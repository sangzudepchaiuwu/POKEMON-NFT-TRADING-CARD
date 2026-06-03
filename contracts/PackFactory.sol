// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IPokemonCard {
    function mintCard(
        address to,
        string memory collection,
        string memory cardId,
        string memory name,
        string memory rarity,
        string memory ipfsUri
    ) external returns (uint256);

    function batchMint(
        address to,
        string memory collection,
        string[] memory cardIds,
        string[] memory names,
        string[] memory rarities,
        string[] memory ipfsUris
    ) external returns (uint256[] memory);
}

/**
 * @title PackFactory
 * @dev Contract quản lý việc mua pack và random card generation
 */
contract PackFactory is Ownable, ReentrancyGuard {
    
    IPokemonCard public pokemonCardContract;

    // Revenue wallet (owner wallet)
    address payable public revenueWallet;
    
    // Pack pricing (in wei, 1 AVAX = 10^18 wei)
    mapping(string => uint256) public packPrices;
    
    // Struct cho pack
    struct Pack {
        uint256 packId;
        string collection;
        address buyer;
        uint256 purchaseTime;
        uint256[] cardTokenIds;
        bool opened;
    }
    
    // Mapping user -> packs
    mapping(address => Pack[]) public userPacks;
    
    // Số thẻ mỗi pack (giảm = ít NFT/batch → explorer index ổn định hơn)
    uint256 public cardsPerPack;

    // Total packs sold
    uint256 public totalPacksSold;
    
    // Revenue tracking
    uint256 public totalRevenue;
    
    // Rarity weights (percentages * 100 for precision)
    struct RarityWeight {
        string rarity;
        uint256 weight;
    }
    
    mapping(string => RarityWeight[]) public rarityWeights;
    
    // Card pools (backend-managed, stored here for reference)
    mapping(string => mapping(string => string[])) public cardPools;
    
    event PackPurchased(
        uint256 indexed packId,
        address indexed buyer,
        string collection,
        uint256 price,
        uint256 timestamp
    );
    
    event PackOpened(
        uint256 indexed packId,
        address indexed owner,
        uint256[] cardTokenIds
    );
    
    event PriceUpdated(string collection, uint256 newPrice);
    
    constructor(address _pokemonCardAddress) {
        pokemonCardContract = IPokemonCard(_pokemonCardAddress);

        // Hardcoded owner/revenue wallet
        revenueWallet = payable(0x043fC8545b77D3f7846D39a98F5112Cf7D85797b);
        _transferOwnership(revenueWallet);

        cardsPerPack = 5;
        
        // Initialize default prices (0.5 AVAX)
        packPrices["NEO"] = 0.5 ether;
        packPrices["SWSH"] = 0.5 ether;
        
        // Initialize rarity weights for NEO
        rarityWeights["NEO"].push(RarityWeight("Common", 7500));
        rarityWeights["NEO"].push(RarityWeight("Uncommon", 2000));
        rarityWeights["NEO"].push(RarityWeight("Rare", 500));
        
        // Initialize rarity weights for SWSH
        rarityWeights["SWSH"].push(RarityWeight("Common", 5000));
        rarityWeights["SWSH"].push(RarityWeight("Uncommon", 2500));
        rarityWeights["SWSH"].push(RarityWeight("Rare", 1300));
        rarityWeights["SWSH"].push(RarityWeight("Holo Rare", 600));
        rarityWeights["SWSH"].push(RarityWeight("Holo Rare V", 350));
        rarityWeights["SWSH"].push(RarityWeight("Holo Rare VMAX", 120));
        rarityWeights["SWSH"].push(RarityWeight("Ultra Rare", 80));
        rarityWeights["SWSH"].push(RarityWeight("Secret Rare", 50));
    }
    
    /**
     * @dev Buy pack
     * Yêu cầu gửi đúng số AVAX
     */
    function buyPack(string memory collection) 
        public 
        payable 
        nonReentrant 
        returns (uint256) 
    {
        require(msg.value == packPrices[collection], "Incorrect payment amount");
        require(bytes(collection).length > 0, "Collection name required");
        
        uint256 packId = totalPacksSold++;
        
        Pack memory newPack = Pack({
            packId: packId,
            collection: collection,
            buyer: msg.sender,
            purchaseTime: block.timestamp,
            cardTokenIds: new uint256[](0),
            opened: false
        });
        
        userPacks[msg.sender].push(newPack);
        totalRevenue += msg.value;

        // Forward AVAX immediately to owner wallet
        (bool success, ) = revenueWallet.call{value: msg.value}("");
        require(success, "Payment transfer failed");
        
        emit PackPurchased(packId, msg.sender, collection, msg.value, block.timestamp);
        
        return packId;
    }
    
    /**
     * @dev Open pack - mint cards vào user inventory
     * Lưu ý: Hàm này sẽ được gọi từ backend sau khi random cards
     * Backend sẽ call hàm này với danh sách cards đã chọn
     */
    function openPack(
        address owner,
        uint256 packIndex,
        string[] memory cardIds,
        string[] memory names,
        string[] memory rarities,
        string[] memory ipfsUris
    ) 
        public 
        onlyOwner 
        nonReentrant 
        returns (uint256[] memory) 
    {
        require(packIndex < userPacks[owner].length, "Invalid pack index");
        require(!userPacks[owner][packIndex].opened, "Pack already opened");
        require(cardIds.length == cardsPerPack, "Invalid pack size");
        
        Pack storage pack = userPacks[owner][packIndex];
        
        // Mint cards
        uint256[] memory tokenIds = pokemonCardContract.batchMint(
            owner,
            pack.collection,
            cardIds,
            names,
            rarities,
            ipfsUris
        );
        
        pack.cardTokenIds = tokenIds;
        pack.opened = true;
        
        emit PackOpened(pack.packId, owner, tokenIds);
        
        return tokenIds;
    }

    /**
     * @dev Đánh dấu pack đã mở (trước khi mint từng lá riêng — explorer index ổn hơn)
     */
    function markPackOpened(address owner, uint256 packIndex) public onlyOwner {
        require(packIndex < userPacks[owner].length, "Invalid pack index");
        require(!userPacks[owner][packIndex].opened, "Pack already opened");
        userPacks[owner][packIndex].opened = true;
    }

    /**
     * @dev Mint 1 lá cho pack đã mở (gọi nhiều lần, mỗi tx cách nhau vài giây)
     */
    function mintPackCard(
        address owner,
        uint256 packIndex,
        string memory collection,
        string memory cardId,
        string memory name,
        string memory rarity,
        string memory ipfsUri
    ) public onlyOwner returns (uint256) {
        require(packIndex < userPacks[owner].length, "Invalid pack index");
        require(userPacks[owner][packIndex].opened, "Pack not opened");
        uint256 tokenId = pokemonCardContract.mintCard(
            owner,
            collection,
            cardId,
            name,
            rarity,
            ipfsUri
        );
        userPacks[owner][packIndex].cardTokenIds.push(tokenId);
        return tokenId;
    }
    
    /**
     * @dev Update pack price
     */
    function setPackPrice(string memory collection, uint256 newPrice) 
        public 
        onlyOwner 
    {
        packPrices[collection] = newPrice;
        emit PriceUpdated(collection, newPrice);
    }
    
    /**
     * @dev Get user's packs
     */
    function getUserPacks(address user) 
        public 
        view 
        returns (Pack[] memory) 
    {
        return userPacks[user];
    }
    
    /**
     * @dev Get pack by index
     */
    function getPack(address user, uint256 index) 
        public 
        view 
        returns (Pack memory) 
    {
        require(index < userPacks[user].length, "Invalid pack index");
        return userPacks[user][index];
    }
    
    /**
     * @dev Withdraw revenue
     */
    function withdraw() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = revenueWallet.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Fallback để nhận AVAX
     */
    receive() external payable {}
}
