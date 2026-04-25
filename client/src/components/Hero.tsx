import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroProps {
  onExplore: () => void;
  onCreateAuction: () => void;
}

export function Hero({ onExplore, onCreateAuction }: HeroProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 pb-20 px-4 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-block px-4 py-2 rounded-full mb-12 border border-emerald-500/10 bg-emerald-500/[0.02] backdrop-blur-md"
        >
          <span className="text-emerald-500/60 text-xs font-body tracking-[0.2em] uppercase">Provenance Redefined</span>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-6xl md:text-8xl font-heading italic text-white mb-6 leading-none tracking-tight">
            Aether<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-xl md:text-2xl font-heading italic text-white/40 mb-10 max-w-xl leading-snug">
            The art of the auction, <br />
            captured eternally on-chain.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
          <button
            onClick={onExplore}
            className="group px-10 py-5 rounded-full font-body font-medium text-black transition-all duration-500 hover:scale-105 active:scale-95 flex items-center gap-3 bg-white"
          >
            Explore the Pulse
            <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
          </button>
          
          <button
            onClick={onCreateAuction}
            className="text-white/40 hover:text-white transition-colors duration-500 font-body text-sm tracking-widest uppercase border-b border-white/10 pb-1"
          >
            Become a Curator
          </button>
        </motion.div>
      </div>
      
      {/* Decorative side element */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block pointer-events-none">
        <div className="rotate-90 origin-right translate-x-20">
          <p className="text-8xl font-heading italic text-white/5 whitespace-nowrap select-none">
            Ethereal / Immutable / Absolute
          </p>
        </div>
      </div>
    </section>
  );
}
