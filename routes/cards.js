const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { getAllCards, getCardById, getCardMetadata } = require('../src/services/cardService');
const { getImageBuffer, cacheImageApiUrl } = require('../src/services/cardCacheService');

/**
 * GET /api/cards/:collection/:cardId/full
 * Trả về JSON đầy đủ của card (attacks, weaknesses, resistances, retreat...)
 * Đọc trực tiếp từ downloaded_series — cùng schema với Pinata
 */
router.get('/:collection/:cardId/full', (req, res) => {
  try {
    const { collection, cardId } = req.params;
    const filePath = path.join(
      __dirname,
      '../downloaded_series',
      collection.toLowerCase(),
      'cards',
      `${cardId}.json`
    );
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Card JSON not found' });
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({
      success: true,
      card: {
        ...raw,
        image: cacheImageApiUrl(collection, cardId),
      },
    });
  } catch (err) {
    console.error('Error fetching full card:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cards/cache/:collection/:cardId/image
 * Ảnh từ SQLite/disk — tải tức thì
 */
router.get('/cache/:collection/:cardId/image', async (req, res) => {
  try {
    const { collection, cardId } = req.params;
    const buffer = await getImageBuffer(collection, cardId);
    if (!buffer) {
      return res.status(404).json({ error: 'Image not in cache. Run: node scripts/sync-card-cache.js' });
    }
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cards/:collection
 * Lấy tất cả cards từ collection
 */
router.get('/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const validCollections = ['NEO', 'SWSH', 'neo', 'swsh'];

    if (!validCollections.includes(collection)) {
      return res.status(400).json({ 
        error: 'Invalid collection. Must be NEO or SWSH' 
      });
    }

    const cards = getAllCards(collection).map((c) => ({
      ...c,
      image: cacheImageApiUrl(collection, c.id),
    }));
    res.json({
      success: true,
      collection: collection.toUpperCase(),
      total: cards.length,
      cards: cards
    });
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cards/:collection/:cardId
 * Lấy chi tiết 1 card
 */
router.get('/:collection/:cardId', (req, res) => {
  try {
    const { collection, cardId } = req.params;

    const card = getCardMetadata(collection, cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      success: true,
      card: card
    });
  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cards/:collection/rarity/:rarity
 * Lấy cards theo rarity
 */
router.get('/:collection/rarity/:rarity', (req, res) => {
  try {
    const { collection, rarity } = req.params;
    const { getCardsByRarity } = require('../src/services/cardService');

    const cards = getCardsByRarity(collection, rarity);
    res.json({
      success: true,
      collection: collection.toUpperCase(),
      rarity: rarity,
      total: cards.length,
      cards: cards
    });
  } catch (err) {
    console.error('Error fetching cards by rarity:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cards/stats/:collection
 * Lấy thống kê cards từ collection
 */
router.get('/stats/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const cards = getAllCards(collection);

    const rarity_stats = {};
    cards.forEach(card => {
      rarity_stats[card.rarity] = (rarity_stats[card.rarity] || 0) + 1;
    });

    res.json({
      success: true,
      collection: collection.toUpperCase(),
      totalCards: cards.length,
      rarityDistribution: rarity_stats,
      types: [...new Set(cards.flatMap(c => c.types))],
      sets: [...new Set(cards.map(c => c.set))]
    });
  } catch (err) {
    console.error('Error fetching card stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
