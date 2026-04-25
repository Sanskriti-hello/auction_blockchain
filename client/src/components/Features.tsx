import { Lock, Zap, Globe, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: Lock,
    title: 'Trustless Execution',
    description: 'Smart contracts enforce every rule automatically and transparently.',
  },
  {
    icon: Zap,
    title: 'Real-Time Bidding',
    description: 'Instant updates via blockchain events for live auction participation.',
  },
  {
    icon: Globe,
    title: 'Fully Decentralized',
    description: 'No intermediaries. No control points. Pure peer-to-peer auctions.',
  },
  {
    icon: Wallet,
    title: 'Secure Funds',
    description: 'Escrow handled on-chain with cryptographic security guarantees.',
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading italic text-white mb-4">
            Web3 Powered
          </h2>
          <p className="text-white/60 font-body text-lg max-w-2xl mx-auto">
            Built on blockchain technology for maximum transparency and security
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-heading italic text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/60 font-body text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
