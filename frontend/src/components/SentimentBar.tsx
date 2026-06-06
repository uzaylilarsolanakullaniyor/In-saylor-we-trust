// ============================================================
// FEATURE 3 — Sentiment bar. Reads bull/bear tallies straight from
// the contract via getResults() and renders a green/red split bar.
// ============================================================

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, SENTIMENT_ABI, ACTIVE_CHAIN } from "../lib/contract";

export function SentimentBar({ companyId }: { companyId: number }) {
  // useReadContract = gas-free view call. `query.refetchInterval` makes it
  // re-poll on its own; we also refetch after a vote tx confirms (in App).
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SENTIMENT_ABI,
    functionName: "getResults",
    args: [companyId],
    chainId: ACTIVE_CHAIN.id, // always read from Base mainnet, regardless of wallet network
    query: { refetchInterval: 15_000 }, // light poll every 15s
  });

  if (isLoading) return <div className="bar bar--muted">Loading votes…</div>;
  if (error)
    return <div className="bar bar--muted">Votes unavailable (contract not deployed yet)</div>;

  // getResults returns a tuple [bull, bear, total] as bigints.
  const [bull, bear, total] = (data ?? [0n, 0n, 0n]) as [bigint, bigint, bigint];
  const totalN = Number(total);

  // Avoid divide-by-zero before anyone has voted.
  const bullPct = totalN === 0 ? 50 : (Number(bull) / totalN) * 100;
  const bearPct = totalN === 0 ? 50 : (Number(bear) / totalN) * 100;

  return (
    <div className="bar">
      <div className="track" aria-hidden>
        <div className="bull" style={{ width: `${bullPct}%` }} />
        <div className="bear" style={{ width: `${bearPct}%` }} />
      </div>
      <div className="legend">
        <span className="b1">🐂 {bullPct.toFixed(0)}%</span>
        <span className="ct">
          {totalN} vote{totalN === 1 ? "" : "s"}
        </span>
        <span className="b2">{bearPct.toFixed(0)}% 🐻</span>
      </div>
    </div>
  );
}
