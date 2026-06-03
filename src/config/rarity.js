// Rarity configurations cho cả 2 collections
const RARITY_CONFIG = {
  NEO: {
    rarities: ['Common', 'Uncommon', 'Rare'],
    dropRates: {
      'Common': 0.75,
      'Uncommon': 0.20,
      'Rare': 0.05
    },
    colors: {
      'Common': '#888888',
      'Uncommon': '#00AA00',
      'Rare': '#FFDD00'
    },
    tierLevel: {
      'Common': 1,
      'Uncommon': 2,
      'Rare': 3
    }
  },
  SWSH: {
    rarities: [
      'Common',
      'Uncommon',
      'Rare',
      'Holo Rare',
      'Holo Rare V',
      'Holo Rare VMAX',
      'Ultra Rare',
      'Secret Rare'
    ],
    dropRates: {
      'Common': 0.50,
      'Uncommon': 0.25,
      'Rare': 0.13,
      'Holo Rare': 0.06,
      'Holo Rare V': 0.035,
      'Holo Rare VMAX': 0.012,
      'Ultra Rare': 0.008,
      'Secret Rare': 0.005
    },
    colors: {
      'Common': '#888888',
      'Uncommon': '#00AA00',
      'Rare': '#FFDD00',
      'Holo Rare': '#AA00FF',
      'Holo Rare V': '#FF5500',
      'Holo Rare VMAX': '#FF0000',
      'Ultra Rare': '#00FFFF',
      'Secret Rare': '#FFD700'
    },
    tierLevel: {
      'Common': 1,
      'Uncommon': 2,
      'Rare': 3,
      'Holo Rare': 4,
      'Holo Rare V': 5,
      'Holo Rare VMAX': 6,
      'Ultra Rare': 7,
      'Secret Rare': 8
    }
  }
};

/** Set được dùng trong game (khớp Pinata + Static) */
const COLLECTION_SETS = {
  NEO: (process.env.NEO_ACTIVE_SETS || 'neo2,neo4')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  SWSH: (process.env.SWSH_ACTIVE_SETS || 'swsh1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

// Pack configurations
// Pure RNG: mỗi lá độc lập roll theo dropRates trong RARITY_CONFIG,
// không có "guaranteed slot" — chấp nhận pack toàn Common.
const PACK_CONFIG = {
  prices: {
    NEO: 0.5,      // 0.5 AVAX
    SWSH: 0.5      // 0.5 AVAX
  },
  cardsPerPack: Math.max(1, parseInt(process.env.CARDS_PER_PACK || '5', 10)),
};

// IPFS — Json và Images là 2 folder Pinata riêng (có thể 2 tài khoản khác nhau)
// NEO Images:  {imagesCid}/neo2/neo2-1.webp
// SWSH Images: {imagesCid}/swsh1/swsh1-2.webp (Pinata); Static/Swsh/swsh1-2.webp (local phẳng)
const IPFS_CONFIG = {
  gateway: process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud',
  collections: {
    NEO: {
      jsonCid:
        process.env.NEO_JSON_CID ||
        process.env.NEO_CID ||
        'bafybeichy6bh7fbrzq5wdbrabnkxru4e6zfhksb5ce7knotqf5cqurxspe',
      imagesCid: process.env.NEO_IMAGES_CID || '',
    },
    SWSH: {
      jsonCid:
        process.env.SWSH_JSON_CID ||
        process.env.SWSH_CID ||
        'bafybeifabl5aqtopnnkbh3twclq5ckgggntm72cgnxuvbcermedn3tsfh4',
      imagesCid: process.env.SWSH_IMAGES_CID || '',
    },
  },
};

// Blockchain configs
const BLOCKCHAIN_CONFIG = {
  fuji: {
    chainId: 43113,
    rpcUrl: process.env.AVAX_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://testnet.snowtrace.io'
  }
};

module.exports = {
  RARITY_CONFIG,
  PACK_CONFIG,
  COLLECTION_SETS,
  IPFS_CONFIG,
  BLOCKCHAIN_CONFIG,
};
