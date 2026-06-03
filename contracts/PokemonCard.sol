// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PokemonCard
 * @dev NFT contract cho Pokemon cards
 */
contract PokemonCard is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private tokenIdCounter;
    
    // Struct cho card metadata
    struct CardMetadata {
        string cardId;          // neo2-3, swsh1-25, etc
        string collection;      // NEO, SWSH
        string name;            // Card name
        string rarity;          // Common, Rare, etc
        string ipfsUri;         // IPFS metadata URI
        uint256 mintedAt;       // Timestamp
    }
    
    // Mapping token ID -> metadata
    mapping(uint256 => CardMetadata) public tokenMetadata;
    
    // Mapping cardId -> tokenIds (track duplicate cards)
    mapping(string => uint256[]) public cardTokenIds;
    
    // Collection-specific data
    mapping(string => bool) public validCollections;
    
    event CardMinted(
        uint256 indexed tokenId,
        address indexed to,
        string collection,
        string cardId,
        string rarity
    );
    
    constructor() ERC721("Pokemon Card NFT", "POKENOM") {
        validCollections["NEO"] = true;
        validCollections["SWSH"] = true;
    }
    
    /**
     * @dev Mint new Pokemon card NFT
     * @param to Address nhận NFT
     * @param collection Collection name (NEO, SWSH)
     * @param cardId Card ID (neo2-3)
     * @param name Card name
     * @param rarity Rarity level
     * @param ipfsUri IPFS metadata URI
     */
    function mintCard(
        address to,
        string memory collection,
        string memory cardId,
        string memory name,
        string memory rarity,
        string memory ipfsUri
    ) public onlyOwner returns (uint256) {
        require(validCollections[collection], "Invalid collection");
        require(to != address(0), "Invalid address");
        
        uint256 tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        
        CardMetadata memory metadata = CardMetadata({
            cardId: cardId,
            collection: collection,
            name: name,
            rarity: rarity,
            ipfsUri: ipfsUri,
            mintedAt: block.timestamp
        });
        
        tokenMetadata[tokenId] = metadata;
        cardTokenIds[cardId].push(tokenId);
        
        emit CardMinted(tokenId, to, collection, cardId, rarity);
        
        return tokenId;
    }
    
    /**
     * @dev Batch mint multiple cards
     */
    function batchMint(
        address to,
        string memory collection,
        string[] memory cardIds,
        string[] memory names,
        string[] memory rarities,
        string[] memory ipfsUris
    ) public onlyOwner returns (uint256[] memory) {
        require(
            cardIds.length == names.length && 
            cardIds.length == rarities.length && 
            cardIds.length == ipfsUris.length,
            "Array length mismatch"
        );
        
        uint256[] memory tokenIds = new uint256[](cardIds.length);
        
        for (uint256 i = 0; i < cardIds.length; i++) {
            tokenIds[i] = mintCard(
                to,
                collection,
                cardIds[i],
                names[i],
                rarities[i],
                ipfsUris[i]
            );
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get card metadata
     */
    function getCardMetadata(uint256 tokenId) 
        public 
        view 
        returns (CardMetadata memory) 
    {
        require(_exists(tokenId), "Token does not exist");
        return tokenMetadata[tokenId];
    }
    
    /**
     * @dev Get all token IDs for a specific card
     */
    function getCardTokenIds(string memory cardId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return cardTokenIds[cardId];
    }
    
    /**
     * @dev Get total cards minted
     */
    function getTotalSupply() public view returns (uint256) {
        return tokenIdCounter.current();
    }
    
    /**
     * @dev Override tokenURI to return IPFS metadata
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_exists(tokenId), "Token does not exist");
        return tokenMetadata[tokenId].ipfsUri;
    }
}
