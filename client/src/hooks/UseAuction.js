// src/hooks/useAuction.js
// ─────────────────────────────────────────────────────────────────────────────
// ALL hooks for the auction DApp in one file.
// Each hook is exported individually — import only what you need.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useAccount,
} from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { fetchMetadata }        from "../utils/ipfs";
import { parseContractError }   from "../utils/formatters";

// ─────────────────────────────────────────────────────────────────────────────
//  Internal shared helper — handles write + wait + error state
// ─────────────────────────────────────────────────────────────────────────────

function useContractWrite() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const [error,     setError]     = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash,    setTxHash]    = useState(null);

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isTxLoading } = useWaitForTransactionReceipt({
    hash:    txHash,
    enabled: !!txHash,
    onSuccess() { setIsSuccess(true); setIsPending(false); },
    onError(e)  { setError(parseContractError(e)); setIsPending(false); },
  });

  const reset = () => { setError(null); setIsSuccess(false); setTxHash(null); };

  const send = useCallback(async (functionName, args, value) => {
    reset();
    setIsPending(true);
    try {
      const params = { address, abi: AUCTION_ABI, functionName, args };
      if (value !== undefined) params.value = value;
      const hash = await writeContractAsync(params);
      setTxHash(hash);
      return hash;
    } catch (e) {
      setError(parseContractError(e));
      setIsPending(false);
      return null;
    }
  }, [address, writeContractAsync]);

  return { address, send, isPending: isPending || isTxLoading, isSuccess, error, txHash, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useAuctionList
//  Fetches all auctions + their IPFS metadata.
//  NOTE: auctionCounter is the NEXT id, so ids are 0 … auctionCounter-1
// ─────────────────────────────────────────────────────────────────────────────

export function useAuctionList() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const [auctions,  setAuctions]  = useState([]);
  const [enriched,  setEnriched]  = useState([]);

  const { data: counterData, refetch: refetchCounter } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "auctionCounter",
    enabled:      !!address,
    watch:        true,
  });

  const count = Number(counterData ?? 0);

  const auctionCalls = Array.from({ length: count }, (_, i) => ({
    address,
    abi:          AUCTION_ABI,
    functionName: "getAuction",
    args:         [BigInt(i)],
  }));

  const { data: results, isLoading, refetch: refetchAll } = useReadContracts({
    contracts: auctionCalls,
    enabled:   !!address && count > 0,
  });

  useEffect(() => {
    if (!results) return;

    const raw = results
      .map((r, i) => {
        if (r.status !== "success") return null;
        const [metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders] = r.result;
        return { id: i, metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders };
      })
      .filter(Boolean);

    setAuctions(raw);

    // Fetch IPFS metadata for each auction in parallel
    Promise.all(
      raw.map(async (a) => {
        try {
          const meta = await fetchMetadata(a.metadataCID);
          return { ...a, ...meta };
        } catch {
          return { ...a, name: "Metadata unavailable", description: "", image: "" };
        }
      })
    ).then(setEnriched);
  }, [results]);

  function refetch() { refetchCounter(); refetchAll(); }

  return { auctions: enriched, count, isLoading, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useAuction  — single auction with live refresh
// ─────────────────────────────────────────────────────────────────────────────

export function useAuction(auctionId) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);
  const [metadata, setMetadata] = useState(null);

  const { data, isLoading, isError, refetch } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "getAuction",
    args:         [BigInt(auctionId ?? 0)],
    enabled:      auctionId !== undefined && !!address,
    watch:        true,
  });

  const { data: fee }      = useReadContract({ address, abi: AUCTION_ABI, functionName: "buyerFee",        args: [BigInt(auctionId ?? 0)], enabled: !!address && auctionId !== undefined, watch: true });
  const { data: minTotal } = useReadContract({ address, abi: AUCTION_ABI, functionName: "minimumBidTotal", args: [BigInt(auctionId ?? 0)], enabled: !!address && auctionId !== undefined, watch: true });

  useEffect(() => {
    if (!data) return;
    const [metadataCID] = data;
    fetchMetadata(metadataCID).then(setMetadata).catch(() => {});
  }, [data]);

  if (!data) return { isLoading, isError, refetch };

  const [metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders] = data;

  return {
    metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders,
    name:        metadata?.name        ?? "Loading…",
    description: metadata?.description ?? "",
    image:       metadata?.image       ?? "",
    condition:   metadata?.condition   ?? "",
    fee, minTotal,
    isLoading, isError, refetch,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useSellerStatus  — check if connected wallet is a verified seller
// ─────────────────────────────────────────────────────────────────────────────

export function useSellerStatus() {
  const chainId              = useChainId();
  const address              = getContractAddress(chainId);
  const { address: userAddr } = useAccount();

  const { data: isVerified, refetch: refetchVerified } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "isVerifiedSeller",
    args:         [userAddr ?? ethers.ZeroAddress],
    enabled:      !!address && !!userAddr,
    watch:        true,
  });

  const { data: sellerData } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "sellers",
    args:         [userAddr ?? ethers.ZeroAddress],
    enabled:      !!address && !!userAddr,
  });

  const { data: regFee } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "sellerRegistrationFee",
    enabled:      !!address,
  });

  return {
    isVerified:   !!isVerified,
    hasPaidFee:   sellerData?.[1] ?? false,
    registeredAt: sellerData?.[2],
    regFee,
    refetch:      refetchVerified,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useRegisterAsSeller
// ─────────────────────────────────────────────────────────────────────────────

export function useRegisterAsSeller() {
  const { send, ...state } = useContractWrite();

  async function register(feeWei) {
    return send("registerAsSeller", [], feeWei);
  }

  return { register, ...state };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useCreateAuction  — calls your Express backend first, then the contract
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateAuction() {
  const { send, ...state }   = useContractWrite();
  const [step, setStep]      = useState(null); // "uploading" | "confirming" | null

  async function createAuction({ name, description, condition, imageFile, startingPrice, durationSeconds, minIncrement }) {
    state.reset?.();
    setStep("uploading");

    // 1. Upload to IPFS via backend
    let metadataCID;
    try {
      const { uploadAuctionToIPFS } = await import("../utils/ipfs");
      const result = await uploadAuctionToIPFS({ name, description, condition, imageFile });
      metadataCID = result.metadataCID;
    } catch (e) {
      setStep(null);
      // surface the error through state.error by re-using the send error path
      throw e;
    }

    // 2. Send on-chain tx
    setStep("confirming");
    const hash = await send("createAuction", [
      metadataCID,
      ethers.parseEther(startingPrice.toString()),
      BigInt(durationSeconds),
      ethers.parseEther(minIncrement.toString()),
    ]);

    setStep(null);
    return hash;
  }

  return { createAuction, step, ...state };
}

// ─────────────────────────────────────────────────────────────────────────────
//  usePlaceBid
// ─────────────────────────────────────────────────────────────────────────────

export function usePlaceBid(auctionId) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);
  const { send, ...state } = useContractWrite();

  const { data: fee }      = useReadContract({ address, abi: AUCTION_ABI, functionName: "buyerFee",        args: [BigInt(auctionId ?? 0)], enabled: !!address && auctionId !== undefined, watch: true });
  const { data: minTotal } = useReadContract({ address, abi: AUCTION_ABI, functionName: "minimumBidTotal", args: [BigInt(auctionId ?? 0)], enabled: !!address && auctionId !== undefined, watch: true });

  async function placeBid(bidAmountEth) {
    const netBid  = ethers.parseEther(bidAmountEth.toString());
    const feeVal  = fee ?? 0n;
    const total   = netBid + feeVal;

    if (minTotal && total < minTotal) {
      // surface as error without sending tx
      return;
    }

    return send("placeBid", [BigInt(auctionId)], total);
  }

  return { placeBid, fee, minTotal, ...state };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useEndAuction
// ─────────────────────────────────────────────────────────────────────────────

export function useEndAuction() {
  const { send, ...state } = useContractWrite();
  return { endAuction: (id) => send("endAuction", [BigInt(id)]), ...state };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useWithdrawBid
// ─────────────────────────────────────────────────────────────────────────────

export function useWithdrawBid(auctionId) {
  const chainId              = useChainId();
  const address              = getContractAddress(chainId);
  const { address: userAddr } = useAccount();
  const { send, ...state }   = useContractWrite();

  const { data: pendingAmount } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "pendingReturns",
    args:         [BigInt(auctionId ?? 0), userAddr ?? ethers.ZeroAddress],
    enabled:      !!address && !!userAddr && auctionId !== undefined,
    watch:        true,
  });

  return {
    withdrawBid:   () => send("withdrawBid", [BigInt(auctionId)]),
    pendingAmount,
    ...state,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useExtendBySeller
// ─────────────────────────────────────────────────────────────────────────────

export function useExtendBySeller() {
  const { send, ...state } = useContractWrite();
  return {
    extendBySeller: (auctionId, extraSecs) => send("extendBySeller", [BigInt(auctionId), BigInt(extraSecs)]),
    ...state,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useAdminPanel  — admin-only functions
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminPanel() {
  const chainId              = useChainId();
  const address              = getContractAddress(chainId);
  const { address: userAddr } = useAccount();
  const { send, ...state }   = useContractWrite();

  const { data: ownerAddr }   = useReadContract({ address, abi: AUCTION_ABI, functionName: "owner",           enabled: !!address });
  const { data: accumulated } = useReadContract({ address, abi: AUCTION_ABI, functionName: "accumulatedFees", enabled: !!address, watch: true });

  const isAdmin = userAddr && ownerAddr && userAddr.toLowerCase() === ownerAddr.toLowerCase();

  return {
    isAdmin,
    ownerAddr,
    accumulated,
    verifySeller:  (addr)             => send("verifySeller",  [addr]),
    revokeSeller:  (addr)             => send("revokeSeller",  [addr]),
    updateFees:    (sellerFee, buyerFee) => send("updateFees", [ethers.parseEther(sellerFee.toString()), ethers.parseEther(buyerFee.toString())]),
    withdrawFees:  ()                 => send("withdrawFees",  []),
    ...state,
  };
}