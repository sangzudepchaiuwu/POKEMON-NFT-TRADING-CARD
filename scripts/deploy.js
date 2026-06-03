const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  console.log("🚀 Deploying Pokemon NFT Smart Contracts to Avalanche Fuji...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());

  console.log("\n1️⃣ Deploying PokemonCard (ERC721)...");
  const PokemonCard = await ethers.getContractFactory("PokemonCard");
  const pokemonCard = await PokemonCard.deploy();
  await pokemonCard.waitForDeployment();
  const pokemonCardAddress = await pokemonCard.getAddress();
  console.log("✅ PokemonCard deployed to:", pokemonCardAddress);

  console.log("\n2️⃣ Deploying PackFactory...");
  const PackFactory = await ethers.getContractFactory("PackFactory");
  const packFactory = await PackFactory.deploy(pokemonCardAddress);
  await packFactory.waitForDeployment();
  const packFactoryAddress = await packFactory.getAddress();
  console.log("✅ PackFactory deployed to:", packFactoryAddress);

  console.log("\n3️⃣ Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(pokemonCardAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  console.log("\n⚙️  Setting up PackFactory minting rights...");
  const tx = await pokemonCard.transferOwnership(packFactoryAddress);
  await tx.wait();
  console.log("✅ PokemonCard ownership transferred to PackFactory");

  console.log("\n" + "=".repeat(60));
  console.log("✨ DEPLOYMENT SUMMARY ✨");
  console.log("=".repeat(60));
  console.log("\n📜 Contract Addresses:");
  console.log(`   PokemonCard:  ${pokemonCardAddress}`);
  console.log(`   PackFactory:  ${packFactoryAddress}`);
  console.log(`   Marketplace:  ${marketplaceAddress}`);

  console.log("\n🔗 Network: Avalanche Fuji Testnet");
  console.log(`   Chain ID: 43113`);
  console.log(`   Explorer: https://testnet.snowtrace.io`);

  console.log("\n📋 Next Steps:");
  console.log("   1. Save these addresses to your .env file");
  console.log("   2. Update frontend with contract addresses");
  console.log("   3. Test contracts on testnet");
  console.log("   4. Setup backend API integration");
  console.log("\n" + "=".repeat(60));

  const deploymentAddresses = {
    network: "fuji",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PokemonCard: pokemonCardAddress,
      PackFactory: packFactoryAddress,
      Marketplace: marketplaceAddress,
    },
    rpcUrl: hre.network.config.url,
    explorer: "https://testnet.snowtrace.io",
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-fuji.json",
    JSON.stringify(deploymentAddresses, null, 2)
  );
  console.log("\n💾 Deployment addresses saved to deployment-fuji.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
