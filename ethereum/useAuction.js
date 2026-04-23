// src/hooks/useAuction.js
// ─────────────────────────────────────────────────────────────────────────────
// Read hook for a single auction. Auto-refreshes every 10 seconds.
// Also fetches metadata from IPFS using the stored CID map.
// ─────────────────────────────────────────────────────────────────────────────

import { useReadContract, useChainId } from "wagmi";
import { useEffect, useState } from "react";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { fetchMetadata } from "../utils/ipfs";

/**
 * Returns all data needed to render a single auction card.
 *
 * @param {number|bigint} auctionId
 * @param {Object} cidMap   { [bytes32]: "QmCID..." }
 *                          — maintained in your app state (see useAuctionList)
 *
 * @returns {{
 *   name, description, images, condition,  ← from IPFS
 *   seller, highestBid, highestBidder,     ← from chain
 *   deadline, ended, numBidders,
 *   minBidTotal, fee,
 *   isLoading, isError, refetch
 * }}
 */
export function useAuction(auctionId, cidMap = {}) {
  const chainId  = useChainId();
  const address  = getContractAddress(chainId);

  const [metadata, setMetadata] = useState(null);
  const [metaError, setMetaError] = useState(null);

  // ── On-chain data ──────────────────────────────────────────────────────────
  const {
    data: auctionData,
    isLoading: chainLoading,
    isError: chainError,
    refetch,
  } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "getAuction",
    args:         [BigInt(auctionId ?? 0)],
    enabled:      auctionId !== undefined && !!address,
    watch:        true,          // re-reads on new blocks
    cacheTime:    10_000,        // 10 s
  });

  const { data: minBidTotal } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "minimumBidTotal",
    args:         [BigInt(auctionId ?? 0)],
    enabled:      auctionId !== undefined && !!address,
    watch:        true,
  });

  const { data: fee } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "participationFee",
    args:         [BigInt(auctionId ?? 0)],
    enabled:      auctionId !== undefined && !!address,
    watch:        true,
  });

  // ── IPFS metadata fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!auctionData) return;

    const cidBytes32 = auctionData[0];      // first return value is metadataCID
    const cid        = cidMap[cidBytes32];  // look up original CID string

    if (!cid) return; // CID not in map yet — parent should populate cidMap

    setMetaError(null);
    fetchMetadata(cid)
      .then(setMetadata)
      .catch((e) => setMetaError(e.message));
  }, [auctionData, cidMap]);

  if (!auctionData) {
    return { isLoading: chainLoading, isError: chainError, refetch };
  }

  const [cidBytes32, seller, highestBid, highestBidder, deadline, ended, numBidders] = auctionData;

  return {
    // IPFS data
    name:          metadata?.name         ?? "Loading…",
    description:   metadata?.description  ?? "",
    images:        metadata?.images       ?? [],
    condition:     metadata?.condition    ?? "",
    metaError,

    // On-chain data
    cidBytes32,
    seller,
    highestBid,
    highestBidder,
    deadline,
    ended,
    numBidders,
    minBidTotal,
    fee,

    isLoading: chainLoading,
    isError:   chainError,
    refetch,
  };
}
