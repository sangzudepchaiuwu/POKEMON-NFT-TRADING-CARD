const { RARITY_CONFIG, PACK_CONFIG } = require('../config/rarity');
const { getCardsByRarity, getAllCards, getCardMetadata } = require('./cardService');

/**
 * Generate random pack dựa trên drop rates
 *
 * Pure RNG: mỗi lá được roll độc lập theo bảng drop rate của collection.
 * Không có "guaranteed slot" — về mặt lý thuyết có thể mở ra pack toàn Common,
 * hoặc may mắn ra nhiều Holo/Ultra/Secret cùng lúc.
 *
 * @param {string} collection - 'NEO' hoặc 'SWSH'
 * @returns {Array} Danh sách thẻ trong pack
 */
const generatePack = (collection) => {
  const collectionKey = collection.toUpperCase();
  const config = RARITY_CONFIG[collectionKey];

  if (!config) {
    throw new Error(`Unknown collection: ${collection}`);
  }

  const pack = [];
  const cardsPerPack = PACK_CONFIG.cardsPerPack;

  for (let i = 0; i < cardsPerPack; i++) {
    const rarity = selectRarityByDropRate(config.dropRates);
    const card = getRandomCardByRarity(collection, rarity);
    if (card) {
      pack.push({
        ...card,
        packPosition: i + 1,
        rarity,
      });
    }
  }

  return pack;
};

/**
 * Select rarity dựa trên drop rates
 * @param {Object} dropRates - Object chứa rarity và xác suất
 * @returns {string} Selected rarity
 */
const selectRarityByDropRate = (dropRates) => {
  const random = Math.random();
  let cumulative = 0;

  for (const [rarity, rate] of Object.entries(dropRates)) {
    cumulative += rate;
    if (random <= cumulative) {
      return rarity;
    }
  }

  // Fallback vào highest rarity
  return Object.keys(dropRates)[Object.keys(dropRates).length - 1];
};

/**
 * Get random card theo rarity
 * @param {string} collection - 'NEO' hoặc 'SWSH'
 * @param {string} rarity - Rarity level
 * @returns {Object} Random card
 */
const getRandomCardByRarity = (collection, rarity) => {
  const cards = getCardsByRarity(collection, rarity);
  
  if (cards.length === 0) {
    console.warn(`No cards found for ${collection} - ${rarity}`);
    // Fallback: lấy random card từ collection
    const allCards = getAllCards(collection);
    return allCards[Math.floor(Math.random() * allCards.length)] || null;
  }

  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  return getCardMetadata(collection, randomCard.id);
};

/**
 * Simulate pack opening (cho demo purposes)
 * @param {string} collection - 'NEO' hoặc 'SWSH'
 * @param {number} packCount - Số pack cần mở
 * @returns {Array} Array của packs
 */
const simulatePackOpening = (collection, packCount = 1) => {
  const packs = [];
  
  for (let i = 0; i < packCount; i++) {
    const pack = generatePack(collection);
    packs.push({
      packId: `${collection.toUpperCase()}-PACK-${Date.now()}-${i}`,
      collection: collection,
      cards: pack,
      timestamp: new Date()
    });
  }

  return packs;
};

/**
 * Get drop rate statistics
 * @param {string} collection - 'NEO' hoặc 'SWSH'
 * @returns {Object} Drop rate statistics
 */
const getDropRateStats = (collection) => {
  const collectionKey = collection.toUpperCase();
  const config = RARITY_CONFIG[collectionKey];
  
  if (!config) {
    throw new Error(`Unknown collection: ${collection}`);
  }

  return {
    collection: collection,
    dropRates: config.dropRates,
    colors: config.colors,
    tierLevels: config.tierLevel,
    cardsPerPack: PACK_CONFIG.cardsPerPack,
  };
};

module.exports = {
  generatePack,
  selectRarityByDropRate,
  getRandomCardByRarity,
  simulatePackOpening,
  getDropRateStats
};
