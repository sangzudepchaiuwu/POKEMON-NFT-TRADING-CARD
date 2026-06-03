/**
 * Recover các listing bị NULL on_chain_listing_id.
 * Đọc receipt từ list của tx_hash → parse event ListingCreated → tự match
 * vào listing đang null on_chain_listing_id theo giá (price wei).
 *
 * Usage:
 *   node scripts/recover-listings.js 0xtx1 0xtx2 ...
 */
const sqlite3 = require('sqlite3').verbose();
const { ethers } = require('ethers');
require('dotenv').config();

const RPCS = [
  process.env.AVAX_RPC_URL,
  'https://avalanche-fuji-c-chain-rpc.publicnode.com',
  'https://api.avax-test.network/ext/bc/C/rpc',
  'https://rpc.ankr.com/avalanche_fuji',
].filter(Boolean);

const MARKET_ABI = [
  'event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp)',
  'function listings(uint256) view returns (uint256, uint256, address, uint256, bool, uint256)',
];

const MARKET_IFACE = new ethers.Interface(MARKET_ABI);
const MARKET_ADDR = process.env.MARKETPLACE_ADDRESS;

async function getProvider() {
  for (const url of RPCS) {
    try {
      const p = new ethers.JsonRpcProvider(url, 43113);
      await p.getBlockNumber();
      console.log(`✅ Using RPC: ${url}`);
      return p;
    } catch (e) {
      console.log(`⚠️  RPC fail: ${url}`);
    }
  }
  throw new Error('All RPCs failed');
}

async function parseTx(provider, txHash) {
  console.log(`\n🔍 Checking tx ${txHash}...`);
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.log('  ❌ Tx receipt not found (chưa được mine?)');
    return null;
  }
  if (receipt.to?.toLowerCase() !== MARKET_ADDR.toLowerCase()) {
    console.log(`  ❌ Tx not sent to Marketplace (${receipt.to} vs ${MARKET_ADDR})`);
    return null;
  }
  for (const log of receipt.logs) {
    try {
      const parsed = MARKET_IFACE.parseLog(log);
      if (parsed?.name === 'ListingCreated') {
        const onChainId = Number(parsed.args.listingId);
        const tokenId = Number(parsed.args.tokenId);
        const priceWei = parsed.args.price.toString();
        const priceAvax = Number(ethers.formatEther(parsed.args.price));
        const seller = parsed.args.seller.toLowerCase();
        console.log(`  ✅ ListingCreated id=${onChainId}, tokenId=${tokenId}, price=${priceAvax} AVAX, seller=${seller}`);
        return { onChainId, tokenId, priceWei, priceAvax, seller, txHash };
      }
    } catch {}
  }
  console.log('  ❌ No ListingCreated event in tx');
  return null;
}

const allListings = (db) =>
  new Promise((res, rej) => {
    db.all(
      `SELECT id, card_id, price, seller_address FROM marketplace_listings
       WHERE on_chain_listing_id IS NULL AND status = 'active'`,
      (err, rows) => (err ? rej(err) : res(rows))
    );
  });

async function main() {
  const txHashes = process.argv.slice(2);
  if (txHashes.length === 0) {
    console.log('Usage: node scripts/recover-listings.js 0xtx1 0xtx2 ...');
    process.exit(1);
  }

  const provider = await getProvider();
  const db = new sqlite3.Database('./data/pokemon_nft.db');
  const pending = await allListings(db);
  console.log(`\n📋 Pending listings (on_chain_listing_id NULL, active): ${pending.length}`);
  console.table(pending);

  for (const tx of txHashes) {
    const data = await parseTx(provider, tx);
    if (!data) continue;

    const match = pending.find(
      (l) =>
        !l._matched &&
        Math.abs(Number(l.price) - data.priceAvax) < 1e-9 &&
        l.seller_address.toLowerCase() === data.seller
    );
    if (!match) {
      console.log(`  ⚠️  No DB listing matches price ${data.priceAvax} AVAX from seller ${data.seller}`);
      continue;
    }
    match._matched = true;

    await new Promise((res, rej) => {
      db.run(
        `UPDATE marketplace_listings
           SET on_chain_listing_id = ?, nft_token_id = ?, list_tx_hash = ?
         WHERE id = ?`,
        [data.onChainId, data.tokenId, tx, match.id],
        (err) => (err ? rej(err) : res())
      );
    });
    console.log(`  💾 Updated DB listing #${match.id} (${match.card_id}) → onChainId=${data.onChainId}, tokenId=${data.tokenId}`);
  }

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
