import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gavel, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-full"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-heading italic text-lg">Auction</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#explore" className="text-white/60 hover:text-white transition-colors text-sm">
            Explore
          </a>
          <a href="#create" className="text-white/60 hover:text-white transition-colors text-sm">
            Create
          </a>
          <a href="#bids" className="text-white/60 hover:text-white transition-colors text-sm">
            My Bids
          </a>
          <a href="#dashboard" className="text-white/60 hover:text-white transition-colors text-sm">
            Dashboard
          </a>
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
          <a href="#explore" className="block text-white/60 hover:text-white text-sm py-2">
            Explore
          </a>
          <a href="#create" className="block text-white/60 hover:text-white text-sm py-2">
            Create
          </a>
          <a href="#bids" className="block text-white/60 hover:text-white text-sm py-2">
            My Bids
          </a>
          <a href="#dashboard" className="block text-white/60 hover:text-white text-sm py-2">
            Dashboard
          </a>
        </div>
      )}
    </nav>
  );
}
