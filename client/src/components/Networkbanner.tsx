import { useChainId } from "wagmi";

export default function NetworkBanner() {
  const chainId = useChainId();

  const getNetworkName = () => {
    switch (chainId) {
      case 31337:
        return "Anvil";

      case 11155111:
        return "Sepolia";

      case 1:
        return "Ethereum Mainnet";

      default:
        return `Unknown (${chainId})`;
    }
  };

  return (
    <div
      style={{
        padding: "12px",
        background: "#111",
        color: "#fff",
        borderBottom: "1px solid #333",
      }}
    >
      Network: {getNetworkName()}
    </div>
  );
}