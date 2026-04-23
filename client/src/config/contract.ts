export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  11155111: "0x0000000000000000000000000000000000000000",
};

export const AUCTION_ABI = [
  "function auctionCount() view returns (uint256)",
  "function getAuction(uint256 auctionId) view returns (bytes32 metadataCID, address seller, uint256 highestBid, address highestBidder, uint256 deadline, bool ended, uint256 numBidders)",
  "function participationFee(uint256 auctionId) view returns (uint256)",
  "function minimumBidTotal(uint256 auctionId) view returns (uint256)",
  "function pendingReturns(uint256 auctionId, address bidder) view returns (uint256)",
  "function bidderCount(uint256 auctionId) view returns (uint256)",
  "function BASE_PARTICIPATION_FEE() view returns (uint256)",
  "function createAuction(bytes32 metadataCID, uint96 startingPrice, uint40 durationSeconds, uint96 minIncrement) returns (uint256)",
  "function placeBid(uint256 auctionId) payable",
  "function endAuction(uint256 auctionId)",
  "function withdrawBid(uint256 auctionId)",
  "function extendBySeller(uint256 auctionId, uint40 extraTime)",
  "event AuctionCreated(uint256 indexed auctionId, address indexed seller, bytes32 metadataCID, uint256 startingPrice, uint256 deadline)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount)",
  "event AuctionExtended(uint256 indexed auctionId, uint256 newDeadline, string reason)",
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

export function getContractAddress(chainId?: number | null) {
  if (!chainId) return null;
  const address = CONTRACT_ADDRESSES[chainId];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return null;
  }
  return address;
}
