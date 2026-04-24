import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock, User, Wallet, Trophy, RefreshCw } from 'lucide-react';
import {
  useAuction,
  useEndAuction,
  useWithdrawBid,
  useExtendBySeller,
  usePlaceBid
} from '@/hooks/UseAuction';
import { formatEthShort, shortAddr } from '@/utils/formatters';
import { useWeb3 } from '@/contexts/Web3Context';

interface AuctionDetailProps {
  auctionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuctionDetail({ auctionId, isOpen, onClose }: AuctionDetailProps) {
  const { address, isConnected } = useWeb3();
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
    refetch
  } = useAuction(auctionId);

  const { placeBid, isPending: isBidPending, error: bidError, txHash: bidHash } = usePlaceBid(auctionId);
  const { endAuction, isPending: isEndPending, error: endError, txHash: endHash } = useEndAuction();
  const { withdrawBid, pendingAmount, isPending: isWithdrawPending, error: withdrawError, txHash: withdrawHash } = useWithdrawBid(auctionId);
  const { extendBySeller, isPending: isExtendPending, error: extendError, txHash: extendHash } = useExtendBySeller();

  const isPending = isBidPending || isEndPending || isWithdrawPending || isExtendPending;
  const error = bidError || endError || withdrawError || extendError;
  const txHash = bidHash || endHash || withdrawHash || extendHash;

  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [extensionHours, setExtensionHours] = useState('1');

  const auctionEndTime = Number(deadline) * 1000;
  const auctionStatus = ended ? 'ended' : 'active';

  useEffect(() => {
    if (!deadline) return;

    const updateTimer = () => {
      const diff = Number(deadline) * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft('Auction Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      else setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const isSeller = useMemo(() => {
    if (!seller || !address) return false;
    return String(seller).toLowerCase() === String(address).toLowerCase();
  }, [address, seller]);

  const canEnd = auctionStatus === 'active' && (auctionEndTime + 16000) <= Date.now();
  const hasPendingWithdrawal = (pendingAmount ?? 0n) > 0n;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(40px)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="p-8">
          {isLoading || !seller ? (
            <div className="py-20 text-center text-white/60 font-body">Loading auction...</div>
          ) : (
            <>
              <div className="mb-8 rounded-xl overflow-hidden h-72 bg-black">
                <img src={image} alt={title} className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                <div>
                  <h2 className="text-3xl font-heading italic text-white mb-3">{title}</h2>
                  <p className="text-white/60 font-body mb-2">{description}</p>
                  <p className="text-white/40 text-sm font-body">Seller: {shortAddr(seller)}</p>
                </div>
                <div
                  className="px-4 py-2 rounded-full text-xs font-medium self-start"
                  style={{
                    background:
                      auctionStatus === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                    color: auctionStatus === 'active' ? '#22c55e' : '#9ca3af',
                  }}
                >
                  {auctionStatus}
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
                  <p className="text-white/50 text-sm font-body mb-4">
                    Minimum total including fee: {formatEthShort(minBidTotal)}
                  </p>
                  {isConnected ? (
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
                        onClick={async () => {
                          if (!bidAmount) return;
                          const hash = await placeBid(bidAmount);
                          if (hash) setBidAmount('');
                        }}
                        disabled={isPending || auctionStatus !== 'active' || isSeller}
                        className="w-full py-3 rounded-lg font-medium text-black transition-all duration-300 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                        style={{ background: 'rgb(255, 255, 255)' }}
                      >
                        {isPending ? 'Submitting...' : isSeller ? 'Seller Cannot Bid' : 'Place Bid'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-white/60 font-body text-sm">Connect your wallet to place bids.</p>
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
                    <button
                      onClick={() => auctionId && void endAuction(auctionId)}
                      disabled={isPending || !canEnd}
                      className="w-full py-3 rounded-lg font-medium text-black transition-all duration-300 disabled:opacity-50"
                      style={{ background: 'rgb(255, 255, 255)' }}
                    >
                      {isPending ? 'Processing...' : 'End Auction'}
                    </button>
                    <button
                      onClick={() => void withdrawBid()}
                      disabled={isPending || !hasPendingWithdrawal}
                      className="w-full py-3 rounded-lg font-medium text-white transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      Withdraw {hasPendingWithdrawal ? formatEthShort(pendingAmount) : 'Pending Funds'}
                    </button>

                    {isSeller && (
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
                            disabled={isPending || auctionStatus !== 'active' || Date.now() >= auctionEndTime}
                            className="px-4 py-3 rounded-lg text-white border border-white/20 transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
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
                    <p>{highestBidder ? shortAddr(highestBidder) : 'No bids yet'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Condition</p>
                    <p>{condition}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-1">Withdrawable</p>
                    <p>{hasPendingWithdrawal ? formatEthShort(pendingAmount) : 'Nothing pending'}</p>
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
