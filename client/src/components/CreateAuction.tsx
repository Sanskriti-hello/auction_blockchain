import { useState, useEffect, type FormEvent } from 'react';
import { X, Upload, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useChainId, useReadContract } from 'wagmi';
import { useWeb3 } from '@/contexts/Web3Context';
import { useCreateAuction, useSellerStatus } from '@/hooks/UseAuction';
import { AUCTION_ABI, getContractAddress } from '@/config/contract';
import { parseContractError } from '@/utils/formatters';
import { SellerModal } from './SellerModal';

interface CreateAuctionProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAuction({ isOpen, onClose }: CreateAuctionProps) {
  const { isConnected } = useWeb3();
  const seller = useSellerStatus();
  const createAuction = useCreateAuction();
  const [, navigate] = useLocation();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);

  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  
  const { data: counter } = useReadContract({
    address: contractAddress ?? undefined,
    abi: AUCTION_ABI,
    functionName: "auctionCounter",
    query: { enabled: !!contractAddress },
  });

  const [pendingAuctionId, setPendingAuctionId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    condition: "",
    imageFile: null as File | null,
    startingPrice: "",
    durationSeconds: "86400", // Default 24 hours
    minIncrement: "0.01",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const [isSuccessState, setIsSuccessState] = useState(false);

  useEffect(() => {
    if (createAuction.isSuccess && !isSuccessState) {
      setIsSuccessState(true);
      // Wait 2 seconds to show success message then close
      const timer = setTimeout(() => {
        onClose();
        // Reset state after closing
        setTimeout(() => {
          setIsSuccessState(false);
          setPendingAuctionId(null);
          setForm({
            name: "",
            description: "",
            condition: "",
            imageFile: null,
            startingPrice: "",
            durationSeconds: "86400",
            minIncrement: "0.01",
          });
        }, 300);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [createAuction.isSuccess, onClose, isSuccessState]);

  function updateField(key: keyof typeof form, value: string | File | null) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!form.imageFile) {
      setLocalError("Select an auction image.");
      return;
    }

    if (counter == null) {
      setLocalError("Unable to determine the next auction ID on this network.");
      return;
    }

    setPendingAuctionId(Number(counter));

    try {
      await createAuction.createAuction({
        ...form,
        title: form.name,
        startingPrice: Number(form.startingPrice),
        durationSeconds: Number(form.durationSeconds),
        minIncrement: Number(form.minIncrement),
      });
    } catch (error) {
      setLocalError(parseContractError(error));
      setPendingAuctionId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-3xl rounded-[2rem] overflow-hidden my-auto"
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

        <div className="p-8 md:p-10">
          <h2 className="text-4xl font-heading italic text-white mb-2">Curate</h2>
          <p className="text-white/50 font-body mb-8">Deploy a new high-value digital asset to the network.</p>

          {isSuccessState ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                 <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
              </div>
              <h3 className="text-3xl font-heading italic text-white mb-3">Auction Successfully Listed</h3>
              <p className="text-white/60 font-body max-w-sm">
                Your asset has been trustlessly deployed to the network. The market list will refresh automatically.
              </p>
            </div>
          ) : !isConnected ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-white/60 font-body">Connect your wallet to curate an auction.</p>
            </div>
          ) : !seller.isVerified ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-white/60 font-body mb-4">You must be a verified seller to curate auctions.</p>
              <button
                onClick={() => {
                  setIsSellerModalOpen(true);
                }}
                className="px-6 py-3 rounded-full bg-white text-black font-body font-medium transition-transform hover:scale-105"
              >
                Go to Registration
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-8">
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80 font-body">Item Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Enter item name"
                      className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 font-body"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80 font-body">Condition</label>
                    <input
                      type="text"
                      value={form.condition}
                      onChange={(e) => updateField("condition", e.target.value)}
                      placeholder="e.g., Mint, Good, Abstract"
                      className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 font-body"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/80 font-body">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Describe the provenance and details of this asset..."
                    className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 min-h-[120px] resize-y font-body"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/80 font-body">Image Upload</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateField("imageFile", e.target.files?.[0] ?? null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required
                    />
                    <div className="w-full rounded-2xl border border-dashed border-white/30 bg-white/5 px-4 py-6 text-center transition-colors hover:bg-white/10 flex flex-col items-center justify-center gap-2">
                      <Upload className="w-6 h-6 text-white/50" />
                      <span className="text-white/70 font-body text-sm">
                        {form.imageFile ? form.imageFile.name : "Click or drag to upload an image"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80 font-body">Starting Price (ETH)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={form.startingPrice}
                      onChange={(e) => updateField("startingPrice", e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 font-body"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80 font-body">Duration (seconds)</label>
                    <input
                      type="number"
                      min="600"
                      value={form.durationSeconds}
                      onChange={(e) => updateField("durationSeconds", e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 font-body"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/80 font-body">Min. Increment (ETH)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={form.minIncrement}
                      onChange={(e) => updateField("minIncrement", e.target.value)}
                      placeholder="0.01"
                      className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 font-body"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center text-sm font-body text-white/60">
                  <span>Status</span>
                  <span>
                    {createAuction.step === "uploading" ? "Uploading to IPFS..." : 
                     createAuction.step === "confirming" ? "Confirming on-chain..." : 
                     createAuction.isSuccess ? "Success!" : "Ready"}
                  </span>
                </div>

                {(localError || createAuction.error) && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-body">
                    {localError || parseContractError(createAuction.error)}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-4 rounded-full font-body font-medium text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAuction.isPending}
                    className="flex-1 py-4 rounded-full font-body font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createAuction.isPending ? "Deploying..." : "Deploy to Network"}
                    {!createAuction.isPending && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <SellerModal isOpen={isSellerModalOpen} onClose={() => setIsSellerModalOpen(false)} />
    </div>
  );
}