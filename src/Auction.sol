// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Auction is ReentrancyGuard {

    // -------------------------------------------------------------------------
    //  Constants
    // -------------------------------------------------------------------------

    uint256 public constant EXTENSION_TIME        = 3 minutes;
    uint256 public constant MAX_EXTENSIONS        = 5;
    uint256 public constant MAX_EXTENSION_PERCENT = 20;
    uint256 public constant TIMESTAMP_BUFFER      = 15 seconds;
    uint256 public constant MIN_DURATION          = 10 minutes;

    // -------------------------------------------------------------------------
    //  Custom Errors
    // -------------------------------------------------------------------------

    error AuctionNotExist();
    error AuctionAlreadyFinalized();
    error StartingPriceMustBePositive();
    error IncrementMustBePositive();
    error DurationTooShort();
    error DurationTooLong();
    error AuctionExpired();
    error SellerCannotBid();
    error AlreadyHighestBidder();
    error BidBelowStartingPrice();
    error BidTooLow();
    error MustSendMoreThanFee();
    error OnlySellerCanExtend();
    error ExtensionMustBePositive();
    error ExceedsMaxSellerExtension();
    error AuctionNotYetEnded();
    error CurrentWinnerCannotWithdraw();
    error NothingToWithdraw();
    error ETHTransferFailed();
    error NotOwner();
    error AlreadyRegistered();
    error InsufficientRegistrationFee();
    error SellerNotPaidFee();
    error SellerNotVerified();
    error NotCurrentlyVerified();
    error NoFeesToWithdraw();

    // -------------------------------------------------------------------------
    //  Structs
    // -------------------------------------------------------------------------

    struct AuctionDetails {
        // Slot 0
        address seller;
        uint8   extensionCount;
        uint32  sellerExtendedTime;
        bool    ended;
        bool    exists;
        // Slot 1
        uint256 startingPrice;
        // Slot 2
        uint256 highestBid;
        // Slot 3
        address highestBidder;
        // Slot 4
        uint40  deadline;
        uint32  duration;
        uint128 minIncrement;
        // Slot 5
        string  metadataCID;
        // Slot 6
        uint256 numBidders;
    }

    struct SellerInfo {
        bool    isVerified;
        bool    hasPaidFee;
        uint256 registeredAt;
    }

    // -------------------------------------------------------------------------
    //  State
    // -------------------------------------------------------------------------

    address public owner;

    mapping(uint256 => AuctionDetails)              public auctions;
    uint256                                          public auctionCounter;
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;
    mapping(uint256 => mapping(address => bool))    private _hasBid;

    mapping(address => SellerInfo) public sellers;

    uint256 public sellerRegistrationFee = 0.01 ether;
    uint256 public baseBuyerFee          = 0.001 ether;
    uint256 public accumulatedFees;

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    //  Modifiers
    // -------------------------------------------------------------------------

    modifier auctionExists(uint256 auctionId) {
        if (!auctions[auctionId].exists) revert AuctionNotExist();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // -------------------------------------------------------------------------
    //  Constructor
    // -------------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    //  Seller Registration
    // -------------------------------------------------------------------------

    function registerAsSeller() external payable {
        if (sellers[msg.sender].hasPaidFee)      revert AlreadyRegistered();
        if (msg.value < sellerRegistrationFee)   revert InsufficientRegistrationFee();
        sellers[msg.sender].hasPaidFee   = true;
        sellers[msg.sender].registeredAt = block.timestamp;
        accumulatedFees                 += msg.value;
        emit SellerRegistered(msg.sender, msg.value);
    }

    function verifySeller(address sellerAddr) external onlyOwner {
        if (!sellers[sellerAddr].hasPaidFee) revert SellerNotPaidFee();
        sellers[sellerAddr].isVerified = true;
        emit SellerVerified(sellerAddr);
    }

    function revokeSeller(address sellerAddr) external onlyOwner {
        if (!sellers[sellerAddr].isVerified) revert NotCurrentlyVerified();
        sellers[sellerAddr].isVerified = false;
        emit SellerRevoked(sellerAddr);
    }

    function isVerifiedSeller(address sellerAddr) external view returns (bool) {
        return sellers[sellerAddr].isVerified;
    }

    // -------------------------------------------------------------------------
    //  Create Auction
    // -------------------------------------------------------------------------

    function createAuction(
        string  calldata metadataCID,
        uint256          startingPrice,
        uint256          durationSeconds,
        uint256          minIncrement
    ) external returns (uint256) {
        if (!sellers[msg.sender].isVerified)     revert SellerNotVerified();
        if (startingPrice  == 0)                 revert StartingPriceMustBePositive();
        if (minIncrement   == 0)                 revert IncrementMustBePositive();
        if (durationSeconds <  MIN_DURATION)     revert DurationTooShort();
        if (durationSeconds >  1 days)           revert DurationTooLong();

        uint256 auctionId = auctionCounter++;
        uint40  deadline  = uint40(block.timestamp + durationSeconds);

        auctions[auctionId] = AuctionDetails({
            metadataCID:        metadataCID,
            seller:             msg.sender,
            startingPrice:      startingPrice,
            highestBid:         startingPrice,
            highestBidder:      address(0),
            deadline:           deadline,
            duration:           uint32(durationSeconds),
            minIncrement:       uint128(minIncrement),
            extensionCount:     0,
            sellerExtendedTime: 0,
            numBidders:         0,
            ended:              false,
            exists:             true
        });

        emit AuctionCreated(auctionId, metadataCID, startingPrice, deadline);
        return auctionId;
    }

    // -------------------------------------------------------------------------
    //  Place Bid
    // -------------------------------------------------------------------------

    function placeBid(uint256 _auctionId)
        external
        payable
        auctionExists(_auctionId)
    {
        AuctionDetails storage auction = auctions[_auctionId];

        if (auction.ended)                         revert AuctionAlreadyFinalized();
        uint40 deadline_ = auction.deadline;
        if (block.timestamp >= deadline_)          revert AuctionExpired();
        if (msg.sender == auction.seller)          revert SellerCannotBid();
        if (msg.sender == auction.highestBidder)   revert AlreadyHighestBidder();

        // Deduct fee
        uint256 fee    = buyerFee(_auctionId);
        if (msg.value <= fee)                      revert MustSendMoreThanFee();
        uint256 netBid = msg.value - fee;
        accumulatedFees += fee;

        address prevBidder = auction.highestBidder;
        if (prevBidder == address(0)) {
            if (netBid < auction.startingPrice)    revert BidBelowStartingPrice();
        } else {
            if (netBid < auction.highestBid + auction.minIncrement) revert BidTooLow();
            pendingReturns[_auctionId][prevBidder] += auction.highestBid;
        }

        // Track unique bidders
        if (!_hasBid[_auctionId][msg.sender]) {
            _hasBid[_auctionId][msg.sender] = true;
            auction.numBidders++;
        }

        // Anti-snipe
        if (deadline_ - block.timestamp < EXTENSION_TIME && auction.extensionCount < MAX_EXTENSIONS) {
            deadline_             += uint40(EXTENSION_TIME);
            auction.deadline       = deadline_;
            auction.extensionCount++;
            emit AuctionExtended(_auctionId, deadline_, "Anti-sniping auto-extension");
        }

        auction.highestBidder = msg.sender;
        auction.highestBid    = netBid;
        emit BidPlaced(_auctionId, msg.sender, netBid);
    }

    // -------------------------------------------------------------------------
    //  Seller Extension
    // -------------------------------------------------------------------------

    function extendBySeller(uint256 _auctionId, uint256 extraTime)
        external
        auctionExists(_auctionId)
    {
        AuctionDetails storage a = auctions[_auctionId];

        if (a.ended)                       revert AuctionAlreadyFinalized();
        if (msg.sender != a.seller)        revert OnlySellerCanExtend();
        if (block.timestamp >= a.deadline) revert AuctionExpired();
        if (extraTime == 0)                revert ExtensionMustBePositive();

        uint32 alreadyExtended = a.sellerExtendedTime;
        if (alreadyExtended + uint32(extraTime) > (uint32(a.duration) * MAX_EXTENSION_PERCENT) / 100)
            revert ExceedsMaxSellerExtension();

        a.deadline           += uint40(extraTime);
        a.sellerExtendedTime  = alreadyExtended + uint32(extraTime);
        emit AuctionExtended(_auctionId, a.deadline, "Seller manual extension");
    }

    // -------------------------------------------------------------------------
    //  End Auction
    // -------------------------------------------------------------------------

    function endAuction(uint256 _auctionId)
        external
        auctionExists(_auctionId)
    {
        AuctionDetails storage a = auctions[_auctionId];

        if (a.ended) revert AuctionAlreadyFinalized();
        if (block.timestamp < uint256(a.deadline) + TIMESTAMP_BUFFER) revert AuctionNotYetEnded();

        a.ended = true;

        address winner = a.highestBidder;
        if (winner != address(0)) {
            pendingReturns[_auctionId][a.seller] += a.highestBid;
        }

        emit AuctionEnded(_auctionId, winner, a.highestBid);
    }

    // -------------------------------------------------------------------------
    //  Withdraw
    // -------------------------------------------------------------------------

    function withdrawBid(uint256 auctionId)
        external
        nonReentrant
        auctionExists(auctionId)
    {
        AuctionDetails storage a = auctions[auctionId];
        if (msg.sender == a.highestBidder && !a.ended) revert CurrentWinnerCannotWithdraw();

        uint256 amount = pendingReturns[auctionId][msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingReturns[auctionId][msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert ETHTransferFailed();

        emit BidWithdrawn(auctionId, msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    //  Admin Fee Management
    // -------------------------------------------------------------------------

    function updateFees(uint256 newSellerFee, uint256 newBuyerFee) external onlyOwner {
        sellerRegistrationFee = newSellerFee;
        baseBuyerFee          = newBuyerFee;
        emit FeesUpdated(newSellerFee, newBuyerFee);
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert NoFeesToWithdraw();
        accumulatedFees = 0;
        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert ETHTransferFailed();
        emit FeesWithdrawn(owner, amount);
    }

    // -------------------------------------------------------------------------
    //  Views
    // -------------------------------------------------------------------------

    function buyerFee(uint256 auctionId) public view auctionExists(auctionId) returns (uint256) {
        return baseBuyerFee + (auctions[auctionId].numBidders * 0.0001 ether);
    }

    function minimumBidTotal(uint256 auctionId) external view auctionExists(auctionId) returns (uint256) {
        AuctionDetails storage a = auctions[auctionId];
        uint256 fee = buyerFee(auctionId);
        if (a.highestBidder == address(0)) return a.startingPrice + fee;
        return a.highestBid + a.minIncrement + fee;
    }

    function getAuction(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (
            string  memory metadataCID,
            address        seller,
            uint256        highestBid,
            address        highestBidder,
            uint256        deadline,
            bool           ended,
            uint256        numBidders
        )
    {
        AuctionDetails storage a = auctions[auctionId];
        return (a.metadataCID, a.seller, a.highestBid, a.highestBidder, a.deadline, a.ended, a.numBidders);
    }

    function timeRemaining(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (uint256)
    {
        uint40 dl = auctions[auctionId].deadline;
        if (block.timestamp >= dl) return 0;
        return dl - block.timestamp;
    }
}