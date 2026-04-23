import React from 'react';
import { AuctionCard } from './AuctionCard';
import { useAuction } from '@/contexts/AuctionContext';

interface AuctionGridProps {
  onAuctionSelect: (auctionId: string) => void;
}

export function AuctionGrid({ onAuctionSelect }: AuctionGridProps) {
  const { auctions } = useAuction();

  return (
    <section id="explore" className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-heading italic text-white mb-4">
            Live Auctions
          </h2>
          <p className="text-white/60 font-body text-lg">
            Explore active auctions and place your bids on premium digital assets
          </p>
        </div>

        {/* Auction Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              onClick={() => onAuctionSelect(auction.id)}
              onBid={() => onAuctionSelect(auction.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
