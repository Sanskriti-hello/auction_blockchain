// src/config/contract.js
// ─────────────────────────────────────────────────────────────────────────────
// Update CONTRACT_ADDRESSES after each deploy.
// Chain IDs: Anvil = 31337 | Sepolia = 11155111 | Mainnet = 1
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRACT_ADDRESSES = {
  31337:    "0x5FbDB2315678afecb367f032d93F642f64180aa3", // default first Anvil deploy
  11155111: "0xYOUR_SEPOLIA_ADDRESS",                    // fill after Sepolia deploy
  1:        "0xYOUR_MAINNET_ADDRESS",                    // fill after mainnet deploy
};

// Helper — returns address for active chain, or null with a warning
export function getContractAddress(chainId) {
  const addr = CONTRACT_ADDRESSES[chainId];
  if (!addr || addr.startsWith("0xYOUR")) {
    console.warn(`No contract deployed on chain ${chainId}`);
    return null;
  }
  return addr;
}

// ABI — matches Auction.sol exactly (string metadataCID, mapping-based, admin functions)
export const AUCTION_ABI = [
  // ── Views ──────────────────────────────────────────────────────────────────
  "function auctionCounter() view returns (uint256)",
  "function getAuction(uint256 auctionId) view returns (string metadataCID, address seller, uint256 highestBid, address highestBidder, uint256 deadline, bool ended, uint256 numBidders)",
  "function buyerFee(uint256 auctionId) view returns (uint256)",
  "function minimumBidTotal(uint256 auctionId) view returns (uint256)",
  "function pendingReturns(uint256 auctionId, address bidder) view returns (uint256)",
  "function isVerifiedSeller(address seller) view returns (bool)",
  "function sellers(address) view returns (bool isVerified, bool hasPaidFee, uint256 registeredAt)",
  "function sellerRegistrationFee() view returns (uint256)",
  "function baseBuyerFee() view returns (uint256)",
  "function accumulatedFees() view returns (uint256)",
  "function owner() view returns (address)",

  // ── State-changing ─────────────────────────────────────────────────────────
  "function registerAsSeller() payable",
  "function createAuction(string metadataCID, uint256 startingPrice, uint256 durationSeconds, uint256 minIncrement) returns (uint256)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  "function withdrawBid(uint256 auctionId)",
  "function extendBySeller(uint256 auctionId, uint256 extraTime)",

  // ── Admin only ─────────────────────────────────────────────────────────────
  "function verifySeller(address sellerAddr)",
  "function revokeSeller(address sellerAddr)",
  "function updateFees(uint256 newSellerFee, uint256 newBuyerFee)",
  "function withdrawFees()",

  // ── Events ─────────────────────────────────────────────────────────────────
  "event AuctionCreated(uint256 indexed auctionId, string metadataCID, uint256 startingPrice, uint256 deadline)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)",
  "event AuctionExtended(uint256 indexed auctionId, uint256 newDeadline, string reason)",
  "event SellerVerified(address indexed seller)",
  "event SellerRevoked(address indexed seller)",
  "event SellerRegistered(address indexed seller, uint256 feePaid)",
  "event FeesWithdrawn(address indexed admin, uint256 amount)",
  "event FeesUpdated(uint256 newSellerFee, uint256 newBuyerFee)",
] as const;

// Backend URL — your Express server
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";