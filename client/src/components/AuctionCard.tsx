import React, { useState, useEffect } from 'react';
import { Gavel, Clock, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Auction } from '@/contexts/AuctionContext';

interface AuctionCardProps {
  auction: Auction;
  onBid: () => void;
  onClick: () => void;
}

export function AuctionCard({ auction, onBid, onClick }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // An auction is visually "ended" if the contract says so OR if the deadline has passed
  const isExpired = auction.endTime <= now;
  const isEnded = auction.status === 'ended' || isExpired;

  useEffect(() => {
    if (isEnded) {
      setTimeLeft(isExpired && auction.status !== 'ended' ? 'Pending Closure' : 'Heritage');
      return;
    }

    const updateTimer = () => {
      const diff = auction.endTime - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
      else setTimeLeft(`${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [auction.endTime, isEnded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
      className={`group relative rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-700 ${isEnded ? 'opacity-70 saturate-[0.25] hover:opacity-100 hover:saturate-100' : ''}`}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(40px)',
      }}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative h-72 overflow-hidden bg-black border-b border-white/5 flex items-center justify-center">
        {auction.image ? (
          <img
            src={auction.image}
            alt={auction.title}
            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('bg-zinc-900');
            }}
          />
        ) : (
          <div className="flex flex-col items-center opacity-10">
            <ImageOff className="w-12 h-12 mb-2" />
            <p className="text-[10px] uppercase tracking-[0.2em]">Missing Asset</p>
          </div>
        )}
        <div className="absolute top-6 right-6 z-10">
          <div className={`px-4 py-1.5 rounded-full backdrop-blur-xl border text-[10px] font-medium uppercase tracking-[0.2em] shadow-2xl ${isEnded ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {isEnded ? 'Inactive' : 'Live'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-10">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`text-2xl font-heading italic truncate max-w-[70%] ${isEnded ? 'text-white/60' : 'text-white'}`}>
            {auction.title}
          </h3>
          <div className={`flex items-center gap-1.5 ${isEnded ? 'text-red-400/60' : 'text-emerald-500/80'}`}>
            {!isEnded && <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />}
            <span className="text-[10px] uppercase tracking-widest font-body">
              {isEnded ? 'Ended' : 'Active'}
            </span>
          </div>
        </div>

        <p className="text-white/30 text-[10px] font-body uppercase tracking-[0.15em] mb-10 block">
          Ref. {auction.id.slice(0, 8)}
        </p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-8 mb-10 border-y border-white/5 py-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-body mb-3">
              {isEnded ? 'Settled For' : 'Highest Bid'}
            </p>
            <p className="text-3xl font-heading italic text-white flex items-baseline gap-1">
              {auction.currentBid} <span className="text-[10px] uppercase not-italic text-white/30 tracking-widest">ETH</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-body mb-3">
              {isEnded ? 'Closed At' : 'Closing In'}
            </p>
            <div className="flex items-center gap-2 text-white/70 justify-end">
              {!isEnded && <Clock className="w-3 h-3 text-emerald-500/60" />}
              <span className="text-sm font-heading italic">{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Action ghost button */}
        <div className="relative overflow-hidden rounded-full border border-white/10 group-hover:border-emerald-500/30 transition-colors duration-500">
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.03] transition-opacity" />
          <div className="px-6 py-4 text-center text-[10px] uppercase tracking-[0.3em] font-medium text-white/40 group-hover:text-white transition-colors">
            {isEnded ? 'View Provenance' : 'Place Offer'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
