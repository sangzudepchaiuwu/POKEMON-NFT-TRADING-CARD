const express = require('express');
const router = express.Router();
const { generatePack, getDropRateStats, simulatePackOpening } = require('../src/services/packService');
const { PACK_CONFIG } = require('../src/config/rarity');
const {
  registerPackPurchase,
  listUserPacks,
  openUserPack,
} = require('../src/services/packFlowService');

router.get('/drop-rates/:collection', (req, res) => {
  try {
    const { collection } = req.params;
    const stats = getDropRateStats(collection);
    res.json({
      success: true,
      ...stats,
      packPrice: PACK_CONFIG.prices[collection.toUpperCase()] || 0.5,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Sau khi user ký buyPack on-chain */
router.post('/confirm-purchase', async (req, res) => {
  try {
    const { collection, userAddress, txHash } = req.body;
    if (!collection || !userAddress || !txHash) {
      return res.status(400).json({ error: 'collection, userAddress, txHash required' });
    }
    const pack = await registerPackPurchase({ collection, userAddress, txHash });
    res.json({
      success: true,
      message: 'Đã mua pack! Bấm "Mở Pack" để xem thẻ.',
      pack: {
        id: pack.id,
        collection: pack.collection,
        status: pack.status,
        txHash: pack.tx_hash,
      },
    });
  } catch (err) {
    console.error('confirm-purchase:', err);
    res.status(400).json({ error: err.message });
  }
});

/** Danh sách pack của user */
router.get('/my/:userAddress', async (req, res) => {
  try {
    const packs = await listUserPacks(req.params.userAddress);
    res.json({ success: true, packs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** User mở pack — trả thẻ + ảnh SQLite ngay */
router.post('/:packId/open', async (req, res) => {
  try {
    const { userAddress } = req.body;
    const packId = parseInt(req.params.packId, 10);
    if (!userAddress) {
      return res.status(400).json({ error: 'userAddress required' });
    }
    const result = await openUserPack(packId, userAddress);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('open pack:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/generate', (req, res) => {
  try {
    const { collection } = req.body;
    if (!collection) return res.status(400).json({ error: 'Collection is required' });
    const pack = generatePack(collection);
    res.json({
      success: true,
      packId: `${collection.toUpperCase()}-${Date.now()}`,
      collection: collection.toUpperCase(),
      cardsInPack: PACK_CONFIG.cardsPerPack,
      cards: pack,
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/simulate', (req, res) => {
  try {
    const { collection, count = 1 } = req.body;
    if (!collection) return res.status(400).json({ error: 'Collection is required' });
    if (count > 100) return res.status(400).json({ error: 'Max 100 packs' });
    const packs = simulatePackOpening(collection, count);
    res.json({
      success: true,
      collection: collection.toUpperCase(),
      totalPacks: packs.length,
      packs,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
