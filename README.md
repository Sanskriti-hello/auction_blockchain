# CS218 — Decentralised Auction DApp

## Networks supported
| Network | Purpose | Chain ID |
|---------|---------|----------|
| Anvil   | Local dev | 31337 |
| Sepolia | Testnet submission | 11155111 |
| Mainnet | Real ETH (optional) | 1 |

---

## Setup

### 1. Contracts (Foundry)
```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
forge test --gas-report       # copy output to report.pdf
forge coverage                # must be ≥ 70%
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # fill in Pinata keys
npm install
node server.js                # runs on :3001
```
Get free Pinata keys at https://app.pinata.cloud

### 3. Frontend
```bash
cd frontend
cp .env.example .env          # fill in WalletConnect ID
npm install
npm run dev                   # runs on :5173
```
Get free WalletConnect project ID at https://cloud.walletconnect.com

### 4. Deploy to Anvil (local)
```bash
anvil                         # terminal 1
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```
Update `CONTRACT_ADDRESSES[31337]` in `src/config/contract.js`.

### 5. Deploy to Sepolia
```bash
# .env needs: SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```
Get Sepolia ETH: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

Update `CONTRACT_ADDRESSES[11155111]` in `src/config/contract.js`.

---

## How it all fits together

```
Browser
  │
  ├─ ConnectButton (RainbowKit) → MetaMask / WalletConnect / Coinbase
  │
  ├─ useAuction hooks (wagmi) → reads/writes to Auction.sol on-chain
  │
  └─ IPFS calls → your Express backend (never Pinata directly)
                       └─ Pinata → IPFS
```

## Seller flow
1. Seller calls `registerAsSeller()` — pays one-time fee
2. Admin calls `verifySeller(sellerAddr)` — approves them
3. Seller can now call `createAuction()`

## Buyer flow
1. Check `buyerFee(auctionId)` — dynamic fee (increases with bidder count)
2. Call `placeBid(auctionId)` with `value = fee + bidAmount`
3. If outbid, `pendingReturns` is credited — call `withdrawBid()` to get ETH back

## Team Members
| Name | Roll Number |
|------|-------------|
|      |             |
|      |             |
|      |             |