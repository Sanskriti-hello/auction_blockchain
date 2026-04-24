// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Auction.sol";

contract AuctionTest is Test {
    Auction public auction;

    address public admin   = address(this);
    address public seller  = makeAddr("seller");
    address public bidder1 = makeAddr("bidder1");
    address public bidder2 = makeAddr("bidder2");

    uint256 constant REG_FEE  = 0.01 ether;
    uint256 constant BASE_FEE = 0.001 ether;

    function setUp() public {
        auction = new Auction();
        vm.deal(seller,  10 ether);
        vm.deal(bidder1, 10 ether);
        vm.deal(bidder2, 10 ether);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _registerAndVerifySeller() internal {
        vm.prank(seller);
        auction.registerAsSeller{value: REG_FEE}();
        auction.verifySeller(seller);
    }

    function _createAuction() internal returns (uint256 id) {
        _registerAndVerifySeller();
        vm.prank(seller);
        id = auction.createAuction("QmTest", 0.1 ether, 1 hours, 0.01 ether);
    }

    // ── seller registration ───────────────────────────────────────────────────

    function test_SellerRegistration() public {
        vm.prank(seller);
        auction.registerAsSeller{value: REG_FEE}();

        (bool isVerified, bool hasPaidFee, ) = auction.sellers(seller);
        assertFalse(isVerified);
        assertTrue(hasPaidFee);
        assertEq(auction.accumulatedFees(), REG_FEE);
    }

    function test_VerifySeller() public {
        _registerAndVerifySeller();
        assertTrue(auction.isVerifiedSeller(seller));
    }

    function test_RevokeSeller() public {
        _registerAndVerifySeller();
        auction.revokeSeller(seller);
        assertFalse(auction.isVerifiedSeller(seller));
    }

    function test_RevertIf_SellerRegistersAgain() public {
        vm.startPrank(seller);
        auction.registerAsSeller{value: REG_FEE}();
        vm.expectRevert(Auction.AlreadyRegistered.selector);
        auction.registerAsSeller{value: REG_FEE}();
        vm.stopPrank();
    }

    function test_RevertIf_UnverifiedSellerCreatesAuction() public {
        vm.prank(seller);
        auction.registerAsSeller{value: REG_FEE}();
        // NOT verified
        vm.prank(seller);
        vm.expectRevert(Auction.SellerNotVerified.selector);
        auction.createAuction("QmTest", 0.1 ether, 1 hours, 0.01 ether);
    }

    // ── auction creation ──────────────────────────────────────────────────────

    function test_CreateAuction() public {
        uint256 id = _createAuction();
        assertEq(id, 0);
        assertEq(auction.auctionCounter(), 1);

        (string memory cid, address s, , , , bool ended, ) = auction.getAuction(0);
        assertEq(cid, "QmTest");
        assertEq(s, seller);
        assertFalse(ended);
    }

    // ── bidding ───────────────────────────────────────────────────────────────

    function test_PlaceFirstBid() public {
        uint256 id  = _createAuction();
        uint256 fee = auction.buyerFee(id);

        vm.prank(bidder1);
        auction.placeBid{value: 0.1 ether + fee}(id);

        (, , uint256 highestBid, address highestBidder, , , ) = auction.getAuction(id);
        assertEq(highestBid,    0.1 ether);
        assertEq(highestBidder, bidder1);
    }

    function test_OutbidRefundsPreviousBidder() public {
        uint256 id  = _createAuction();
        uint256 fee = auction.buyerFee(id);

        vm.prank(bidder1);
        auction.placeBid{value: 0.1 ether + fee}(id);

        uint256 fee2 = auction.buyerFee(id); // fee may have increased
        vm.prank(bidder2);
        auction.placeBid{value: 0.15 ether + fee2}(id);

        assertEq(auction.pendingReturns(id, bidder1), 0.1 ether);
    }

    function test_WithdrawBid() public {
        uint256 id  = _createAuction();
        uint256 fee = auction.buyerFee(id);

        vm.prank(bidder1);
        auction.placeBid{value: 0.1 ether + fee}(id);

        uint256 fee2 = auction.buyerFee(id);
        vm.prank(bidder2);
        auction.placeBid{value: 0.15 ether + fee2}(id);

        uint256 balBefore = bidder1.balance;
        vm.prank(bidder1);
        auction.withdrawBid(id);
        assertEq(bidder1.balance, balBefore + 0.1 ether);
    }

    function test_RevertIf_BidBelowStartingPrice() public {
        uint256 id  = _createAuction();
        uint256 fee = auction.buyerFee(id);

        vm.prank(bidder1);
        vm.expectRevert(Auction.BidBelowStartingPrice.selector);
        auction.placeBid{value: 0.05 ether + fee}(id);
    }

    function test_RevertIf_SellerBids() public {
        uint256 id  = _createAuction();
        uint256 fee = auction.buyerFee(id);

        vm.prank(seller);
        vm.expectRevert(Auction.SellerCannotBid.selector);
        auction.placeBid{value: 0.1 ether + fee}(id);
    }

    // ── end & withdraw ────────────────────────────────────────────────────────

    function test_EndAuction() public {
        uint256 id = _createAuction();
        uint256 fee = auction.buyerFee(id);

        vm.prank(bidder1);
        auction.placeBid{value: 0.1 ether + fee}(id);

        // fast-forward past the end block
        vm.warp(block.timestamp + 1 hours + 1 minutes);
        auction.endAuction(id);

        (, , , , , bool ended, ) = auction.getAuction(id);
        assertTrue(ended);
        assertEq(auction.pendingReturns(id, seller), 0.1 ether);
    }

    function test_RevertIf_EndAuctionTooEarly() public {
        uint256 id = _createAuction();
        vm.expectRevert(Auction.AuctionNotYetEnded.selector);
        auction.endAuction(id);
    }

    // ── seller extension ──────────────────────────────────────────────────────

    function test_ExtendBySeller() public {
        uint256 id = _createAuction();
        (, , , , uint256 deadlineBefore, , ) = auction.getAuction(id);

        vm.prank(seller);
        auction.extendBySeller(id, 60);

        (, , , , uint256 deadlineAfter, , ) = auction.getAuction(id);
        assertEq(deadlineAfter, deadlineBefore + 60);
    }

    function test_RevertIf_ExtendExceedsCap() public {
        uint256 id = _createAuction();
        // 20% of 1 hour = 720 seconds
        vm.prank(seller);
        vm.expectRevert(Auction.ExceedsMaxSellerExtension.selector);
        auction.extendBySeller(id, 721);
    }

    // ── admin fees ────────────────────────────────────────────────────────────

    function test_UpdateFees() public {
        auction.updateFees(0.02 ether, 0.002 ether);
        assertEq(auction.sellerRegistrationFee(), 0.02 ether);
        assertEq(auction.baseBuyerFee(), 0.002 ether);
    }

    function test_WithdrawFees() public {
        vm.prank(seller);
        auction.registerAsSeller{value: REG_FEE}();

        uint256 balBefore = address(this).balance;
        auction.withdrawFees();
        assertEq(address(this).balance, balBefore + REG_FEE);
        assertEq(auction.accumulatedFees(), 0);
    }

    function test_RevertIf_NonAdminVerifies() public {
        vm.prank(seller);
        auction.registerAsSeller{value: REG_FEE}();

        vm.prank(bidder1);
        vm.expectRevert(Auction.NotOwner.selector);
        auction.verifySeller(seller);
    }

    // allow test contract to receive ETH
    receive() external payable {}
}
