import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock, User, Wallet, Trophy, RefreshCw, ImageOff, AlertCircle } from 'lucide-react';
import {
  useAuction,
  useEndAuction,
  useWithdrawBid,
  useExtendBySeller,
  usePlaceBid,
  useAdminPanel
} from '@/hooks/UseAuction';
import { formatEthShort, shortAddr } from '@/utils/formatters';
import { useWeb3 } from '@/contexts/Web3Context';
import { ipfsImageUrl } from '@/utils/ipfs';

interface AuctionDetailProps {
  auctionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuctionDetail({ auctionId, isOpen, onClose }: AuctionDetailProps) {
  const { address, isConnected } = useWeb3();
  const auction = useAuction(auctionId);
  const {
    seller,
    highestBid,
    highestBidder,
    deadline,
    ended,
    numBidders,
    name: title,
    description,
    image,
    condition,
    fee,
    minTotal: minBidTotal,
    isLoading,
    metadataError,
    refetch,
    isError: chainError
  } = auction;

  const adminPanel = useAdminPanel();
  const isAdmin = adminPanel?.isAdmin ?? false;
  
  const placeBidHook = usePlaceBid(auctionId);
  const endAuctionHook = useEndAuction();
  const withdrawBidHook = useWithdrawBid(auctionId);
  const extendBySellerHook = useExtendBySeller();

  const { placeBid, isPending: isBidPending, error: bidError, txHash: bidHash } = placeBidHook;
  const { endAuction, isPending: isEndPending, error: endError, txHash: endHash } = endAuctionHook;
  const { withdrawBid, pendingAmount, isPending: isWithdrawPending, error: withdrawError, txHash: withdrawHash } = withdrawBidHook;
  const { extendBySeller, isPending: isExtendPending, error: extendError, txHash: extendHash } = extendBySellerHook;

  const isPending = isBidPending || isEndPending || isWithdrawPending || isExtendPending;
  const error = bidError || endError || withdrawError || extendError;
  const txHash = bidHash || endHash || withdrawHash || extendHash;

  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [extensionHours, setExtensionHours] = useState('1');

  const auctionEndTime = Number(deadline || 0) * 1000;
  
  const isExpired = useMemo(() => {
    if (!deadline) return false;
    return Number(deadline) <= Math.floor(Date.now() / 1000);
  }, [deadline]);

  const isActuallyEnded = !!(ended || isExpired);

  const isSeller = useMemo(() => {
    if (!seller || !address) return false;
    return String(seller).toLowerCase() === String(address).toLowerCase();
  }, [address, seller]);

  const isHighestBidder = useMemo(() => {
    if (!highestBidder || !address) return false;
    return String(highestBidder).toLowerCase() === String(address).toLowerCase();
  }, [address, highestBidder]);

  const canBid = useMemo(() => {
    return !!(isConnected && !isSeller && !ended && !isExpired);
  }, [isConnected, isSeller, ended, isExpired]);

  const canEnd = useMemo(() => {
    return !!((isSeller || isAdmin) && !ended && isExpired);
  }, [isSeller, isAdmin, ended, isExpired]);
  
  // Withdraw MUST ONLY appear if: user connected, has pending balance, and is not the current leading bidder of an active auction
  const canWithdraw = useMemo(() => {
    const hasBalance = (pendingAmount ?? 0n) > 0n;
    const isLeadingActive = isHighestBidder && !isActuallyEnded;
    return !!(isConnected && hasBalance && !isLeadingActive);
  }, [isConnected, isHighestBidder, isActuallyEnded, pendingAmount]);

  if (!isOpen) return null;

  const imageUrl = image ? ipfsImageUrl(image) : null;

  const handlePlaceBid = async () => {
    if (!canBid || !bidAmount) return;
    try {
      const hash = await placeBid(bidAmount);
      if (hash) setBidAmount('');
    } catch (e) {
      // Error is handled by hook state
    }
  };

  const handleEndAuction = async () => {
    if (!auctionId || (!isSeller && !isAdmin)) return;
    try {
      await endAuction(auctionId);
    } catch (e) {
      // Handled by state
    }
  };

  // Final safety check to prevent crash if hook returned malformed object
  if (!auction) {
     return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 text-center">
              <p className="text-white/60 mb-4">Unable to load auction context.</p>
              <button onClick={onClose} className="px-6 py-2 bg-white text-black rounded-full font-medium">Close</button>
           </div>
        </div>
     );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(40px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="p-8">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center text-white/60 font-body">
              <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-50" />
              <p className="uppercase tracking-widest text-xs">Synchronizing with blockchain...</p>
            </div>
          ) : chainError || !seller ? (
             <div className="py-32 flex flex-col items-center justify-center text-white/60 font-body">
              <AlertCircle className="w-8 h-8 mb-4 text-red-400 opacity-50" />
              <p className="uppercase tracking-widest text-xs">Auction not found or failed to load.</p>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-xl overflow-hidden h-72 bg-black flex items-center justify-center border border-white/10">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={title} 
                    className={`w-full h-full object-cover ${isActuallyEnded ? 'grayscale opacity-50' : ''}`} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.classList.add('bg-zinc-900');
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center opacity-20">
                    <ImageOff className="w-12 h-12 mb-2" />
                    <p className="text-[10px] uppercase tracking-widest">Image Unavailable</p>
                  </div>
                )}
              </div>

              {metadataError && (
                <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-200/80 font-body">
                    We're having trouble reaching the decentralized storage for this auction's details. Bidding remains functional based on on-chain data.
                  </p>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                <div>
                  <h2 className={`text-3xl font-heading italic mb-3 ${isActuallyEnded ? 'text-white/60' : 'text-white'}`}>{title}</h2>
                  <p className="text-white/60 font-body mb-2">{description}</p>
                  <p className="text-white/40 text-sm font-body">Seller: {shortAddr(seller)}</p>
                </div>
                <div
                  className="px-4 py-2 rounded-full text-xs font-medium self-start uppercase tracking-widest"
                  style={{
                    background:
                      !isActuallyEnded ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: !isActuallyEnded ? '#4ade80' : '#f87171',
                    border: !isActuallyEnded ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {isActuallyEnded ? 'Inactive' : 'Active'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <DetailCard label="Current Bid" value={`${(Number(highestBid ?? 0) / 1e18).toFixed(4)} ETH`} />
                <DetailCard label="Time Left" value={timeLeft} icon={<Clock className="w-4 h-4" />} />
                <DetailCard label="Buyer Fee" value={formatEthShort(fee)} icon={<Wallet className="w-4 h-4" />} />
                <DetailCard label="Bidders" value={numBidders?.toString() ?? '0'} icon={<User className="w-4 h-4" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div
                  className="p-5 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <h3 className="text-lg font-heading italic text-white mb-3">Place Bid</h3>
                  {canBid ? (
                    <>
                      <p className="text-white/50 text-sm font-body mb-4">
                        Minimum total including fee: {formatEthShort(minBidTotal)}
                      </p>
                      <div className="space-y-4">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={bidAmount}
                          onChange={(event) => setBidAmount(event.target.value)}
                          placeholder="Enter net bid in ETH"
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 font-body"
                        />
                        <button
                          onClick={handlePlaceBid}
                          disabled={isPending}
                          className="w-full py-3 rounded-lg font-medium text-black transition-all duration-300 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                          style={{ background: 'rgb(255, 255, 255)' }}
                        >
                          {isPending ? 'Submitting...' : 'Place Bid'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center text-center">
                       {ended || isExpired ? (
                         <p className="text-red-400/80 font-body text-sm uppercase tracking-widest">Bidding has ended</p>
                       ) : isSeller ? (
                         <p className="text-white/40 font-body text-sm">You are the seller of this auction</p>
                       ) : !isConnected ? (
                         <p className="text-white/40 font-body text-sm">Connect wallet to participate</p>
                       ) : isHighestBidder ? (
                         <p className="text-emerald-500/80 font-body text-sm uppercase tracking-widest">You are leading</p>
                       ) : (
                         <p className="text-white/40 font-body text-sm">Bidding unavailable</p>
                       )}
                    </div>
                  )}
                </div>

                <div
                  className="p-5 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <h3 className="text-lg font-heading italic text-white mb-3">Auction Actions</h3>
                  <div className="space-y-3">
                    {canEnd && (
                      <button
                        onClick={handleEndAuction}
                        disabled={isPending}
                        className="w-full py-3 rounded-lg font-medium text-black transition-all duration-300 disabled:opacity-50"
                        style={{ background: 'rgb(255, 255, 255)' }}
                      >
                        {isPending ? 'Processing...' : 'End Auction'}
                      </button>
                    )}
                    
                    {canWithdraw && (
                      <button
                        onClick={() => void withdrawBid()}
                        disabled={isPending}
                        className="w-full py-3 rounded-lg font-medium text-white transition-all duration-300 disabled:opacity-50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        Withdraw {formatEthShort(pendingAmount)}
                      </button>
                    )}

                    {isSeller && !isActuallyEnded && Date.now() < auctionEndTime && (
                      <div className="pt-3 border-t border-white/10">
                        <label className="block text-white/60 text-sm font-body mb-2">Extend auction</label>
                        <div className="flex gap-3">
                          <select
                            value={extensionHours}
                            onChange={(event) => setExtensionHours(event.target.value)}
                            className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 font-body"
                          >
                            <option value="1">1 Hour</option>
                            <option value="6">6 Hours</option>
                            <option value="24">24 Hours</option>
                          </select>
                          <button
                            onClick={() => auctionId && void extendBySeller(auctionId, Number(extensionHours) * 3600)}
                            disabled={isPending}
                            className="px-4 py-3 rounded-lg text-white border border-white/20 transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!canEnd && !canWithdraw && (!isSeller || isActuallyEnded || Date.now() >= auctionEndTime) && (
                      <p className="text-white/40 text-sm font-body">No actions available at this time.</p>
                    )}
                  </div>
                </div>
              </div>

              {(error || txHash) && (
                <div
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: error ? 'rgba(127, 29, 29, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                    border: error
                      ? '1px solid rgba(248, 113, 113, 0.35)'
                      : '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {error && <p className="text-sm font-body text-red-200">{error}</p>}
                  {txHash && (
                    <p className="text-sm font-body text-white/70 break-all">
                      Tx: {txHash}
                    </p>
                  )}
                </div>
              )}

              <div
                className="p-5 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <h3 className="text-lg font-heading italic text-white mb-3">Auction Snapshot</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-body text-white/70">
                  <div>
                    <p className="text-white/40 mb-1">Highest Bidder</p>
                    <p>{highestBidder ? (isHighestBidder ? "You (Leading)" : shortAddr(highestBidder)) : 'No bids yet'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Condition</p>
                    <p>{condition}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Withdrawable</p>
                    <p>{(pendingAmount ?? 0n) > 0n ? formatEthShort(pendingAmount) : 'Nothing pending'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <p className="text-white/60 text-xs font-body mb-1">{label}</p>
      <div className="flex items-center gap-2 text-white">
        {icon}
        <p className="text-sm font-body">{value}</p>
      </div>
    </div>
  );
}
