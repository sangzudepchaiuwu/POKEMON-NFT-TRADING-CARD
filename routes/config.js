const express = require('express');
const router = express.Router();
const { loadDeployment } = require('../src/services/blockchainService');
const { PACK_CONFIG, COLLECTION_SETS } = require('../src/config/rarity');

router.get('/', (req, res) => {
  const contracts = loadDeployment() || {};
  res.json({
    success: true,
    contracts,
    packPrices: PACK_CONFIG.prices,
    cardsPerPack: PACK_CONFIG.cardsPerPack,
    activeSets: COLLECTION_SETS,
    chainId: 43113,
  });
});

module.exports = router;
