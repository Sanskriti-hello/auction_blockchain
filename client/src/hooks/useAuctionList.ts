import { useEffect, useMemo, useState } from "react";
import { useBlockNumber, useChainId, usePublicClient } from "wagmi";
import { AUCTION_ABI, getContractAddress } from "@/config/contract";
import { fetchMetadata, type AuctionMetadata } from "@/utils/ipfs";

export interface ChainAuction {
  id: number;
  cidBytes32: string;
  cid?: string;
  seller: string;
  highestBid: bigint;
  highestBidder: string;
  deadline: bigint;
  ended: boolean;
  numBidders: bigint;
  metadata?: AuctionMetadata;
}

export function useAuctionList() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const address = getContractAddress(chainId);
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [auctions, setAuctions] = useState<ChainAuction[]>([]);
  const [cidMap, setCidMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("auctionCidMap");
    if (stored) {
      setCidMap(JSON.parse(stored) as Record<string, string>);
    }
  }, []);

  const refreshKey = useMemo(() => `${chainId ?? "unknown"}-${blockNumber?.toString() ?? "0"}`, [blockNumber, chainId]);

  useEffect(() => {
    async function load() {
      if (!address || !publicClient) {
        setAuctions([]);
        return;
      }

      setIsLoading(true);
      try {
        const count = (await publicClient.readContract({
          address,
          abi: AUCTION_ABI,
          functionName: "auctionCount",
        })) as bigint;

        const ids = Array.from({ length: Number(count) }, (_, index) => index);

        const baseAuctions = await Promise.all(
          ids.map(async (id) => {
            const result = (await publicClient.readContract({
              address,
              abi: AUCTION_ABI,
              functionName: "getAuction",
              args: [BigInt(id)],
            })) as readonly [string, string, bigint, string, bigint, boolean, bigint];

            const [cidBytes32, seller, highestBid, highestBidder, deadline, ended, numBidders] = result;
            const cid = cidMap[cidBytes32];

            let metadata: AuctionMetadata | undefined;
            if (cid) {
              try {
                metadata = await fetchMetadata(cid);
              } catch {
                metadata = undefined;
              }
            }

            return {
              id,
              cidBytes32,
              cid,
              seller,
              highestBid,
              highestBidder,
              deadline,
              ended,
              numBidders,
              metadata,
            };
          })
        );

        setAuctions(baseAuctions);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [address, publicClient, cidMap, refreshKey]);

  function saveCid(cidBytes32: string, cid: string) {
    setCidMap((current) => {
      const next = { ...current, [cidBytes32]: cid };
      localStorage.setItem("auctionCidMap", JSON.stringify(next));
      return next;
    });
  }

  return { auctions, cidMap, saveCid, isLoading };
}
