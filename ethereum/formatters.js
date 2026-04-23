// src/utils/formatters.js
// ─────────────────────────────────────────────────────────────────────────────
// Display helpers used across all components.
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from "ethers";

// ── ETH formatting ────────────────────────────────────────────────────────────

/** Wei → "1.23 ETH" */
export function formatEth(wei) {
  if (wei === undefined || wei === null) return "—";
  return `${ethers.formatEther(wei.toString())} ETH`;
}

/** Wei → "0.001 ETH" (for participation fee display) */
export function formatEthShort(wei) {
  if (wei === undefined || wei === null) return "—";
  const val = parseFloat(ethers.formatEther(wei.toString()));
  return `${val.toFixed(4)} ETH`;
}

/** ETH string → wei BigInt  (for passing to contract calls) */
export function parseEth(ethStr) {
  return ethers.parseEther(ethStr.toString());
}

// ── Address formatting ────────────────────────────────────────────────────────

/** "0x1234...abcd" — truncated for display */
export function shortAddr(address) {
  if (!address || address === ethers.ZeroAddress) return "None";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Returns true if address is the zero address */
export function isZeroAddr(address) {
  return !address || address === ethers.ZeroAddress;
}

// ── Countdown timer ───────────────────────────────────────────────────────────

/**
 * Converts a unix timestamp (seconds) to a human-readable countdown.
 * @param {number|bigint} deadlineSeconds
 * @returns {string}  e.g. "2h 15m 30s" or "Ended"
 */
export function formatCountdown(deadlineSeconds) {
  const now  = Math.floor(Date.now() / 1000);
  const secs = Number(deadlineSeconds) - now;
  if (secs <= 0) return "Ended";

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  if (h > 0)  return `${h}h ${m}m ${s}s`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

/** Returns true if a deadline (unix seconds) has passed */
export function isExpired(deadlineSeconds) {
  return Number(deadlineSeconds) < Math.floor(Date.now() / 1000);
}

// ── Contract error decoding ───────────────────────────────────────────────────

/**
 * Converts a wagmi/viem contract error into a user-friendly string.
 * Handles custom errors from Auction.sol.
 *
 * Usage:
 *   try { await writeContractAsync(...) }
 *   catch (err) { setError(parseContractError(err)) }
 */
export function parseContractError(err) {
  if (!err) return "Unknown error";

  const msg = err.message || err.toString();

  // Custom error names from Auction.sol
  const customErrors = {
    AuctionDoesNotExist:     "Auction does not exist.",
    AuctionNotActive:        "This auction is not active.",
    AuctionAlreadyFinalized: "This auction has already been finalised.",
    AuctionStillActive:      "The auction deadline has not passed yet.",
    AuctionAlreadyEnded:     "This auction has already ended.",
    SellerCannotBid:         "The seller cannot bid on their own auction.",
    AlreadyHighestBidder:    "You are already the highest bidder.",
    BidTooLow:               "Your bid is too low. Check the minimum bid.",
    NothingToWithdraw:       "You have no funds to withdraw.",
    TransferFailed:          "ETH transfer failed. Please try again.",
    NotSeller:               "Only the seller can do this.",
    ExceedsAllowedExtension: "Extension exceeds the 20% limit.",
    InvalidParam:            "Invalid input. Check all fields.",
    InsufficientFee:         "Insufficient participation fee included.",
  };

  for (const [name, friendly] of Object.entries(customErrors)) {
    if (msg.includes(name)) return friendly;
  }

  // User rejected the transaction in MetaMask
  if (msg.includes("User rejected") || msg.includes("user rejected")) {
    return "Transaction cancelled.";
  }

  // Insufficient funds
  if (msg.includes("insufficient funds")) {
    return "Insufficient ETH in your wallet.";
  }

  return "Transaction failed. Check the console for details.";
}
