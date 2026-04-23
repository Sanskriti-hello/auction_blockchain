// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; 
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/ReentrancyGuard.sol";

contract Auction is ReentrancyGuard {
    struct AuctionDetails {
        string itemName;
        address seller;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 deadline;       
        uint256 endBlock;      
        uint256 duration;
        uint256 minIncrement;
        uint256 extensionCount;
        uint256 sellerExtendedTime;
        bool ended;
        bool exists;            
    }

    mapping(uint256 => AuctionDetails) public auctions;
    uint256 public auctionCounter;
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    uint256 public constant EXTENSION_TIME = 2 minutes;
    uint256 public constant MAX_EXTENSIONS = 5;
    uint256 public constant MAX_EXTENSION_PERCENT = 20;

    event AuctionCreated(uint256 indexed auctionId, string itemName, uint256 startingPrice, uint256 deadline);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionExtended(uint256 indexed auctionId, uint256 newDeadline, string reason);

    function createAuction(
        string memory itemName,
        uint256 startingPrice,
        uint256 durationSeconds,
        uint256 minIncrement
    ) external returns (uint256) {
        require(startingPrice > 0, "Starting price must be > 0");
        require(minIncrement > 0, "Increment must be > 0");
        require(durationSeconds >= 1 minutes, "Duration must be at least 1 minute");
        require(durationSeconds <= 1 days, "Duration cannot exceed 24 hours");

        uint256 auctionId = auctionCounter++;
        uint256 blocks = durationSeconds / 12;

        auctions[auctionId] = AuctionDetails({
            itemName: itemName,
            seller: msg.sender,
            startingPrice: startingPrice,
            highestBid: startingPrice,
            highestBidder: address(0),
            deadline: block.timestamp + durationSeconds,
            endBlock: block.number + blocks,
            duration: durationSeconds,
            minIncrement: minIncrement,
            extensionCount: 0,
            sellerExtendedTime: 0,
            ended: false,
            exists: true
        });

        emit AuctionCreated(auctionId, itemName, startingPrice, block.timestamp + durationSeconds);
        return auctionId;
    }

    function placeBid(uint256 _auctionId) external payable {
        require(auctions[_auctionId].exists, "Auction does not exist");
        AuctionDetails storage auction = auctions[_auctionId];

        require(block.number < auction.endBlock, "Auction has already ended");
        require(!auction.ended, "Auction is already finalized");
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(msg.sender != auction.highestBidder, "Already highest bidder");

        if (auction.highestBidder == address(0)) {
            require(msg.value >= auction.startingPrice, "Bid below starting price");
        } else {
            uint256 minRequired = auction.highestBid + auction.minIncrement;
            require(msg.value >= minRequired, "Bid must be at least increment higher");
            pendingReturns[_auctionId][auction.highestBidder] += auction.highestBid;
        }
        
        if (block.number < auction.endBlock && (auction.deadline - block.timestamp) < EXTENSION_TIME && auction.extensionCount < MAX_EXTENSIONS) {
            auction.deadline += EXTENSION_TIME; 
            auction.endBlock += (EXTENSION_TIME / 12);
            auction.extensionCount++;
            emit AuctionExtended(_auctionId, auction.deadline, "Anti-sniping auto-extension");
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }

    function extendBySeller(uint256 _auctionId, uint256 extraTime) external {
        require(auctions[_auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[_auctionId];
        
        require(msg.sender == a.seller, "Only seller can extend");
        require(block.number < a.endBlock, "Auction already ended");
        require(!a.ended, "Auction is finalized");
        require(extraTime > 0, "Invalid extension");

        uint256 maxAllowedExtension = (a.duration * MAX_EXTENSION_PERCENT) / 100;
        require(a.sellerExtendedTime + extraTime <= maxAllowedExtension, "Exceeds allowed extension");

        a.deadline += extraTime;
        a.endBlock += (extraTime / 12);
        a.sellerExtendedTime += extraTime;
        
        emit AuctionExtended(_auctionId, a.deadline, "Seller manual extension");
    }

    function endAuction(uint256 _auctionId) external {
        require(auctions[_auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[_auctionId];

        require(block.number >= a.endBlock, "Auction is still active");
        require(!a.ended, "Auction already ended");

        a.ended = true;
        uint256 finalAmount = 0;

        if (a.highestBidder != address(0)) {
            pendingReturns[_auctionId][a.seller] += a.highestBid;
            finalAmount = a.highestBid;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, finalAmount);
    }

    function withdrawBid(uint256 auctionId) external nonReentrant {
        require(auctions[auctionId].exists, "Auction does not exist");
        AuctionDetails storage a = auctions[auctionId];

        require(!(msg.sender == a.highestBidder && !a.ended), "Winner cannot withdraw");
        uint256 amount = pendingReturns[auctionId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[auctionId][msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit BidWithdrawn(auctionId, msg.sender, amount);
    }

    function getAuction(uint256 auctionId) external view returns (string memory itemName, address seller, uint256 highestBid, address highestBidder, uint256 deadline, bool ended) {
        require(auctions[auctionId].exists, "Invalid auction ID");
        AuctionDetails storage a = auctions[auctionId];
        return (a.itemName, a.seller, a.highestBid, a.highestBidder, a.deadline, a.ended);
    }
}