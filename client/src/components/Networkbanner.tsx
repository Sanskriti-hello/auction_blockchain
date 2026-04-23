import { useChainId } from "wagmi";
import { getContractAddress } from "../config/contract";
import { supportedChains } from "../config/wagmi";

export function NetworkBanner() {
  const chainId = useChainId();
  const chain = supportedChains.find((item) => item.id === chainId);
  const contractAddress = getContractAddress(chainId);

  if (!chain) {
    return (
      <div className="border-b border-amber-300/30 bg-amber-200/10">
        <div className="container py-3 text-sm text-amber-100">Unsupported network. Switch to Sepolia, Ethereum Mainnet, or Anvil.</div>
      </div>
    );
  }

  return (
    <div className={`border-b ${chainId === 1 ? "border-amber-300/30 bg-amber-200/10" : "border-emerald-300/20 bg-emerald-200/10"}`}>
      <div className="container flex flex-col gap-1 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <p className={chainId === 1 ? "text-amber-100" : "text-emerald-100"}>
          Network: <span className="font-medium">{chain.name}</span>
          {chainId === 1 ? " | Mainnet selected. Transactions use real ETH." : ""}
        </p>
        <p className="text-white/60">
          {contractAddress ? `Contract: ${contractAddress}` : "No contract configured for this network yet."}
        </p>
      </div>
    </div>
  );
}
