// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Marketplace
 * @dev P2P marketplace cho giao dịch thẻ Pokemon
 */
contract Marketplace is IERC721Receiver, ReentrancyGuard, Ownable {
    
    IERC721 public pokemonCardContract;

    // Revenue wallet (owner wallet)
    address payable public revenueWallet;
    
    // Listing ID counter
    uint256 private listingCounter;
    
    // Struct cho listing
    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
        uint256 createdAt;
    }
    
    // Mapping listing ID -> Listing
    mapping(uint256 => Listing) public listings;
    
    // Mapping user -> listingIds
    mapping(address => uint256[]) public userListings;
    
    // Mapping tokenId -> active listing
    mapping(uint256 => uint256) public tokenActiveListing;
    
    // Marketplace fee (2%)
    uint256 public constant MARKETPLACE_FEE_PERCENT = 2;
    
    // Platform revenue (accounting only; funds are forwarded immediately)
    uint256 public platformRevenue;
    
    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller
    );
    
    event CardSold(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 fee,
        uint256 timestamp
    );

    // ============ OFFER SYSTEM ============
    struct Offer {
        uint256 offerId;
        uint256 listingId;
        address offerer;
        uint256 amount;       // AVAX wei locked in contract
        bool active;
        uint256 createdAt;
    }

    uint256 private offerCounter;
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => uint256[]) public listingOffers; // listingId -> offerIds
    mapping(address => uint256[]) public userOffers;    // user -> offerIds

    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed offerer,
        uint256 amount,
        uint256 timestamp
    );

    event OfferCancelled(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed offerer,
        uint256 refundAmount
    );

    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address seller,
        address offerer,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );

    constructor(address _pokemonCardAddress) {
        pokemonCardContract = IERC721(_pokemonCardAddress);

        // Hardcoded owner/revenue wallet
        revenueWallet = payable(0x043fC8545b77D3f7846D39a98F5112Cf7D85797b);
        _transferOwnership(revenueWallet);
    }
    
    /**
     * @dev List card for sale
     * Seller phải approve contract trước
     */
    function listCard(uint256 tokenId, uint256 price) 
        public 
        returns (uint256) 
    {
        require(price > 0, "Price must be greater than 0");
        require(
            pokemonCardContract.ownerOf(tokenId) == msg.sender,
            "You don't own this card"
        );
        
        uint256 listingId = listingCounter++;
        
        Listing memory listing = Listing({
            listingId: listingId,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true,
            createdAt: block.timestamp
        });
        
        listings[listingId] = listing;
        userListings[msg.sender].push(listingId);
        tokenActiveListing[tokenId] = listingId;
        
        // Transfer NFT to contract
        pokemonCardContract.transferFrom(msg.sender, address(this), tokenId);
        
        emit ListingCreated(listingId, tokenId, msg.sender, price, block.timestamp);
        
        return listingId;
    }
    
    /**
     * @dev Buy card từ marketplace
     */
    function buyCard(uint256 listingId) 
        public 
        payable 
        nonReentrant 
    {
        Listing storage listing = listings[listingId];
        
        require(listing.active, "Listing not active");
        require(msg.value == listing.price, "Incorrect payment amount");
        require(msg.sender != listing.seller, "Seller cannot buy own card");
        
        // Calculate fee
        uint256 fee = (listing.price * MARKETPLACE_FEE_PERCENT) / 100;
        uint256 sellerAmount = listing.price - fee;
        
        // Update listing
        listing.active = false;
        
        // Transfer NFT to buyer
        pokemonCardContract.safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );
        
        // Transfer AVAX to seller
        (bool sellerSuccess, ) = listing.seller.call{value: sellerAmount}("");
        require(sellerSuccess, "Seller payment failed");

        // Transfer fee to owner wallet immediately
        (bool feeSuccess, ) = revenueWallet.call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        // Accounting only
        platformRevenue += fee;
        
        emit CardSold(
            listingId,
            listing.tokenId,
            msg.sender,
            listing.seller,
            listing.price,
            fee,
            block.timestamp
        );
    }
    
    /**
     * @dev Cancel listing
     */
    function cancelListing(uint256 listingId) 
        public 
        nonReentrant 
    {
        Listing storage listing = listings[listingId];
        
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Only seller can cancel");
        
        listing.active = false;
        
        // Transfer NFT back to seller
        pokemonCardContract.safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId
        );
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @dev Get all active listings
     */
    function getActiveListings() 
        public 
        view 
        returns (Listing[] memory) 
    {
        uint256 count = 0;
        
        for (uint256 i = 0; i < listingCounter; i++) {
            if (listings[i].active) {
                count++;
            }
        }
        
        Listing[] memory activeListings = new Listing[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < listingCounter; i++) {
            if (listings[i].active) {
                activeListings[index] = listings[i];
                index++;
            }
        }
        
        return activeListings;
    }
    
    /**
     * @dev Get user's active listings
     */
    function getUserListings(address user) 
        public 
        view 
        returns (Listing[] memory) 
    {
        uint256[] memory listingIds = userListings[user];
        Listing[] memory userActiveListings = new Listing[](listingIds.length);
        
        for (uint256 i = 0; i < listingIds.length; i++) {
            userActiveListings[i] = listings[listingIds[i]];
        }
        
        return userActiveListings;
    }
    
    /**
     * @dev Get platform revenue
     */
    function getPlatformRevenue() public view returns (uint256) {
        return platformRevenue;
    }
    
    /**
     * @dev Withdraw platform revenue
     */
    function withdrawRevenue() public onlyOwner nonReentrant {
        uint256 revenue = platformRevenue;
        require(revenue > 0, "No revenue to withdraw");
        
        platformRevenue = 0;
        
        // Funds are forwarded immediately in buyCard; this is kept for safety
        // in case the contract receives AVAX via `receive()`.
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = revenueWallet.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ============ OFFERS ============

    /**
     * @dev Đặt offer cho 1 listing. Buyer khoá AVAX trong contract.
     */
    function makeOffer(uint256 listingId)
        public
        payable
        nonReentrant
        returns (uint256)
    {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.value > 0, "Offer must be > 0");
        require(msg.sender != listing.seller, "Seller cannot offer own card");

        uint256 offerId = offerCounter++;
        offers[offerId] = Offer({
            offerId: offerId,
            listingId: listingId,
            offerer: msg.sender,
            amount: msg.value,
            active: true,
            createdAt: block.timestamp
        });
        listingOffers[listingId].push(offerId);
        userOffers[msg.sender].push(offerId);

        emit OfferMade(offerId, listingId, msg.sender, msg.value, block.timestamp);
        return offerId;
    }

    /**
     * @dev Buyer huỷ offer của mình → hoàn AVAX về ví.
     * Có thể gọi kể cả khi listing đã sold/cancelled (để rút tiền).
     */
    function cancelOffer(uint256 offerId) public nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.active, "Offer not active");
        require(offer.offerer == msg.sender, "Only offerer can cancel");

        uint256 refund = offer.amount;
        offer.active = false;
        offer.amount = 0;

        (bool ok, ) = msg.sender.call{value: refund}("");
        require(ok, "Refund failed");

        emit OfferCancelled(offerId, offer.listingId, msg.sender, refund);
    }

    /**
     * @dev Seller chấp nhận offer:
     *   - Chuyển NFT cho offerer
     *   - Chuyển AVAX (- fee) cho seller, fee cho owner
     *   - Đóng listing
     *   - Các offer khác vẫn active để offerer tự cancel rút tiền
     */
    function acceptOffer(uint256 offerId) public nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.active, "Offer not active");

        Listing storage listing = listings[offer.listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Only seller can accept");

        uint256 amount = offer.amount;
        uint256 fee = (amount * MARKETPLACE_FEE_PERCENT) / 100;
        uint256 sellerAmount = amount - fee;

        // Đóng offer + listing trước (CEI pattern)
        offer.active = false;
        offer.amount = 0;
        listing.active = false;

        // Transfer NFT cho offerer
        pokemonCardContract.safeTransferFrom(
            address(this),
            offer.offerer,
            listing.tokenId
        );

        // Trả AVAX cho seller
        (bool sOk, ) = listing.seller.call{value: sellerAmount}("");
        require(sOk, "Seller payment failed");

        // Trả fee cho revenue wallet
        (bool fOk, ) = revenueWallet.call{value: fee}("");
        require(fOk, "Fee transfer failed");

        platformRevenue += fee;

        emit OfferAccepted(
            offerId,
            listing.listingId,
            listing.tokenId,
            listing.seller,
            offer.offerer,
            amount,
            fee,
            block.timestamp
        );

        // Cũng emit CardSold để consumer cũ dễ track
        emit CardSold(
            listing.listingId,
            listing.tokenId,
            offer.offerer,
            listing.seller,
            amount,
            fee,
            block.timestamp
        );
    }

    /**
     * @dev Get all offer IDs của 1 listing
     */
    function getListingOffers(uint256 listingId)
        public
        view
        returns (uint256[] memory)
    {
        return listingOffers[listingId];
    }

    /**
     * @dev Get all offer IDs do user đặt
     */
    function getUserOffers(address user)
        public
        view
        returns (uint256[] memory)
    {
        return userOffers[user];
    }

    /**
     * @dev IERC721Receiver implementation
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    /**
     * @dev Fallback để nhận AVAX
     */
    receive() external payable {}
}
