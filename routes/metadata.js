const express = require('express');
const router = express.Router();
const { buildWalletMetadata } = require('../src/services/metadataService');

/** Metadata chuẩn cho ví / explorer (có description + image HTTPS) */
router.get('/:collection/:cardId.json', async (req, res) => {
  try {
    const { collection, cardId } = req.params;
    const metadata = await buildWalletMetadata(collection, cardId.replace(/\.json$/, ''));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(metadata);
  } catch (err) {
    console.error('metadata:', err.message);
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
