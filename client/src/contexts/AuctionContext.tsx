import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { AUCTION_ABI, getContractAddress } from "@/config/contract";
import { useAuctionList } from "@/hooks/UseAuction";
import { ipfsImageUrl, uploadMetadata } from "@/utils/ipfs";
import { parseContractError, parseEth } from "@/utils/formatters";
import { zeroAddress } from "viem";

export interface Bid {
  id: string;
  bidder: string;
  amount: number;
  timestamp: number;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  image: string;
  startingBid: number;
  currentBid: number;
  highestBidder: string | null;
  bids: Bid[];
  endTime: number;
  status: "active" | "ended" | "won" | "lost";
  creator: string;
}

interface AuctionInput {
  title: string;
  description: string;
  image: string;
  startingBid: number;
  endTime: number;
  status: "active" | "ended" | "won" | "lost";
  creator: string;
}

interface AuctionContextType {
  auctions: Auction[];
  selectedAuction: Auction | null;
  isLoading: boolean;
  error: string | null;
  selectAuction: (auctionId: string) => void;
  createAuction: (auction: AuctionInput) => Promise<boolean>;
  placeBid: (auctionId: string, amount: number) => Promise<void>;
  finalizeAuction: (auctionId: string) => Promise<void>;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export function AuctionProvider({ children }: { children: ReactNode }) {
  const chainId = useChainId();
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();
  const contractAddress = getContractAddress(chainId);
  const { writeContractAsync } = useWriteContract();
  const { auctions: chainAuctions, isLoading: isListLoading } = useAuctionList();

  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auctions = useMemo<Auction[]>(() => {
    return chainAuctions.map((auction: any) => {
      const highestBidder =
        auction.highestBidder && auction.highestBidder !== zeroAddress ? auction.highestBidder : null;
      const currentBid = Number(auction.highestBid > 0n ? auction.highestBid : 0n);

      return {
        id: String(auction.id),
        title: auction.name ?? `Auction #${auction.id}`,
        description: auction.description ?? "Metadata unavailable",
        image: auction.image ?? "",
        startingBid: currentBid / 1e18,
        currentBid: currentBid / 1e18,
        highestBidder,
        bids: [],
        endTime: Number(auction.deadline) * 1000,
        status: auction.ended ? "ended" : "active",
        creator: auction.seller || walletAddress || "",
      };
    });
  }, [chainAuctions, walletAddress]);

  const selectedAuction = useMemo(
    () => auctions.find((auction) => auction.id === selectedAuctionId) ?? null,
    [auctions, selectedAuctionId]
  );

  useEffect(() => {
    if (!selectedAuctionId) return;
    if (!auctions.some((auction) => auction.id === selectedAuctionId)) {
      setSelectedAuctionId(null);
    }
  }, [auctions, selectedAuctionId]);

  async function waitForReceipt(hash: `0x${string}`) {
    if (!publicClient) {
      throw new Error("Public client is not available");
    }
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function createAuction(auction: AuctionInput) {
    if (!contractAddress) {
      setError("Contract address is not configured for the connected chain.");
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const durationSeconds = Math.max(3600, Math.floor((auction.endTime - Date.now()) / 1000));
      const { uploadAuctionToIPFS } = await import("@/utils/ipfs");
      const { metadataCID } = await uploadAuctionToIPFS({
        name: auction.title,
        description: auction.description,
        condition: "Good",
        imageFile: null,
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "createAuction",
        args: [metadataCID, parseEth(auction.startingBid), BigInt(durationSeconds), parseEth("0.01")],
      });

      await waitForReceipt(hash);
      return true;
    } catch (caught) {
      setError(parseContractError(caught));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function placeBid(auctionId: string, amount: number) {
    if (!contractAddress || !publicClient) {
      setError("Contract address is not configured for the connected chain.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const auctionIdBigInt = BigInt(auctionId);
      const fee = (await publicClient.readContract({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "buyerFee",
        args: [auctionIdBigInt],
      })) as bigint;

      const total = parseEth(amount) + fee;

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "placeBid",
        args: [auctionIdBigInt],
        value: total,
      });

      await waitForReceipt(hash);
    } catch (caught) {
      setError(parseContractError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function finalizeAuction(auctionId: string) {
    if (!contractAddress) {
      setError("Contract address is not configured for the connected chain.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AUCTION_ABI,
        functionName: "endAuction",
        args: [BigInt(auctionId)],
      });

      await waitForReceipt(hash);
    } catch (caught) {
      setError(parseContractError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuctionContext.Provider
      value={{
        auctions,
        selectedAuction,
        isLoading: isListLoading || isSubmitting,
        error,
        selectAuction: setSelectedAuctionId,
        createAuction,
        placeBid,
        finalizeAuction,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error("useAuction must be used within AuctionProvider");
  }
  return context;
}
