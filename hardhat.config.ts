// ============================================================
// Hardhat config — compiles the contract and defines the Base
// networks (Sepolia testnet + mainnet) we deploy to.
// Secrets come from .env (NEVER commit it).
// ============================================================

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Read secrets from env, with safe fallbacks so `compile`/`test` work
// even before you've set up deployment keys.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY ?? "";

// Custom RPC URLs are optional; the public defaults work for testing.
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const BASE_MAINNET_RPC = process.env.BASE_MAINNET_RPC ?? "https://mainnet.base.org";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      // The optimizer lowers deployment + call gas. 200 runs = balanced.
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Local in-memory chain for `hardhat test` (no config needed).
    hardhat: {},

    // --- Base Sepolia testnet (chainId 84532) — deploy here FIRST. ---
    baseSepolia: {
      url: BASE_SEPOLIA_RPC,
      chainId: 84532,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },

    // --- Base mainnet (chainId 8453) — only after testnet works. ---
    base: {
      url: BASE_MAINNET_RPC,
      chainId: 8453,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  // Lets `hardhat verify` publish your source to Basescan so users can
  // read/verify the contract. Both Base networks use the same key var.
  etherscan: {
    apiKey: {
      baseSepolia: BASESCAN_API_KEY,
      base: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};

export default config;
