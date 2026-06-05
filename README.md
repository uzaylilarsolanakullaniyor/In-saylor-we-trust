# Treasury Sentiment

On-chain bull/bear voting for crypto treasury companies, with live off-chain P/L
from CoinGecko. Built for **Base** (Coinbase L2), publishable as a Base App / Farcaster Mini App.

- **Companies:** Strategy (MSTR / BTC), BitMine (BMNR / ETH), Forward (FWDI / SOL)
- **Contract:** `contracts/SentimentVoting.sol` — gas-only voting, 1 vote/wallet/company, cooldown to change
- **Frontend:** React + wagmi + viem (`frontend/`)
- **Data:** CoinGecko `/companies/public_treasury/{coin}` → P/L computed client-side

---

## Prerequisites

> ⚠️ **Node.js is required and is NOT yet installed on this machine.**
> Install Node 18+ first: https://nodejs.org (or `brew install node`).

You'll also need:
- A **throwaway wallet** private key (dev only) with Base Sepolia test ETH
- A **CoinGecko** API key (Demo or Pro — the treasury endpoint isn't on the free tier)
- A **Basescan** API key (free) for contract verification

---

## Step 6 — Test & Deploy

### A. Contracts (root of repo)

```bash
npm install                     # installs Hardhat + toolbox
cp .env.example .env            # fill DEPLOYER_PRIVATE_KEY + BASESCAN_API_KEY

npm run compile                 # compile the Solidity
npm test                        # run the test suite (local chain)
```

### B. Get Base Sepolia test ETH
Send your deployer address to a faucet:
- https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- https://www.alchemy.com/faucets/base-sepolia

### C. Deploy to Base Sepolia (testnet first!)
```bash
npm run deploy:sepolia
# prints the deployed address + a verify command
```

Verify the source on Basescan (lets users read it):
```bash
npx hardhat verify --network baseSepolia <DEPLOYED_ADDRESS>
```

### D. Wire up the frontend
```bash
cd frontend
cp .env.example .env
#   VITE_CONTRACT_ADDRESS=<deployed address>
#   VITE_CHAIN=base-sepolia
#   VITE_COINGECKO_API_KEY=<your key>   VITE_COINGECKO_TIER=demo
npm install
npm run dev                     # http://localhost:5173
```

Test the full loop: connect MetaMask/Coinbase Wallet (set to Base Sepolia),
vote, watch the sentiment bar update, wait out the cooldown, change your vote.

### E. Go to mainnet (only after testnet works)
```bash
# fund the deployer with REAL Base ETH (bridge via https://bridge.base.org)
npm run deploy:mainnet
npx hardhat verify --network base <DEPLOYED_ADDRESS>
# frontend/.env -> VITE_CHAIN=base, VITE_CONTRACT_ADDRESS=<mainnet address>
```

---

## Base App / Farcaster Mini App

1. **Deploy the frontend** to a public HTTPS domain (Vercel, Netlify, etc.).
2. **Frame meta tags** — already stubbed in `frontend/index.html`
   (`fc:frame`, `fc:frame:image`, `og:image`). Point them at your domain.
3. **Manifest** — `frontend/public/.well-known/farcaster.json` is served at
   `https://YOUR_DOMAIN/.well-known/farcaster.json`. Replace `YOUR_DOMAIN`
   and the asset URLs (icon/preview/splash).
4. **Account association** — sign the manifest in Warpcast / Base developer
   tools to prove domain ownership; paste the returned header/payload/signature
   into `accountAssociation`.
5. **Wallet** — the Coinbase Wallet connector already works inside the Base App's
   native wallet, so no extra wallet code is needed.

---

## Security recap (see Step 3 for detail)

- **Reentrancy:** impossible — no external calls / no ETH movement.
- **Sybil:** mitigated by cooldown ONLY (your choice). Does **not** stop
  fresh-wallet spam — add a refundable stake or proof-of-personhood before
  any high-stakes use.
- **CoinGecko key:** fine in `.env` for dev; for production, proxy it through a
  serverless function so it never ships in the browser bundle.
- **P/L is off-chain & informational** — the contract never reads prices, so
  there's no oracle to manipulate.
```
