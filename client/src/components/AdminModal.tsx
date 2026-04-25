import React from 'react';
import { X, ShieldCheck, UserCheck, UserX, RefreshCw, Wallet } from 'lucide-react';
import { useAdminPanel } from '@/hooks/UseAuction';
import { formatEthShort, shortAddr } from '@/utils/formatters';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const admin = useAdminPanel();

  if (!isOpen || !admin.isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl rounded-[2rem] overflow-hidden"
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
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-heading italic text-white">Network Admin</h2>
              <p className="text-white/40 text-xs font-body tracking-widest uppercase">System Control Panel</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-body">Protocol Treasury</p>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500/50" />
                <p className="text-2xl font-heading italic text-white">{formatEthShort(admin.accumulated)} ETH</p>
              </div>
            </div>
            <button
               onClick={() => admin.withdrawFees()}
               disabled={admin.isPending || !admin.accumulated || admin.accumulated === 0n}
               className="h-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-body font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-30 flex items-center justify-center"
            >
              Withdraw Accumulated Fees
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-heading italic text-white mb-4">Pending Curation Requests</h3>
              
              {admin.isEventsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center opacity-30">
                  <RefreshCw className="w-6 h-6 animate-spin mb-3" />
                  <p className="text-[10px] uppercase tracking-tighter">Scanning network logs...</p>
                </div>
              ) : admin.logsError ? (
                <div className="py-12 text-center border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                  <p className="text-red-400/80 font-body text-xs italic px-6">{admin.logsError}</p>
                </div>
              ) : admin.pendingSellers.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
                  <p className="text-white/30 font-body text-sm italic">No pending registrations discovered.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {admin.pendingSellers.map((addr) => (
                    <div key={addr} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="font-mono text-sm text-white/70">
                        {shortAddr(addr)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => admin.verifySeller(addr)}
                          disabled={admin.isPending}
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-50"
                          title="Approve Curator"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => admin.revokeSeller(addr)}
                          disabled={admin.isPending}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                          title="Reject/Revoke"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {admin.error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-body text-center">
              {admin.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
