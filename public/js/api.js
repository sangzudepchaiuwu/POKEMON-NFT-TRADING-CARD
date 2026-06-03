// API Configuration
const API_CONFIG = {
  // Use same origin as the page (works with 8080/3000/etc.)
  baseUrl: `${window.location.origin}/api`,
  endpoints: {
    cards: '/cards',
    packs: '/packs',
    marketplace: '/marketplace',
    inventory: '/inventory'
  }
};

/**
 * API Request Helper
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Get all cards from collection
 */
async function getCards(collection) {
  return apiRequest(`${API_CONFIG.endpoints.cards}/${collection}`);
}

/**
 * Get card by ID
 */
async function getCardById(collection, cardId) {
  return apiRequest(`${API_CONFIG.endpoints.cards}/${collection}/${cardId}`);
}

/**
 * Get full card JSON (attacks, weaknesses, resistances, retreat...)
 */
async function getCardFull(collection, cardId) {
  return apiRequest(`${API_CONFIG.endpoints.cards}/${collection}/${cardId}/full`);
}

/**
 * Get cards by rarity
 */
async function getCardsByRarity(collection, rarity) {
  return apiRequest(`${API_CONFIG.endpoints.cards}/${collection}/rarity/${rarity}`);
}

/**
 * Get card stats
 */
async function getCardStats(collection) {
  return apiRequest(`${API_CONFIG.endpoints.cards}/stats/${collection}`);
}

/**
 * Get drop rates
 */
async function getDropRates(collection) {
  return apiRequest(`${API_CONFIG.endpoints.packs}/drop-rates/${collection}`);
}

/**
 * Generate random pack (demo)
 */
async function generatePack(collection) {
  return apiRequest(`${API_CONFIG.endpoints.packs}/generate`, 'POST', {
    collection: collection
  });
}

/**
 * Simulate pack opening
 */
async function simulatePacks(collection, count = 1) {
  return apiRequest(`${API_CONFIG.endpoints.packs}/simulate`, 'POST', {
    collection: collection,
    count: count
  });
}

/**
 * Sau khi user ký buyPack on-chain
 */
async function confirmPackPurchase(collection, userAddress, txHash) {
  return apiRequest(`${API_CONFIG.endpoints.packs}/confirm-purchase`, 'POST', {
    collection,
    userAddress,
    txHash,
  });
}

async function getMyPacks(userAddress) {
  return apiRequest(`${API_CONFIG.endpoints.packs}/my/${userAddress}`);
}

async function openPack(packDbId, userAddress) {
  return apiRequest(`${API_CONFIG.endpoints.packs}/${packDbId}/open`, 'POST', {
    userAddress,
  });
}

async function getAppConfig() {
  return apiRequest('/config');
}

/**
 * Marketplace — Listings
 */
async function getMarketplaceListings(filters = {}) {
  const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const query = new URLSearchParams(clean).toString();
  const ep = query
    ? `${API_CONFIG.endpoints.marketplace}/listings?${query}`
    : `${API_CONFIG.endpoints.marketplace}/listings`;
  return apiRequest(ep);
}

async function getListingDetail(listingId) {
  return apiRequest(`${API_CONFIG.endpoints.marketplace}/listings/${listingId}`);
}

async function listCardForSale({
  packId,
  cardIndex,
  sellerAddress,
  price,
  nftTokenId,
  onChainListingId,
  listTxHash,
}) {
  return apiRequest(`${API_CONFIG.endpoints.marketplace}/list`, 'POST', {
    packId,
    cardIndex,
    sellerAddress,
    price,
    nftTokenId,
    onChainListingId,
    listTxHash,
  });
}

async function cancelListing(listingId, sellerAddress, txHash) {
  return apiRequest(
    `${API_CONFIG.endpoints.marketplace}/listings/${listingId}/cancel`,
    'POST',
    { sellerAddress, txHash }
  );
}

async function buyListing(listingId, buyerAddress, txHash) {
  return apiRequest(
    `${API_CONFIG.endpoints.marketplace}/listings/${listingId}/buy`,
    'POST',
    { buyerAddress, txHash }
  );
}

async function makeOffer(listingId, offererAddress, offerPrice, message, onChainOfferId, makeTxHash) {
  return apiRequest(
    `${API_CONFIG.endpoints.marketplace}/listings/${listingId}/offers`,
    'POST',
    { offererAddress, offerPrice, message, onChainOfferId, makeTxHash }
  );
}

async function acceptOffer(offerId, sellerAddress, txHash) {
  return apiRequest(`${API_CONFIG.endpoints.marketplace}/offers/${offerId}/accept`, 'POST', {
    sellerAddress,
    txHash,
  });
}

async function cancelOffer(offerId, offererAddress, txHash) {
  return apiRequest(`${API_CONFIG.endpoints.marketplace}/offers/${offerId}/cancel`, 'POST', {
    offererAddress,
    txHash,
  });
}

async function getMyMarket(address) {
  return apiRequest(`${API_CONFIG.endpoints.marketplace}/my/${address}`);
}

async function getMarketActivity(address) {
  const ep = address
    ? `${API_CONFIG.endpoints.marketplace}/activity?address=${address}`
    : `${API_CONFIG.endpoints.marketplace}/activity`;
  return apiRequest(ep);
}

/**
 * Get user inventory
 */
async function getUserInventory(userAddress) {
  return apiRequest(`${API_CONFIG.endpoints.inventory}/${userAddress}`);
}

/**
 * Add card to inventory
 */
async function addCardToInventory(userAddress, cardId, nftTokenId) {
  return apiRequest(`${API_CONFIG.endpoints.inventory}/${userAddress}/add-card`, 'POST', {
    cardId: cardId,
    nftTokenId: nftTokenId
  });
}
