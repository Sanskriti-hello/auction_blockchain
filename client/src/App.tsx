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

type AuctionListItem = {
  id: number;
  image?: string;
  name?: string;
  highestBid?: bigint;
  deadline?: bigint;
  seller?: string;
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(209,250,229,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_25%),linear-gradient(180deg,_#07110f_0%,_#0b1513_45%,_#040706_100%)]" />
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
            <NavLink href="/seller">Seller</NavLink>
            <NavLink href="/admin">Admin</NavLink>
            <ConnectButton />
          </div>
        </div>
      </header>
      <NetworkBanner />
      <main className="container py-8">{children}</main>
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
    return <p className="text-sm text-emerald-300">✅ Done!</p>;
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
  const { auctions, isLoading } = useAuctionList() as { auctions: AuctionListItem[]; isLoading: boolean };

  return (
    <PageCard title="Live Auctions">
      {isLoading && <p>Loading auctions...</p>}
      {!isLoading && auctions.length === 0 && <p>No auctions yet.</p>}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {auctions.map((auction) => (
          <Link
            key={auction.id}
            href={`/auction/${auction.id}`}
            className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 no-underline transition hover:-translate-y-1 hover:bg-black/40"
          >
            <div className="aspect-[4/3] bg-white/5">
              {auction.image ? (
                <img src={ipfsImageUrl(auction.image)} alt={auction.name ?? `Auction ${auction.id}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/40">No image</div>
              )}
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl text-white">{auction.name ?? `Auction #${auction.id}`}</h2>
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
    </PageCard>
  );
}

function AuctionDetailPage() {
  const params = useParams();
  const auctionId = Number(params.id);
  const { address: connectedAddr } = useAccount();
  const auction = useAuction(auctionId) as Record<string, any>;
  const bid = usePlaceBid(auctionId) as Record<string, any>;
  const endAuction = useEndAuction() as Record<string, any>;
  const withdraw = useWithdrawBid(auctionId) as Record<string, any>;
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

  if (Number.isNaN(auctionId)) {
    return <PageCard title="Auction">Invalid auction ID.</PageCard>;
  }

  if (auction.isLoading) {
    return <PageCard title="Auction">Loading auction...</PageCard>;
  }

  if (auction.isError || !auction.metadataCID) {
    return <PageCard title="Auction">Auction not found.</PageCard>;
  }

  const isSeller =
    connectedAddr &&
    auction.seller &&
    connectedAddr.toLowerCase() === String(auction.seller).toLowerCase();

  async function submitBid() {
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <PageCard title={auction.name}>
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30">
          {auction.image ? (
            <img src={ipfsImageUrl(auction.image)} alt={auction.name} className="max-h-[28rem] w-full object-cover" />
          ) : (
            <div className="flex h-80 items-center justify-center text-white/40">No image</div>
          )}
        </div>
        <p>{auction.description || "No description provided."}</p>
        <div className="grid gap-3 text-sm text-white/75 md:grid-cols-2">
          <p>Seller: {shortAddr(auction.seller)}</p>
          <p>Highest bidder: {shortAddr(auction.highestBidder)}</p>
          <p>Highest bid: {formatEth(auction.highestBid)}</p>
          <p>Condition: {auction.condition || "Not specified"}</p>
          <p>Deadline: {new Date(Number(auction.deadline) * 1000).toLocaleString()}</p>
          <p>Status: {auction.ended ? "Ended" : formatCountdown(auction.deadline)}</p>
          <p>Bidders: {String(auction.numBidders)}</p>
          <p className="break-all">Metadata CID: {auction.metadataCID}</p>
        </div>
      </PageCard>

      <div className="space-y-6">
        <PageCard title="Place Bid">
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
          <Feedback error={localBidError || bid.error} success={bid.isSuccess} />
        </PageCard>

        {!auction.ended && isExpired(auction.deadline) && (
          <PageCard title="Finalize Auction">
            <button
              type="button"
              disabled={endAuction.isPending}
              onClick={() => endAuction.endAuction(auctionId)}
              className={buttonClassName(endAuction.isPending)}
            >
              {endAuction.isPending ? "Submitting..." : "End auction"}
            </button>
            <Feedback error={endAuction.error} success={endAuction.isSuccess} />
          </PageCard>
        )}

        {(withdraw.pendingAmount ?? 0n) > 0n && (
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

        {isSeller && !auction.ended && (
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
            <button type="button" disabled={extend.isPending} onClick={submitExtension} className={buttonClassName(extend.isPending)}>
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
      navigate(`/auction/${pendingAuctionId}`);
    }
  }, [createAuction.isSuccess, navigate, pendingAuctionId]);

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

function SellerRegistrationPage() {
  const seller = useSellerStatus() as Record<string, any>;
  const register = useRegisterAsSeller() as Record<string, any>;

  if (seller.isVerified) {
    return (
      <PageCard title="Seller Status">
        <p>You are a verified seller ✅</p>
        <p>
          <Link href="/create" className="text-white underline">
            Create an auction
          </Link>
        </p>
      </PageCard>
    );
  }

  if (seller.hasPaidFee) {
    return (
      <PageCard title="Seller Status">
        <p>Awaiting admin verification.</p>
      </PageCard>
    );
  }

  return (
    <PageCard title="Seller Registration">
      <p>Registration fee: {formatEth(seller.regFee)}</p>
      <button
        type="button"
        disabled={register.isPending || !seller.regFee}
        onClick={() => seller.regFee && register.register(seller.regFee)}
        className={buttonClassName(register.isPending || !seller.regFee)}
      >
        {register.isPending ? "Submitting..." : "Register as seller"}
      </button>
      <Feedback error={register.error} success={register.isSuccess} />
    </PageCard>
  );
}

function AdminPanelPage() {
  const admin = useAdminPanel() as Record<string, any>;
  const [sellerToVerify, setSellerToVerify] = useState("");
  const [sellerToRevoke, setSellerToRevoke] = useState("");
  const [sellerFee, setSellerFee] = useState("");
  const [buyerFee, setBuyerFee] = useState("");

  if (!admin.isAdmin) {
    return <PageCard title="Admin Panel">Not authorised.</PageCard>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PageCard title="Verify Seller">
        <Field label="Seller address">
          <input value={sellerToVerify} onChange={(event) => setSellerToVerify(event.target.value)} className={inputClassName()} />
        </Field>
        <button type="button" disabled={admin.isPending} onClick={() => admin.verifySeller(sellerToVerify)} className={buttonClassName(admin.isPending)}>
          {admin.isPending ? "Submitting..." : "Verify seller"}
        </button>
        <Feedback error={admin.error} success={admin.isSuccess} />
      </PageCard>

      <PageCard title="Revoke Seller">
        <Field label="Seller address">
          <input value={sellerToRevoke} onChange={(event) => setSellerToRevoke(event.target.value)} className={inputClassName()} />
        </Field>
        <button type="button" disabled={admin.isPending} onClick={() => admin.revokeSeller(sellerToRevoke)} className={buttonClassName(admin.isPending)}>
          {admin.isPending ? "Submitting..." : "Revoke seller"}
        </button>
        <Feedback error={admin.error} success={admin.isSuccess} />
      </PageCard>

      <PageCard title="Update Fees">
        <Field label="Seller fee (ETH)">
          <input value={sellerFee} onChange={(event) => setSellerFee(event.target.value)} type="number" min="0" step="0.0001" className={inputClassName()} />
        </Field>
        <Field label="Buyer fee (ETH)">
          <input value={buyerFee} onChange={(event) => setBuyerFee(event.target.value)} type="number" min="0" step="0.0001" className={inputClassName()} />
        </Field>
        <button type="button" disabled={admin.isPending} onClick={() => admin.updateFees(sellerFee, buyerFee)} className={buttonClassName(admin.isPending)}>
          {admin.isPending ? "Submitting..." : "Update fees"}
        </button>
        <Feedback error={admin.error} success={admin.isSuccess} />
      </PageCard>

      <PageCard title="Withdraw Fees">
        <p>Accumulated balance: {formatEth(admin.accumulated)}</p>
        <button type="button" disabled={admin.isPending} onClick={() => admin.withdrawFees()} className={buttonClassName(admin.isPending)}>
          {admin.isPending ? "Submitting..." : "Withdraw fees"}
        </button>
        <Feedback error={admin.error} success={admin.isSuccess} />
      </PageCard>
    </div>
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
    <Shell>
      <Switch>
        <Route path="/" component={AuctionListPage} />
        <Route path="/auctions" component={AuctionListPage} />
        <Route path="/auction/:id" component={AuctionDetailPage} />
        <Route path="/create" component={CreateAuctionPage} />
        <Route path="/seller" component={SellerRegistrationPage} />
        <Route path="/admin" component={AdminPanelPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Shell>
  );
}
