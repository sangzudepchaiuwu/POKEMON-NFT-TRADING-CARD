const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { initDatabase } = require('./src/database/db');
const cardRoutes = require('./routes/cards');
const packRoutes = require('./routes/packs');
const marketplaceRoutes = require('./routes/marketplace');
const inventoryRoutes = require('./routes/inventory');
const metadataRoutes = require('./routes/metadata');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));
// Optional: serve raw files from Static/ (API cache vẫn ưu tiên SQLite)
if (require('fs').existsSync('Static')) {
  app.use('/static-assets', express.static('Static'));
}
// Pack artwork (booster + card back)
if (require('fs').existsSync('pack_images')) {
  app.use('/pack-images', express.static('pack_images'));
}

// Routes
app.use('/api/config', configRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/metadata', metadataRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Pokemon NFT Backend running on port ${PORT}`);
      console.log(`📝 Chạy sync ảnh: node scripts/sync-card-cache.js`);
    });
  })
  .catch((err) => {
    console.error('Failed to init database:', err);
    process.exit(1);
  });

module.exports = app;
