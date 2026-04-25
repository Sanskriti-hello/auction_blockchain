import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ethers } from "ethers";
import { Link, Route, Switch, useLocation, useParams, useRoute } from "wouter";
import { useAccount, useChainId, useReadContract } from "wagmi";
import NetworkBanner from "./components/Networkbanner";
import { AUCTION_ABI, getContractAddress } from "./config/contract";
import {
  useAdminPanel,
  useAuction,
  useAuctionList,
  useCreateAuction,
  useEndAuction,
  useExtendBySeller,
  usePlaceBid,
  useRegisterAsSeller,
  useSellerStatus,
  useWithdrawBid,
} from "./hooks/UseAuction";
import { formatCountdown, formatEth, isExpired, parseContractError, shortAddr } from "./utils/formatters";
import { ipfsImageUrl } from "./utils/ipfs";
import { SellerModal } from "./components/SellerModal";
import { AdminModal } from "./components/AdminModal";
import Home from "./pages/Home";

type AuctionListItem = {
  id: number;
  image?: string;
  name?: string;
  highestBid?: bigint;
  deadline?: bigint;
  seller?: string;
};

function Shell({ children }: { children: ReactNode }) {
  const admin = useAdminPanel() as Record<string, any>;
  const seller = useSellerStatus() as Record<string, any>;
  const [isSellerOpen, setIsSellerOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.15),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.05),_transparent_40%),linear-gradient(180deg,_#050505_0%,_#000000_100%)]" />
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="font-serif text-3xl italic text-white no-underline">
              CS218 Auction DApp
            </Link>
            <p className="mt-1 text-white/60">Decentralised auctions on Ethereum with contract-backed bidding and IPFS metadata.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NavLink href="/">Auctions</NavLink>
            <NavLink href="/create">Create</NavLink>
            <button 
              onClick={() => setIsSellerOpen(true)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              {seller.isVerified ? 'Curator' : 'Seller'}
            </button>
            {admin.isAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Admin
              </button>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>
      <NetworkBanner />
      <main className="container py-8">{children}</main>
      
      <SellerModal isOpen={isSellerOpen} onClose={() => setIsSellerOpen(false)} />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const [active] = useRoute(href);

  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-sm no-underline transition ${
        active ? "border-emerald-200 bg-emerald-100 text-emerald-950" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}

function PageCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <h1 className="text-4xl text-white">{title}</h1>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white/80">{label}</span>
      {children}
    </label>
  );
}

function Feedback({ error, success }: { error?: unknown; success?: boolean }) {
  if (error) {
    const message = typeof error === "string" ? error : parseContractError(error);
    return <p className="text-sm text-red-300">{message}</p>;
  }

  if (success) {
    return <p className="text-sm text-emerald-300">Success!</p>;
  }

  return null;
}

function inputClassName() {
  return "w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35";
}

function buttonClassName(disabled?: boolean) {
  return `rounded-full px-5 py-3 text-sm font-medium transition ${
    disabled ? "cursor-not-allowed bg-white/15 text-white/50" : "bg-emerald-200 text-emerald-950 hover:bg-emerald-100"
  }`;
}

function AuctionListPage() {
  const { auctions, isLoading } = useAuctionList() as { auctions: any[]; isLoading: boolean };

  return (
    <PageCard title="Live Auctions">
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <p className="animate-pulse text-white/40 uppercase tracking-widest text-xs">Synchronizing Auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <p className="text-white/40 italic">No auctions yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {auctions.map((auction) => (
            <Link
              key={auction.id}
              href={`/auction/${auction.id}`}
              className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 no-underline transition hover:-translate-y-1 hover:bg-black/40"
            >
              <div className="aspect-[4/3] bg-white/5 flex items-center justify-center relative overflow-hidden">
                {(() => {
                  const isExpired = Number(auction.deadline) <= Math.floor(Date.now() / 1000);
                  const isActuallyEnded = auction.ended || isExpired;
                  return (
                    <>
                      {auction.image ? (
                        <img 
                          src={ipfsImageUrl(auction.image)} 
                          alt={auction.name ?? `Auction ${auction.id}`} 
                          className={`h-full w-full object-cover ${isActuallyEnded ? 'grayscale opacity-40' : ''}`} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add('bg-zinc-900');
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center opacity-20">
                          <p className="text-[10px] uppercase tracking-widest">No Image</p>
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-bold border ${isActuallyEnded ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                        {isActuallyEnded ? 'Inactive' : 'Live'}
                      </div>
                    </>
                  );
                })()}
                {auction.metadataError && (
                  <div className="absolute top-2 left-2 bg-amber-500/20 border border-amber-500/40 rounded px-2 py-0.5">
                     <p className="text-[8px] text-amber-200 uppercase tracking-widest">Meta unavailable</p>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className={`text-2xl truncate ${auction.ended ? 'text-white/60' : 'text-white'}`}>{auction.name || `Auction #${auction.id}`}</h2>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">#{auction.id}</span>
                </div>
                <div className="space-y-1 text-sm text-white/70">
                  <p>Highest bid: {formatEth(auction.highestBid)}</p>
                  <p>Countdown: {formatCountdown(auction.deadline)}</p>
                  <p>Seller: {shortAddr(auction.seller)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageCard>
  );
}

function AuctionDetailPage() {
  const params = useParams();
  const auctionId = Number(params.id);
  const auctionIdSafe = Number.isNaN(auctionId) ? 0 : auctionId;

  const { address: connectedAddr } = useAccount();
  const admin = useAdminPanel() as Record<string, any>;
  const auction = useAuction(auctionIdSafe) as Record<string, any>;
  const bid = usePlaceBid(auctionIdSafe) as Record<string, any>;
  const endAuction = useEndAuction() as Record<string, any>;
  const withdraw = useWithdrawBid(auctionIdSafe) as Record<string, any>;
  const extend = useExtendBySeller() as Record<string, any>;

  const [bidAmount, setBidAmount] = useState("");
  const [extendSeconds, setExtendSeconds] = useState("60");
  const [localBidError, setLocalBidError] = useState<string | null>(null);
  const [localExtendError, setLocalExtendError] = useState<string | null>(null);

  const total = useMemo(() => {
    try {
      return bidAmount ? ethers.parseEther(bidAmount) + (bid.fee ?? 0n) : bid.fee ?? 0n;
    } catch {
      return bid.fee ?? 0n;
    }
  }, [bidAmount, bid.fee]);

  const isSeller = useMemo(() => {
    return connectedAddr && auction.seller && String(connectedAddr).toLowerCase() === String(auction.seller).toLowerCase();
  }, [connectedAddr, auction.seller]);

  const isHighestBidder = useMemo(() => {
    return connectedAddr && auction.highestBidder && String(connectedAddr).toLowerCase() === String(auction.highestBidder).toLowerCase();
  }, [connectedAddr, auction.highestBidder]);

  if (Number.isNaN(auctionId)) {
    return <PageCard title="Auction">Invalid auction ID.</PageCard>;
  }

  if (auction.isLoading) {
    return (
      <PageCard title="Auction">
        <div className="py-20 flex flex-col items-center justify-center opacity-40">
           <p className="animate-pulse uppercase tracking-[0.2em] text-xs">Accessing Smart Contract...</p>
        </div>
      </PageCard>
    );
  }

  if (auction.isError || !auction.seller) {
    return <PageCard title="Auction">Auction not found or failed to load from chain.</PageCard>;
  }

  const isExpired = Number(auction.deadline) <= Math.floor(Date.now() / 1000);
  const canEnd = (isSeller || admin.isAdmin) && !auction.ended && (Number(auction.deadline) + 16) <= Math.floor(Date.now() / 1000);
  const canWithdraw = connectedAddr && (withdraw.pendingAmount ?? 0n) > 0n && !(isHighestBidder && !auction.ended);
  const canBid = connectedAddr && !isSeller && !auction.ended && !isExpired;

  async function submitEndAuction() {
    if (!isSeller && !admin.isAdmin) return;
    try {
      await endAuction.endAuction(auctionId);
    } catch (e) {
      // Handled by state
    }
  }

  async function submitBid() {
    if (!canBid) return;
    setLocalBidError(null);

    if (!bidAmount) {
      setLocalBidError("Enter a bid amount.");
      return;
    }

    try {
      const netBid = ethers.parseEther(bidAmount);
      const fullAmount = netBid + (bid.fee ?? 0n);
      if (bid.minTotal && fullAmount < bid.minTotal) {
        setLocalBidError(`Minimum total required is ${formatEth(bid.minTotal)}.`);
        return;
      }

      await bid.placeBid(bidAmount);
    } catch (error) {
      setLocalBidError(parseContractError(error));
    }
  }

  async function submitExtension() {
    setLocalExtendError(null);

    if (!extendSeconds || Number(extendSeconds) <= 0) {
      setLocalExtendError("Enter extra seconds greater than zero.");
      return;
    }

    try {
      await extend.extendBySeller(auctionId, Number(extendSeconds));
    } catch (error) {
      setLocalExtendError(parseContractError(error));
    }
  }

  const isActuallyEnded = auction.ended || isExpired;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <PageCard title={auction.name || "Untitled Auction"}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border ${isActuallyEnded ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {isActuallyEnded ? 'Inactive' : 'Active'}
          </div>
          {auction.metadataError && (
             <div className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border bg-amber-500/10 border-amber-500/20 text-amber-200">
               Meta Unavailable
             </div>
          )}
        </div>
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 flex items-center justify-center min-h-[20rem]">
          {auction.image ? (
            <img 
              src={ipfsImageUrl(auction.image)} 
              alt={auction.name} 
              className={`max-h-[28rem] w-full object-cover ${isActuallyEnded ? 'grayscale opacity-40' : ''}`} 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add('bg-zinc-900');
              }}
            />
          ) : (
            <div className="flex flex-col items-center opacity-20">
              <p className="text-xs uppercase tracking-widest">No Image Asset</p>
            </div>
          )}
        </div>
        <p className={isActuallyEnded ? 'text-white/60' : 'text-white/90'}>{auction.description || "Description unavailable."}</p>
        <div className="grid gap-3 text-sm text-white/75 md:grid-cols-2">
          <p>Seller: {shortAddr(auction.seller)}</p>
          <p>Highest bidder: {auction.highestBidder ? (isHighestBidder ? "You (Leading)" : shortAddr(auction.highestBidder)) : "No bids yet"}</p>
          <p>Highest bid: {formatEth(auction.highestBid)}</p>
          <p>Condition: {auction.condition || "Not specified"}</p>
          <p>Deadline: {new Date(Number(auction.deadline) * 1000).toLocaleString()}</p>
          <p>Status: {isActuallyEnded ? "Ended" : formatCountdown(auction.deadline)}</p>
          <p>Bidders: {String(auction.numBidders)}</p>
          <p className="break-all opacity-40">Metadata: {auction.metadataCID}</p>
        </div>
      </PageCard>

      <div className="space-y-6">
        <PageCard title="Place Bid">
          {canBid ? (
            <>
              <div className="space-y-2 text-sm text-white/70">
                <p>Fee: {formatEth(bid.fee)}</p>
                <p>Minimum total: {formatEth(bid.minTotal)}</p>
              </div>
              <Field label="Bid amount (ETH)">
                <input
                  value={bidAmount}
                  onChange={(event) => setBidAmount(event.target.value)}
                  placeholder="0.10"
                  type="number"
                  min="0"
                  step="0.0001"
                  className={inputClassName()}
                />
              </Field>
              <p className="text-sm text-white/70">Total: {formatEth(total)}</p>
              <button type="button" disabled={bid.isPending} onClick={submitBid} className={buttonClassName(bid.isPending)}>
                {bid.isPending ? "Submitting..." : "Place bid"}
              </button>
            </>
          ) : (
            <div className="py-4 text-center">
              {auction.ended || isExpired ? (
                <p className="text-red-400/80 font-medium uppercase tracking-widest text-sm">Bidding has ended</p>
              ) : isSeller ? (
                <p className="text-white/40 text-sm">You are the seller of this auction</p>
              ) : !connectedAddr ? (
                <p className="text-white/40 text-sm">Connect wallet to participate</p>
              ) : isHighestBidder ? (
                <p className="text-emerald-500/80 font-medium uppercase tracking-widest text-sm">You are leading</p>
              ) : (
                <p className="text-white/40 text-sm">Bidding unavailable</p>
              )}
            </div>
          )}
          <Feedback error={localBidError || bid.error} success={bid.isSuccess} />
        </PageCard>

        {canEnd && (
         <PageCard title="Finalize Auction">
           <button
             type="button"
             disabled={endAuction.isPending}
             onClick={submitEndAuction}
             className={buttonClassName(endAuction.isPending)}
           >

              {endAuction.isPending ? "Submitting..." : "End auction"}
            </button>
            <Feedback error={endAuction.error} success={endAuction.isSuccess} />
          </PageCard>
        )}

        {canWithdraw && (
          <PageCard title="Withdraw">
            <p>Pending amount: {formatEth(withdraw.pendingAmount)}</p>
            <button
              type="button"
              disabled={withdraw.isPending}
              onClick={() => withdraw.withdrawBid()}
              className={buttonClassName(withdraw.isPending)}
            >
              {withdraw.isPending ? "Submitting..." : "Withdraw bid"}
            </button>
            <Feedback error={withdraw.error} success={withdraw.isSuccess} />
          </PageCard>
        )}

        {isSeller && !auction.ended && Math.floor(Date.now() / 1000) < Number(auction.deadline) && (
          <PageCard title="Extend Auction">
            <Field label="Extra seconds">
              <input
                value={extendSeconds}
                onChange={(event) => setExtendSeconds(event.target.value)}
                type="number"
                min="1"
                className={inputClassName()}
              />
            </Field>
            <button
              type="button"
              disabled={extend.isPending}
              onClick={submitExtension}
              className={buttonClassName(extend.isPending)}
            >
              {extend.isPending ? "Submitting..." : "Extend by seller"}
            </button>
            <Feedback error={localExtendError || extend.error} success={extend.isSuccess} />
          </PageCard>
        )}
      </div>
    </div>
  );
}

function CreateAuctionPage() {
  const seller = useSellerStatus() as Record<string, any>;
  const createAuction = useCreateAuction() as Record<string, any>;
  const [, navigate] = useLocation();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
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
    durationSeconds: "",
    minIncrement: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (createAuction.isSuccess && pendingAuctionId !== null) {
      setForm({
        name: "",
        description: "",
        condition: "",
        imageFile: null,
        startingPrice: "",
        durationSeconds: "",
        minIncrement: "",
      });
      setPendingAuctionId(null);
    }
  }, [createAuction.isSuccess, pendingAuctionId]);

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
        startingPrice: Number(form.startingPrice),
        durationSeconds: Number(form.durationSeconds),
        minIncrement: Number(form.minIncrement),
      });
    } catch (error) {
      setLocalError(parseContractError(error));
      setPendingAuctionId(null);
    }
  }

  if (!seller.isVerified) {
    return (
      <PageCard title="Create Auction">
        <p>You must be a verified seller.</p>
        <p>
          <Link href="/seller" className="text-white underline">
            Go to seller registration
          </Link>
        </p>
      </PageCard>
    );
  }

  return (
    <PageCard title="Create Auction">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className={inputClassName()} required />
        </Field>
        <Field label="Condition">
          <input value={form.condition} onChange={(event) => updateField("condition", event.target.value)} className={inputClassName()} required />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className={`${inputClassName()} min-h-32`}
              required
            />
          </Field>
        </div>
        <Field label="Image file">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => updateField("imageFile", event.target.files?.[0] ?? null)}
            className={inputClassName()}
            required
          />
        </Field>
        <Field label="Starting price (ETH)">
          <input
            value={form.startingPrice}
            onChange={(event) => updateField("startingPrice", event.target.value)}
            type="number"
            min="0"
            step="0.0001"
            className={inputClassName()}
            required
          />
        </Field>
        <Field label="Duration (seconds)">
          <input
            value={form.durationSeconds}
            onChange={(event) => updateField("durationSeconds", event.target.value)}
            type="number"
            min="1"
            className={inputClassName()}
            required
          />
        </Field>
        <Field label="Minimum increment (ETH)">
          <input
            value={form.minIncrement}
            onChange={(event) => updateField("minIncrement", event.target.value)}
            type="number"
            min="0"
            step="0.0001"
            className={inputClassName()}
            required
          />
        </Field>
        <div className="space-y-2 md:col-span-2">
          <p className="text-sm text-white/70">
            Step: {createAuction.step === "uploading" ? "uploading" : createAuction.step === "confirming" ? "confirming" : createAuction.isSuccess ? "success" : "ready"}
          </p>
          <button type="submit" disabled={createAuction.isPending} className={buttonClassName(createAuction.isPending)}>
            {createAuction.isPending ? "Submitting..." : "Create auction"}
          </button>
          <Feedback error={localError || createAuction.error} success={createAuction.isSuccess} />
        </div>
      </form>
    </PageCard>
  );
}

function NotFoundPage() {
  return (
    <PageCard title="Not Found">
      <p>The page you requested does not exist.</p>
      <p>
        <Link href="/" className="text-white underline">
          Back to auctions
        </Link>
      </p>
    </PageCard>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/:rest*">
        <Shell>
          <Switch>
            <Route path="/auctions" component={AuctionListPage} />
            <Route path="/auction/:id" component={AuctionDetailPage} />
            <Route path="/create" component={CreateAuctionPage} />
            <Route component={NotFoundPage} />
          </Switch>
        </Shell>
      </Route>
    </Switch>
  );
}
