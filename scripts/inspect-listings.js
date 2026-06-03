const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/pokemon_nft.db');

db.all(
  `SELECT id, card_id, substr(seller_address,1,10) AS seller, price, status,
          nft_token_id AS tokenId, on_chain_listing_id AS onChainId,
          substr(list_tx_hash, 1, 14) AS list_tx,
          created_at
   FROM marketplace_listings
   ORDER BY id DESC LIMIT 20`,
  (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
    db.close();
  }
);
