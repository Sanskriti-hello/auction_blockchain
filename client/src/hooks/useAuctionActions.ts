import { useState } from "react";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { AUCTION_ABI, getContractAddress } from "@/config/contract";
import { parseContractError, parseEth } from "@/utils/formatters";

export function useAuctionActions(auctionId: string | null) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contractAddress = getContractAddress(chainId);
  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  async function run(action: () => Promise<`0x${string}`>) {
    setIsPending(true);
    setError(null);
    try {
      const hash = await action();
      setTxHash(hash);
      if (!publicClient) {
        throw new Error("Public client is not available");
      }
      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (caught) {
      setError(parseContractError(caught));
      return false;
    } finally {
      setIsPending(false);
    }
  }

  async function placeBid(amountEth: string, fee: bigint) {
    if (!auctionId || !contractAddress) return false;
    return run(() =>
      writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "placeBid",
        args: [BigInt(auctionId)],
        value: parseEth(amountEth) + fee,
      })
    );
  }

  async function endAuction() {
    if (!auctionId || !contractAddress) return false;
    return run(() =>
      writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "endAuction",
        args: [BigInt(auctionId)],
      })
    );
  }

  async function withdrawBid() {
    if (!auctionId || !contractAddress) return false;
    return run(() =>
      writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "withdrawBid",
        args: [BigInt(auctionId)],
      })
    );
  }

  async function extendBySeller(extraSeconds: number) {
    if (!auctionId || !contractAddress) return false;
    return run(() =>
      writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "extendBySeller",
        args: [BigInt(auctionId), BigInt(extraSeconds)],
      })
    );
  }

  return {
    placeBid,
    endAuction,
    withdrawBid,
    extendBySeller,
    isPending,
    error,
    txHash,
  };
}
