import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gavel, Menu, X, Shield, UserCircle } from 'lucide-react';
import { useAdminPanel, useSellerStatus } from '@/hooks/UseAuction';

interface NavbarProps {
  onOpenSeller: () => void;
  onOpenAdmin: () => void;
  onOpenCreate: () => void;
}

export function Navbar({ onOpenSeller, onOpenAdmin, onOpenCreate }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const admin = useAdminPanel();
  const seller = useSellerStatus();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-6 py-6"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <span className="text-white font-heading italic text-2xl tracking-tighter cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Aether<span className="text-emerald-500">.</span></span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#explore" className="text-white/60 hover:text-white transition-colors text-sm font-body">
            Explore
          </a>
          <button 
            onClick={onOpenCreate}
            className="text-white/60 hover:text-white transition-colors text-sm font-body"
          >
            Curate
          </button>
          
          <button 
            onClick={onOpenSeller}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-body"
          >
            <UserCircle className="w-4 h-4 text-emerald-500/50" />
            {seller.isVerified ? 'Curator Status' : 'Register'}
          </button>

          {admin.isAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-body"
            >
              <Shield className="w-4 h-4 text-emerald-500/50" />
              Admin
            </button>
          )}
        </div>

        {/* Wallet Button */}
        <div className="flex items-center gap-4">
          <ConnectButton />

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          className="md:hidden mt-4 p-4 rounded-xl space-y-3"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <a href="#explore" className="block text-white/60 hover:text-white text-sm py-2 font-body" onClick={() => setIsMenuOpen(false)}>
            Explore
          </a>
          <button 
            onClick={() => { onOpenCreate(); setIsMenuOpen(false); }}
            className="block w-full text-left text-white/60 hover:text-white text-sm py-2 font-body"
          >
            Curate
          </button>
          <button 
            onClick={() => { onOpenSeller(); setIsMenuOpen(false); }}
            className="block w-full text-left text-white/60 hover:text-white text-sm py-2 font-body"
          >
            {seller.isVerified ? 'Curator Status' : 'Register'}
          </button>
          {admin.isAdmin && (
            <button 
              onClick={() => { onOpenAdmin(); setIsMenuOpen(false); }}
              className="block w-full text-left text-white/60 hover:text-white text-sm py-2 font-body"
            >
              Admin
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
