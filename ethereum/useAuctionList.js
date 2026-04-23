// src/hooks/useAuctionList.js
// ─────────────────────────────────────────────────────────────────────────────
// Fetches the total auction count, then reads each auction.
// Maintains a cidMap so individual useAuction hooks can resolve IPFS CIDs.
//
// In a production app you would page this (load 10 at a time).
// For CS218 scope (a few test auctions) loading all is fine.
// ─────────────────────────────────────────────────────────────────────────────

import { useReadContract, useReadContracts, useChainId } from "wagmi";
import { useState, useEffect } from "react";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { fetchMetadata } from "../utils/ipfs";

/**
 * @returns {{
 *   auctions: Array<{
 *     id, cidBytes32, cid, seller, highestBid, highestBidder,
 *     deadline, ended, numBidders,
 *     name, description, images, condition
 *   }>,
 *   cidMap: { [bytes32]: cid },
 *   isLoading,
 *   refetch
 * }}
 */
export function useAuctionList() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const [cidMap,   setCidMap]   = useState({});
  const [enriched, setEnriched] = useState([]);

  // ── Step 1: how many auctions exist? ──────────────────────────────────────
  const { data: countData, refetch: refetchCount } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "auctionCount",
    enabled:      !!address,
    watch:        true,
  });

  const count = Number(countData ?? 0);

  // ── Step 2: batch-read all auctions in one multicall ─────────────────────
  const auctionCalls = Array.from({ length: count }, (_, i) => ({
    address,
    abi:          AUCTION_ABI,
    functionName: "getAuction",
    args:         [BigInt(i)],
  }));

  const { data: auctionResults, isLoading, refetch: refetchAll } = useReadContracts({
    contracts: auctionCalls,
    enabled:   !!address && count > 0,
  });

  // ── Step 3: enrich with IPFS metadata ────────────────────────────────────
  // cidMap is populated from localStorage (persisted between sessions)
  // so IPFS isn't re-fetched on every render.
  useEffect(() => {
    const stored = localStorage.getItem("auctionCidMap");
    if (stored) setCidMap(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!auctionResults) return;

    const raw = auctionResults
      .map((r, i) => {
        if (r.status !== "success") return null;
        const [cidBytes32, seller, highestBid, highestBidder, deadline, ended, numBidders] = r.result;
        return { id: i, cidBytes32, seller, highestBid, highestBidder, deadline, ended, numBidders };
      })
      .filter(Boolean);

    // Build list of CIDs we don't have metadata for yet
    // (cidMap is populated externally when createAuction is called)
    const tasks = raw
      .filter((a) => cidMap[a.cidBytes32])
      .map(async (a) => {
        try {
          const meta = await fetchMetadata(cidMap[a.cidBytes32]);
          return { ...a, ...meta };
        } catch {
          return { ...a, name: "Metadata unavailable", description: "", images: [] };
        }
      });

    Promise.all(tasks).then(setEnriched);
  }, [auctionResults, cidMap]);

  // ── saveCid: called from useCreateAuction after a successful tx ──────────
  function saveCid(cidBytes32, cid) {
    setCidMap((prev) => {
      const next = { ...prev, [cidBytes32]: cid };
      localStorage.setItem("auctionCidMap", JSON.stringify(next));
      return next;
    });
  }

  function refetch() {
    refetchCount();
    refetchAll();
  }

  return {
    auctions:  enriched,
    cidMap,
    saveCid,   // <── pass this to useCreateAuction
    count,
    isLoading,
    refetch,
  };
}
