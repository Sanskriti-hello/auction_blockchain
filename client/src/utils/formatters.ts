import { ethers } from "ethers";

type ContractErrorLike = {
  message?: string;
  shortMessage?: string;
  details?: string;
  cause?: unknown;
  data?: {
    errorName?: string;
  };
  metaMessages?: string[];
  walk?: (predicate?: (error: unknown) => boolean) => unknown;
};

const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  AuctionNotExist: "This auction does not exist.",
  AuctionAlreadyFinalized: "This auction has been finalized.",
  StartingPriceMustBePositive: "Starting price must be greater than zero.",
  IncrementMustBePositive: "Minimum increment must be greater than zero.",
  DurationTooShort: "Auction duration is too short.",
  DurationTooLong: "Auction duration is too long.",
  AuctionExpired: "Bidding has closed for this auction.",
  SellerCannotBid: "The seller cannot bid on their own auction.",
  AlreadyHighestBidder: "You are already the highest bidder.",
  BidBelowStartingPrice: "Bid too low. It is below the starting price.",
  BidTooLow: "Bid too low. Increase your bid to meet the minimum increment.",
  MustSendMoreThanFee: "Bid amount must be greater than the buyer fee.",
  OnlySellerCanExtend: "Only the seller can extend this auction.",
  ExtensionMustBePositive: "Extension time must be greater than zero.",
  ExceedsMaxSellerExtension: "Extension would exceed the seller extension cap.",
  AuctionNotYetEnded: "Auction is not finalizable yet. Wait for the settlement buffer.",
  CurrentWinnerCannotWithdraw: "The current winner cannot withdraw while the auction is active.",
  NothingToWithdraw: "There is nothing available to withdraw.",
  ETHTransferFailed: "ETH transfer failed. Try again.",
  NotOwner: "Not authorized.",
  AlreadyRegistered: "You have already registered as a seller.",
  InsufficientRegistrationFee: "Sent ETH is less than the registration fee.",
  SellerNotPaidFee: "Seller has not paid the registration fee.",
  SellerNotVerified: "Your seller account is not yet verified by the admin.",
  NotCurrentlyVerified: "Seller is not currently verified.",
  NoFeesToWithdraw: "No fees accumulated yet.",
};

export const formatEth = (wei: bigint | number | string | null | undefined): string =>
  wei != null ? `${ethers.formatEther(wei.toString())} ETH` : "-";

export const formatEthShort = (wei: bigint | number | string | null | undefined): string =>
  wei != null ? `${parseFloat(ethers.formatEther(wei.toString())).toFixed(4)} ETH` : "-";

export const parseEth = (str: string): bigint => ethers.parseEther(str);

export const shortAddr = (address: string | null | undefined): string =>
  !address || address === ethers.ZeroAddress ? "None" : `${address.slice(0, 6)}...${address.slice(-4)}`;

export const isZeroAddr = (address: string | null | undefined): boolean =>
  !address || address === ethers.ZeroAddress;

export function formatCountdown(deadlineSeconds: bigint | number | string): string {
  const secs = Number(deadlineSeconds) - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "Ended";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const isExpired = (deadlineSeconds: bigint | number | string): boolean =>
  Number(deadlineSeconds) < Math.floor(Date.now() / 1000);

function getErrorName(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const candidate = error as ContractErrorLike;
  if (candidate.data?.errorName) return candidate.data.errorName;

  if (typeof candidate.walk === "function") {
    const walked = candidate.walk((inner) => {
      const innerName = getErrorName(inner);
      return !!innerName;
    }) as ContractErrorLike | undefined;
    if (walked?.data?.errorName) return walked.data.errorName;
  }

  return getErrorName(candidate.cause);
}

function getErrorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const candidate = error as ContractErrorLike;
  return [
    candidate.shortMessage,
    candidate.message,
    candidate.details,
    ...(candidate.metaMessages ?? []),
    String(error),
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseContractError(err: unknown): string {
  if (!err) return "Unknown error.";

  const decodedName = getErrorName(err);
  if (decodedName && CONTRACT_ERROR_MESSAGES[decodedName]) {
    return CONTRACT_ERROR_MESSAGES[decodedName];
  }

  const msg = getErrorText(err);
  for (const [errorName, friendly] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (msg.includes(errorName)) return friendly;
  }

  const lower = msg.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Transaction cancelled.";
  if (lower.includes("insufficient funds")) return "Insufficient ETH in wallet.";
  if (lower.includes("execution reverted")) return "Transaction reverted by the contract.";

  return "Transaction failed. Check console for details.";
}
