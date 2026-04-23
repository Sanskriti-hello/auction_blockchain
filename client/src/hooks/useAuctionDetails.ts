import { useEffect, useState } from "react";
import { useAccount, useBlockNumber, useChainId, usePublicClient } from "wagmi";
import { zeroAddress } from "viem";
import { AUCTION_ABI, getContractAddress } from "@/config/contract";
import { fetchMetadata, type AuctionMetadata, ipfsImageUrl } from "@/utils/ipfs";

export interface AuctionDetails {
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  currentBid: number;
  highestBidder: string | null;
  creator: string;
  endTime: number;
  status: "active" | "ended";
  condition: string;
  fee: bigint;
  minBidTotal: bigint;
  pendingAmount: bigint;
  numBidders: bigint;
}

export function useAuctionDetails(auctionId: string | null) {
  const chainId = useChainId();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const contractAddress = getContractAddress(chainId);
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!auctionId || !publicClient || !contractAddress) {
        setAuction(null);
        return;
      }

      setIsLoading(true);
      try {
        const id = BigInt(auctionId);
        const [rawAuction, fee, minBidTotal, pendingAmount] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: AUCTION_ABI,
            functionName: "getAuction",
            args: [id],
          }) as Promise<readonly [string, string, bigint, string, bigint, boolean, bigint]>,
          publicClient.readContract({
            address: contractAddress,
            abi: AUCTION_ABI,
            functionName: "participationFee",
            args: [id],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contractAddress,
            abi: AUCTION_ABI,
            functionName: "minimumBidTotal",
            args: [id],
          }) as Promise<bigint>,
          userAddress
            ? (publicClient.readContract({
                address: contractAddress,
                abi: AUCTION_ABI,
                functionName: "pendingReturns",
                args: [id, userAddress],
              }) as Promise<bigint>)
            : Promise.resolve(0n),
        ]);

        const [cidBytes32, seller, highestBid, highestBidder, deadline, ended, numBidders] = rawAuction;
        const cidMap = JSON.parse(localStorage.getItem("auctionCidMap") || "{}") as Record<string, string>;
        const cid = cidMap[cidBytes32];

        let metadata: AuctionMetadata | undefined;
        if (cid) {
          try {
            metadata = await fetchMetadata(cid);
          } catch {
            metadata = undefined;
          }
        }

        setAuction({
          id: auctionId,
          title: metadata?.name ?? `Auction #${auctionId}`,
          description: metadata?.description ?? "Metadata unavailable",
          image: ipfsImageUrl(metadata?.images?.[0] ?? ""),
          images: (metadata?.images ?? []).map(ipfsImageUrl),
          currentBid: Number(highestBid) / 1e18,
          highestBidder: highestBidder === zeroAddress ? null : highestBidder,
          creator: seller,
          endTime: Number(deadline) * 1000,
          status: ended ? "ended" : "active",
          condition: metadata?.condition ?? "Unknown",
          fee,
          minBidTotal,
          pendingAmount,
          numBidders,
        });
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [auctionId, blockNumber, contractAddress, publicClient, userAddress]);

  return { auction, isLoading };
}
