import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, sepolia } from "wagmi/chains";
import { http } from "wagmi";

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "1023fc0d7d5bdc0cfb8f497d8c718123";

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

  chains: [sepolia, localAnvil],

  transports: {
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/qlqT0PUfl_SVK-Zi1YOeu"
    ),

    [localAnvil.id]: http("http://127.0.0.1:8545"),
  },

  ssr: false,
});