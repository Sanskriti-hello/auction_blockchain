// src/Providers.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrap your entire app in <Providers> to enable wagmi + RainbowKit.
//
// In main.jsx:
//   import { Providers } from "./Providers";
//   ReactDOM.createRoot(...).render(
//     <React.StrictMode>
//       <Providers>
//         <App />
//       </Providers>
//     </React.StrictMode>
//   );
// ─────────────────────────────────────────────────────────────────────────────

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider }                              from "wagmi";
import { QueryClient, QueryClientProvider }           from "@tanstack/react-query";
import { wagmiConfig }                                from "./config/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry failed contract reads more than once — avoids spamming the RPC
      retry:            1,
      staleTime:        10_000,  // 10 s
      refetchInterval:  10_000,
    },
  },
});

export function Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/*
          RainbowKitProvider theming:
            - Pass theme={darkTheme()} or theme={lightTheme()} to match your UI
            - coolMode adds a confetti effect on connect (remove if too playful)
        */}
        <RainbowKitProvider
          theme={lightTheme({
            accentColor:          "#6366f1",   // indigo — change to match your palette
            accentColorForeground: "white",
            borderRadius:         "medium",
          })}
          // coolMode   ← uncomment for confetti on wallet connect
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
