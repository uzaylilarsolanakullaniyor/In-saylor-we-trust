// ============================================================
// Entry point. Wallet connection is now handled by Privy, which gives a
// single clean "Connect" modal instead of one button per installed wallet.
//
// Provider order matters:
//   PrivyProvider          -> auth + the connect modal
//     QueryClientProvider  -> wagmi uses TanStack Query for caching reads
//       WagmiProvider       -> wallet/chain state for all wagmi hooks
//                              (from @privy-io/wagmi, so the Privy-connected
//                               wallet feeds straight into useReadContract /
//                               useSendTransaction with no other changes)
// ============================================================

import React from "react";
import ReactDOM from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base, baseSepolia } from "wagmi/chains";
import { config } from "./wagmi";
import { ACTIVE_CHAIN } from "./lib/contract";
import App from "./App";
import "./styles.css";

const queryClient = new QueryClient();

// Set VITE_PRIVY_APP_ID in Vercel (and .env locally). Get it from
// https://dashboard.privy.io/ → your app → App ID.
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {PRIVY_APP_ID ? (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          // Curated, de-cluttered wallet list — only the wallets this app
          // actually targets, instead of every injected extension.
          appearance: {
            walletList: ["base_account", "metamask", "coinbase_wallet"],
            showWalletLoginFirst: true,
            theme: "dark",
          },
          // Wallet-only login (no email/social) — this is a pure web3 app.
          loginMethods: ["wallet"],
          // Default the modal/network to whatever chain the build targets.
          defaultChain: ACTIVE_CHAIN.id === base.id ? base : baseSepolia,
          supportedChains: [base, baseSepolia],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <App />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    ) : (
      <div style={{ padding: "2rem", textAlign: "center", color: "#f87171" }}>
        Missing <code>VITE_PRIVY_APP_ID</code>. Set it in Vercel → Settings →
        Environment Variables (get the ID from dashboard.privy.io).
      </div>
    )}
  </React.StrictMode>,
);
