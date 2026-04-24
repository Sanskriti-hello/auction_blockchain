// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Auction — CS218 Decentralised Auction DApp
/// @notice Supports seller registration/verification, IPFS metadata, dynamic
///         buyer fees, anti-sniping extensions, and admin fee management.
contract Auction is ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────────────────────────────────

    struct AuctionDetails {
        string   metadataCID;       // IPFS CID for name/image/description JSON
        address  seller;
        uint256  startingPrice;
        uint256  highestBid;
        address  highestBidder;
        uint256  deadline;          // unix timestamp
        uint256  endBlock;          // block-number gate (anti-manipulation)
        uint256  duration;          // original duration in seconds
        uint256  minIncrement;      // minimum raise in wei
        uint256  extensionCount;    // auto-extensions so far
        uint256  sellerExtendedTime;// total time seller has added
        uint256  numBidders;        // unique bidder count (for fee scaling)
        bool     ended;
        bool     exists;
    }

    struct SellerInfo {
        bool    isVerified;
        bool    hasPaidFee;
        uint256 registeredAt;
    }

    address public owner;

    mapping(uint256 => AuctionDetails)              public auctions;
    uint256                                          public auctionCounter;
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;
    mapping(uint256 => mapping(address => bool))    private _hasBid;

    mapping(address => SellerInfo) public sellers;

    uint256 public sellerRegistrationFee = 0.01 ether;
    uint256 public baseBuyerFee          = 0.001 ether;
    uint256 public accumulatedFees;

    // ─────────────────────────────────────────────────────────────────────────
    //  Constants
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public constant EXTENSION_TIME       = 2 minutes;
    uint256 public constant MAX_EXTENSIONS       = 5;
    uint256 public constant MAX_EXTENSION_PERCENT = 20;

    // ─────────────────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────────────────

    event AuctionCreated(uint256 indexed auctionId, string metadataCID, uint256 startingPrice, uint256 deadline);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionExtended(uint256 indexed auctionId, uint256 newDeadline, string reason);
    event SellerRegistered(address indexed seller, uint256 feePaid);
    event SellerVerified(address indexed seller);
    event SellerRevoked(address indexed seller);
    event FeesUpdated(uint256 newSellerFee, uint256 newBuyerFee);
    event FeesWithdrawn(address indexed admin, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Seller registration
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Pay the registration fee to become a seller candidate.
    function registerAsSeller() external payable {
        require(!sellers[msg.sender].hasPaidFee,  "Already registered");
        require(msg.value >= sellerRegistrationFee, "Insufficient registration fee");

        sellers[msg.sender].hasPaidFee    = true;
        sellers[msg.sender].registeredAt  = block.timestamp;
        accumulatedFees                  += msg.value;

        emit SellerRegistered(msg.sender, msg.value);
    }

    /// @notice Admin approves a seller.
    function verifySeller(address sellerAddr) external onlyOwner {
        require(sellers[sellerAddr].hasPaidFee, "Seller has not paid registration fee");
        sellers[sellerAddr].isVerified = true;
        emit SellerVerified(sellerAddr);
    }

    /// @notice Admin revokes a seller.
    function revokeSeller(address sellerAddr) external onlyOwner {
        require(sellers[sellerAddr].isVerified, "Not currently verified");
        sellers[sellerAddr].isVerified = false;
        emit SellerRevoked(sellerAddr);
    }

    /// @notice Convenience view used by the frontend.
    function isVerifiedSeller(address sellerAddr) external view returns (bool) {
        return sellers[sellerAddr].isVerified;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Auction lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Create a new auction. Caller must be a verified seller.
    function createAuction(
        string  memory metadataCID,
        uint256        startingPrice,
        uint256        durationSeconds,
        uint256        minIncrement
    ) external returns (uint256) {
        require(sellers[msg.sender].isVerified, "Seller not verified by admin");
        require(startingPrice  > 0,           "Starting price must be > 0");
        require(minIncrement   > 0,           "Increment must be > 0");
        require(durationSeconds >= 1 minutes, "Duration must be at least 1 minute");
        require(durationSeconds <= 1 days,    "Duration cannot exceed 24 hours");

        uint256 auctionId = auctionCounter++;
        uint256 blocks    = durationSeconds / 12;

        auctions[auctionId] = AuctionDetails({
            metadataCID:       metadataCID,
            seller:            msg.sender,
            startingPrice:     startingPrice,
            highestBid:        startingPrice,
            highestBidder:     address(0),
            deadline:          block.timestamp + durationSeconds,
            endBlock:          block.number    + blocks,
            duration:          durationSeconds,
            minIncrement:      minIncrement,
            extensionCount:    0,
            sellerExtendedTime:0,
            numBidders:        0,
            ended:             false,
            exists:            true
        });

        emit AuctionCreated(auctionId, metadataCID, startingPrice, block.timestamp + durationSeconds);
        return auctionId;
    }

    /// @notice Place a bid. msg.value must cover the participation fee + bid amount.
    function placeBid(uint256 _auctionId) external payable {
        require(auctions[_auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[_auctionId];

        require(block.number < a.endBlock,  "Auction has already ended");
        require(!a.ended,                   "Auction is already finalized");
        require(msg.sender != a.seller,     "Seller cannot bid");
        require(msg.sender != a.highestBidder, "Already highest bidder");

        // Dynamic fee: baseBuyerFee + 0.0001 ETH per extra bidder
        uint256 fee      = buyerFee(_auctionId);
        uint256 netBid   = msg.value - fee;
        accumulatedFees += fee;

        require(netBid > 0, "Must send more than the participation fee");

        if (a.highestBidder == address(0)) {
            require(netBid >= a.startingPrice, "Bid below starting price");
        } else {
            uint256 minRequired = a.highestBid + a.minIncrement;
            require(netBid >= minRequired, "Bid must be at least increment higher");
            pendingReturns[_auctionId][a.highestBidder] += a.highestBid;
        }

        // Track unique bidders
        if (!_hasBid[_auctionId][msg.sender]) {
            _hasBid[_auctionId][msg.sender] = true;
            a.numBidders++;
        }

        // Anti-sniping: extend if bid lands in last EXTENSION_TIME window
        if (
            block.number < a.endBlock &&
            (a.deadline - block.timestamp) < EXTENSION_TIME &&
            a.extensionCount < MAX_EXTENSIONS
        ) {
            a.deadline    += EXTENSION_TIME;
            a.endBlock    += (EXTENSION_TIME / 12);
            a.extensionCount++;
            emit AuctionExtended(_auctionId, a.deadline, "Anti-sniping auto-extension");
        }

        a.highestBidder = msg.sender;
        a.highestBid    = netBid;
        emit BidPlaced(_auctionId, msg.sender, netBid);
    }

    /// @notice Seller can manually extend within the 20 % cap.
    function extendBySeller(uint256 _auctionId, uint256 extraTime) external {
        require(auctions[_auctionId].exists,    "Auction does not exist");
        AuctionDetails storage a = auctions[_auctionId];

        require(msg.sender == a.seller,          "Only seller can extend");
        require(block.number < a.endBlock,       "Auction already ended");
        require(!a.ended,                        "Auction is finalized");
        require(extraTime > 0,                   "Invalid extension");

        uint256 maxAllowed = (a.duration * MAX_EXTENSION_PERCENT) / 100;
        require(a.sellerExtendedTime + extraTime <= maxAllowed, "Exceeds allowed extension");

        a.deadline          += extraTime;
        a.endBlock          += (extraTime / 12);
        a.sellerExtendedTime += extraTime;

        emit AuctionExtended(_auctionId, a.deadline, "Seller manual extension");
    }

    /// @notice Finalise an auction after the block deadline has passed.
    function endAuction(uint256 _auctionId) external {
        require(auctions[_auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[_auctionId];

        require(block.number >= a.endBlock, "Auction is still active");
        require(!a.ended,                   "Auction already ended");

        a.ended = true;

        uint256 finalAmount = 0;
        if (a.highestBidder != address(0)) {
            pendingReturns[_auctionId][a.seller] += a.highestBid;
            finalAmount = a.highestBid;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, finalAmount);
    }

    /// @notice Withdraw a pending return (outbid amount or seller proceeds).
    function withdrawBid(uint256 auctionId) external nonReentrant {
        require(auctions[auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[auctionId];

        require(!(msg.sender == a.highestBidder && !a.ended), "Winner cannot withdraw");

        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[auctionId][msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");

        emit BidWithdrawn(auctionId, msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Admin fee management
    // ─────────────────────────────────────────────────────────────────────────

    function updateFees(uint256 newSellerFee, uint256 newBuyerFee) external onlyOwner {
        sellerRegistrationFee = newSellerFee;
        baseBuyerFee          = newBuyerFee;
        emit FeesUpdated(newSellerFee, newBuyerFee);
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "Transfer failed");
        emit FeesWithdrawn(owner, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Views
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns the participation fee for a given auction (scales with bidder count).
    function buyerFee(uint256 auctionId) public view returns (uint256) {
        require(auctions[auctionId].exists, "Auction does not exist");
        uint256 extra = auctions[auctionId].numBidders * 0.0001 ether;
        return baseBuyerFee + extra;
    }

    /// @notice Minimum total ETH (fee + bid) required to beat the current highest bid.
    function minimumBidTotal(uint256 auctionId) external view returns (uint256) {
        require(auctions[auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[auctionId];
        uint256 fee = buyerFee(auctionId);
        if (a.highestBidder == address(0)) {
            return a.startingPrice + fee;
        }
        return a.highestBid + a.minIncrement + fee;
    }

    /// @notice Full auction data for the frontend.
    function getAuction(uint256 auctionId) external view returns (
        string  memory metadataCID,
        address        seller,
        uint256        highestBid,
        address        highestBidder,
        uint256        deadline,
        bool           ended,
        uint256        numBidders
    ) {
        require(auctions[auctionId].exists, "Invalid auction ID");
        AuctionDetails storage a = auctions[auctionId];
        return (
            a.metadataCID,
            a.seller,
            a.highestBid,
            a.highestBidder,
            a.deadline,
            a.ended,
            a.numBidders
        );
    }
}
