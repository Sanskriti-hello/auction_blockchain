import React, { createContext, useContext, type ReactNode } from "react";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect } from "wagmi";

interface Web3ContextType {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending, error: connectError } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const connect = async () => {
    const connector = connectors[0];
    if (!connector) {
      throw new Error("No wallet connector available");
    }
    await connectAsync({ connector });
  };

  const disconnect = async () => {
    await disconnectAsync();
  };

  return (
    <Web3Context.Provider
      value={{
        isConnected,
        address: address ?? null,
        balance: balanceData ? balanceData.formatted : null,
        chainId: chainId ?? null,
        isLoading: isPending,
        error: connectError?.message ?? null,
        connect,
        disconnect,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
}
