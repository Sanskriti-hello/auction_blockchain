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
import { useState, useEffect, useCallback } from "react";
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
    hash: txHash || undefined,
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
const SELLER_REGISTERED_EVENT = {
  type: "event",
  name: "SellerRegistered",
  inputs: [
    { type: "address", name: "seller", indexed: true },
    { type: "uint256", name: "feePaid", indexed: false },
  ],
};

async function getAllSellerRegisteredLogs({
  publicClient,
  contractAddress,
  event,
  fromBlock,
  toBlock,
}) {
  const STEP = 10n; // Aggressive chunking for restrictive free-tier RPCs
  let allLogs = [];

  for (let start = fromBlock; start <= toBlock; start += STEP) {
    const end = start + STEP - 1n > toBlock ? toBlock : start + STEP - 1n;
    try {
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event,
        fromBlock: start,
        toBlock: end,
      });
      allLogs.push(...logs);
    } catch (err) {
      console.error(`Failed to fetch logs for block range ${start}-${end}:`, err.message);
    }
    
    // Small delay to prevent rate-limiting on high-frequency requests
    if (start + STEP <= toBlock) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return allLogs;
}

export function useAuctionList() {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const [auctions,  setAuctions]  = useState([]);
  const [enriched,  setEnriched]  = useState([]);

  const { data: counterData, refetch: refetchCounter } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "auctionCounter",
    query: {
      enabled:      !!address,
    },
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
    query: {
      enabled:   !!address && count > 0,
    },
  });

  useEffect(() => {
    if (!results || count === 0) {
      setAuctions([]);
      setEnriched([]);
      return;
    }

    const parsed = results
      .map((entry, id) => {
        if (!entry || entry.status !== "success" || !entry.result) return null;
        const [metadataCID, seller, highestBid, highestBidder, deadline, ended, numBidders] = entry.result;
        return {
          id,
          metadataCID,
          seller,
          highestBid,
          highestBidder,
          deadline,
          ended,
          numBidders,
        };
      })
      .filter(Boolean);

    setAuctions(parsed);

    let cancelled = false;
    Promise.all(
      parsed.map(async (auction) => {
        if (!auction.metadataCID) return auction;

        try {
          if (!metadataCache.has(auction.metadataCID)) {
            metadataCache.set(auction.metadataCID, fetchMetadata(auction.metadataCID));
          }
          const metadata = await metadataCache.get(auction.metadataCID);
          return { ...auction, ...(metadata || {}), metadataError: false };
        } catch (err) {
          console.error("fetchMetadata failed for", auction.metadataCID, err);
          metadataCache.delete(auction.metadataCID);
          return {
            ...auction,
            name: `Auction #${auction.id}`,
            description: "Metadata unavailable. Could not load auction details from IPFS.",
            image: null,
            metadataError: true,
          };
        }
      })
    ).then((items) => {
      if (!cancelled) setEnriched(items);
    });

    return () => {
      cancelled = true;
    };
  }, [results, count]);

  const refetch = useCallback(() => {
    refetchCounter();
    refetchAll();
  }, [refetchCounter, refetchAll]);

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetch]);

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
    query: {
      enabled:      auctionId !== undefined && auctionId !== null && !!address,
    },
    watch:        true,
  });

  const { data: fee,      refetch: refetchFee }   = useReadContract({ address, abi: AUCTION_ABI, functionName: "buyerFee",        args: [BigInt(auctionId ?? 0)], query: { enabled: !!address && auctionId !== undefined && auctionId !== null }, watch: true });
  const { data: minTotal, refetch: refetchMin }   = useReadContract({ address, abi: AUCTION_ABI, functionName: "minimumBidTotal", args: [BigInt(auctionId ?? 0)], query: { enabled: !!address && auctionId !== undefined && auctionId !== null }, watch: true });

  useEffect(() => {
    const refresh = () => { refetchFee(); refetchMin(); };
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetchFee, refetchMin]);

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetch]);

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
    query: {
      enabled:      !!address && !!userAddr,
    },
    watch:        true,
  });

  const { data: sellerData, refetch: refetchSeller } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "sellers",
    args:         [userAddr ?? ethers.ZeroAddress],
    query: {
      enabled:      !!address && !!userAddr,
    },
  });

  const { data: regFee, refetch: refetchFee } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "sellerRegistrationFee",
    query: {
      enabled:      !!address,
    },
  });

  useEffect(() => {
    const refresh = () => { refetchVerified(); refetchSeller(); refetchFee(); };
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetchVerified, refetchSeller, refetchFee]);

  return {
    isVerified:   !!isVerified,
    hasPaidFee:   (typeof sellerData === 'object' && sellerData !== null && !Array.isArray(sellerData) ? sellerData.hasPaidFee : sellerData?.[1]) ?? false,
    registeredAt: typeof sellerData === 'object' && sellerData !== null && !Array.isArray(sellerData) ? sellerData.registeredAt : sellerData?.[2],
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
    state.reset();
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
      ethers.parseEther(String(startingPrice)),
      BigInt(durationSeconds),
      ethers.parseEther(String(minIncrement)),
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
  const publicClient = usePublicClient();

  const { data: fee,      refetch: refetchFee }   = useReadContract({ address, abi: AUCTION_ABI, functionName: "buyerFee",        args: [BigInt(auctionId ?? 0)], query: { enabled: !!address && auctionId !== undefined }, watch: true });
  const { data: minTotal, refetch: refetchMin }   = useReadContract({ address, abi: AUCTION_ABI, functionName: "minimumBidTotal", args: [BigInt(auctionId ?? 0)], query: { enabled: !!address && auctionId !== undefined }, watch: true });

  useEffect(() => {
    const refresh = () => { refetchFee(); refetchMin(); };
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetchFee, refetchMin]);

  async function placeBid(bidAmountEth) {
    safeLog("placeBid attempt", { auctionId, bidAmountEth });
    if (!address || !publicClient || auctionId === undefined || auctionId === null) {
      throw new Error("Contract is not ready for bidding.");
    }

    const auctionIdBigInt = BigInt(auctionId);
    const netBid  = ethers.parseEther(String(bidAmountEth));
    const [liveFee, liveMinTotal] = await Promise.all([
      publicClient.readContract({
        address,
        abi: AUCTION_ABI,
        functionName: "buyerFee",
        args: [auctionIdBigInt],
      }),
      publicClient.readContract({
        address,
        abi: AUCTION_ABI,
        functionName: "minimumBidTotal",
        args: [auctionIdBigInt],
      }),
    ]);
    const total   = netBid + liveFee;

    if (liveMinTotal && total < liveMinTotal) {
      safeError("Bid below live minimum total", { total, liveMinTotal });
      throw new Error("Bid below minimum total");
    }

    return send("placeBid", [auctionIdBigInt], total);
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

  const { data: pendingAmount, refetch: refetchPending } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "pendingReturns",
    args:         [BigInt(auctionId ?? 0), userAddr ?? ethers.ZeroAddress],
    query: {
      enabled:      !!address && !!userAddr && auctionId !== undefined,
    },
    watch:        true,
  });

  useEffect(() => {
    const refresh = () => refetchPending();
    window.addEventListener("auction-updated", refresh);
    return () => window.removeEventListener("auction-updated", refresh);
  }, [refetchPending]);

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
  const { address: userAddr, isConnected } = useAccount();
  const { send, ...state }   = useContractWrite();
  const publicClient         = usePublicClient();

  const { data: ownerAddr, error: ownerError } = useReadContract({
    address,
    abi: AUCTION_ABI,
    functionName: "owner",
    query: {
      enabled: !!address,
    },
  });

  const { data: accumulated, refetch: refetchAcc } = useReadContract({
    address,
    abi: AUCTION_ABI,
    functionName: "accumulatedFees",
    query: {
      enabled: !!address,
    },
    watch: true,
  });

  const [pendingSellers, setPendingSellers] = useState([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  // Robust admin check: dynamic owner, normalized casing, and chain/connection validation
  const isAdmin = !!(
    isConnected && 
    userAddr && 
    ownerAddr && 
    userAddr.toLowerCase() === String(ownerAddr).toLowerCase()
  );

  const fetchPendingSellers = useCallback(async () => {
    if (!address || !publicClient || !isAdmin) {
      setPendingSellers([]);
      return;
    }
    
    setIsEventsLoading(true);
    setLogsError(null);
    try {
      // Get current block to avoid "latest" incompatibility with some RPCs (like Google)
      const latestBlock = await publicClient.getBlockNumber();
      // Use deployment block for Sepolia if on that chain, otherwise 0
      const fromBlock = chainId === 11155111 ? 10825843n : 0n;

      const logs = await getAllSellerRegisteredLogs({
        publicClient,
        contractAddress: address,
        event: SELLER_REGISTERED_EVENT,
        fromBlock,
        toBlock: latestBlock,
      });

      const uniqueAddrs = [
        ...new Set(
          logs
            .map((log) => log.args?.seller)
            .filter(Boolean)
            .map((addr) => String(addr))
        ),
      ];
      
      const sellerStatuses = await Promise.all(
        uniqueAddrs.map(async (addr) => {
          const [isVerified, sellerData] = await Promise.all([
            publicClient.readContract({
              address,
              abi: AUCTION_ABI,
              functionName: "isVerifiedSeller",
              args: [addr],
            }),
            publicClient.readContract({
              address,
              abi: AUCTION_ABI,
              functionName: "sellers",
              args: [addr],
            }),
          ]);
          
          // Viem v2 returns objects for structs with named properties, arrays otherwise
          const hasPaidFee = typeof sellerData === 'object' && sellerData !== null && !Array.isArray(sellerData) 
            ? sellerData.hasPaidFee 
            : sellerData?.[1];
            
          return { addr, isVerified, hasPaidFee };
        })
      );

      setPendingSellers(sellerStatuses.filter((s) => s.hasPaidFee && !s.isVerified).map((s) => s.addr));
    } catch (e) {
      console.error("Failed to fetch pending sellers:", e);
      setLogsError("Failed to synchronize curation requests.");
    } finally {
      setIsEventsLoading(false);
    }
  }, [address, publicClient, isAdmin, chainId]);

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
