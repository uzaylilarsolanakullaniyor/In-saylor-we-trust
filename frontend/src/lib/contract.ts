// ============================================================
// Contract wiring: ABI, address, company registry, chain choice.
// The ABI is the "menu" of functions wagmi/viem can call. It must
// match SentimentVoting.sol exactly. After you deploy in Step 6,
// put the address in .env as VITE_CONTRACT_ADDRESS.
// ============================================================

import { base, baseSepolia } from "wagmi/chains";

// --- Which chain are we on? Driven by .env (defaults to testnet). ---
export const ACTIVE_CHAIN =
  import.meta.env.VITE_CHAIN === "base" ? base : baseSepolia;

// --- Deployed contract address (0x0 until you deploy). ---
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

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
}

export const COMPANIES: Company[] = [
  {
    id: 0,
    ticker: "MSTR",
    label: "Strategy",
    coinId: "bitcoin",
    coinSymbol: "BTC",
    match: ["strategy", "microstrategy"],
  },
  {
    id: 1,
    ticker: "BMNR",
    label: "BitMine",
    coinId: "ethereum",
    coinSymbol: "ETH",
    match: ["bitmine"],
  },
  {
    id: 2,
    ticker: "FWDI",
    label: "Forward",
    coinId: "solana",
    coinSymbol: "SOL",
    match: ["forward"],
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
