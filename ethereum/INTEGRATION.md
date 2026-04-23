# Frontend Integration Guide

Everything here slots into your existing React (Vite) app.
You copy the files, install packages, wrap your app root, then call the hooks.

---

## Step 1 — Copy the files

Copy these into your existing frontend `src/` folder, preserving the structure:

```
src/
├── config/
│   ├── wagmi.js          ← RainbowKit + wagmi chain config
│   └── contract.js       ← ABI + deployed addresses
├── hooks/
│   ├── useAuction.js         ← read one auction
│   ├── useAuctionList.js     ← read all auctions
│   ├── useCreateAuction.js   ← create auction (IPFS + on-chain)
│   ├── usePlaceBid.js        ← place a bid
│   └── useAuctionActions.js  ← endAuction, withdrawBid, extendBySeller
├── utils/
│   ├── ipfs.js           ← upload to Pinata, CID ↔ bytes32 helpers
│   └── formatters.js     ← ETH display, countdown, error parsing
└── Providers.jsx         ← wrap your app root with this
```

---

## Step 2 — Install packages

```bash
npm install \
  @rainbow-me/rainbowkit \
  wagmi \
  viem \
  ethers \
  @tanstack/react-query
```

---

## Step 3 — Set up environment variables

Copy `.env.example` to `.env` and fill in:

```
VITE_WALLETCONNECT_PROJECT_ID=  ← from https://cloud.walletconnect.com (free)
VITE_PINATA_JWT=                ← from https://app.pinata.cloud (free, 1 GB)
```

Add `.env` to `.gitignore` if it isn't already.

---

## Step 4 — Wrap your app root

Open `src/main.jsx` and add `<Providers>`:

```jsx
// src/main.jsx
import React    from "react";
import ReactDOM from "react-dom/client";
import App      from "./App";
import { Providers } from "./Providers";   // ← add this import

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Providers>          {/* ← wrap App */}
      <App />
    </Providers>
  </React.StrictMode>
);
```

---

## Step 5 — Add the connect button

Put this anywhere in your navbar/header — it handles MetaMask, WalletConnect, and Coinbase Wallet automatically:

```jsx
import { ConnectButton } from "@rainbow-me/rainbowkit";

<ConnectButton />
```

---

## Step 6 — Update contract addresses after deploying

After running the Foundry deploy script, open `src/config/contract.js` and update:

```js
export const CONTRACT_ADDRESSES = {
  31337:    "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Anvil default
  11155111: "0xYOUR_ACTUAL_SEPOLIA_ADDRESS",             // ← paste here
};
```

The Anvil address shown is the default first-deploy address. If yours differs,
update it (the deploy script prints the address).

---

## Step 7 — Deploy to Anvil for local testing

```bash
# Terminal 1: start local chain
anvil

# Terminal 2: deploy
cd your-foundry-project/
forge script script/DeployAuction.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

# The private key above is Anvil account 0 — it's public, safe for local dev only.
```

Then in MetaMask:
- Add network: RPC `http://localhost:8545`, Chain ID `31337`, Currency `ETH`
- Import Anvil account 0 private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## Step 8 — Deploy to Sepolia for submission

```bash
# Make sure .env has SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
forge script script/DeployAuction.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Copy the printed address into `CONTRACT_ADDRESSES[11155111]`.

Get free Sepolia ETH: https://sepoliafaucet.com

---

## How the IPFS flow works

```
Seller fills in form
       ↓
uploadFile(photo) × N     → Pinata → imageCIDs[]
uploadMetadata(json)      → Pinata → CID string
cidToBytes32(CID)         → bytes32 (32 bytes, cheap to store on-chain)
       ↓
createAuction(bytes32, price, duration, increment)  → on-chain tx
saveCid(bytes32, CID)     → localStorage (so the list can show names)
       ↓
When loading auctions:
  getAuction(id)          → bytes32 from chain
  cidMap[bytes32]         → original CID from localStorage
  fetchMetadata(CID)      → JSON from IPFS
  ipfsImageUrl(imageCID)  → gateway URL for <img src>
```

---

## What each hook does

| Hook | Where to use it |
|------|----------------|
| `useAuctionList()` | Auction listing/browse page |
| `useAuction(id, cidMap)` | Single auction detail page |
| `useCreateAuction(saveCid)` | Create auction form |
| `usePlaceBid(auctionId)` | Bid form inside auction detail |
| `useEndAuction()` | Button shown after deadline passes |
| `useWithdrawBid(auctionId)` | Withdraw button for losing bidders + seller |
| `useExtendBySeller()` | Seller dashboard — extend deadline |

---

## Checklist for presentation marks

- [ ] `<ConnectButton />` visible and working
- [ ] Connected wallet address shown (ConnectButton does this automatically)
- [ ] Contract balance or auction state displayed on screen
- [ ] `placeBid()` callable from UI with ETH amount input and MetaMask popup
- [ ] Transaction hash shown after submission
- [ ] UI updates after bid (hook auto-refreshes on new blocks)
- [ ] `endAuction()` callable after deadline
- [ ] `withdrawBid()` shows pending amount and clears after withdrawal
