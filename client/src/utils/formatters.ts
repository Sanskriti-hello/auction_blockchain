import { formatEther, parseEther, zeroAddress } from "viem";

export function formatEth(value?: bigint | null) {
  if (value === undefined || value === null) return "--";
  return `${formatEther(value)} ETH`;
}

export function formatEthShort(value?: bigint | null) {
  if (value === undefined || value === null) return "--";
  return `${Number(formatEther(value)).toFixed(4)} ETH`;
}

export function parseEth(value: string | number) {
  return parseEther(String(value));
}

export function shortAddr(address?: string | null) {
  if (!address || address === zeroAddress) return "None";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCountdown(deadlineSeconds?: bigint | number | null) {
  if (deadlineSeconds === undefined || deadlineSeconds === null) return "--";
  const remaining = Number(deadlineSeconds) - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Ended";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function parseContractError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

  const knownErrors: Record<string, string> = {
    AuctionDoesNotExist: "Auction does not exist.",
    AuctionNotActive: "This auction is not active.",
    AuctionAlreadyFinalized: "This auction has already been finalised.",
    AuctionStillActive: "The auction deadline has not passed yet.",
    AuctionAlreadyEnded: "This auction has already ended.",
    SellerCannotBid: "The seller cannot bid on their own auction.",
    AlreadyHighestBidder: "You are already the highest bidder.",
    BidTooLow: "Your bid is too low. Check the minimum bid.",
    NothingToWithdraw: "You have no funds to withdraw.",
    TransferFailed: "ETH transfer failed. Please try again.",
    NotSeller: "Only the seller can do this.",
    ExceedsAllowedExtension: "Extension exceeds the 20% limit.",
    InvalidParam: "Invalid input. Check all fields.",
    InsufficientFee: "Insufficient participation fee included.",
  };

  for (const [name, friendly] of Object.entries(knownErrors)) {
    if (message.includes(name)) return friendly;
  }

  if (message.toLowerCase().includes("user rejected")) return "Transaction cancelled.";
  if (message.toLowerCase().includes("insufficient funds")) return "Insufficient ETH in your wallet.";

  return "Transaction failed. Check the console for details.";
}
