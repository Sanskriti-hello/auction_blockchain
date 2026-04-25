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
  usePublicClient,
} from "wagmi";
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { fetchMetadata }        from "../utils/ipfs";
import { safeLog, safeError } from "../utils/safeStringify";

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

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash,
    },
  });

  // Log txHash state changes
  useEffect(() => {
    console.log("INTERNAL: txHash state changed", txHash);
  }, [txHash]);

  // Log pending state transitions
  useEffect(() => {
    console.log("INTERNAL: isPending state changed", isPending);
  }, [isPending]);

  // Log receipt hook status
  useEffect(() => {
    if (txHash) {
      safeLog("WAITING: useWaitForTransactionReceipt hook status", {
        hash: txHash,
        isLoading: receipt.isLoading,
        isFetching: receipt.isFetching,
        status: receipt.status,
        data: receipt.data ? "received" : "none"
      });
    }
  }, [txHash, receipt.isLoading, receipt.isFetching, receipt.status, receipt.data]);

  useEffect(() => {
    if (receipt.isSuccess) {
      safeLog("receipt success", receipt.data);
      setIsSuccess(true);
      setIsPending(false);
      window.dispatchEvent(new Event("auction-updated"));
    }
  }, [receipt.isSuccess, receipt.data]);

  useEffect(() => {
    if (receipt.isError) {
      safeError("receipt failed", receipt.error);
      if (receipt.error?.cause) safeError("receipt error cause", receipt.error.cause);
      if (receipt.error?.shortMessage) safeError("receipt error shortMessage", receipt.error.shortMessage);
      if (receipt.error?.message) safeError("receipt error message", receipt.error.message);
      safeError("full receipt error json", receipt.error);

      setError(parseContractError(receipt.error));
      setIsPending(false);
    }
  }, [receipt.isError, receipt.error]);

  // Timeout detection
  useEffect(() => {
    if (txHash && receipt.isLoading) {
      const timer = setTimeout(() => {
        console.error("transaction receipt timeout - 20s exceeded for hash", txHash);
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [txHash, receipt.isLoading]);

  const reset = () => { 
    console.log("INTERNAL: resetting contract write state");
    setError(null); setIsSuccess(false); setTxHash(null); 
  };

  const send = useCallback(async (functionName, args, value) => {
    safeLog("sending tx", { functionName, args, value });
    reset();
    setIsPending(true);
    try {
      const params = { address, abi: AUCTION_ABI, functionName, args };
      if (value !== undefined) params.value = value;
      
      safeLog("sending tx: calling writeContractAsync", params);
      const hash = await writeContractAsync(params);
      
      console.log("wallet returned hash", hash);
      if (!hash) {
        console.error("wallet returned EMPTY/UNDEFINED hash after confirmation");
      }
      
      setTxHash(hash);
      console.log("waiting for receipt", hash);
      return hash;
    } catch (e) {
      safeError("writeContractAsync failed", e);
      if (e?.cause) safeError("error cause", e.cause);
      if (e?.shortMessage) safeError("error shortMessage", e.shortMessage);
      if (e?.message) safeError("error message", e.message);
      safeError("full error json", e);

      setError(parseContractError(e));
      setIsPending(false);
      throw e;
    }
  }, [address, writeContractAsync]);

  return { address, send, isPending: isPending || receipt.isLoading, isSuccess, error, txHash, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
//  useAuctionList
//  Fetches all auctions + their IPFS metadata.
//  NOTE: auctionCounter is the NEXT id, so ids are 0 … auctionCounter-1
// ─────────────────────────────────────────────────────────────────────────────

const metadataCache = new Map();

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
    const refresh = () => refetch();
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, []);

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
          if (metadataCache.has(a.metadataCID)) {
            return { ...a, ...metadataCache.get(a.metadataCID) };
          }
          console.log("auction list metadata field", a.metadataCID);
          const meta = await fetchMetadata(a.metadataCID);
          metadataCache.set(a.metadataCID, meta);
          return { ...a, ...meta };
        } catch {
          return { 
            ...a, 
            name: "Untitled Auction", 
            description: "Metadata unavailable.", 
            image: null,
            metadataError: true 
          };
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
    const refresh = () => refetch();
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, []);

  useEffect(() => {
    if (!data) return;
    const [metadataCID] = data;
    
    if (metadata?.__cid === metadataCID) return;

    console.log("auction metadata field", metadataCID);
    fetchMetadata(metadataCID)
      .then((m) => {
        setMetadata({ ...m, __cid: metadataCID, error: false });
      })
      .catch((err) => {
        console.error("fetchMetadata failed for", metadataCID, err);
        setMetadata({ 
          name: "Untitled Auction", 
          description: "Metadata unavailable. Could not load auction details from IPFS.", 
          image: null, 
          __cid: metadataCID,
          error: true 
        });
      });
  }, [data, metadata?.__cid]);

  if (!data) return { isLoading, isError, refetch };

  const [metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders] = data;

  return {
    metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders,
    name:        metadata?.name        ?? "Loading…",
    description: metadata?.description ?? "",
    image:       metadata?.image       ?? null,
    condition:   metadata?.condition   ?? "",
    metadataError: metadata?.error     ?? false,
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

  const { data: sellerData, refetch: refetchSeller } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "sellers",
    args:         [userAddr ?? ethers.ZeroAddress],
    enabled:      !!address && !!userAddr,
  });

  const { data: regFee, refetch: refetchFee } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "sellerRegistrationFee",
    enabled:      !!address,
  });

  useEffect(() => {
    const refresh = () => { refetchVerified(); refetchSeller(); refetchFee(); };
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetchVerified, refetchSeller, refetchFee]);

  return {
    isVerified:   !!isVerified,
    hasPaidFee:   sellerData?.[1] ?? false,
    registeredAt: sellerData?.[2],
    regFee,
    refetch:      () => { refetchVerified(); refetchSeller(); refetchFee(); },
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
      safeLog("upload response", result);
      metadataCID = result.metadataCID;
      console.log("metadata uri", metadataCID);
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
    safeLog("placeBid attempt", { auctionId, bidAmountEth });
    const netBid  = ethers.parseEther(bidAmountEth.toString());
    const feeVal  = fee ?? 0n;
    const total   = netBid + feeVal;

    if (minTotal && total < minTotal) {
      safeError("Bid below minimum total", { total, minTotal });
      throw new Error("Bid below minimum total");
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

  return {
    endAuction: async (id) => {
      safeLog("end auction attempt", id);

      try {
        return await send("endAuction", [BigInt(id)]);
      } catch (e) {
        safeError("end auction failed", e);
        throw e;
      }
    },

    ...state,
  };
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
    extendBySeller: async (auctionId, extraSecs) => {
      safeLog("extend attempt", {
        auctionId,
        extraSecs,
      });

      try {
        return await send("extendBySeller", [BigInt(auctionId), BigInt(extraSecs)]);
      } catch (e) {
        safeError("extend failed", e);
        throw e;
      }
    },
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
  const publicClient         = usePublicClient();

  const { data: ownerAddr }   = useReadContract({ address, abi: AUCTION_ABI, functionName: "owner",           enabled: !!address });
  const { data: accumulated, refetch: refetchAcc } = useReadContract({ address, abi: AUCTION_ABI, functionName: "accumulatedFees", enabled: !!address, watch: true });

  const [pendingSellers, setPendingSellers] = useState([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const lastFetchRef = useRef(0);

  const isAdmin = userAddr && ownerAddr && String(userAddr).toLowerCase() === String(ownerAddr).toLowerCase();

  const fetchPendingSellers = useCallback(async () => {
    if (!address || !publicClient || !isAdmin) return;
    
    setIsEventsLoading(true);
    setLogsError(null);
    try {
      // Direct contract read: get total count of registration attempts
      const count = await publicClient.readContract({
        address,
        abi: AUCTION_ABI,
        functionName: 'getRegisteredSellersCount'
      });

      // Fetch all addresses that attempted registration
      const addrs = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) => 
          publicClient.readContract({
            address,
            abi: AUCTION_ABI,
            functionName: 'registeredSellers',
            args: [BigInt(i)]
          })
        )
      );

      // Deduplicate addresses
      const uniqueAddrs = [...new Set(addrs)];
      
      // Filter for those who are NOT yet verified
      const sellerStatuses = await Promise.all(
        uniqueAddrs.map(async (addr) => {
          const isVerified = await publicClient.readContract({
            address,
            abi: AUCTION_ABI,
            functionName: 'isVerifiedSeller',
            args: [addr]
          });
          return { addr, isVerified };
        })
      );

      setPendingSellers(sellerStatuses.filter(s => !s.isVerified).map(s => s.addr));
    } catch (e) {
      console.error("Failed to fetch pending sellers:", e);
      setLogsError("Failed to synchronize curation requests.");
    } finally {
      setIsEventsLoading(false);
    }
  }, [address, publicClient, isAdmin]);

  useEffect(() => {
    fetchPendingSellers();
  }, [fetchPendingSellers]);

  useEffect(() => {
    const refresh = () => {
      refetchAcc();
      fetchPendingSellers(); 
    };
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetchAcc, fetchPendingSellers]);

  return {
    isAdmin,
    ownerAddr,
    accumulated,
    pendingSellers,
    isEventsLoading,
    logsError,
    verifySeller:  (addr)             => send("verifySeller",  [addr]),
    revokeSeller:  (addr)             => send("revokeSeller",  [addr]),
    updateFees:    (sellerFee, buyerFee) => send("updateFees", [ethers.parseEther(sellerFee.toString()), ethers.parseEther(buyerFee.toString())]),
    withdrawFees:  ()                 => send("withdrawFees",  []),
    ...state,
  };
}
