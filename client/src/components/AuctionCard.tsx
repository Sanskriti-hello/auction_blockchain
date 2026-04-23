import React, { useState, useEffect } from 'react';
import { Gavel, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Auction } from '@/contexts/AuctionContext';

interface AuctionCardProps {
  auction: Auction;
  onBid: () => void;
  onClick: () => void;
}

export function AuctionCard({ auction, onBid, onClick }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = auction.endTime - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [auction.endTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -8 }}
      className="group rounded-xl overflow-hidden cursor-pointer"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden bg-black">
        <img
          src={auction.image}
          alt={auction.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-white font-heading italic text-lg mb-2 line-clamp-2">
          {auction.title}
        </h3>

        {/* Description */}
        <p className="text-white/50 text-sm font-body mb-4 line-clamp-1">
          {auction.description}
        </p>

        {/* Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-xs font-body">Current Bid</span>
            <span className="text-white font-heading italic text-lg">
              {auction.currentBid} ETH
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/60 text-xs font-body">Time Left</span>
            <div className="flex items-center gap-1 text-white/80">
              <Clock className="w-3 h-3" />
              <span className="text-xs font-body">{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Bid Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBid();
          }}
          className="w-full py-2 rounded-full text-sm font-medium text-black transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'rgb(255, 255, 255)',
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Gavel className="w-4 h-4" />
            Place Bid
          </div>
        </button>
      </div>
    </motion.div>
  );
}
