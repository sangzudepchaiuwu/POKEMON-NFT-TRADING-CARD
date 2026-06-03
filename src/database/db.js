const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/pokemon_nft.db');

// Đảm bảo thư mục data tồn tại
const fs = require('fs');
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db;

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
      } else {
        console.log('✅ SQLite Database connected:', DB_PATH);
        createTables().then(() => resolve(db)).catch(reject);
      }
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
  db.serialize(() => {
    // Bảng User Inventory
    db.run(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT UNIQUE NOT NULL,
        cards JSON,
        total_cards INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bảng Transactions
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash TEXT UNIQUE,
        from_address TEXT NOT NULL,
        to_address TEXT,
        card_id TEXT,
        pack_id TEXT,
        tx_type TEXT,
        amount REAL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bảng Marketplace Listings (OpenSea-style)
    db.run(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pack_id INTEGER NOT NULL,
        card_index INTEGER NOT NULL,
        card_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        seller_address TEXT NOT NULL,
        buyer_address TEXT,
        price REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sold_at DATETIME,
        cancelled_at DATETIME
      )
    `);

    // Migrations cho schema cũ
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN pack_id INTEGER`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN card_index INTEGER`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN collection TEXT`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN cancelled_at DATETIME`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN nft_token_id INTEGER`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN on_chain_listing_id INTEGER`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN list_tx_hash TEXT`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN buy_tx_hash TEXT`, () => {});
    db.run(`ALTER TABLE marketplace_listings ADD COLUMN cancel_tx_hash TEXT`, () => {});

    // Offers (bid) lên 1 listing
    db.run(`
      CREATE TABLE IF NOT EXISTS marketplace_offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        offerer_address TEXT NOT NULL,
        offer_price REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
      )
    `);
    db.run(`ALTER TABLE marketplace_offers ADD COLUMN on_chain_offer_id INTEGER`, () => {});
    db.run(`ALTER TABLE marketplace_offers ADD COLUMN make_tx_hash TEXT`, () => {});
    db.run(`ALTER TABLE marketplace_offers ADD COLUMN accept_tx_hash TEXT`, () => {});
    db.run(`ALTER TABLE marketplace_offers ADD COLUMN cancel_tx_hash TEXT`, () => {});

    // Activity log (history) — listed, sold, offer_made, offer_accepted, cancelled...
    db.run(`
      CREATE TABLE IF NOT EXISTS marketplace_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER,
        pack_id INTEGER,
        card_index INTEGER,
        card_id TEXT,
        collection TEXT,
        event_type TEXT NOT NULL,
        actor_address TEXT NOT NULL,
        counter_party TEXT,
        price REAL,
        tx_hash TEXT,
        meta TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_listings_pack_card ON marketplace_listings(pack_id, card_index)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_offers_listing ON marketplace_offers(listing_id, status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activity_listing ON marketplace_activity(listing_id, created_at)`);

    // Bảng Card Info (Cache) — legacy
    db.run(`
      CREATE TABLE IF NOT EXISTS card_info (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        name TEXT,
        rarity TEXT,
        series TEXT,
        image_url TEXT,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cache thẻ + ảnh (hiển thị tức thì, không chờ Pinata)
    db.run(`
      CREATE TABLE IF NOT EXISTS card_cache (
        card_id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        set_id TEXT,
        name TEXT,
        rarity TEXT,
        ipfs_json_uri TEXT,
        local_image_path TEXT,
        image_blob BLOB,
        metadata_json TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pack của user: mua → mở → mint nền
    db.run(`
      CREATE TABLE IF NOT EXISTS user_packs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        collection TEXT NOT NULL,
        status TEXT DEFAULT 'unopened',
        tx_hash TEXT UNIQUE,
        on_chain_pack_index INTEGER,
        cards_json TEXT,
        mint_tx_hash TEXT,
        mint_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        opened_at DATETIME
      )
    `);

    db.run(`ALTER TABLE user_packs ADD COLUMN token_ids_json TEXT`, () => {});

    db.run(`SELECT 1`, (err) => {
      if (err) reject(err);
      else {
        console.log('✅ Database tables created');
        resolve();
      }
    });
  });
  });
};

const getDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
    } else {
      initDatabase().then(resolve).catch(reject);
    }
  });
};

module.exports = {
  initDatabase,
  getDB,
  DB_PATH
};
