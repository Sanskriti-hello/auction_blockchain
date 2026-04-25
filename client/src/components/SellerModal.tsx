import React from 'react';
import { X, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useSellerStatus, useRegisterAsSeller } from '@/hooks/UseAuction';
import { formatEthShort, parseContractError } from '@/utils/formatters';
import { useWeb3 } from '@/contexts/Web3Context';

interface SellerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SellerModal({ isOpen, onClose }: SellerModalProps) {
  const { isConnected } = useWeb3();
  const seller = useSellerStatus();
  const register = useRegisterAsSeller();

  if (!isOpen) return null;

  const handleRegister = async () => {
    if (!seller.regFee) return;
    try {
      await register.register(seller.regFee);
    } catch (e) {
      // Error handled by hook state
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-[2rem] overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(40px)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="p-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>

          <h2 className="text-4xl font-heading italic text-white mb-4">Curator Status</h2>
          
          <div className="space-y-6 mb-10">
            <p className="text-white/60 font-body leading-relaxed">
              To maintain the integrity of the Aether marketplace, all curators must undergo a verification process. 
              This ensures that high-value digital assets are represented by verified entities.
            </p>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="text-xs uppercase tracking-widest text-emerald-500 font-bold mb-2">Verification Terms</h4>
              <ul className="text-sm text-white/50 space-y-2 font-body">
                <li>• One-time curation registration fee</li>
                <li>• Manual review by network administrators</li>
                <li>• Permanent record of curator provenance</li>
              </ul>
            </div>
          </div>

          {!isConnected ? (
            <p className="text-white/40 text-center font-body italic">Connect your wallet to proceed with registration.</p>
          ) : seller.isVerified ? (
            <div className="text-center">
              <p className="text-emerald-400 font-body mb-6">Your curator status is active and verified.</p>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-full bg-white text-black font-body font-medium transition-transform hover:scale-[1.02]"
              >
                Return to Market
              </button>
            </div>
          ) : seller.hasPaidFee ? (
            <div className="text-center p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4 opacity-50" />
              <p className="text-white/80 font-body italic">Registration fee paid. Awaiting network administrator approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="text-white/40 font-body">Network Fee</span>
                <span className="text-white font-body">{formatEthShort(seller.regFee)} ETH</span>
              </div>
              
              <button
                onClick={handleRegister}
                disabled={register.isPending}
                className="w-full py-4 rounded-full bg-emerald-500 text-black font-body font-medium transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {register.isPending ? 'Confirming...' : 'Initialize Registration'}
                {!register.isPending && <ArrowRight className="w-4 h-4" />}
              </button>

              {register.error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-body text-center">
                  {parseContractError(register.error)}
                </div>
              )}
              
              {register.isSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-body text-center">
                  Payment confirmed. Verification pending.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
