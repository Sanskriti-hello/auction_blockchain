export interface AuctionRecord {
  id: number | string;
  metadataCID?: string;
  seller?: `0x${string}` | string;
  highestBid?: bigint;
  highestBidder?: `0x${string}` | string;
  deadline?: bigint | number | string;
  ended?: boolean;
  numBidders?: bigint | number;
  name?: string;
  description?: string;
  image?: string | null;
  condition?: string;
  metadataError?: boolean;
}

export interface WriteState {
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: `0x${string}` | null;
  reset: () => void;
}

export function useAuctionList(): {
  auctions: AuctionRecord[];
  count: number;
  isLoading: boolean;
  refetch: () => void;
};

export function useAuction(auctionId?: string | number | null): AuctionRecord & {
  fee?: bigint;
  minTotal?: bigint;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useSellerStatus(): {
  isVerified: boolean;
  hasPaidFee: boolean;
  registeredAt?: bigint;
  regFee?: bigint;
  refetch: () => void;
};

export function useRegisterAsSeller(): WriteState & {
  register: (feeWei: bigint) => Promise<`0x${string}`>;
};

export function useCreateAuction(): WriteState & {
  step: "uploading" | "confirming" | null;
  createAuction: (input: {
    name: string;
    title?: string;
    description: string;
    condition?: string;
    imageFile: File;
    startingPrice: string;
    durationSeconds: number;
    minIncrement: string;
  }) => Promise<`0x${string}`>;
};

export function usePlaceBid(auctionId?: string | number | null): WriteState & {
  fee?: bigint;
  minTotal?: bigint;
  placeBid: (bidAmountEth: string) => Promise<`0x${string}`>;
};

export function useEndAuction(): WriteState & {
  endAuction: (id: string | number) => Promise<`0x${string}`>;
};

export function useWithdrawBid(auctionId?: string | number | null): WriteState & {
  pendingAmount?: bigint;
  withdrawBid: () => Promise<`0x${string}`>;
};

export function useExtendBySeller(): WriteState & {
  extendBySeller: (auctionId: string | number, extraSecs: string | number | bigint) => Promise<`0x${string}`>;
};

export function useAdminPanel(): WriteState & {
  isAdmin: boolean;
  accumulated?: bigint;
  pendingSellers: `0x${string}`[];
  isEventsLoading: boolean;
  logsError: string | null;
  fetchPendingSellers: () => Promise<void>;
  verifySeller: (address: `0x${string}` | string) => Promise<`0x${string}`>;
  revokeSeller: (address: `0x${string}` | string) => Promise<`0x${string}`>;
  withdrawFees: () => Promise<`0x${string}`>;
};
