// src/config/wagmi.js
// ─────────────────────────────────────────────────────────────────────────────
// Central wagmi + RainbowKit config.
// Supports: Anvil (local dev) + Sepolia (testnet submission).
// Import `wagmiConfig` and `chains` wherever you set up your providers.
// ─────────────────────────────────────────────────────────────────────────────

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, anvil } from "wagmi/chains";

// Get a free WalletConnect project ID at https://cloud.walletconnect.com
// Add to your .env:  VITE_WALLETCONNECT_PROJECT_ID=your_id_here
const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const chains = [
  anvil,    // local dev  — shows up in MetaMask as "Anvil" (chainId 31337)
  sepolia,  // testnet    — for submission
];

export const wagmiConfig = getDefaultConfig({
  appName:   "CS218 Auction DApp",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains,
  // ssr: false   ← uncomment if you ever move to Next.js
});
