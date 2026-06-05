// ============================================================
// App shell: wallet connect bar + one card per company tying together
// the P/L panel, vote buttons, and sentiment bar. English, mobile-first.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { COMPANIES, ACTIVE_CHAIN } from "./lib/contract";
import { fetchAllPnL, type CompanyPnL } from "./lib/coingecko";
import { PnLPanel } from "./components/PnLPanel";
import { VoteButtons } from "./components/VoteButtons";
import { SentimentBar } from "./components/SentimentBar";

function WalletBar() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="wallet">
        <span className="wallet__addr">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <button className="btn-ghost" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet">
      {connectors.map((c) => (
        <button className="btn-ghost" key={c.uid} onClick={() => connect({ connector: c })} disabled={isPending}>
          Connect {c.name}
        </button>
      ))}
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
          const up = data && !data.error ? data.pnlUsd >= 0 : true;
          return (
            <article key={company.id} className={`card ${up ? "up" : "down"}`}>
              {data ? (
                <PnLPanel data={data} />
              ) : (
                <div className="bar--muted">Loading {company.label}…</div>
              )}

              {/* key={tick} forces a remount so the bar refetches post-vote */}
              <SentimentBar key={`bar-${company.id}-${tick}`} companyId={company.id} />

              <VoteButtons companyId={company.id} onVoted={refreshBars} />
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
