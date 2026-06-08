/// <reference types="vite/client" />

// Type definitions for our custom environment variables so TypeScript
// recognizes import.meta.env.VITE_* without errors.
interface ImportMetaEnv {
  readonly VITE_COINGECKO_API_KEY: string;
  readonly VITE_COINGECKO_TIER: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_CHAIN: string;
  readonly VITE_PRIVY_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
