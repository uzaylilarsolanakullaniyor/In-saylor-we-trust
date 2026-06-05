// ============================================================
// Contract wiring: ABI, address, company registry, chain choice.
// The ABI is the "menu" of functions wagmi/viem can call. It must
// match SentimentVoting.sol exactly. After you deploy in Step 6,
// put the address in .env as VITE_CONTRACT_ADDRESS.
// ============================================================

import { base, baseSepolia } from "wagmi/chains";

// --- Which chain are we on? Defaults to Base mainnet; set VITE_CHAIN to
// "base-sepolia" to use the testnet instead. ---
export const ACTIVE_CHAIN =
  import.meta.env.VITE_CHAIN === "base-sepolia" ? baseSepolia : base;

// --- Deployed contract address. Live on Base mainnet. The env var can
// override it, but we hardcode the deployed address as the default so the
// app works even if the env var isn't set. ---
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x52fd75BD49712980F0f449e81499D84b26642018") as `0x${string}`;

// --- Base Builder Code (ERC-8021 attribution) ---
// This encoded suffix is appended to the END of our vote transactions'
// calldata. The contract ignores the extra bytes; Base's indexer reads them
// and attributes the on-chain activity to builder code "bc_x9ewdvub", which
// is what makes the app eligible for Builder Rewards / potential airdrops.
// (Generated from the Base builder-codes tool — see docs.base.org/apps/builder-codes.)
export const BUILDER_CODE_SUFFIX =
  "0x62635f78396577647675620b0080218021802180218021802180218021" as `0x${string}`;

// --- Sentiment enum mirror (must match the Solidity enum order). ---
export enum Sentiment {
  None = 0,
  Bullish = 1,
  Bearish = 2,
}

// --- The three companies. id == companyId in the contract. ---
// `coinId` is the CoinGecko coin used to look this company up.
// `match` is the case-insensitive substring we filter the API response by
// (flexible matching, per your choice — survives naming differences like
// "MicroStrategy" vs "Strategy").
export interface Company {
  id: number;
  ticker: string;
  label: string;
  coinId: "bitcoin" | "ethereum" | "solana";
  coinSymbol: string;
  match: string[];
  // Whether voting is enabled. CoinGecko only reports a cost basis (entry
  // value) for Strategy, so P/L — and therefore betting — is only meaningful
  // there. BitMine/Forward are shown info-only (holdings + current value).
  votable: boolean;
}

export const COMPANIES: Company[] = [
  {
    id: 0,
    ticker: "MSTR",
    label: "Strategy",
    coinId: "bitcoin",
    coinSymbol: "BTC",
    match: ["strategy", "microstrategy"],
    votable: true, // has cost basis -> full P/L + voting
  },
  {
    id: 1,
    ticker: "BMNR",
    label: "BitMine",
    coinId: "ethereum",
    coinSymbol: "ETH",
    match: ["bitmine"],
    votable: false, // no cost basis from CoinGecko -> info-only
  },
  {
    id: 2,
    ticker: "FWDI",
    label: "Forward",
    coinId: "solana",
    coinSymbol: "SOL",
    match: ["forward"],
    votable: false, // no cost basis from CoinGecko -> info-only
  },
];

// --- The ABI. Only the functions/events the frontend actually uses. ---
export const SENTIMENT_ABI = [
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "companyId", type: "uint8" },
      { name: "sentiment", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "changeVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "companyId", type: "uint8" },
      { name: "newSentiment", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getResults",
    stateMutability: "view",
    inputs: [{ name: "companyId", type: "uint8" }],
    outputs: [
      { name: "bull", type: "uint256" },
      { name: "bear", type: "uint256" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getUserVote",
    stateMutability: "view",
    inputs: [
      { name: "companyId", type: "uint8" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "changeCooldownRemaining",
    stateMutability: "view",
    inputs: [
      { name: "companyId", type: "uint8" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "Voted",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "companyId", type: "uint8", indexed: true },
      { name: "sentiment", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteChanged",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "companyId", type: "uint8", indexed: true },
      { name: "oldSentiment", type: "uint8", indexed: false },
      { name: "newSentiment", type: "uint8", indexed: false },
    ],
  },
] as const;
