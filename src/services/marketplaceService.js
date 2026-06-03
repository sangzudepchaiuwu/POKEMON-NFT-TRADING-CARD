const { getDB } = require('../database/db');
const { enrichCardsForDisplay } = require('./cardCacheService');

const MARKETPLACE_FEE_PERCENT = 2;

const runQuery = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const getQuery = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const allQuery = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const lower = (s) => (s || '').toLowerCase();

/**
 * Tìm "owner hiện tại" của 1 card (theo pack_id + card_index).
 * Owner = seller của listing 'sold' gần nhất, fallback về user_address của pack.
 */
const getCurrentOwner = async (packId, cardIndex) => {
  const db = await getDB();
  const sold = await getQuery(
    db,
    `SELECT buyer_address FROM marketplace_listings
     WHERE pack_id = ? AND card_index = ? AND status = 'sold'
     ORDER BY sold_at DESC LIMIT 1`,
    [packId, cardIndex]
  );
  if (sold?.buyer_address) return lower(sold.buyer_address);
  const pack = await getQuery(db, `SELECT user_address FROM user_packs WHERE id = ?`, [packId]);
  return pack ? lower(pack.user_address) : null;
};

const logActivity = async (
  db,
  { listingId, packId, cardIndex, cardId, collection, eventType, actor, counterParty, price, txHash, meta }
) =>
  runQuery(
    db,
    `INSERT INTO marketplace_activity
      (listing_id, pack_id, card_index, card_id, collection, event_type, actor_address, counter_party, price, tx_hash, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listingId || null,
      packId || null,
      cardIndex != null ? cardIndex : null,
      cardId || null,
      collection || null,
      eventType,
      lower(actor),
      lower(counterParty) || null,
      price != null ? price : null,
      txHash || null,
      meta ? JSON.stringify(meta) : null,
    ]
  );

/**
 * Đăng bán: verify ownership + ghi nhận on-chain info
 */
const createListing = async ({
  packId,
  cardIndex,
  sellerAddress,
  price,
  nftTokenId,
  onChainListingId,
  listTxHash,
}) => {
  if (!packId || cardIndex == null || !sellerAddress || !price) {
    throw new Error('packId, cardIndex, sellerAddress, price là bắt buộc');
  }
  if (Number(price) <= 0) throw new Error('Giá phải > 0');

  const db = await getDB();
  const pack = await getQuery(db, `SELECT * FROM user_packs WHERE id = ?`, [packId]);
  if (!pack) throw new Error('Pack không tồn tại');
  if (!pack.cards_json) throw new Error('Pack chưa mở');

  let cards;
  try {
    cards = JSON.parse(pack.cards_json);
  } catch {
    throw new Error('Pack data lỗi');
  }
  if (!cards[cardIndex]) throw new Error('Card index không hợp lệ');
  const card = cards[cardIndex];

  const currentOwner = await getCurrentOwner(packId, cardIndex);
  if (currentOwner !== lower(sellerAddress)) {
    throw new Error('Bạn không sở hữu thẻ này');
  }

  const existing = await getQuery(
    db,
    `SELECT id FROM marketplace_listings
     WHERE pack_id = ? AND card_index = ? AND status = 'active'`,
    [packId, cardIndex]
  );
  if (existing) throw new Error('Thẻ này đang được đăng bán');

  const result = await runQuery(
    db,
    `INSERT INTO marketplace_listings
      (pack_id, card_index, card_id, collection, seller_address, price, status,
       nft_token_id, on_chain_listing_id, list_tx_hash)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      packId,
      cardIndex,
      card.id,
      pack.collection,
      lower(sellerAddress),
      Number(price),
      nftTokenId != null ? Number(nftTokenId) : null,
      onChainListingId != null ? Number(onChainListingId) : null,
      listTxHash || null,
    ]
  );

  await logActivity(db, {
    listingId: result.lastID,
    packId,
    cardIndex,
    cardId: card.id,
    collection: pack.collection,
    eventType: 'listed',
    actor: sellerAddress,
    price,
    txHash: listTxHash,
    meta: { nftTokenId, onChainListingId },
  });

  return getListingById(result.lastID);
};

const cancelListing = async ({ listingId, sellerAddress }) => {
  const db = await getDB();
  const listing = await getQuery(db, `SELECT * FROM marketplace_listings WHERE id = ?`, [listingId]);
  if (!listing) throw new Error('Listing không tồn tại');
  if (listing.status !== 'active') throw new Error('Listing không còn active');
  if (lower(listing.seller_address) !== lower(sellerAddress)) {
    throw new Error('Chỉ người bán mới được hủy');
  }

  const txHash = arguments[0].txHash;
  await runQuery(
    db,
    `UPDATE marketplace_listings SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancel_tx_hash = ? WHERE id = ?`,
    [txHash || null, listingId]
  );

  // Hủy các offer còn pending
  await runQuery(
    db,
    `UPDATE marketplace_offers SET status = 'expired', responded_at = CURRENT_TIMESTAMP
     WHERE listing_id = ? AND status = 'pending'`,
    [listingId]
  );

  await logActivity(db, {
    listingId,
    packId: listing.pack_id,
    cardIndex: listing.card_index,
    cardId: listing.card_id,
    collection: listing.collection,
    eventType: 'cancelled',
    actor: sellerAddress,
    price: listing.price,
  });

  return getListingById(listingId);
};

const buyListing = async ({ listingId, buyerAddress, txHash }) => {
  const db = await getDB();
  const listing = await getQuery(db, `SELECT * FROM marketplace_listings WHERE id = ?`, [listingId]);
  if (!listing) throw new Error('Listing không tồn tại');
  if (listing.status !== 'active') throw new Error('Listing không còn active');
  if (lower(listing.seller_address) === lower(buyerAddress)) {
    throw new Error('Không thể mua thẻ của chính mình');
  }

  await runQuery(
    db,
    `UPDATE marketplace_listings
       SET status = 'sold', buyer_address = ?, sold_at = CURRENT_TIMESTAMP, buy_tx_hash = ?
     WHERE id = ?`,
    [lower(buyerAddress), txHash || null, listingId]
  );

  // Đóng các offer pending khác
  await runQuery(
    db,
    `UPDATE marketplace_offers SET status = 'expired', responded_at = CURRENT_TIMESTAMP
     WHERE listing_id = ? AND status = 'pending'`,
    [listingId]
  );

  await logActivity(db, {
    listingId,
    packId: listing.pack_id,
    cardIndex: listing.card_index,
    cardId: listing.card_id,
    collection: listing.collection,
    eventType: 'sold',
    actor: buyerAddress,
    counterParty: listing.seller_address,
    price: listing.price,
    txHash,
  });

  return getListingById(listingId);
};

const makeOffer = async ({
  listingId,
  offererAddress,
  offerPrice,
  message,
  onChainOfferId,
  makeTxHash,
}) => {
  if (!offerPrice || Number(offerPrice) <= 0) throw new Error('Giá offer phải > 0');

  const db = await getDB();
  const listing = await getQuery(db, `SELECT * FROM marketplace_listings WHERE id = ?`, [listingId]);
  if (!listing) throw new Error('Listing không tồn tại');
  if (listing.status !== 'active') throw new Error('Listing không còn active');
  if (lower(listing.seller_address) === lower(offererAddress)) {
    throw new Error('Không thể offer trên listing của chính mình');
  }

  const result = await runQuery(
    db,
    `INSERT INTO marketplace_offers
      (listing_id, offerer_address, offer_price, message, on_chain_offer_id, make_tx_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      listingId,
      lower(offererAddress),
      Number(offerPrice),
      message || null,
      onChainOfferId != null ? Number(onChainOfferId) : null,
      makeTxHash || null,
    ]
  );

  await logActivity(db, {
    listingId,
    packId: listing.pack_id,
    cardIndex: listing.card_index,
    cardId: listing.card_id,
    collection: listing.collection,
    eventType: 'offer_made',
    actor: offererAddress,
    counterParty: listing.seller_address,
    price: offerPrice,
    txHash: makeTxHash,
    meta: { onChainOfferId },
  });

  return getOfferById(result.lastID);
};

const acceptOffer = async ({ offerId, sellerAddress, txHash }) => {
  const db = await getDB();
  const offer = await getQuery(db, `SELECT * FROM marketplace_offers WHERE id = ?`, [offerId]);
  if (!offer) throw new Error('Offer không tồn tại');
  if (offer.status !== 'pending') throw new Error('Offer không còn pending');

  const listing = await getQuery(db, `SELECT * FROM marketplace_listings WHERE id = ?`, [offer.listing_id]);
  if (!listing) throw new Error('Listing không tồn tại');
  if (listing.status !== 'active') throw new Error('Listing không còn active');
  if (lower(listing.seller_address) !== lower(sellerAddress)) {
    throw new Error('Chỉ người bán mới được accept');
  }

  await runQuery(
    db,
    `UPDATE marketplace_offers SET status = 'accepted', responded_at = CURRENT_TIMESTAMP, accept_tx_hash = ? WHERE id = ?`,
    [txHash || null, offerId]
  );

  await runQuery(
    db,
    `UPDATE marketplace_listings
       SET status = 'sold', buyer_address = ?, price = ?, sold_at = CURRENT_TIMESTAMP, buy_tx_hash = ?
     WHERE id = ?`,
    [offer.offerer_address, offer.offer_price, txHash || null, listing.id]
  );

  // Đánh dấu các offer khác là 'open' để user tự cancel rút tiền (contract vẫn giữ AVAX)
  await runQuery(
    db,
    `UPDATE marketplace_offers SET status = 'open' 
     WHERE listing_id = ? AND status = 'pending' AND id != ?`,
    [listing.id, offerId]
  );

  await logActivity(db, {
    listingId: listing.id,
    packId: listing.pack_id,
    cardIndex: listing.card_index,
    cardId: listing.card_id,
    collection: listing.collection,
    eventType: 'offer_accepted',
    actor: sellerAddress,
    counterParty: offer.offerer_address,
    price: offer.offer_price,
    txHash,
  });

  return { offer: await getOfferById(offerId), listing: await getListingById(listing.id) };
};

const cancelOffer = async ({ offerId, offererAddress, txHash }) => {
  const db = await getDB();
  const offer = await getQuery(db, `SELECT * FROM marketplace_offers WHERE id = ?`, [offerId]);
  if (!offer) throw new Error('Offer không tồn tại');
  if (!['pending', 'open'].includes(offer.status)) throw new Error('Offer không thể hủy');
  if (lower(offer.offerer_address) !== lower(offererAddress)) {
    throw new Error('Chỉ người đặt offer mới được hủy');
  }

  await runQuery(
    db,
    `UPDATE marketplace_offers SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP, cancel_tx_hash = ? WHERE id = ?`,
    [txHash || null, offerId]
  );

  const listing = await getQuery(db, `SELECT * FROM marketplace_listings WHERE id = ?`, [offer.listing_id]);
  await logActivity(db, {
    listingId: offer.listing_id,
    packId: listing?.pack_id,
    cardIndex: listing?.card_index,
    cardId: listing?.card_id,
    collection: listing?.collection,
    eventType: 'offer_cancelled',
    actor: offererAddress,
    price: offer.offer_price,
  });

  return getOfferById(offerId);
};

const getOfferById = async (offerId) => {
  const db = await getDB();
  return getQuery(db, `SELECT * FROM marketplace_offers WHERE id = ?`, [offerId]);
};

const enrichListing = async (listing) => {
  if (!listing) return null;
  const enriched = await enrichCardsForDisplay(listing.collection, [
    { id: listing.card_id, set: listing.card_id.replace(/-\d+$/, '') },
  ]);
  return {
    ...listing,
    card: enriched[0] || null,
  };
};

const getListingById = async (listingId) => {
  const db = await getDB();
  const listing = await getQuery(db, `SELECT * FROM marketplace_listings WHERE id = ?`, [listingId]);
  return enrichListing(listing);
};

/**
 * Lấy listing + card metadata + offers + activity
 */
const getListingFull = async (listingId) => {
  const db = await getDB();
  const listing = await getListingById(listingId);
  if (!listing) return null;
  const offers = await allQuery(
    db,
    `SELECT * FROM marketplace_offers WHERE listing_id = ? ORDER BY created_at DESC`,
    [listingId]
  );
  const activity = await allQuery(
    db,
    `SELECT * FROM marketplace_activity WHERE listing_id = ? ORDER BY created_at DESC`,
    [listingId]
  );
  // pack info để lấy rarity từ cards_json
  const pack = await getQuery(db, `SELECT cards_json FROM user_packs WHERE id = ?`, [listing.pack_id]);
  let rarity = null;
  let name = null;
  if (pack?.cards_json) {
    try {
      const cards = JSON.parse(pack.cards_json);
      if (cards[listing.card_index]) {
        rarity = cards[listing.card_index].rarity;
        name = cards[listing.card_index].name;
      }
    } catch {}
  }
  return { ...listing, rarity, name, offers, activity };
};

const listActiveListings = async ({ collection, rarity, search, sort = 'recent', address } = {}) => {
  const db = await getDB();
  const where = [`l.status = 'active'`];
  const params = [];
  if (collection) {
    where.push(`l.collection = ?`);
    params.push(collection.toUpperCase());
  }
  if (address) {
    where.push(`l.seller_address = ?`);
    params.push(lower(address));
  }
  let orderBy = `l.created_at DESC`;
  if (sort === 'price_asc') orderBy = `l.price ASC`;
  if (sort === 'price_desc') orderBy = `l.price DESC`;

  const rows = await allQuery(
    db,
    `SELECT l.*, p.cards_json
       FROM marketplace_listings l
       LEFT JOIN user_packs p ON p.id = l.pack_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}`,
    params
  );

  const enriched = [];
  for (const row of rows) {
    let cardRarity = null;
    let cardName = null;
    try {
      const cards = row.cards_json ? JSON.parse(row.cards_json) : [];
      if (cards[row.card_index]) {
        cardRarity = cards[row.card_index].rarity;
        cardName = cards[row.card_index].name;
      }
    } catch {}
    if (rarity && cardRarity !== rarity) continue;
    if (search && !`${cardName} ${row.card_id}`.toLowerCase().includes(search.toLowerCase())) continue;

    const item = await enrichListing(row);
    enriched.push({ ...item, rarity: cardRarity, name: cardName, cards_json: undefined });
  }
  return enriched;
};

const getMyMarketData = async (address) => {
  const db = await getDB();
  const addr = lower(address);
  const myListings = await allQuery(
    db,
    `SELECT l.*, p.cards_json FROM marketplace_listings l
       LEFT JOIN user_packs p ON p.id = l.pack_id
      WHERE l.seller_address = ? ORDER BY l.created_at DESC LIMIT 100`,
    [addr]
  );
  const myOffers = await allQuery(
    db,
    `SELECT o.*, l.card_id, l.collection, l.price as listing_price, l.status as listing_status
       FROM marketplace_offers o JOIN marketplace_listings l ON o.listing_id = l.id
      WHERE o.offerer_address = ? ORDER BY o.created_at DESC LIMIT 100`,
    [addr]
  );
  const offersOnMyListings = await allQuery(
    db,
    `SELECT o.*, l.card_id, l.collection
       FROM marketplace_offers o JOIN marketplace_listings l ON o.listing_id = l.id
      WHERE l.seller_address = ? AND o.status = 'pending'
      ORDER BY o.created_at DESC`,
    [addr]
  );

  const enrichedListings = [];
  for (const row of myListings) {
    let rarity = null;
    let name = null;
    try {
      const cards = row.cards_json ? JSON.parse(row.cards_json) : [];
      if (cards[row.card_index]) {
        rarity = cards[row.card_index].rarity;
        name = cards[row.card_index].name;
      }
    } catch {}
    const item = await enrichListing(row);
    enrichedListings.push({ ...item, rarity, name, cards_json: undefined });
  }

  return { listings: enrichedListings, offersByMe: myOffers, offersToMe: offersOnMyListings };
};

const getActivity = async ({ address, limit = 50 } = {}) => {
  const db = await getDB();
  let sql = `SELECT * FROM marketplace_activity`;
  const params = [];
  if (address) {
    sql += ` WHERE actor_address = ? OR counter_party = ?`;
    params.push(lower(address), lower(address));
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return allQuery(db, sql, params);
};

module.exports = {
  MARKETPLACE_FEE_PERCENT,
  createListing,
  cancelListing,
  buyListing,
  makeOffer,
  acceptOffer,
  cancelOffer,
  getListingById,
  getListingFull,
  listActiveListings,
  getMyMarketData,
  getActivity,
  getCurrentOwner,
};
