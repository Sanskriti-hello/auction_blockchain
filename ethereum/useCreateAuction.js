// src/hooks/useCreateAuction.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles the full create-auction flow:
//   1. Upload metadata JSON (+ images) to IPFS via Pinata
//   2. Encode the CID as bytes32
//   3. Call createAuction() on-chain
//   4. Save the CID mapping to local state (so the list can show names)
// ─────────────────────────────────────────────────────────────────────────────

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { useState } from "react";
import { ethers } from "ethers";
import { AUCTION_ABI, getContractAddress } from "../config/contract";
import { uploadMetadata, uploadFile } from "../utils/ipfs";
import { parseContractError } from "../utils/formatters";

/**
 * @param {Function} saveCid   — from useAuctionList, persists cidBytes32 → cid mapping
 *
 * @returns {{
 *   createAuction: (params) => Promise<void>,
 *   isPending,        ← true while IPFS upload or tx is in flight
 *   isSuccess,
 *   error,
 *   txHash
 * }}
 *
 * params shape:
 * {
 *   name:           string,   item title
 *   description:    string,
 *   condition:      string,
 *   imageFiles:     File[],   browser File objects from <input type="file" multiple>
 *   startingPrice:  string,   in ETH e.g. "1.5"
 *   durationSeconds: number,  e.g. 3600 for 1 hour
 *   minIncrement:   string,   in ETH e.g. "0.1"
 * }
 */
export function useCreateAuction(saveCid) {
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

  async function createAuction({
    name,
    description,
    condition,
    imageFiles = [],
    startingPrice,
    durationSeconds,
    minIncrement,
  }) {
    setError(null);
    setIsSuccess(false);
    setIsPending(true);

    try {
      // ── Step 1: Upload images to IPFS first ──────────────────────────────
      const imageCids = await Promise.all(
        imageFiles.map((file) => uploadFile(file))
      );

      // ── Step 2: Upload metadata JSON to IPFS ─────────────────────────────
      const { cid, cidBytes32 } = await uploadMetadata({
        name,
        description,
        condition,
        images: imageCids,  // array of IPFS CIDs for the photos
      });

      // ── Step 3: Call createAuction on-chain ───────────────────────────────
      const hash = await writeContractAsync({
        address,
        abi:          AUCTION_ABI,
        functionName: "createAuction",
        args: [
          cidBytes32,
          ethers.parseEther(startingPrice.toString()),
          BigInt(durationSeconds),
          ethers.parseEther(minIncrement.toString()),
        ],
      });

      setTxHash(hash);

      // ── Step 4: Persist CID mapping so the auction list can show names ────
      // Must be done here (we have the original cid string),
      // the chain only stores the bytes32 hash.
      saveCid(cidBytes32, cid);

    } catch (e) {
      setError(parseContractError(e));
      setIsPending(false);
    }
  }

  return {
    createAuction,
    isPending: isPending || isTxLoading,
    isSuccess,
    error,
    txHash,
  };
}
