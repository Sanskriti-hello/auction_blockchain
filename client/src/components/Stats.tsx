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
    <section className="bg-white text-black py-16 px-4 overflow-hidden relative border-y border-white/5">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-12 relative z-10">
        {STATS.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="flex flex-col"
          >
            <span className="text-[0.6rem] uppercase tracking-[0.4em] text-black/40 font-body mb-2">
              {stat.label}
            </span>
            <span className="text-4xl md:text-5xl font-heading italic leading-none">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </span>
          </motion.div>
        ))}
      </div>
      
      {/* Subtle scrolling text background */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full opacity-[0.03] whitespace-nowrap pointer-events-none select-none">
        <p className="text-[12rem] font-heading italic animate-scroll">
          IMMUTABLE / PROVENANCE / SETTLEMENT / IMMUTABLE / PROVENANCE / SETTLEMENT
        </p>
      </div>
    </section>
  );
}
