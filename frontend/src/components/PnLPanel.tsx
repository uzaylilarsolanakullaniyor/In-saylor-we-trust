// ============================================================
// FEATURE 1 — Real-time P/L panel for one company.
// Green when in profit, red at a loss. Data from CoinGecko.
// ============================================================

import type { CompanyPnL } from "../lib/coingecko";
import { fmtUsdShort, fmtCoin } from "../lib/coingecko";

// Map CoinGecko coin id -> badge style class.
const COIN_CLASS: Record<string, string> = {
  bitcoin: "btc",
  ethereum: "eth",
  solana: "sol",
};

export function PnLPanel({ data }: { data: CompanyPnL }) {
  const { company } = data;
  const coinClass = COIN_CLASS[company.coinId] ?? "";

  const head = (
    <div className="phead">
      <div className={`coin ${coinClass}`}>{company.coinSymbol}</div>
      <div className="phead__t">
        <span className="ticker">{company.ticker}</span>
        <span className="subname">
          {company.label} · {company.coinSymbol} treasury
        </span>
      </div>
    </div>
  );

  // Error / unavailable state — readable, never crashes.
  if (data.error) {
    return (
      <>
        {head}
        <div className="errmsg">⚠️ {data.error}</div>
      </>
    );
  }

  const up = data.pnlUsd >= 0;
  const pctStr = `${data.pnlPercent >= 0 ? "+" : ""}${data.pnlPercent.toFixed(2)}%`;

  return (
    <>
      {head}

      <div className="pl">
        <span className="arrow">{up ? "▲" : "▼"}</span>
        <span className="pl__val">{fmtUsdShort(data.pnlUsd)}</span>
        <span className="pl__pct">{pctStr}</span>
      </div>

      <dl className="grid">
        <div>
          <dt>Holdings</dt>
          <dd>{fmtCoin(data.holdings, company.coinSymbol)}</dd>
        </div>
        <div>
          <dt>Cost basis</dt>
          <dd>{fmtUsdShort(data.costBasisUsd)}</dd>
        </div>
        <div>
          <dt>Current value</dt>
          <dd>{fmtUsdShort(data.currentValueUsd)}</dd>
        </div>
        <div>
          <dt>Profit / Loss</dt>
          <dd>{fmtUsdShort(data.pnlUsd)}</dd>
        </div>
      </dl>

      <div className="updated">
        <span className="dot" /> Updated {new Date(data.fetchedAt).toLocaleTimeString("en-US")}
      </div>
    </>
  );
}
