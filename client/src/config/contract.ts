// client/src/config/contract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Update CONTRACT_ADDRESSES after each deploy.
// Chain IDs: Anvil = 31337 | Sepolia = 11155111 | Mainnet = 1
// ─────────────────────────────────────────────────────────────────────────────
import auctionArtifact from "../../../out/Auction.sol/Auction.json";
export const CONTRACT_ADDRESSES: Record<number, string> = {
  31337:    "0x5FbDB2315678afecb367f032d93F642f64180aa3", // default first Anvil deploy
  11155111: "0xYOUR_SEPOLIA_ADDRESS",                    // fill after Sepolia deploy
  1:        "0xYOUR_MAINNET_ADDRESS",                    // fill after mainnet deploy
};

export function getContractAddress(chainId: number): `0x${string}` | null {
  const addr = CONTRACT_ADDRESSES[chainId];
  if (!addr || addr.startsWith("0xYOUR")) {
    console.warn(`No contract deployed on chain ${chainId}`);
    return null;
  }
  return addr as `0x${string}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ABI — mirrors Auction.sol exactly
// ─────────────────────────────────────────────────────────────────────────────
export const AUCTION_ABI = auctionArtifact.abi;
// Express backend URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
