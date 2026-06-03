const express = require('express');
const router = express.Router();
const { getUserInventory } = require('../src/services/inventoryService');

/**
 * GET /api/inventory/:userAddress
 * Thẻ từ pack đã mở / đã mint
 */
router.get('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const inventory = await getUserInventory(userAddress);
    res.json({ success: true, ...inventory });
  } catch (err) {
    console.error('inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
