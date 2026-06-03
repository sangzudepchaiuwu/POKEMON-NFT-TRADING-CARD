const fs = require('fs');
const path = require('path');
const { RARITY_CONFIG, IPFS_CONFIG, COLLECTION_SETS } = require('../config/rarity');

// Load card data từ local files
const cardDataCache = {};

/** Derive set folder from card id (neo2-1 -> neo2) */
const getSetIdFromCardId = (cardId) => cardId.replace(/-\d+$/, '');

const getActiveSets = (collection) => COLLECTION_SETS[collection.toUpperCase()] || [];

const cardBelongsToActiveSet = (card, collection) => {
  const active = getActiveSets(collection);
  if (!active.length) return true;
  const setId = card.set || getSetIdFromCardId(card.id);
  return active.includes(setId);
};

/** Build Pinata/IPFS image URL theo cấu trúc folder Pinata */
const buildImageUrl = (collection, cardId, setId) => {
  const collectionKey = collection.toUpperCase();
  const config = IPFS_CONFIG.collections[collectionKey];
  if (!config?.imagesCid) {
    return null;
  }

  const folder = setId || getSetIdFromCardId(cardId);
  const imagePath = `${folder}/${cardId}.webp`;

  return `${IPFS_CONFIG.gateway}/ipfs/${config.imagesCid}/${imagePath}`;
};

const loadCardData = (collection) => {
  if (cardDataCache[collection]) {
    return cardDataCache[collection];
  }

  const collectionPath = path.join(__dirname, `../../downloaded_series/${collection.toLowerCase()}/cards`);
  
  if (!fs.existsSync(collectionPath)) {
    console.warn(`⚠️ Path not found: ${collectionPath}`);
    return [];
  }

  const cards = [];
  const files = fs.readdirSync(collectionPath).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filePath = path.join(collectionPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      cards.push({
        id: data.id,
        name: data.name,
        rarity: data.rarity || 'Common',
        hp: data.hp,
        types: data.types || [],
        stage: data.stage,
        illustrator: data.illustrator,
        image: buildImageUrl(collection, data.id, data.set?.id),
        description: data.description,
        set: data.set?.id,
        dexId: data.dexId || []
      });
    } catch (err) {
      console.error(`Error loading card ${file}:`, err.message);
    }
  }

  const activeSets = getActiveSets(collection);
  const filtered = activeSets.length
    ? cards.filter((c) => cardBelongsToActiveSet(c, collection))
    : cards;

  cardDataCache[collection] = filtered;
  console.log(
    `✅ Loaded ${filtered.length} cards from ${collection}` +
      (activeSets.length ? ` (sets: ${activeSets.join(', ')})` : '')
  );
  return filtered;
};

// Lấy card theo collection và rarity
const getCardsByRarity = (collection, rarity) => {
  const cards = loadCardData(collection);
  return cards.filter(card => card.rarity === rarity);
};

// Lấy tất cả card từ collection
const getAllCards = (collection) => {
  return loadCardData(collection);
};

// Lấy card details
const getCardById = (collection, cardId) => {
  const cards = loadCardData(collection);
  return cards.find(card => card.id === cardId);
};

// Get card metadata từ IPFS
const getCardMetadata = (collection, cardId) => {
  const card = getCardById(collection, cardId);
  if (!card) return null;

  return {
    id: cardId,
    name: card.name,
    rarity: card.rarity,
    description: card.description,
    image: buildImageUrl(collection, cardId, card.set),
    attributes: {
      hp: card.hp,
      types: card.types,
      stage: card.stage,
      illustrator: card.illustrator,
      set: card.set,
      dexId: card.dexId
    },
    rarityTier: RARITY_CONFIG[collection.toUpperCase()]?.tierLevel?.[card.rarity] || 0,
    rarityColor: RARITY_CONFIG[collection.toUpperCase()]?.colors?.[card.rarity] || '#FFFFFF'
  };
};

module.exports = {
  loadCardData,
  getCardsByRarity,
  getAllCards,
  getCardById,
  getCardMetadata,
  buildImageUrl,
  getActiveSets,
  cardBelongsToActiveSet,
};
