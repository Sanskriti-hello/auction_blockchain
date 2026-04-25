import { AuctionCard } from './AuctionCard';
import { useAuction } from '@/contexts/AuctionContext';

interface AuctionGridProps {
  onAuctionSelect: (auctionId: string) => void;
}

export function AuctionGrid({ onAuctionSelect }: AuctionGridProps) {
  const { auctions, isLoading } = useAuction();

  // Filter for active auctions only for the "Current Pulse" grid
  const activeAuctions = auctions.filter(a => a.status === 'active');

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
