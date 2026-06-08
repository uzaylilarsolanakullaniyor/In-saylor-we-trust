// ============================================================
// App shell: wallet connect bar + one card per company tying together
// the P/L panel, vote buttons, and sentiment bar. English, mobile-first.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { COMPANIES, ACTIVE_CHAIN } from "./lib/contract";
import { fetchAllPnL, type CompanyPnL } from "./lib/coingecko";
import { PnLPanel } from "./components/PnLPanel";
import { VoteButtons } from "./components/VoteButtons";
import { SentimentBar } from "./components/SentimentBar";

function WalletBar() {
  // The connected address still comes from wagmi (Privy feeds it in), but the
  // connect/disconnect flow is Privy's single clean modal.
  const { address } = useAccount();
  const { ready, authenticated, login, logout } = usePrivy();

  // Avoid a flicker of the wrong button before Privy has rehydrated state.
  if (!ready) {
    return (
      <div className="wallet">
        <button className="btn-ghost" disabled>
          Loading…
        </button>
      </div>
    );
  }

  if (authenticated && address) {
    return (
      <div className="wallet">
        <span className="wallet__addr">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button className="btn-ghost" onClick={() => logout()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet">
      <button className="btn-ghost" onClick={() => login()}>
        Connect Wallet
      </button>
    </div>
  );
}

export default function App() {
  const [pnl, setPnl] = useState<CompanyPnL[]>([]);
  // `tick` is bumped to force the sentiment bars to refetch after a vote.
  const [tick, setTick] = useState(0);
  const refreshBars = useCallback(() => setTick((t) => t + 1), []);

  // Periodic CoinGecko refresh. CoinGecko itself only updates ~5 min, so
  // 60s polling is plenty and stays well under rate limits.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await fetchAllPnL();
      if (alive) setPnl(data);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="app">
      <header className="hdr">
        <h1>🫡 In Saylor We Trust</h1>
        <p className="hdr__sub">Live P/L of crypto treasury portfolios + on-chain bull/bear voting</p>
        <div className="pills">
          <span className="pill pill--chain">⬡ {ACTIVE_CHAIN.name}</span>
          <span className="pill pill--live">
            <span className="dot" /> LIVE
          </span>
        </div>
        <WalletBar />
      </header>

      <section className="cards">
        {COMPANIES.map((company) => {
          const data = pnl.find((p) => p.company.id === company.id);
          // Card tone: green/red only when we actually have a P/L (cost basis).
          const hasPnl = Boolean(data && !data.error && data.costBasisUsd > 0);
          const tone = hasPnl ? (data!.pnlUsd >= 0 ? "up" : "down") : "flat";

          return (
            <article key={company.id} className={`card ${tone}`}>
              {data ? (
                <PnLPanel data={data} />
              ) : (
                <div className="bar--muted">Loading {company.label}…</div>
              )}

              {company.votable ? (
                <>
                  {/* key={tick} forces a remount so the bar refetches post-vote */}
                  <SentimentBar key={`bar-${company.id}-${tick}`} companyId={company.id} />
                  <VoteButtons companyId={company.id} onVoted={refreshBars} />
                </>
              ) : (
                <p className="vhint">🔒 Voting disabled — no cost-basis data for this company.</p>
              )}
            </article>
          );
        })}
      </section>

      <footer className="foot">
        P/L is informational, sourced off-chain from CoinGecko.
        <br />
        Votes are stored on-chain and pay gas only — no app fee.
      </footer>
    </main>
  );
}
