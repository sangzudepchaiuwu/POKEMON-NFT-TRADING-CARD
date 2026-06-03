const { getDB } = require('../database/db');
const { enrichCardsForDisplay } = require('./cardCacheService');
const { BLOCKCHAIN_CONFIG } = require('../config/rarity');
const { loadDeployment } = require('./blockchainService');

const allQuery = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

/**
 * Inventory = thẻ user đang sở hữu:
 *   - Từ pack đã mở (gốc) → trừ những thẻ đã bán cho người khác
 *   - Cộng thẻ user đã mua từ người khác trên marketplace
 */
const getUserInventory = async (userAddress) => {
  const db = await getDB();
  const addr = userAddress.toLowerCase();

  // 1. Pack của user
  const packs = await allQuery(
    db,
    `SELECT * FROM user_packs
     WHERE user_address = ? AND cards_json IS NOT NULL
       AND status IN ('opened', 'minting', 'minted', 'mint_failed')
     ORDER BY COALESCE(opened_at, created_at) DESC`,
    [addr]
  );

  // 2. Listings sold ra (thẻ user đã bán → loại khỏi inventory)
  const soldOut = await allQuery(
    db,
    `SELECT pack_id, card_index FROM marketplace_listings
      WHERE status = 'sold' AND seller_address = ?`,
    [addr]
  );
  const soldOutKeys = new Set(soldOut.map((r) => `${r.pack_id}:${r.card_index}`));

  // 3. Listings user đã mua (thẻ từ user khác)
  const boughtRows = await allQuery(
    db,
    `SELECT l.*, p.cards_json, p.collection AS p_collection
       FROM marketplace_listings l
       LEFT JOIN user_packs p ON p.id = l.pack_id
      WHERE l.status = 'sold' AND l.buyer_address = ?
      ORDER BY l.sold_at DESC`,
    [addr]
  );

  // 4. Listings active (để đánh dấu đang đăng bán)
  const activeListings = await allQuery(
    db,
    `SELECT id, pack_id, card_index, price FROM marketplace_listings
      WHERE status = 'active' AND seller_address = ?`,
    [addr]
  );
  const activeMap = new Map(
    activeListings.map((l) => [`${l.pack_id}:${l.card_index}`, l])
  );

  const deployment = loadDeployment() || {};
  const pokemonCardAddress = deployment.PokemonCard || process.env.POKEMON_CARD_ADDRESS;
  const explorer = BLOCKCHAIN_CONFIG.fuji.explorerUrl;

  const cards = [];

  for (const pack of packs) {
    let rawCards;
    try {
      rawCards = JSON.parse(pack.cards_json);
    } catch {
      continue;
    }

    let tokenIds = [];
    if (pack.token_ids_json) {
      try {
        tokenIds = JSON.parse(pack.token_ids_json);
      } catch {
        tokenIds = [];
      }
    }

    const enriched = await enrichCardsForDisplay(pack.collection, rawCards);

    enriched.forEach((card, index) => {
      const key = `${pack.id}:${index}`;
      if (soldOutKeys.has(key)) return; // đã bán cho người khác — bỏ qua

      const tokenId = tokenIds[index] != null ? Number(tokenIds[index]) : null;
      const activeListing = activeMap.get(key);

      cards.push({
        ...card,
        packId: pack.id,
        cardIndex: index,
        collection: pack.collection,
        mintStatus: pack.status,
        mintTxHash: pack.mint_tx_hash,
        nftTokenId: tokenId,
        nftExplorerUrl:
          tokenId != null && pokemonCardAddress
            ? `${explorer}/token/${pokemonCardAddress}?a=${tokenId}`
            : null,
        listingId: activeListing?.id || null,
        listingPrice: activeListing?.price || null,
        ownedVia: 'opened',
      });
    });
  }

  // Thẻ mua được từ marketplace
  for (const row of boughtRows) {
    try {
      const packCards = JSON.parse(row.cards_json || '[]');
      const rawCard = packCards[row.card_index];
      if (!rawCard) continue;
      const enriched = await enrichCardsForDisplay(row.collection || row.p_collection, [rawCard]);
      const card = enriched[0];
      const key = `${row.pack_id}:${row.card_index}`;
      // Nếu user đã bán lại thẻ này thì bỏ qua
      if (soldOutKeys.has(key)) continue;
      const activeListing = activeMap.get(key);
      const tokenId = row.nft_token_id != null ? Number(row.nft_token_id) : null;
      cards.push({
        ...card,
        packId: row.pack_id,
        cardIndex: row.card_index,
        collection: row.collection || row.p_collection,
        mintStatus: 'minted',
        nftTokenId: tokenId,
        nftExplorerUrl:
          tokenId != null && pokemonCardAddress
            ? `${explorer}/token/${pokemonCardAddress}?a=${tokenId}`
            : null,
        listingId: activeListing?.id || null,
        listingPrice: activeListing?.price || null,
        ownedVia: 'bought',
        boughtPrice: row.price,
      });
    } catch (err) {
      console.warn('inventory bought card:', err.message);
    }
  }

  return {
    userAddress: addr,
    cards,
    totalCards: cards.length,
  };
};

module.exports = { getUserInventory };
