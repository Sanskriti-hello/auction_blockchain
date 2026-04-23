import React, { useState } from 'react';
import { Upload, ArrowRight } from 'lucide-react';
import { useAuction } from '@/contexts/AuctionContext';
import { useWeb3 } from '@/contexts/Web3Context';

interface CreateAuctionProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAuction({ isOpen, onClose }: CreateAuctionProps) {
  const { createAuction, isLoading, error } = useAuction();
  const { isConnected } = useWeb3();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startingBid: '',
    duration: '24',
    image: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.startingBid) return;

    const succeeded = await createAuction({
      title: formData.title,
      description: formData.description,
      image: formData.image || 'https://d2xsxph8kpxj0f.cloudfront.net/310519663490197801/jpkXeorEWufbEWjVg8iLPw/nft-artwork-1-Thhj5tiD9WMBbxaWx55Nd9.webp',
      startingBid: parseFloat(formData.startingBid),
      endTime: Date.now() + parseInt(formData.duration) * 3600000,
      status: 'active',
      creator: '0xuser...1234',
    });

    if (!succeeded) return;

    setFormData({ title: '', description: '', startingBid: '', duration: '24', image: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(40px)',
        }}
      >
        <div className="p-8">
          <h2 className="text-3xl font-heading italic text-white mb-6">Create Auction</h2>

          {!isConnected && (
            <div
              className="p-4 rounded-lg mb-6 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <p className="text-white/60 font-body">Connect your wallet to create auctions</p>
            </div>
          )}

          {isConnected && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-white/60 text-sm font-body mb-2">Item Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter item name"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 font-body"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/60 text-sm font-body mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your item"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 font-body resize-none"
                />
              </div>

              {/* Starting Bid */}
              <div>
                <label className="block text-white/60 text-sm font-body mb-2">Starting Bid (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.startingBid}
                  onChange={(e) => setFormData({ ...formData, startingBid: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 font-body"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-white/60 text-sm font-body mb-2">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 font-body"
                >
                  <option value="1">1 Hour</option>
                  <option value="24">24 Hours</option>
                  <option value="72">3 Days</option>
                  <option value="168">7 Days</option>
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-white/60 text-sm font-body mb-2">Image URL</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 font-body"
                  />
                  <button
                    type="button"
                    className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/40 font-body">
                  Keep using remote image URLs for now. Pinata stores the auction metadata.
                </p>
              </div>

              {error && (
                <div
                  className="p-4 rounded-lg text-sm font-body text-red-200"
                  style={{
                    background: 'rgba(127, 29, 29, 0.35)',
                    border: '1px solid rgba(248, 113, 113, 0.35)',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !formData.title || !formData.description || !formData.startingBid}
                className="w-full py-3 rounded-lg font-medium text-black transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'rgb(255, 255, 255)',
                }}
              >
                {isLoading ? 'Deploying...' : 'Deploy Auction'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
