import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { AuctionGrid } from '@/components/AuctionGrid';
import { AuctionDetail } from '@/components/AuctionDetail';
import { CreateAuction } from '@/components/CreateAuction';
import { SellerModal } from '@/components/SellerModal';
import { AdminModal } from '@/components/AdminModal';
import { Features } from '@/components/Features';
import { Stats } from '@/components/Stats';
import { Footer } from '@/components/Footer';
import { GeometricBackground } from '@/components/GeometricBackground';
import { useAuction } from '@/contexts/AuctionContext';
import { useState, useMemo, cloneElement, type ReactElement, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, History, Shield, Zap } from 'lucide-react';

export default function Home() {
  const { auctions, selectAuction } = useAuction();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSellerOpen, setIsSellerOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const activeAuctions = useMemo(() => 
    auctions.filter(a => a.status === 'active').slice(0, 6), 
  [auctions]);

  const previousAuctions = useMemo(() => 
    auctions.filter(a => a.status === 'ended').slice(0, 3), 
  [auctions]);

  const handleAuctionSelect = (auctionId: string) => {
    selectAuction(auctionId);
    setSelectedId(auctionId);
  };

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
      <Navbar 
        onOpenSeller={() => setIsSellerOpen(true)} 
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenCreate={() => setIsCreateOpen(true)}
      />
      
      {/* Hero Section */}
      <section className="relative">
        <GeometricBackground />
        <Hero onExplore={scrollToExplore} onCreateAuction={() => setIsCreateOpen(true)} />
      </section>

      {/* Live Auctions Preview */}
      <section id="explore" className="py-32 px-6 bg-black relative">
        <div className="max-w-7xl mx-auto">
          {/* Refined Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-20 gap-10 border-b border-white/5 pb-12">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-emerald-500/80 font-body tracking-[0.3em] uppercase text-[10px] font-medium">Live Market</p>
              </div>
              <h2 className="text-5xl md:text-7xl font-heading italic text-white mb-6 leading-[0.9]">The Current Pulse<span className="text-emerald-500/50">.</span></h2>
              <p className="text-white/40 font-body text-lg leading-relaxed max-w-lg">
                Curated selection of high-value digital assets currently undergoing trustless settlement on the Ethereum network.
              </p>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-body mb-1">Active Batches</p>
                <p className="text-2xl font-heading italic text-white/80">{activeAuctions.length} Total</p>
              </div>
              <button 
                onClick={scrollToExplore}
                className="group relative overflow-hidden px-8 py-4 rounded-full border border-white/10 hover:border-emerald-500/30 transition-colors duration-500"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.03] transition-opacity" />
                <span className="relative z-10 text-[10px] uppercase tracking-[0.3em] font-medium text-white/60 group-hover:text-white transition-colors">
                  View Catalogue
                </span>
              </button>
            </div>
          </div>

          <div className="relative">
            <AuctionGrid onAuctionSelect={handleAuctionSelect} />
          </div>
        </div>
      </section>

      {/* Features Section - Bento Style */}
      <section className="py-24 px-4 bg-[#050505] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-heading italic mb-4">Architected for Trust.</h2>
            <p className="text-white/40 font-body max-w-xl mx-auto">
              We've stripped away the noise to focus on what matters: secure, transparent, and unstoppable auctions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />}
              title="Immutable Provenance"
              desc="Every bid and settlement is verified by Ethereum smart contracts, creating a permanent history of ownership."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6" />}
              title="Anti-Sniping Logic"
              desc="Late bids automatically extend the auction deadline, ensuring fair market value and eliminating bot sniping."
            />
            <FeatureCard 
              icon={<History className="w-6 h-6" />}
              title="IPFS Preservation"
              desc="Metadata and media are stored on the permaweb, ensuring your assets exist beyond the platform's lifespan."
            />
          </div>
        </div>
      </section>

      {/* Previous Auctions / Heritage */}
      {previousAuctions.length > 0 && (
        <section className="py-24 px-4 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <p className="text-white/30 font-body tracking-[0.2em] uppercase text-xs mb-3">The Heritage Wall</p>
              <h2 className="text-4xl font-heading italic">Past Curations.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 opacity-60 hover:opacity-100 transition-opacity duration-700">
              {previousAuctions.map((auction) => (
                <div key={auction.id} className="group border-l border-white/10 pl-6 py-4 hover:border-emerald-500/50 transition-colors cursor-pointer" onClick={() => handleAuctionSelect(auction.id)}>
                  <p className="text-white/20 font-body text-xs mb-2 italic">Sold</p>
                  <h3 className="text-xl font-heading italic mb-1 group-hover:text-emerald-500 transition-colors">{auction.title}</h3>
                  <p className="text-2xl font-heading italic text-white/80">{auction.currentBid} ETH</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <Stats />

      {/* Final CTA */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full translate-y-1/2" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-heading italic mb-8">Ready to curate?</h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="px-10 py-5 rounded-full bg-white text-black font-body font-medium hover:scale-105 transition-transform"
            >
              Start an Auction
            </button>
            <button 
              onClick={scrollToExplore}
              className="px-10 py-5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white font-body font-medium hover:bg-white/10 transition-colors"
            >
              Explore the Pulse
            </button>
          </div>
        </div>
      </section>

      <Footer />

      <CreateAuction isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <SellerModal isOpen={isSellerOpen} onClose={() => setIsSellerOpen(false)} />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <AuctionDetail
        auctionId={selectedId}
        isOpen={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-sm group hover:border-emerald-500/20 transition-colors">
      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 w-fit mb-6 group-hover:scale-110 transition-transform duration-500">
        {cloneElement(icon as ReactElement, { className: 'w-6 h-6 text-emerald-500' } as any)}
      </div>
      <h3 className="text-2xl font-heading italic mb-4">{title}</h3>
      <p className="text-white/40 font-body leading-relaxed">{desc}</p>
    </div>
  );
}
