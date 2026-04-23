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
    "Seller not verified by admin": "Your seller account is not yet verified by the admin.",
    "Seller has not paid registration fee": "You need to pay the registration fee first.",
    "Already registered":      "You have already registered as a seller.",
    "Insufficient registration fee": "Sent ETH is less than the registration fee.",
    "Auction does not exist":  "This auction doesn't exist.",
    "Auction has already ended": "This auction has closed.",
    "Auction is already finalized": "This auction has been finalised.",
    "Auction is still active": "The auction hasn't ended yet.",
    "Auction already ended":   "Already ended.",
    "Seller cannot bid":       "The seller cannot bid on their own auction.",
    "Already highest bidder":  "You are already the highest bidder.",
    "Bid below starting price": "Your bid is below the starting price.",
    "Bid must be at least increment higher": "Your bid doesn't meet the minimum increment.",
    "Must send more than the participation fee": "You must send more than just the fee.",
    "Nothing to withdraw":     "You have nothing to withdraw.",
    "Transfer failed":         "ETH transfer failed. Try again.",
    "Only seller can extend":  "Only the seller can extend this auction.",
    "Exceeds allowed extension": "Extension would exceed the 20% limit.",
    "No fees to withdraw":     "No fees accumulated yet.",
    "Not currently verified":  "Seller is not currently verified.",
  };

  for (const [solMsg, friendly] of Object.entries(map)) {
    if (msg.includes(solMsg)) return friendly;
  }

  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction cancelled.";
  if (msg.includes("insufficient funds")) return "Insufficient ETH in wallet.";

  return "Transaction failed. Check console for details.";
}