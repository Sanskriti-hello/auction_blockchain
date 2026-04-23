// src/config/contract.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the deployed contract.
// After every deploy (forge script ...) update the address for that chain here.
// The ABI is copied from out/Auction.json after `forge build`.
// ─────────────────────────────────────────────────────────────────────────────

// ── Addresses per chain ───────────────────────────────────────────────────────
// Replace the placeholder strings after running the deploy script.
// Chain IDs: Anvil = 31337, Sepolia = 11155111
export const CONTRACT_ADDRESSES = {
  31337:    "0x5FbDB2315678afecb367f032d93F642f64180aa3", // default first Anvil deploy address
  11155111: "0xYOUR_SEPOLIA_DEPLOYED_ADDRESS",           // fill in after Sepolia deploy
};

// ── ABI ───────────────────────────────────────────────────────────────────────
// Human-readable ABI — easier to read than JSON, wagmi accepts both.
// Must stay in sync with src/Auction.sol.
export const AUCTION_ABI = [
  // ── Views ──────────────────────────────────────────────────────────────────
  "function auctionCount() view returns (uint256)",
  "function getAuction(uint256 auctionId) view returns (bytes32 metadataCID, address seller, uint256 highestBid, address highestBidder, uint256 deadline, bool ended, uint256 numBidders)",
  "function participationFee(uint256 auctionId) view returns (uint256)",
  "function minimumBidTotal(uint256 auctionId) view returns (uint256)",
  "function pendingReturns(uint256 auctionId, address bidder) view returns (uint256)",
  "function bidderCount(uint256 auctionId) view returns (uint256)",
  "function BASE_PARTICIPATION_FEE() view returns (uint256)",

  // ── State-changing ─────────────────────────────────────────────────────────
  "function createAuction(bytes32 metadataCID, uint96 startingPrice, uint40 durationSeconds, uint96 minIncrement) returns (uint256)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  "function withdrawBid(uint256 auctionId)",
  "function extendBySeller(uint256 auctionId, uint40 extraTime)",

  // ── Events ─────────────────────────────────────────────────────────────────
  "event AuctionCreated(uint256 indexed auctionId, address indexed seller, bytes32 metadataCID, uint256 startingPrice, uint256 deadline)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)",
  "event AuctionExtended(uint256 indexed auctionId, uint256 newDeadline, string reason)",

  // ── Custom errors (needed for wagmi to decode revert reasons) ──────────────
  "error AuctionDoesNotExist()",
  "error AuctionNotActive()",
  "error AuctionAlreadyFinalized()",
  "error AuctionStillActive()",
  "error AuctionAlreadyEnded()",
  "error SellerCannotBid()",
  "error AlreadyHighestBidder()",
  "error BidTooLow(uint256 minimum)",
  "error NothingToWithdraw()",
  "error TransferFailed()",
  "error NotSeller()",
  "error ExceedsAllowedExtension()",
  "error InvalidParam()",
  "error InsufficientFee(uint256 required)",
] as const;

// ── Helper — get address for the currently connected chain ───────────────────
export function getContractAddress(chainId) {
  const addr = CONTRACT_ADDRESSES[chainId];
  if (!addr || addr.startsWith("0xYOUR")) {
    console.warn(`No contract deployed on chain ${chainId}. Update CONTRACT_ADDRESSES in contract.js`);
    return null;
  }
  return addr;
}
