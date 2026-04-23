import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { AuctionGrid } from '@/components/AuctionGrid';
import { AuctionDetail } from '@/components/AuctionDetail';
import { CreateAuction } from '@/components/CreateAuction';
import { Dashboard } from '@/components/Dashboard';
import { Features } from '@/components/Features';
import { Stats } from '@/components/Stats';
import { Footer } from '@/components/Footer';
import { useAuction } from '@/contexts/AuctionContext';
import { useState } from 'react';

export default function Home() {
  const { selectAuction } = useAuction();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleAuctionSelect = (auctionId: string) => {
    selectAuction(auctionId);
    setSelectedId(auctionId);
  };

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <Hero onExplore={scrollToExplore} onCreateAuction={() => setIsCreateOpen(true)} />
      <section id="create" className="px-4 pb-10 bg-black">
        <div
          className="max-w-7xl mx-auto rounded-2xl p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <p className="text-white/40 text-sm font-body mb-2">Seller Control Panel</p>
            <h2 className="text-3xl md:text-4xl font-heading italic text-white mb-3">
              Launch a new auction on-chain
            </h2>
            <p className="text-white/60 font-body max-w-2xl">
              Upload item metadata to IPFS, create the auction from your connected wallet, and manage it from the dashboard below.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-8 py-4 rounded-full font-body font-medium text-black transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'rgb(255, 255, 255)' }}
          >
            Open Create Auction
          </button>
        </div>
      </section>
      <AuctionGrid onAuctionSelect={handleAuctionSelect} />
      <Dashboard onAuctionSelect={handleAuctionSelect} />
      <Features />
      <Stats />
      <Footer />
      <CreateAuction isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <AuctionDetail
        auctionId={selectedId}
        isOpen={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
