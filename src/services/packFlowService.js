const { getDB } = require('../database/db');
const { generatePack } = require('./packService');
const { enrichCardsForDisplay } = require('./cardCacheService');
const { verifyBuyPackTransaction, mintPackOnChain } = require('./blockchainService');


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

/**
 * Sau khi user ký buyPack on-chain → đăng ký pack chưa mở trong DB
 */
const registerPackPurchase = async ({ collection, userAddress, txHash }) => {
  const db = await getDB();
  const existing = await getQuery(db, 'SELECT id FROM user_packs WHERE tx_hash = ?', [txHash]);
  if (existing) {
    return getPackById(existing.id);
  }

  let onChainPackIndex = -1;
  let verifyError = null;

  try {
    const verified = await verifyBuyPackTransaction(txHash, userAddress, collection);
    onChainPackIndex = verified.onChainPackIndex;
  } catch (err) {
    if (err.code === 'VERIFY_TIMEOUT') {
      // RPC không phản hồi — tin tưởng txHash của frontend, ghi nhận để verify sau
      verifyError = err.message;
      console.warn(`[registerPackPurchase] VERIFY_TIMEOUT, registering pack unverified. txHash=${txHash}`);
    } else {
      throw err; // lỗi thật (tx sai, sender sai...) → vẫn từ chối
    }
  }

  const result = await runQuery(
    db,
    `INSERT INTO user_packs (user_address, collection, status, tx_hash, on_chain_pack_index)
     VALUES (?, ?, 'unopened', ?, ?)`,
    [userAddress.toLowerCase(), collection.toUpperCase(), txHash, onChainPackIndex]
  );

  if (verifyError) {
    console.log(`[registerPackPurchase] Pack #${result.lastID} created (unverified). Will verify when opening.`);
  }

  return getPackById(result.lastID);
};

const getPackById = async (packDbId) => {
  const db = await getDB();
  return getQuery(db, 'SELECT * FROM user_packs WHERE id = ?', [packDbId]);
};

const listUserPacks = async (userAddress, status = null) => {
  const db = await getDB();
  if (status) {
    return allQuery(
      db,
      `SELECT * FROM user_packs WHERE user_address = ? AND status = ? ORDER BY created_at DESC`,
      [userAddress.toLowerCase(), status]
    );
  }
  return allQuery(
    db,
    `SELECT * FROM user_packs WHERE user_address = ? ORDER BY created_at DESC`,
    [userAddress.toLowerCase()]
  );
};

/**
 * User bấm mở → random ngay, trả ảnh từ SQLite, mint chạy nền
 */
const openUserPack = async (packDbId, userAddress) => {
  const db = await getDB();
  const pack = await getPackById(packDbId);

  if (!pack) throw new Error('Pack not found');
  if (pack.user_address.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error('Not your pack');
  }
  if (pack.status !== 'unopened') {
    if (pack.cards_json) {
      const cards = JSON.parse(pack.cards_json);
      return {
        pack,
        cards: await enrichCardsForDisplay(pack.collection, cards),
        alreadyOpened: true,
        mintStatus: pack.status,
      };
    }
    throw new Error(`Pack already processed (${pack.status})`);
  }

  // Nếu lúc mua bị VERIFY_TIMEOUT, lấy lại on_chain_pack_index khi mở
  let onChainPackIndex = pack.on_chain_pack_index;
  if (onChainPackIndex == null || onChainPackIndex < 0) {
    try {
      const verified = await verifyBuyPackTransaction(pack.tx_hash, userAddress, pack.collection);
      onChainPackIndex = verified.onChainPackIndex;
      await runQuery(db, `UPDATE user_packs SET on_chain_pack_index = ? WHERE id = ?`, [onChainPackIndex, packDbId]);
    } catch (err) {
      console.warn(`[openUserPack] Late verify failed for pack #${packDbId}: ${err.message}`);
      onChainPackIndex = 0; // fallback — mint sẽ thử với index 0
    }
  }

  const rawCards = generatePack(pack.collection);
  const cards = await enrichCardsForDisplay(pack.collection, rawCards);

  await runQuery(
    db,
    `UPDATE user_packs SET status = 'opened', cards_json = ?, opened_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify(rawCards), packDbId]
  );

  queueBackgroundMint(packDbId, userAddress, pack.collection, onChainPackIndex, rawCards);

  return {
    pack: await getPackById(packDbId),
    cards,
    alreadyOpened: false,
    mintStatus: 'minting',
    message: 'Đã mở pack! NFT đang được mint nền (Pinata metadata).',
  };
};

const queueBackgroundMint = (packDbId, userAddress, collection, onChainPackIndex, cards) => {
  setImmediate(async () => {
    const db = await getDB();
    try {
      await runQuery(db, `UPDATE user_packs SET status = 'minting' WHERE id = ?`, [packDbId]);
      const { txHash, tokenIds } = await mintPackOnChain(
        userAddress,
        onChainPackIndex,
        collection,
        cards
      );
      await runQuery(
        db,
        `UPDATE user_packs SET status = 'minted', mint_tx_hash = ?, token_ids_json = ? WHERE id = ?`,
        [txHash, JSON.stringify(tokenIds || []), packDbId]
      );
      console.log(`✅ Minted pack #${packDbId} tx=${txHash}`);
    } catch (err) {
      console.error(`❌ Mint failed pack #${packDbId}:`, err.message);
      await runQuery(
        db,
        `UPDATE user_packs SET status = 'mint_failed', mint_error = ? WHERE id = ?`,
        [err.message, packDbId]
      );
    }
  });
};

module.exports = {
  registerPackPurchase,
  listUserPacks,
  openUserPack,
  getPackById,
};
