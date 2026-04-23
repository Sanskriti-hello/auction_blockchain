// src/examples/HowToUse.jsx
// ─────────────────────────────────────────────────────────────────────────────
// These are NOT components to copy wholesale.
// They are minimal, annotated snippets showing exactly what to import and call
// in each of your own components. Read these, then adapt to your UI.
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// 1. WALLET CONNECT BUTTON  (drop anywhere in your nav/header)
// ══════════════════════════════════════════════════════════════════════════════
import { ConnectButton } from "@rainbow-me/rainbowkit";

function MyNavbar() {
  return (
    <nav>
      <h1>CS218 Auction</h1>

      {/* This single component handles MetaMask, WalletConnect, Coinbase Wallet.
          It also shows the connected address, network badge, and balance.
          No extra code needed. */}
      <ConnectButton />
    </nav>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// 2. AUCTION LIST PAGE
// ══════════════════════════════════════════════════════════════════════════════
import { useAuctionList }  from "../hooks/useAuctionList";
import { formatEth, formatCountdown, shortAddr, isExpired } from "../utils/formatters";
import { ipfsImageUrl }   from "../utils/ipfs";

function AuctionListPage() {
  const { auctions, isLoading, refetch } = useAuctionList();

  if (isLoading) return <p>Loading auctions…</p>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {auctions.map((a) => (
        <div key={a.id} style={{ border: "1px solid #ccc", margin: 8, padding: 12 }}>
          {/* Show first image from IPFS if available */}
          {a.images?.[0] && (
            <img src={ipfsImageUrl(a.images[0])} alt={a.name} width={200} />
          )}
          <h3>{a.name}</h3>
          <p>{a.description}</p>
          <p>Condition: {a.condition}</p>
          <p>Seller: {shortAddr(a.seller)}</p>
          <p>Highest bid: {formatEth(a.highestBid)}</p>
          <p>Highest bidder: {shortAddr(a.highestBidder)}</p>
          <p>
            {a.ended
              ? "✅ Ended"
              : isExpired(a.deadline)
              ? "⏰ Awaiting endAuction"
              : `⏳ ${formatCountdown(a.deadline)}`}
          </p>
          <p>Bidders: {a.numBidders?.toString()}</p>
        </div>
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// 3. CREATE AUCTION FORM
// ══════════════════════════════════════════════════════════════════════════════
import { useState }          from "react";
import { useAuctionList }    from "../hooks/useAuctionList";
import { useCreateAuction }  from "../hooks/useCreateAuction";

function CreateAuctionForm() {
  const { saveCid }                        = useAuctionList();
  const { createAuction, isPending, isSuccess, error } = useCreateAuction(saveCid);

  const [name,     setName]     = useState("");
  const [desc,     setDesc]     = useState("");
  const [price,    setPrice]    = useState("1");
  const [duration, setDuration] = useState("3600");
  const [inc,      setInc]      = useState("0.1");
  const [files,    setFiles]    = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    await createAuction({
      name,
      description:     desc,
      condition:       "Good",
      imageFiles:      files,         // File[] from <input type="file" multiple>
      startingPrice:   price,         // ETH string
      durationSeconds: Number(duration),
      minIncrement:    inc,           // ETH string
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input  value={name}     onChange={(e) => setName(e.target.value)}     placeholder="Item name" />
      <textarea value={desc}   onChange={(e) => setDesc(e.target.value)}     placeholder="Description" />
      <input  value={price}    onChange={(e) => setPrice(e.target.value)}    placeholder="Starting price (ETH)" />
      <input  value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (seconds)" />
      <input  value={inc}      onChange={(e) => setInc(e.target.value)}      placeholder="Min increment (ETH)" />
      <input  type="file"      multiple onChange={(e) => setFiles([...e.target.files])} />

      <button type="submit" disabled={isPending}>
        {isPending ? "Uploading to IPFS + signing…" : "Create Auction"}
      </button>

      {isSuccess && <p style={{ color: "green" }}>✅ Auction created!</p>}
      {error     && <p style={{ color: "red"   }}>❌ {error}</p>}
    </form>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// 4. BID FORM  (place inside your AuctionDetail component)
// ══════════════════════════════════════════════════════════════════════════════
import { usePlaceBid }   from "../hooks/usePlaceBid";
import { formatEth }     from "../utils/formatters";
import { ethers }        from "ethers";

function BidForm({ auctionId }) {
  const [amount, setAmount] = useState("");
  const { placeBid, isPending, isSuccess, error, fee, minBidTotal } = usePlaceBid(auctionId);

  return (
    <div>
      {/* Show the user what they'll actually send */}
      {fee && (
        <p>
          Participation fee: {formatEth(fee)}<br />
          Min bid amount: {minBidTotal ? formatEth(minBidTotal - fee) : "…"}<br />
          Total you'll send: {amount ? formatEth((ethers.parseEther(amount || "0") + (fee ?? 0n))) : "—"}
        </p>
      )}

      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Your bid (ETH)"
      />

      <button onClick={() => placeBid(amount)} disabled={isPending || !amount}>
        {isPending ? "Submitting…" : "Place Bid"}
      </button>

      {isSuccess && <p style={{ color: "green" }}>✅ Bid placed!</p>}
      {error     && <p style={{ color: "red"   }}>❌ {error}</p>}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// 5. WITHDRAW + END AUCTION BUTTONS
// ══════════════════════════════════════════════════════════════════════════════
import { useEndAuction, useWithdrawBid } from "../hooks/useAuctionActions";
import { formatEth, isExpired }          from "../utils/formatters";

function AuctionActions({ auctionId, deadline, ended, seller }) {
  const { endAuction,  isPending: endPending,  error: endError  } = useEndAuction();
  const { withdrawBid, isPending: wdPending,   error: wdError,
          pendingAmount }                                          = useWithdrawBid(auctionId);

  const { address: userAddr } = useAccount();
  const isSeller = userAddr?.toLowerCase() === seller?.toLowerCase();

  return (
    <div>
      {/* End auction button — shown to anyone once deadline has passed */}
      {!ended && isExpired(deadline) && (
        <button onClick={() => endAuction(auctionId)} disabled={endPending}>
          {endPending ? "Ending…" : "End Auction"}
        </button>
      )}
      {endError && <p style={{ color: "red" }}>❌ {endError}</p>}

      {/* Withdraw button — shown when the user has funds to collect */}
      {pendingAmount > 0n && (
        <button onClick={() => withdrawBid()} disabled={wdPending}>
          {wdPending
            ? "Withdrawing…"
            : `Withdraw ${formatEth(pendingAmount)}`}
        </button>
      )}
      {wdError && <p style={{ color: "red" }}>❌ {wdError}</p>}
    </div>
  );
}
