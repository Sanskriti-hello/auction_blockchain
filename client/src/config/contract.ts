import auctionArtifact from "../../../out/Auction.sol/Auction.json";

export function getContractAddress(chainId?: number): `0x${string}` | null {
  // Use environment variable for Sepolia or other production-like networks
  if (chainId === 11155111) {
    const addr = import.meta.env.VITE_CONTRACT_ADDRESS?.trim();
    if (!addr) {
      console.warn("VITE_CONTRACT_ADDRESS is not configured for Sepolia.");
      return null;
    }
    return addr as `0x${string}`;
  }

  // Fallback for Anvil (local testing)
  if (chainId === 31337) {
    // Usually local Anvil deployments use a stable address or can be configured via another env var
    return (import.meta.env.VITE_LOCAL_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;
  }

  // Default to the env var if no chainId provided or unknown chain
  const fallbackAddr = import.meta.env.VITE_CONTRACT_ADDRESS?.trim();
  return (fallbackAddr as `0x${string}`) || null;
}

export const AUCTION_ABI = auctionArtifact.abi;
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
