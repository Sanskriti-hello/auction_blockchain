import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroProps {
  onExplore: () => void;
  onCreateAuction: () => void;
}

export function Hero({ onExplore, onCreateAuction }: HeroProps) {
  const [stats, setStats] = useState({
    highestBid: '12.1 ETH',
    activeAuctions: 1247,
    totalVolume: '5,234 ETH',
  });

  return (
    <section
      className="relative min-h-screen pt-32 pb-20 px-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
      }}
    >
      {/* Background gradient animation */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663490197801/jpkXeorEWufbEWjVg8iLPw/hero-background-LMRXUwXCSJYnRtFBqwxGm3.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-block px-4 py-2 rounded-full mb-8"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span className="text-white/60 text-sm font-body">✨ Decentralized Auctions</span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-6xl md:text-7xl font-heading italic text-white mb-6 leading-tight max-w-4xl">
          Own the Bid.<br />
          Trust the Chain.
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg text-white/60 font-body mb-12 max-w-2xl leading-relaxed">
          Trustless auctions powered by smart contracts. Transparent, secure, unstoppable.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-16">
          <button
            onClick={onExplore}
            className="px-8 py-4 rounded-full font-body font-medium text-black transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
            style={{
              background: 'rgb(255, 255, 255)',
            }}
          >
            Explore Auctions
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onCreateAuction}
            className="px-8 py-4 rounded-full font-body font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(6px)',
            }}
          >
            Create Auction
          </button>
        </motion.div>

        {/* Floating Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Live Highest Bid', value: stats.highestBid, icon: '🔥' },
            { label: 'Active Auctions', value: stats.activeAuctions.toLocaleString(), icon: '📊' },
            { label: 'Total ETH Volume', value: stats.totalVolume, icon: '💰' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-6 rounded-xl backdrop-blur-sm animate-float"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                animationDelay: `${idx * 0.2}s`,
              }}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-white/60 text-sm font-body mb-1">{stat.label}</p>
              <p className="text-white text-2xl font-heading italic">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
