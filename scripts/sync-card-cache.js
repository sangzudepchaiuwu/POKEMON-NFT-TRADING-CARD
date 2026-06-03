/**
 * Đồng bộ metadata + ảnh vào SQLite
 *
 * Từ folder Static (ảnh đã tải, cấu trúc giống Pinata):
 *   node scripts/sync-card-cache.js --from-static
 *   node scripts/sync-card-cache.js NEO --from-static
 *
 * Từ Pinata (chậm):
 *   node scripts/sync-card-cache.js NEO --limit=50
 */
require('dotenv').config();
const fs = require('fs');
const { initDatabase } = require('../src/database/db');
const { syncCollectionToCache, STATIC_ROOT } = require('../src/services/cardCacheService');

async function main() {
  const args = process.argv.slice(2);
  const collectionArg = args.find((a) => !a.startsWith('--')) || 'ALL';
  const fromStatic =
    args.includes('--from-static') ||
    (!args.includes('--from-pinata') && fs.existsSync(STATIC_ROOT));
  const downloadImages = !args.includes('--no-download') && !fromStatic;
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

  await initDatabase();

  const collections =
    collectionArg.toUpperCase() === 'ALL' ? ['NEO', 'SWSH'] : [collectionArg.toUpperCase()];

  console.log(`📁 Static root: ${STATIC_ROOT}`);
  console.log(`📦 Mode: ${fromStatic ? 'from Static folder' : 'from Pinata download'}\n`);

  for (const col of collections) {
    const result = await syncCollectionToCache(col, {
      downloadImages,
      limit,
      fromStatic,
    });
    if (fromStatic) {
      console.log(
        `✅ ${col}: ${result.withImage}/${result.total} có ảnh, ${result.missing} thiếu file trong Static`
      );
    } else {
      console.log(`✅ Done ${col}: ${result.total} cards`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
