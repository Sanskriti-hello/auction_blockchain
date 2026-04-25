import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuction as useAuctionContext } from '@/contexts/AuctionContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useAuction, useEndAuction, useWithdrawBid, useExtendBySeller } from '@/hooks/UseAuction';
import { formatEthShort, shortAddr } from '@/utils/formatters';
import { Gavel, TrendingUp, Trophy, RefreshCw } from 'lucide-react';

interface DashboardProps {
  onAuctionSelect: (auctionId: string) => void;
}

export function Dashboard({ onAuctionSelect }: DashboardProps) {
  const { auctions } = useAuctionContext();
  const { address, isConnected } = useWeb3();

  const normalizedAddress = address?.toLowerCase();
  const myAuctions = auctions.filter((auction) => auction.creator.toLowerCase() === normalizedAddress);
  const myLeadingBids = auctions.filter((auction) => auction.highestBidder?.toLowerCase() === normalizedAddress);
  const watchedAuctions = auctions.filter(
    (auction) => auction.highestBidder?.toLowerCase() !== normalizedAddress && auction.creator.toLowerCase() !== normalizedAddress
  );

  return (
    <section id="dashboard" className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-heading italic text-white mb-4">My Dashboard</h1>
        <p className="text-white/60 font-body mb-12 max-w-2xl">
          Monitor your live auctions, manage seller actions, and withdraw any funds available to your connected wallet.
        </p>

        {!isConnected ? (
          <div
            className="p-8 rounded-xl text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <p className="text-white/60 font-body">Connect your wallet to access seller and bidder controls.</p>
          </div>
        ) : (
          <Tabs defaultValue="auctions" className="w-full">
            <TabsList
              className="grid w-full grid-cols-3 mb-8"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <TabsTrigger value="auctions">My Auctions</TabsTrigger>
              <TabsTrigger value="bids">Leading Bids</TabsTrigger>
              <TabsTrigger value="watch">Watchlist</TabsTrigger>
            </TabsList>

            <TabsContent value="auctions">
              <div className="space-y-4">
                {myAuctions.length > 0 ? (
                  myAuctions.map((auction) => (
                    <AuctionActionRow
                      key={auction.id}
                      auctionId={auction.id}
                      title={auction.title}
                      image={auction.image}
                      subtitle={`Current bid: ${auction.currentBid.toFixed(4)} ETH`}
                      onOpen={() => onAuctionSelect(auction.id)}
                      mode="seller"
                    />
                  ))
                ) : (
                  <EmptyState icon={Gavel} message="No auctions created yet" />
                )}
              </div>
            </TabsContent>

            <TabsContent value="bids">
              <div className="space-y-4">
                {myLeadingBids.length > 0 ? (
                  myLeadingBids.map((auction) => (
                    <AuctionActionRow
                      key={auction.id}
                      auctionId={auction.id}
                      title={auction.title}
                      image={auction.image}
                      subtitle={`You are leading at ${auction.currentBid.toFixed(4)} ETH`}
                      onOpen={() => onAuctionSelect(auction.id)}
                      mode="bidder"
                    />
                  ))
                ) : (
                  <EmptyState icon={TrendingUp} message="No auctions where you are the highest bidder yet" />
                )}
              </div>
            </TabsContent>

            <TabsContent value="watch">
              <div className="space-y-4">
                {watchedAuctions.slice(0, 6).length > 0 ? (
                  watchedAuctions.slice(0, 6).map((auction) => (
                    <AuctionActionRow
                      key={auction.id}
                      auctionId={auction.id}
                      title={auction.title}
                      image={auction.image}
                      subtitle={`Seller: ${shortAddr(auction.creator)}`}
                      onOpen={() => onAuctionSelect(auction.id)}
                      mode="viewer"
                    />
                  ))
                ) : (
                  <EmptyState icon={Trophy} message="No other live auctions to watch right now" />
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </section>
  );
}

function AuctionActionRow({
  auctionId,
  title,
  image,
  subtitle,
  onOpen,
  mode,
}: {
  auctionId: string;
  title: string;
  image: string;
  subtitle: string;
  onOpen: () => void;
  mode: 'seller' | 'bidder' | 'viewer';
}) {
  const { address: connectedAddr } = useWeb3();
  const { deadline, ended, seller, highestBidder, pendingAmount, isLoading } = useAuction(auctionId);
  const { endAuction, isPending: isEndPending, error: endError } = useEndAuction();
  const { withdrawBid, isPending: isWithdrawPending, error: withdrawError } = useWithdrawBid(auctionId);
  const { extendBySeller, isPending: isExtendPending, error: extendError } = useExtendBySeller();

  const isPending = isEndPending || isWithdrawPending || isExtendPending;
  const error = endError || withdrawError || extendError;

  const isSeller = useMemo(() => {
    return connectedAddr && seller && String(connectedAddr).toLowerCase() === String(seller).toLowerCase();
  }, [connectedAddr, seller]);

  const isHighestBidder = useMemo(() => {
    return connectedAddr && highestBidder && String(connectedAddr).toLowerCase() === String(highestBidder).toLowerCase();
  }, [connectedAddr, highestBidder]);

  const isExpired = useMemo(() => {
    if (!deadline) return false;
    return Number(deadline) <= Math.floor(Date.now() / 1000);
  }, [deadline]);

  const isActuallyEnded = !!(ended || isExpired);
  const auctionEndTime = Number(deadline) * 1000;
  
  const canEnd = !ended && isExpired;
  const canWithdraw = connectedAddr && !isSeller && !isHighestBidder && (pendingAmount ?? 0n) > 0n;

  return (
    <div
      className="p-6 rounded-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      <div className="flex items-center gap-4">
        <img src={image} alt={title} className={`w-16 h-16 rounded-lg object-cover bg-black ${isActuallyEnded ? 'grayscale opacity-40' : ''}`} />
        <div>
          <h3 className={`font-heading italic text-lg ${isActuallyEnded ? 'text-white/60' : 'text-white'}`}>{title}</h3>
          <p className="text-white/60 text-sm font-body">{subtitle}</p>
          {!isLoading && (pendingAmount ?? 0n) > 0n && (
            <p className="text-white/40 text-xs font-body mt-1">
              {canWithdraw ? `Pending withdrawal: ${formatEthShort(pendingAmount)}` : `Funds locked: ${formatEthShort(pendingAmount)}`}
            </p>
          )}
          {error && <p className="text-red-200 text-xs font-body mt-2">{error}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onOpen}
          className="px-4 py-2 rounded-lg text-sm font-medium text-black"
          style={{ background: 'rgb(255, 255, 255)' }}
        >
          View
        </button>

        {mode === 'seller' && (
          <>
            {canEnd && (
              <button
                onClick={() => void endAuction(auctionId)}
                disabled={isPending || isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {isEndPending ? 'Processing...' : 'End Auction'}
              </button>
            )}
            
            {!isActuallyEnded && Date.now() < auctionEndTime && (
              <button
                onClick={() => void extendBySeller(auctionId, 3600)}
                disabled={isPending || isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                {isExtendPending ? 'Extending...' : 'Extend 1h'}
              </button>
            )}
          </>
        )}

        {canWithdraw && (
          <button
            onClick={() => void withdrawBid()}
            disabled={isPending || isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {isWithdrawPending ? 'Withdrawing...' : 'Withdraw'}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-white/20 mx-auto mb-4" />
      <p className="text-white/60 font-body">{message}</p>
    </div>
  );
}
