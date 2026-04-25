import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./config/wagmi";
import { AuctionProvider } from "./contexts/AuctionContext";
import { Web3Provider } from "./contexts/Web3Context";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme()}
          showRecentTransactions={false}
        >
          <ThemeProvider defaultTheme="dark">
            <Web3Provider>
              <AuctionProvider>
                {children}
              </AuctionProvider>
            </Web3Provider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}