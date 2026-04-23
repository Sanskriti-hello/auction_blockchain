import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  label: string;
  value: number;
  suffix: string;
}

const STATS: StatItem[] = [
  { label: 'Total Volume', value: 5234, suffix: ' ETH' },
  { label: 'Active Auctions', value: 1247, suffix: '' },
  { label: 'Total Users', value: 8934, suffix: '' },
  { label: 'Avg Bid Increase', value: 23, suffix: '%' },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [target, suffix]);

  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
}

export function Stats() {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading italic text-white mb-4">
            Platform Statistics
          </h2>
          <p className="text-white/60 font-body text-lg">
            Real-time metrics from our decentralized auction network
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-8 rounded-xl text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <p className="text-white/60 font-body text-sm mb-3">{stat.label}</p>
              <p className="text-5xl font-heading italic text-white">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
