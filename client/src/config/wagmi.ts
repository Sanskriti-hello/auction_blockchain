import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, mainnet, sepolia } from "wagmi/chains";
import { http } from "wagmi";

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "demo";

const localAnvil = {
  ...anvil,

  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },

    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
};

export const wagmiConfig = getDefaultConfig({
  appName: "CS218 Auction DApp",

  projectId,

  chains: [
    localAnvil,
    sepolia,
    mainnet,
  ],

  transports: {
    [localAnvil.id]: http("http://127.0.0.1:8545"),

    [sepolia.id]: http(),

    [mainnet.id]: http(),
  },

  ssr: false,
});