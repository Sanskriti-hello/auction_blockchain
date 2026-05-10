import { AuctionCard } from './AuctionCard';
import { useAuctionList } from '@/hooks/UseAuction';
import { ipfsImageUrl } from '@/utils/ipfs';

interface AuctionGridProps {
  onAuctionSelect: (auctionId: string) => void;
}

export function AuctionGrid({ onAuctionSelect }: AuctionGridProps) {
  const { auctions, isLoading } = useAuctionList() as { auctions: any[]; isLoading: boolean };
  const now = Math.floor(Date.now() / 1000);

  const activeAuctions = auctions
    .filter((auction) => !auction.ended)
    .map((auction) => {
      const deadline = Number(auction.deadline ?? 0);
      return {
        id: String(auction.id),
        title: auction.name || `Auction #${auction.id}`,
        image: auction.image ? ipfsImageUrl(auction.image) : '',
        currentBid: Number(auction.highestBid ?? 0n) / 1e18,
        endTime: deadline * 1000,
        status: deadline <= now ? 'finalizing' as const : 'active' as const,
      };
    });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[500px] rounded-[2.5rem] bg-white/[0.02] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (activeAuctions.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
        <p className="text-white/30 font-body uppercase tracking-[0.2em] text-xs">The market is currently quiet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
      {activeAuctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          onClick={() => onAuctionSelect(auction.id)}
          onBid={() => onAuctionSelect(auction.id)}
        />
      ))}
    </div>
  );
}
