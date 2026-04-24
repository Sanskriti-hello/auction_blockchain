// src/utils/formatters.js
import { ethers } from "ethers";

// ── ETH ───────────────────────────────────────────────────────────────────────
export const formatEth      = (wei) => wei != null ? `${ethers.formatEther(wei.toString())} ETH` : "—";
export const formatEthShort = (wei) => wei != null ? `${parseFloat(ethers.formatEther(wei.toString())).toFixed(4)} ETH` : "—";
export const parseEth       = (str) => ethers.parseEther(str.toString());

// ── Address ───────────────────────────────────────────────────────────────────
export const shortAddr  = (a) => (!a || a === ethers.ZeroAddress) ? "None" : `${a.slice(0,6)}…${a.slice(-4)}`;
export const isZeroAddr = (a) => !a || a === ethers.ZeroAddress;

// ── Time ──────────────────────────────────────────────────────────────────────
export function formatCountdown(deadlineSeconds) {
  const secs = Number(deadlineSeconds) - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "Ended";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const isExpired = (deadlineSeconds) =>
  Number(deadlineSeconds) < Math.floor(Date.now() / 1000);

// ── Contract errors ───────────────────────────────────────────────────────────
export function parseContractError(err) {
  if (!err) return "Unknown error";
  const msg = err.message || err.toString();

  const map = {
    SellerNotVerified:            "Your seller account is not yet verified by the admin.",
    AlreadyRegistered:            "You have already registered as a seller.",
    InsufficientRegistrationFee:  "Sent ETH is less than the registration fee.",
    SellerNotPaidFee:             "Seller has not paid the registration fee.",
    AuctionNotExist:              "This auction doesn't exist.",
    AuctionAlreadyFinalized:      "This auction has been finalised.",
    AuctionExpired:               "This auction has closed.",
    AuctionNotYetEnded:           "The auction hasn't ended yet.",
    SellerCannotBid:              "The seller cannot bid on their own auction.",
    AlreadyHighestBidder:         "You are already the highest bidder.",
    BidBelowStartingPrice:        "Your bid is below the starting price.",
    BidTooLow:                    "Your bid doesn't meet the minimum increment.",
    MustSendMoreThanFee:           "You must send more than just the fee.",
    NothingToWithdraw:            "You have nothing to withdraw.",
    ETHTransferFailed:            "ETH transfer failed. Try again.",
    OnlySellerCanExtend:           "Only the seller can extend this auction.",
    ExceedsMaxSellerExtension:    "Extension would exceed the 20% limit.",
    NoFeesToWithdraw:             "No fees accumulated yet.",
    NotCurrentlyVerified:         "Seller is not currently verified.",
    NotOwner:                     "Not authorised.",
  };

  for (const [errorName, friendly] of Object.entries(map)) {
    if (msg.includes(errorName)) return friendly;
  }

  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled.";
  if (msg.includes("insufficient funds")) return "Insufficient ETH in wallet.";

  return "Transaction failed. Check console for details.";
}