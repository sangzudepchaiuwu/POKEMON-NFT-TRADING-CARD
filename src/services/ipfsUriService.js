const { IPFS_CONFIG } = require('../config/rarity');

/**
 * URI metadata lưu on-chain khi mint.
 * Ưu tiên PUBLIC_APP_URL (metadata chuẩn ví) nếu server public (ngrok/deploy).
 * Không có thì Pinata gateway HTTPS.
 */
const buildJsonIpfsUri = (collection, cardId) => {
  const publicBase = (process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (publicBase) {
    return `${publicBase}/api/metadata/${collection.toUpperCase()}/${cardId}.json`;
  }

  const collectionKey = collection.toUpperCase();
  const jsonCid = IPFS_CONFIG.collections[collectionKey]?.jsonCid;
  if (!jsonCid) return null;
  const gateway = (IPFS_CONFIG.gateway || 'https://gateway.pinata.cloud').replace(/\/$/, '');
  return `${gateway}/ipfs/${jsonCid}/${cardId}.json`;
};

module.exports = { buildJsonIpfsUri };
