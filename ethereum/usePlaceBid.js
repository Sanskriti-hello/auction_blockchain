// src/hooks/usePlaceBid.js
// ─────────────────────────────────────────────────────────────────────────────
// Place a bid on an auction.
// msg.value = participationFee + netBidAmount (both fetched from the contract).
// ─────────────────────────────────────────────────────────────────────────────

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from "wagmi";
import { useState } from "react";
import { ethers } from "ethers";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { parseContractError } from "../utils/formatters";

/**
 * @param {number|bigint} auctionId
 *
 * @returns {{
 *   placeBid: (bidAmountEth: string) => Promise<void>,
 *   isPending,
 *   isSuccess,
 *   error,
 *   txHash,
 *   fee,          ← current participation fee in wei (bigint)
 *   minBidTotal,  ← minimum total msg.value in wei (bigint)
 * }}
 */
export function usePlaceBid(auctionId) {
  const chainId = useChainId();
  const address = getContractAddress(chainId);

  const [error,     setError]     = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash,    setTxHash]    = useState(null);

  // Fetch current fee and minimum bid total from contract
  const { data: fee } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "participationFee",
    args:         [BigInt(auctionId ?? 0)],
    enabled:      auctionId !== undefined && !!address,
    watch:        true,
  });

  const { data: minBidTotal } = useReadContract({
    address,
    abi:          AUCTION_ABI,
    functionName: "minimumBidTotal",
    args:         [BigInt(auctionId ?? 0)],
    enabled:      auctionId !== undefined && !!address,
    watch:        true,
  });

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isTxLoading } = useWaitForTransactionReceipt({
    hash:    txHash,
    enabled: !!txHash,
    onSuccess() { setIsSuccess(true); setIsPending(false); },
    onError(e)  { setError(parseContractError(e)); setIsPending(false); },
  });

  /**
   * @param {string} bidAmountEth  — the NET bid amount in ETH e.g. "1.5"
   *                                 The participation fee is added automatically.
   */
  async function placeBid(bidAmountEth) {
    setError(null);
    setIsSuccess(false);
    setIsPending(true);

    try {
      const netBid   = ethers.parseEther(bidAmountEth.toString());
      const feeValue = fee ?? 0n;
      const total    = netBid + feeValue;

      // Guard: check against on-chain minimum before sending tx
      if (minBidTotal && total < minBidTotal) {
        setError(`Bid too low. Minimum is ${ethers.formatEther(minBidTotal)} ETH (including fee).`);
        setIsPending(false);
        return;
      }

      const hash = await writeContractAsync({
        address,
        abi:          AUCTION_ABI,
        functionName: "placeBid",
        args:         [BigInt(auctionId)],
        value:        total,
      });

      setTxHash(hash);

    } catch (e) {
      setError(parseContractError(e));
      setIsPending(false);
    }
  }

  return {
    placeBid,
    isPending: isPending || isTxLoading,
    isSuccess,
    error,
    txHash,
    fee,
    minBidTotal,
  };
}
