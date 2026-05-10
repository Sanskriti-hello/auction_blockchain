# Project 5- Decentralized Auction System

A production-grade, trustless auction DApp built on Ethereum Sepolia. This platform features automated anti-snipe protection, IPFS-backed metadata, and a robust seller curation system.

## Team Members

Sanskriti Jain -  240001064  
Shriya Deo - 240041013  
Siddhi Patil - 240041035  
Rida Samrin - 240001060  
Bhavika Jaiswal - 240001017  
Disha Dange - 240001026

---

## 🚀 Overview

This DApp allows users to:
- **Register as Sellers:** Requires a one-time fee and manual admin verification.
- **Create Auctions:** Upload high-value digital assets with names, descriptions, and images stored on IPFS.
- **Participate in Auctions:** Trustless bidding with automatic 3-minute anti-snipe extensions.
- **Admin Control:** A dedicated dashboard for the contract owner to verify sellers and withdraw protocol fees.

---

## 🛠 Tech Stack

- **Smart Contracts:** Solidity 0.8.20, Foundry (Forge/Cast)
- **Frontend:** React 19, Vite, Wagmi v2, Viem, RainbowKit, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript (IPFS Proxy & Metadata Handler)
- **Infrastructure:** Alchemy RPC, Pinata IPFS Gateway

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) or npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for smart contract development)
- [MetaMask](https://metamask.io/) with Sepolia ETH

---

## ⚙️ Setup Instructions

### 1. Smart Contract Configuration (Root)
Install Foundry dependencies and build the contracts:

```bash
# Install OpenZeppelin contracts
forge install

# Compile the contracts
forge build
```

Create a `.env` file in the root directory:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
VITE_CONTRACT_ADDRESS=0x33f75CC8f11450Dd1BD749E74f387B395f1e3947
```

### 2. Backend Setup (`/server`)
The backend handles secure IPFS uploads to Pinata.

```bash
cd server
npm install
```

Create a `server/.env` file:
```env
PORT=3001
PINATA_JWT=your_pinata_jwt_here
FRONTEND_URL=http://localhost:5173
```

Start the server:
```bash
npm run dev
```

### 3. Frontend Setup (`/client`)
```bash
cd client
npm install
```

Create a `client/.env` file:
```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_BACKEND_URL=http://localhost:3001
VITE_CONTRACT_ADDRESS=0x33f75CC8f11450Dd1BD749E74f387B395f1e3947
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

Start the frontend:
```bash
npm run dev
```

---

## 🏗 Deployment Guide

To deploy a fresh version of the contract:

1. **Deploy to Sepolia:**
   ```bash
   forge script script/Deploy.s.sol:DeployAuction --rpc-url $SEPOLIA_RPC_URL --broadcast -vvvv
   ```

2. **Sync the ABI:**
   After deployment, copy the fresh ABI to the client:
   ```bash
   cp out/Auction.sol/Auction.json client/src/abi/Auction.json
   ```

3. **Update Addresses:**
   Update `VITE_CONTRACT_ADDRESS` in both the root `.env` and `client/.env` files.

---

## 🔧 Critical Engineering Fixes Applied

This repository contains several advanced fixes required for stable operation on Sepolia:

- **Aggressive Log Chunking:** Alchemy's free tier and some Sepolia RPCs have strict limits on block ranges for `eth_getLogs`. We implemented a paginated scanner in `getAllSellerRegisteredLogs` that fetches in 10-block intervals with a 50ms delay to prevent rate-limiting.
- **Wagmi v2 Query Pattern:** All `useReadContract` hooks have been synchronized to the `query: { enabled: ... }` pattern. This ensures that contract reads (especially for the Admin UI) do not fail silently due to v1/v2 syntax mismatches.
- **Viem Struct Parsing:** Contract mappings returning structs with named outputs (like `sellers(address)`) are returned as Objects in Viem v2. We've updated the extraction logic to safely handle both Array and Object returns (e.g., `sellerData.hasPaidFee`).
- **RPC Transport Fix:** Corrected a common misconfiguration where the Sepolia chain was pointing to a Mainnet RPC transport, which caused write simulations to fail before reaching MetaMask.

---

## 🛡 Security & Admin

- **Admin Wallet:** `0x1bE5687B38F2e57C32049a2A6C45955C099F2906`
- **Verification:** Only the `owner` can call `verifySeller`.
- **Anti-Snipe:** Bids within the last 3 minutes of an auction trigger an automatic 3-minute extension (up to 5 times).

---

## 📄 License
MIT
