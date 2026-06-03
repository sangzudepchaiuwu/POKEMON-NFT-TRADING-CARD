const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getDB } = require('../database/db');
const { loadCardData } = require('./cardService');
const { IPFS_CONFIG } = require('../config/rarity');

const IMAGES_DIR = path.join(__dirname, '../../data/card-images');
const STATIC_ROOT = path.resolve(
  process.env.STATIC_IMAGES_DIR || path.join(__dirname, '../../Static')
);

const IMAGE_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg'];

const getSetIdFromCardId = (cardId) => cardId.replace(/-\d+$/, '');

const buildPinataImageUrl = (collection, cardId, setId) => {
  const collectionKey = collection.toUpperCase();
  const imagesCid = IPFS_CONFIG.collections[collectionKey]?.imagesCid;
  if (!imagesCid) return null;
  const folder = setId || getSetIdFromCardId(cardId);
  return `${IPFS_CONFIG.gateway}/ipfs/${imagesCid}/${folder}/${cardId}.webp`;
};

const localImagePath = (collection, cardId, setId) => {
  const folder = setId || getSetIdFromCardId(cardId);
  return path.join(IMAGES_DIR, collection.toLowerCase(), folder, `${cardId}.webp`);
};

/** Tìm thư mục collection trong Static (Neo/NEO, Swsh/SWSH, …) */
const resolveStaticCollectionDir = (collection) => {
  if (!fs.existsSync(STATIC_ROOT)) return null;

  const target = collection.toLowerCase();
  for (const name of fs.readdirSync(STATIC_ROOT, { withFileTypes: true })) {
    if (name.isDirectory() && name.name.toLowerCase() === target) {
      return path.join(STATIC_ROOT, name.name);
    }
  }
  return path.join(STATIC_ROOT, collection.toUpperCase());
};

/**
 * Tìm file ảnh trong folder Static
 * NEO: {collection}/Images/{setId}/{cardId}.webp
 * SWSH: {collection}/{cardId}.webp (ảnh phẳng, không subfolder Images/set)
 */
const resolveStaticImagePath = (collection, cardId, setId) => {
  const collectionDir = resolveStaticCollectionDir(collection);
  if (!collectionDir || !fs.existsSync(collectionDir)) return null;

  const folder = setId || getSetIdFromCardId(cardId);
  const bases = [
    // NEO-style: Images/{setId}/{cardId}
    path.join(collectionDir, 'Images', folder, cardId),
    path.join(collectionDir, 'images', folder, cardId),
    // SWSH-style: ảnh phẳng ngay trong thư mục collection
    path.join(collectionDir, cardId),
    // Fallbacks
    path.join(collectionDir, 'Images', cardId),
    path.join(collectionDir, 'images', cardId),
    path.join(collectionDir, folder, cardId),
    path.join(STATIC_ROOT, 'Images', collection.toUpperCase(), folder, cardId),
  ];

  for (const base of bases) {
    for (const ext of IMAGE_EXTENSIONS) {
      const filePath = base + ext;
      if (fs.existsSync(filePath)) return filePath;
    }
  }
  return null;
};

const cacheImageApiUrl = (collection, cardId) =>
  `/api/cards/cache/${collection.toUpperCase()}/${cardId}/image`;

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

const upsertCardCache = async (card, collection, options = {}) => {
  const db = await getDB();
  const setId = card.set || getSetIdFromCardId(card.id);
  const { buildJsonIpfsUri } = require('./ipfsUriService');

  const staticPath = options.staticPath ?? resolveStaticImagePath(collection, card.id, setId);
  const filePath = staticPath || localImagePath(collection, card.id, setId);

  let imageBlob = options.imageBlob ?? null;
  if (!imageBlob && staticPath && fs.existsSync(staticPath)) {
    imageBlob = fs.readFileSync(staticPath);
  } else if (!imageBlob && fs.existsSync(filePath)) {
    imageBlob = fs.readFileSync(filePath);
  }

  await runQuery(
    db,
    `INSERT INTO card_cache (
      card_id, collection, set_id, name, rarity, ipfs_json_uri,
      local_image_path, image_blob, metadata_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(card_id) DO UPDATE SET
      collection = excluded.collection,
      set_id = excluded.set_id,
      name = excluded.name,
      rarity = excluded.rarity,
      ipfs_json_uri = excluded.ipfs_json_uri,
      local_image_path = excluded.local_image_path,
      image_blob = excluded.image_blob,
      metadata_json = excluded.metadata_json,
      updated_at = CURRENT_TIMESTAMP`,
    [
      card.id,
      collection.toUpperCase(),
      setId,
      card.name,
      card.rarity || 'Common',
      buildJsonIpfsUri(collection, card.id),
      staticPath || filePath,
      imageBlob,
      JSON.stringify(card),
    ]
  );

  return Boolean(imageBlob);
};

const getCachedCard = async (collection, cardId) => {
  const db = await getDB();
  return getQuery(db, 'SELECT * FROM card_cache WHERE card_id = ? AND collection = ?', [
    cardId,
    collection.toUpperCase(),
  ]);
};

const getImageBuffer = async (collection, cardId) => {
  const row = await getCachedCard(collection, cardId);
  if (row?.image_blob) return row.image_blob;

  const setId = getSetIdFromCardId(cardId);
  const staticPath = resolveStaticImagePath(collection, cardId, setId);
  if (staticPath && fs.existsSync(staticPath)) {
    return fs.readFileSync(staticPath);
  }

  if (row?.local_image_path && fs.existsSync(row.local_image_path)) {
    return fs.readFileSync(row.local_image_path);
  }
  return null;
};

const enrichCardsForDisplay = async (collection, cards) => {
  const enriched = [];
  for (const card of cards) {
    const cached = await getCachedCard(collection, card.id);
    const hasImage =
      cached?.image_blob ||
      (cached?.local_image_path && fs.existsSync(cached.local_image_path)) ||
      resolveStaticImagePath(collection, card.id, card.set);

    enriched.push({
      ...card,
      image: cacheImageApiUrl(collection, card.id),
      ipfsJsonUri: cached?.ipfs_json_uri,
      cached: Boolean(hasImage),
    });
  }
  return enriched;
};

const downloadAndCacheImage = async (collection, cardId, setId) => {
  const staticPath = resolveStaticImagePath(collection, cardId, setId);
  if (staticPath) {
    const buffer = fs.readFileSync(staticPath);
    const db = await getDB();
    await runQuery(
      db,
      `UPDATE card_cache SET image_blob = ?, local_image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE card_id = ?`,
      [buffer, staticPath, cardId]
    );
    return true;
  }

  const url = buildPinataImageUrl(collection, cardId, setId);
  if (!url) return false;

  const filePath = localImagePath(collection, cardId, setId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    const buffer = Buffer.from(res.data);
    fs.writeFileSync(filePath, buffer);
    const db = await getDB();
    await runQuery(
      db,
      `UPDATE card_cache SET image_blob = ?, local_image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE card_id = ?`,
      [buffer, filePath, cardId]
    );
    return true;
  } catch (err) {
    console.warn(`⚠️ Skip image ${cardId}: ${err.message}`);
    return false;
  }
};

/** Import từ folder Static (ảnh đã tải sẵn) → SQLite */
const syncCollectionFromStatic = async (collection, options = {}) => {
  const { limit = 0 } = options;
  const cards = loadCardData(collection);
  const slice = limit > 0 ? cards.slice(0, limit) : cards;
  let withImage = 0;
  let missing = 0;

  if (!fs.existsSync(STATIC_ROOT)) {
    throw new Error(
      `Folder Static không tồn tại: ${STATIC_ROOT}\nTạo theo Static/README.md`
    );
  }

  for (const card of slice) {
    const setId = card.set || getSetIdFromCardId(card.id);
    const staticPath = resolveStaticImagePath(collection, card.id, setId);
    const ok = await upsertCardCache(card, collection, {
      staticPath: staticPath || undefined,
      imageBlob: staticPath ? fs.readFileSync(staticPath) : null,
    });
    if (ok) withImage++;
    else missing++;
    if ((withImage + missing) % 50 === 0) {
      console.log(`  … ${collection}: ${withImage + missing}/${slice.length}`);
    }
  }

  return { total: slice.length, withImage, missing };
};

const syncCollectionToCache = async (collection, options = {}) => {
  const { downloadImages = true, limit = 0, fromStatic = false } = options;

  if (fromStatic) {
    return syncCollectionFromStatic(collection, { limit });
  }

  const cards = loadCardData(collection);
  const slice = limit > 0 ? cards.slice(0, limit) : cards;
  let synced = 0;

  for (const card of slice) {
    await upsertCardCache(card, collection);
    if (downloadImages) {
      const setId = card.set || getSetIdFromCardId(card.id);
      await downloadAndCacheImage(collection, card.id, setId);
    }
    synced++;
    if (synced % 25 === 0) {
      console.log(`  … ${collection}: ${synced}/${slice.length}`);
    }
  }

  return { total: synced, withImage: synced, missing: 0 };
};

module.exports = {
  cacheImageApiUrl,
  enrichCardsForDisplay,
  getCachedCard,
  getImageBuffer,
  syncCollectionToCache,
  syncCollectionFromStatic,
  resolveStaticImagePath,
  upsertCardCache,
  IMAGES_DIR,
  STATIC_ROOT,
};
