// ============================================================
// wagmi configuration: which chains we support.
// wagmi = React hooks for Ethereum; viem = the low-level engine under it.
//
// Wallet CONNECTION is handled by Privy (see main.tsx), so we no longer
// list connectors here. We use createConfig from @privy-io/wagmi instead of
// plain wagmi so the Privy-connected wallet flows into every wagmi hook
// (useReadContract / useSendTransaction / etc.) unchanged.
// ============================================================

import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { createConfig } from "@privy-io/wagmi";

export const config = createConfig({
  // We allow both testnet and mainnet; the UI targets one via .env.
  chains: [baseSepolia, base],

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
