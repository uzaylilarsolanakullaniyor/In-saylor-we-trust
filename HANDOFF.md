# In Saylor We Trust — Handoff

A Web3 mini-app on **Base** that shows the live profit/loss of crypto treasury
companies and lets users vote **bullish/bearish** on-chain (gas only, no fees).
Published as a Base App / Farcaster Mini App.

> **Tagline (suggested):** `Track crypto treasury giants`

---

## 1. Live links

| What | URL |
|------|-----|
| Live site | https://in-saylor-we-trust.vercel.app |
| GitHub repo | https://github.com/uzaylilarsolanakullaniyor/In-saylor-we-trust |
| Smart contract (Basescan) | https://basescan.org/address/0x52fd75BD49712980F0f449e81499D84b26642018 |
| Cached data API | https://in-saylor-we-trust.vercel.app/api/treasuries |

---

## 2. Key facts / constants

| Item | Value |
|------|-------|
| Chain | **Base mainnet** (chainId `8453`) |
| Contract address | `0x52fd75BD49712980F0f449e81499D84b26642018` |
| Base builder code | `bc_exla6y5l` (for builder rewards / airdrop attribution) |
| Builder code suffix (ERC-8021) | `0x62635f65786c613679356c0b0080218021802180218021802180218021` |
| Base App `app_id` (meta tag) | `6a23296cab28df7fd2fc169f` |
| Wallet | MetaMask (EOA) + Coinbase Wallet |

### Companies tracked
| Ticker | Name | Coin | Votable? |
|--------|------|------|----------|
| MSTR | Strategy | BTC | ✅ yes (has cost basis) |
| BMNR | BitMine | ETH | ❌ info-only (no cost basis from CoinGecko) |
| FWDI | Forward | SOL | ❌ info-only (no cost basis from CoinGecko) |

---

## 3. How it works (architecture)

```
Browser ──reads──▶ /api/treasuries (Vercel serverless, cached 1 day) ──▶ CoinGecko
        ──reads──▶ Base mainnet (getResults / getUserVote) ── contract
        ──writes─▶ vote() / changeVote() tx (+ builder-code suffix) ── contract
```

- **P/L data** is off-chain (CoinGecko `/companies/public_treasury/{coin}`),
  fetched **server-side** and cached 1 day at Vercel's CDN. The contract never
  sees prices.
- **Votes** are on-chain on Base. One vote per wallet per company; can change
  after a 1-hour cooldown. Each vote tx carries the builder-code suffix.
- P/L is computed in the frontend: `current_value − entry_value`. Avg cost per
  coin = `entry_value / holdings`.

---

## 4. Tech stack & key files

- **Contract:** Solidity 0.8.24 — `contracts/SentimentVoting.sol`
- **Frontend:** React + Vite + wagmi + viem — `frontend/`

| File | Purpose |
|------|---------|
| `frontend/api/treasuries.ts` | Serverless CoinGecko proxy + daily cache (server-side key) |
| `frontend/src/lib/contract.ts` | Contract address, ABI, chain, companies, builder code |
| `frontend/src/lib/coingecko.ts` | Fetch `/api/treasuries`, filter, compute P/L |
| `frontend/src/components/PnLPanel.tsx` | P/L card (full vs info-only) |
| `frontend/src/components/VoteButtons.tsx` | vote/changeVote + builder code + network guard |
| `frontend/src/components/SentimentBar.tsx` | On-chain bull/bear bar |
| `frontend/src/App.tsx` | Layout, wallet bar, polling |
| `frontend/index.html` | Title, Base App `app_id` meta tag, frame tags |
| `frontend/public/.well-known/farcaster.json` | Base App / Mini App manifest |

---

## 5. Environment variables (set in Vercel → Settings → Environments)

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_CHAIN` | `base` | targets mainnet |
| `VITE_CONTRACT_ADDRESS` | `0x52fd75BD49712980F0f449e81499D84b26642018` | also hardcoded as default in code |
| `COINGECKO_API_KEY` | *(free CoinGecko Demo key, `CG-…`)* | **server-side only — NO `VITE_` prefix**, never exposed to browser |

> CoinGecko rate-limits keyless requests from Vercel's cloud IP (HTTP 429), so a
> free Demo key is required **on the server**. With daily caching, usage is tiny.

---

## 6. How to make changes (workflow)

The local repo at `/Users/mustafakavalci/Desktop/Claude/In-saylor-we-trust` is a
clone of the GitHub repo (has an `origin` remote).

1. Edit files in `frontend/…`
2. Commit (or let your tooling commit)
3. **GitHub Desktop → "Push origin"** (one click)
4. Vercel auto-deploys in ~1–2 min

> Direct `git push` from the terminal needs GitHub auth that isn't configured;
> GitHub Desktop handles auth, so it's the easy path. (The previous flow was
> manually dragging the `frontend` folder into GitHub's web uploader — no longer
> needed now that the folder is a clone.)

To run locally you need **Node.js** (not installed on this machine):
`cd frontend && npm install && npm run dev`.

---

## 7. Status — done ✅

- Smart contract deployed & live on Base mainnet (auto-verified on Basescan)
- Frontend live on Vercel, English + mobile-responsive
- Real CoinGecko P/L data (server-side cached, daily)
- On-chain voting (only Strategy; BMNR/FWDI info-only)
- Builder code (`bc_exla6y5l`) attached to every vote
- Base App ownership meta tag live (ready to "Register")
- Wrong-network handling: reads pinned to mainnet + "Switch to Base" button
- Avg buy cost per coin + colored profit/loss trend badge

---

## 8. Open / optional next steps

- [ ] Click **Register** in Base App (meta tag is already live)
- [ ] Add tagline + description in the Base App listing
- [ ] Sign the `accountAssociation` in `farcaster.json` with the domain (Warpcast/Base
      dev tools) for full Mini App embedding
- [ ] (Optional) Stronger Sybil resistance — currently **cooldown-only**, which does
      NOT stop fresh-wallet spam. Consider a small stake or proof-of-personhood.
- [ ] (Optional) Add preview/og images referenced by `index.html` & `farcaster.json`
      (`/preview.png`, `/icon.png`, `/splash.png`)
- [ ] (Optional) Verify the builder-code encoded string came from Base's official
      tool so attribution counts.

---

## 9. Design decisions & constraints

- **UI must be English and mobile-responsive** (375px). Cards collapse to one
  column via CSS grid auto-fit.
- **Base mainnet**, not Sepolia. Code defaults to `base`; override with
  `VITE_CHAIN=base-sepolia` for testing.
- **Only Strategy is votable** because CoinGecko reports a cost basis only for it;
  BMNR/FWDI show holdings + current value, no P/L, no voting.
- **Sybil defense = cooldown only** (1h to change a vote) — simplest, accepted
  trade-off for an MVP.
- **No app fee** — `vote()`/`changeVote()` are non-payable; users pay gas only.
- **No admin/owner/pause** on the contract — fully trustless, but no kill-switch.

---

## 10. Known gotchas

- **Coinbase Smart Wallet cannot deploy contracts** (no `to` field). Use MetaMask
  (EOA) for any contract deployment. Voting works on both.
- **CoinGecko data may be a snapshot** — e.g. Strategy can show a loss if its
  avg cost ($75.7K/BTC) is above the current snapshot price. That's the data
  source, not a bug.
- **Daily cache** means P/L only refreshes every 24h. Change `s-maxage=86400` in
  `frontend/api/treasuries.ts` to e.g. `900` (15 min) for fresher data.
