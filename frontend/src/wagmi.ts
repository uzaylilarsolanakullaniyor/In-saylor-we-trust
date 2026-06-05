// ============================================================
// wagmi configuration: which chains we support and which wallets.
// wagmi = React hooks for Ethereum; viem = the low-level engine under it.
// ============================================================

import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const config = createConfig({
  // We allow both testnet and mainnet; the UI targets one via .env.
  chains: [baseSepolia, base],

  // Connectors = the wallet options shown to the user.
  connectors: [
    // MetaMask and other browser-extension wallets.
    injected(),
    // Coinbase Wallet — this is also Base App's native wallet, so the
    // same connector works when the app runs inside the Base App.
    coinbaseWallet({
      appName: "In Saylor We Trust",
      preference: "all", // allow both extension and smart-wallet modes
    }),
  ],

  // transports = how we talk to each chain's RPC. http() uses the chain's
  // default public RPC. For production, swap in a dedicated RPC URL
  // (e.g. Alchemy/Infura) to avoid public-node rate limits.
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

// Tell TypeScript about our config so hooks are fully typed.
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
