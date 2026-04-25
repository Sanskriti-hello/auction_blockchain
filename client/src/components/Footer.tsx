import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowRight, Github, FileText } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';

export function Footer() {
  const { isConnected } = useWeb3();

  return (
    <footer className="bg-black border-t border-white/5 selection:bg-emerald-500/30">
      {/* Footer Links */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            {/* Branding */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                </div>
                <span className="text-white font-heading italic text-2xl tracking-tighter">Aether<span className="text-emerald-500">.</span></span>
              </div>
              <p className="text-white/30 font-body text-sm max-w-sm leading-relaxed">
                A premium minimalist Ethereum-native auction platform for high-value digital assets. Secured by smart contracts, preserved on IPFS.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-heading italic text-lg mb-6">Foundation</h4>
              <ul className="space-y-4">
                <li><a href="#explore" className="text-white/30 hover:text-emerald-500 text-sm font-body transition-colors uppercase tracking-widest text-[10px]">Collection</a></li>
                <li><a href="#create" className="text-white/30 hover:text-emerald-500 text-sm font-body transition-colors uppercase tracking-widest text-[10px]">Curate</a></li>
                <li><a href="#dashboard" className="text-white/30 hover:text-emerald-500 text-sm font-body transition-colors uppercase tracking-widest text-[10px]">Provenance</a></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-white font-heading italic text-lg mb-6">Connect</h4>
              <ul className="space-y-4">
                <li><a href="#github" className="text-white/30 hover:text-white text-sm font-body transition-colors flex items-center gap-2 uppercase tracking-widest text-[10px]"><Github className="w-3 h-3" /> GitHub</a></li>
                <li><a href="#docs" className="text-white/30 hover:text-white text-sm font-body transition-colors flex items-center gap-2 uppercase tracking-widest text-[10px]"><FileText className="w-3 h-3" /> Documentation</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/10 text-[10px] font-body uppercase tracking-[0.3em]">
              © 2026 Aether Foundation. All rights reserved.
            </p>
            <div className="flex gap-8">
              <a href="#privacy" className="text-white/10 hover:text-white text-[10px] font-body uppercase tracking-[0.3em] transition-colors">Privacy</a>
              <a href="#terms" className="text-white/10 hover:text-white text-[10px] font-body uppercase tracking-[0.3em] transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
