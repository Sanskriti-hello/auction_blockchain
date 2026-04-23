// src/hooks/useAuctionActions.js
// ─────────────────────────────────────────────────────────────────────────────
// Smaller action hooks: endAuction, withdrawBid, extendBySeller.
// Each follows the same pattern:  write → wait for receipt → surface status.
// ─────────────────────────────────────────────────────────────────────────────

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useAccount } from "wagmi";
import { useState } from "react";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { parseContractError } from "../utils/formatters";

// ── Shared internal helper ────────────────────────────────────────────────────

function useContractAction() {
  const chainId  = useChainId();
  const address  = getContractAddress(chainId);

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

  async function send(functionName, args) {
    setError(null);
    setIsSuccess(false);
    setIsPending(true);
    try {
      const hash = await writeContractAsync({ address, abi: AUCTION_ABI, functionName, args });
      setTxHash(hash);
    } catch (e) {
      setError(parseContractError(e));
      setIsPending(false);
    }
  }

  return {
    address,
    send,
    isPending: isPending || isTxLoading,
    isSuccess,
    error,
    txHash,
  };
}

// ── useEndAuction ─────────────────────────────────────────────────────────────

/**
 * Ends an auction after its deadline. Callable by anyone.
 *
 * @returns {{ endAuction: (auctionId) => void, isPending, isSuccess, error }}
 */
export function useEndAuction() {
  const { send, ...state } = useContractAction();
  return {
    ...state,
    endAuction: (auctionId) => send("endAuction", [BigInt(auctionId)]),
  };
}

// ── useWithdrawBid ────────────────────────────────────────────────────────────

/**
 * Withdraws pending ETH for the connected wallet on a given auction.
 * Works for losing bidders AND the seller (after endAuction).
 *
 * @param {number|bigint} auctionId
 *
 * @returns {{
 *   withdrawBid: () => void,
 *   isPending, isSuccess, error,
 *   pendingAmount  ← wei the caller can withdraw right now
 * }}
 */
export function useWithdrawBid(auctionId) {
  const chainId  = useChainId();
  const address  = getContractAddress(chainId);
  const { address: userAddr } = useAccount();
  const { send, ...state }    = useContractAction();

  const { data: pendingAmount, refetch: refetchPending } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "pendingReturns",
    args:         [BigInt(auctionId ?? 0), userAddr ?? "0x0000000000000000000000000000000000000000"],
    enabled:      auctionId !== undefined && !!address && !!userAddr,
    watch:        true,
  });

  return {
    ...state,
    pendingAmount,
    withdrawBid: () => send("withdrawBid", [BigInt(auctionId)]),
    refetchPending,
  };
}

// ── useExtendBySeller ─────────────────────────────────────────────────────────

/**
 * Seller extends their own auction deadline.
 *
 * @returns {{ extendBySeller: (auctionId, extraSeconds) => void, isPending, isSuccess, error }}
 */
export function useExtendBySeller() {
  const { send, ...state } = useContractAction();
  return {
    ...state,
    extendBySeller: (auctionId, extraSeconds) =>
      send("extendBySeller", [BigInt(auctionId), BigInt(extraSeconds)]),
  };
}
