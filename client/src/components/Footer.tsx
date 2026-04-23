import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowRight, Github, FileText } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';

export function Footer() {
  const { isConnected } = useWeb3();

  return (
    <footer className="bg-black border-t border-white/10">
      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-heading italic text-white mb-6">
            Start bidding on the future
          </h2>
          <p className="text-white/60 font-body text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of collectors and investors in the decentralized auction revolution
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              className="px-8 py-4 rounded-full font-body font-medium text-black transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: 'rgb(255, 255, 255)',
              }}
            >
              Explore Auctions
              <ArrowRight className="w-4 h-4" />
            </button>
            {!isConnected && (
              <div>
                <ConnectButton />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section
        className="py-12 px-4 border-t"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Branding */}
            <div>
              <h3 className="text-white font-heading italic text-lg mb-2">Auction</h3>
              <p className="text-white/60 font-body text-sm">
                Decentralized auction platform powered by Ethereum smart contracts
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-heading italic text-sm mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#docs"
                    className="text-white/60 hover:text-white text-sm font-body transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#github"
                    className="text-white/60 hover:text-white text-sm font-body transition-colors flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-heading italic text-sm mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#terms" className="text-white/60 hover:text-white text-sm font-body transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="text-white/60 hover:text-white text-sm font-body transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div
            className="py-4 border-t text-center"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <p className="text-white/40 text-xs font-body">
              © 2026 Decentralized Auction Platform. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
