// src/config/wagmi.js
// Supports: Anvil (local dev), Sepolia (testnet), Ethereum Mainnet
// User chooses their network via the RainbowKit network switcher in the UI.

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia, anvil } from "wagmi/chains";

// Free WalletConnect project ID → https://cloud.walletconnect.com
const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName:   "CS218 Auction DApp",
  projectId: PROJECT_ID,
  chains: [
    sepolia,   // shown first → default for the demo
    mainnet,   // real ETH — user can switch to this in MetaMask/RainbowKit
    anvil,     // local dev
  ],
});

// Export chains list so Providers.jsx can pass it to RainbowKitProvider
export const supportedChains = [sepolia, mainnet, anvil];