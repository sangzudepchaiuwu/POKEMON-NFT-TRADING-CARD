/**
 * Deploy CHỈ Marketplace mới (giữ nguyên PokemonCard + PackFactory cũ).
 * Sau khi xong, copy địa chỉ vào .env: MARKETPLACE_ADDRESS=0x...
 */
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  const { ethers } = hre;

  const pokemonCardAddress = process.env.POKEMON_CARD_ADDRESS;
  if (!pokemonCardAddress) {
    throw new Error('POKEMON_CARD_ADDRESS không có trong .env');
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`📝 Deployer: ${deployer.address}`);
  console.log(`💰 Balance:  ${ethers.formatEther(balance)} AVAX\n`);
  console.log(`🎴 Reusing PokemonCard at: ${pokemonCardAddress}\n`);

  console.log('🚀 Deploying NEW Marketplace (with offers)...');
  const Marketplace = await ethers.getContractFactory('Marketplace');
  const market = await Marketplace.deploy(pokemonCardAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();

  console.log(`\n✅ Marketplace deployed: ${marketAddress}`);
  console.log('\n' + '='.repeat(60));
  console.log('📋 NEXT STEPS:');
  console.log('  1. Update .env:');
  console.log(`     MARKETPLACE_ADDRESS=${marketAddress}`);
  console.log('  2. Restart backend server');
  console.log('  3. Users đã approve marketplace cũ cần approve lại (chỉ 1 lần)');
  console.log('='.repeat(60));

  // Update deployment-fuji.json
  const deploymentPath = path.join(__dirname, '..', 'deployment-fuji.json');
  let data = {};
  if (fs.existsSync(deploymentPath)) {
    data = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  }
  data.contracts = data.contracts || {};
  data.contracts.Marketplace = marketAddress;
  data.lastMarketplaceDeploy = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(data, null, 2));
  console.log('\n💾 deployment-fuji.json updated');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
