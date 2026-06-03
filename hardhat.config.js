require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    fuji: {
      url: process.env.AVAX_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: process.env.AVAX_PRIVATE_KEY ? [process.env.AVAX_PRIVATE_KEY] : [],
      chainId: 43113,
      gasPrice: 25000000000, // 25 nAVAX
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: process.env.AVAX_PRIVATE_KEY ? [process.env.AVAX_PRIVATE_KEY] : [],
      chainId: 43114,
      gasPrice: 25000000000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
      avalanche: process.env.SNOWTRACE_API_KEY || "",
    },
  },
};
