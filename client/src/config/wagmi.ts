import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, sepolia } from "wagmi/chains";

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const chains = [anvil, sepolia] as const;

export const wagmiConfig = getDefaultConfig({
  appName: "Auction Platform",
  projectId: walletConnectProjectId,
  chains,
});
