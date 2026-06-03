#!/usr/bin/env node

/**
 * Test script để verify toàn bộ hệ thống
 * Run: node test-system.js
 */

const path = require('path');
const fs = require('fs');

console.log('\n' + '='.repeat(60));
console.log('🧪 POKEMON NFT SYSTEM TEST');
console.log('='.repeat(60) + '\n');

// Test 1: Check Node version
console.log('1️⃣ Checking Node.js version...');
const nodeVersion = process.version;
console.log(`   ✅ Node ${nodeVersion}\n`);

// Test 2: Check directories
console.log('2️⃣ Checking directory structure...');
const dirs = [
  'contracts',
  'routes',
  'src/config',
  'src/services',
  'src/database',
  'public/js',
  'scripts',
  'downloaded_series/neo/cards',
  'downloaded_series/swsh/cards'
];

let allDirsExist = true;
dirs.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`   ${exists ? '✅' : '❌'} ${dir}`);
  if (!exists) allDirsExist = false;
});
console.log();

// Test 3: Check files
console.log('3️⃣ Checking important files...');
const files = [
  'package.json',
  'server.js',
  'hardhat.config.js',
  'contracts/PokemonCard.sol',
  'contracts/PackFactory.sol',
  'contracts/Marketplace.sol',
  'routes/cards.js',
  'routes/packs.js',
  'routes/marketplace.js',
  'src/config/rarity.js',
  'src/services/cardService.js',
  'src/services/packService.js',
  'public/index.html',
  'public/js/web3-config.js',
  'public/js/api.js',
  'public/js/ui.js',
  'scripts/deploy.js',
  'README.md'
];

let allFilesExist = true;
files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});
console.log();

// Test 4: Check .env
console.log('4️⃣ Checking .env configuration...');
const envFile = path.join(__dirname, '.env');
const envExists = fs.existsSync(envFile);
console.log(`   ${envExists ? '✅' : '⚠️'} .env file ${envExists ? 'exists' : 'missing (use .env.example)'}\n`);

// Test 5: Check card data
console.log('5️⃣ Checking card data...');
const neoCardsPath = path.join(__dirname, 'downloaded_series/neo/cards');
const swshCardsPath = path.join(__dirname, 'downloaded_series/swsh/cards');

let neoCount = 0;
let swshCount = 0;

if (fs.existsSync(neoCardsPath)) {
  neoCount = fs.readdirSync(neoCardsPath).filter(f => f.endsWith('.json')).length;
}
if (fs.existsSync(swshCardsPath)) {
  swshCount = fs.readdirSync(swshCardsPath).filter(f => f.endsWith('.json')).length;
}

console.log(`   ✅ NEO cards: ${neoCount} JSON files`);
console.log(`   ✅ SWSH cards: ${swshCount} JSON files\n`);

// Test 6: Load card config
console.log('6️⃣ Testing rarity configuration...');
try {
  const rarityConfig = require('./src/config/rarity.js');
  console.log(`   ✅ NEO rarities: ${rarityConfig.RARITY_CONFIG.NEO.rarities.length}`);
  console.log(`   ✅ SWSH rarities: ${rarityConfig.RARITY_CONFIG.SWSH.rarities.length}`);
  console.log(`   ✅ Pack config: ${rarityConfig.PACK_CONFIG.cardsPerPack} cards/pack\n`);
} catch (err) {
  console.log(`   ❌ Error loading rarity config: ${err.message}\n`);
}

// Test 7: Load services
console.log('7️⃣ Testing services...');
try {
  const cardService = require('./src/services/cardService.js');
  const packService = require('./src/services/packService.js');
  console.log(`   ✅ cardService loaded`);
  console.log(`   ✅ packService loaded\n`);
} catch (err) {
  console.log(`   ❌ Error loading services: ${err.message}\n`);
}

// Summary
console.log('='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`
✅ Directory structure: ${allDirsExist ? 'PASS' : 'FAIL'}
✅ Files present: ${allFilesExist ? 'PASS' : 'FAIL'}
⚠️ Configuration: ${envExists ? 'PASS' : 'Setup needed'}
✅ Card data: ${neoCount > 0 && swshCount > 0 ? 'PASS' : 'FAIL'}

🚀 Next steps:
1. Create .env file from .env.example
2. Add your AVAX_PRIVATE_KEY
3. Run: npm install
4. Run: npx hardhat compile
5. Run: npx hardhat run scripts/deploy.js --network fuji
6. Run: npm start
`);
console.log('='.repeat(60) + '\n');
