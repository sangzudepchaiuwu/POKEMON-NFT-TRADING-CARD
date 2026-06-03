/**
 * Contract ABIs Placeholder
 * 
 * IMPORTANT: Sau khi deploy contracts, sao chép ABIs từ artifacts/
 * và thay thế placeholder này bằng ABIs thực tế.
 * 
 * ABIs sẽ nằm ở:
 * - artifacts/contracts/PokemonCard.sol/PokemonCard.json
 * - artifacts/contracts/PackFactory.sol/PackFactory.json  
 * - artifacts/contracts/Marketplace.sol/Marketplace.json
 */

// Placeholder ABIs - cần update sau khi deploy
const CONTRACT_ABIS = {
  PokemonCard: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "tokenId", "type": "uint256" },
        { "indexed": true, "name": "to", "type": "address" },
        { "indexed": false, "name": "collection", "type": "string" },
        { "indexed": false, "name": "cardId", "type": "string" },
        { "indexed": false, "name": "rarity", "type": "string" }
      ],
      "name": "CardMinted",
      "type": "event"
    },
    {
      "inputs": [
        { "name": "to", "type": "address" },
        { "name": "collection", "type": "string" },
        { "name": "cardId", "type": "string" },
        { "name": "name", "type": "string" },
        { "name": "rarity", "type": "string" },
        { "name": "ipfsUri", "type": "string" }
      ],
      "name": "mintCard",
      "outputs": [{ "name": "", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "tokenId", "type": "uint256" }],
      "name": "getCardMetadata",
      "outputs": [
        {
          "components": [
            { "name": "cardId", "type": "string" },
            { "name": "collection", "type": "string" },
            { "name": "name", "type": "string" },
            { "name": "rarity", "type": "string" },
            { "name": "ipfsUri", "type": "string" },
            { "name": "mintedAt", "type": "uint256" }
          ],
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "name": "to", "type": "address" },
        { "name": "tokenId", "type": "uint256" }
      ],
      "name": "approve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "name": "operator", "type": "address" },
        { "name": "approved", "type": "bool" }
      ],
      "name": "setApprovalForAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "name": "owner", "type": "address" },
        { "name": "operator", "type": "address" }
      ],
      "name": "isApprovedForAll",
      "outputs": [{ "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "name": "tokenId", "type": "uint256" }],
      "name": "getApproved",
      "outputs": [{ "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "name": "tokenId", "type": "uint256" }],
      "name": "ownerOf",
      "outputs": [{ "name": "", "type": "address" }],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  PackFactory: [
    {
      "inputs": [{ "name": "_pokemonCardAddress", "type": "address" }],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [{ "name": "collection", "type": "string" }],
      "name": "buyPack",
      "outputs": [{ "name": "", "type": "uint256" }],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        { "name": "collection", "type": "string" },
        { "name": "newPrice", "type": "uint256" }
      ],
      "name": "setPackPrice",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  Marketplace: [
    {
      "inputs": [{ "name": "_pokemonCardAddress", "type": "address" }],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "listingId", "type": "uint256" },
        { "indexed": true, "name": "tokenId", "type": "uint256" },
        { "indexed": true, "name": "seller", "type": "address" },
        { "indexed": false, "name": "price", "type": "uint256" },
        { "indexed": false, "name": "timestamp", "type": "uint256" }
      ],
      "name": "ListingCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "listingId", "type": "uint256" },
        { "indexed": true, "name": "tokenId", "type": "uint256" },
        { "indexed": true, "name": "buyer", "type": "address" },
        { "indexed": false, "name": "seller", "type": "address" },
        { "indexed": false, "name": "price", "type": "uint256" },
        { "indexed": false, "name": "fee", "type": "uint256" },
        { "indexed": false, "name": "timestamp", "type": "uint256" }
      ],
      "name": "CardSold",
      "type": "event"
    },
    {
      "inputs": [
        { "name": "tokenId", "type": "uint256" },
        { "name": "price", "type": "uint256" }
      ],
      "name": "listCard",
      "outputs": [{ "name": "", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "listingId", "type": "uint256" }],
      "name": "buyCard",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "listingId", "type": "uint256" }],
      "name": "cancelListing",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "listingId", "type": "uint256" }],
      "name": "listings",
      "outputs": [
        { "name": "listingId", "type": "uint256" },
        { "name": "tokenId", "type": "uint256" },
        { "name": "seller", "type": "address" },
        { "name": "price", "type": "uint256" },
        { "name": "active", "type": "bool" },
        { "name": "createdAt", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "offerId", "type": "uint256" },
        { "indexed": true, "name": "listingId", "type": "uint256" },
        { "indexed": true, "name": "offerer", "type": "address" },
        { "indexed": false, "name": "amount", "type": "uint256" },
        { "indexed": false, "name": "timestamp", "type": "uint256" }
      ],
      "name": "OfferMade",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "offerId", "type": "uint256" },
        { "indexed": true, "name": "listingId", "type": "uint256" },
        { "indexed": true, "name": "offerer", "type": "address" },
        { "indexed": false, "name": "refundAmount", "type": "uint256" }
      ],
      "name": "OfferCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "offerId", "type": "uint256" },
        { "indexed": true, "name": "listingId", "type": "uint256" },
        { "indexed": true, "name": "tokenId", "type": "uint256" },
        { "indexed": false, "name": "seller", "type": "address" },
        { "indexed": false, "name": "offerer", "type": "address" },
        { "indexed": false, "name": "amount", "type": "uint256" },
        { "indexed": false, "name": "fee", "type": "uint256" },
        { "indexed": false, "name": "timestamp", "type": "uint256" }
      ],
      "name": "OfferAccepted",
      "type": "event"
    },
    {
      "inputs": [{ "name": "listingId", "type": "uint256" }],
      "name": "makeOffer",
      "outputs": [{ "name": "", "type": "uint256" }],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "offerId", "type": "uint256" }],
      "name": "cancelOffer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "offerId", "type": "uint256" }],
      "name": "acceptOffer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "offerId", "type": "uint256" }],
      "name": "offers",
      "outputs": [
        { "name": "offerId", "type": "uint256" },
        { "name": "listingId", "type": "uint256" },
        { "name": "offerer", "type": "address" },
        { "name": "amount", "type": "uint256" },
        { "name": "active", "type": "bool" },
        { "name": "createdAt", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

// Browser global (used by web3-config.js)
if (typeof window !== 'undefined') {
  window.CONTRACT_ABIS = CONTRACT_ABIS;
}
