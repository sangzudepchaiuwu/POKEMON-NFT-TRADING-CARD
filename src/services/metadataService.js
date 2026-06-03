const axios = require('axios');
const { IPFS_CONFIG } = require('../config/rarity');

const gateway = () => (IPFS_CONFIG.gateway || 'https://gateway.pinata.cloud').replace(/\/$/, '');

const normalizeImageUrl = (imageField, collection, cardId) => {
  if (!imageField) {
    const imagesCid = IPFS_CONFIG.collections[collection.toUpperCase()]?.imagesCid;
    if (!imagesCid) return null;
    const setId = cardId.replace(/-\d+$/, '');
    if (collection.toUpperCase() === 'SWSH') {
      return `${gateway()}/ipfs/${imagesCid}/${cardId}.webp`;
    }
    return `${gateway()}/ipfs/${imagesCid}/${setId}/${cardId}.webp`;
  }
  if (imageField.startsWith('http')) return imageField;
  if (imageField.startsWith('ipfs://')) {
    return `${gateway()}/ipfs/${imageField.replace('ipfs://', '')}`;
  }
  return imageField;
};

/** Metadata chuẩn ERC721 (MetaMask / Snowtrace) */
const buildWalletMetadata = async (collection, cardId) => {
  const collectionKey = collection.toUpperCase();
  const jsonCid = IPFS_CONFIG.collections[collectionKey]?.jsonCid;
  if (!jsonCid) throw new Error('JSON CID not configured');

  const url = `${gateway()}/ipfs/${jsonCid}/${cardId}.json`;
  const { data: raw } = await axios.get(url, { timeout: 30000 });

  const name = raw.name || cardId;
  const description =
    raw.description ||
    `${name} — Pokémon TCG (${collectionKey}, set ${raw.set?.id || cardId.split('-')[0]})`;

  return {
    name,
    description,
    image: normalizeImageUrl(raw.image, collectionKey, cardId),
    attributes: [
      { trait_type: 'Collection', value: collectionKey },
      { trait_type: 'Card ID', value: cardId },
      { trait_type: 'Rarity', value: raw.rarity || 'Unknown' },
      { trait_type: 'Set', value: raw.set?.id || '' },
    ],
  };
};

module.exports = { buildWalletMetadata, normalizeImageUrl };
