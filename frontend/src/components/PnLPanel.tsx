// ============================================================
// FEATURE 1 — Real-time P/L panel for one company.
// Full P/L (green/red) when CoinGecko reports a cost basis (Strategy).
// When there's no cost basis (BitMine/Forward), show an info-only layout:
// holdings + current value, no P/L, no color.
// ============================================================

import type { CompanyPnL } from "../lib/coingecko";
import { fmtUsdShort, fmtCoin, fmtPrice } from "../lib/coingecko";

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

  // No cost basis reported -> info-only layout (no P/L, no color).
  const hasCostBasis = data.costBasisUsd > 0;

  if (!hasCostBasis) {
    return (
      <>
        {head}

        <div className="pl pl--flat">
          <span className="pl__val">{fmtUsdShort(data.currentValueUsd)}</span>
          <span className="pl__tag">current value</span>
        </div>

        <dl className="grid">
          <div>
            <dt>Holdings</dt>
            <dd>{fmtCoin(data.holdings, company.coinSymbol)}</dd>
          </div>
          <div>
            <dt>Current value</dt>
            <dd>{fmtUsdShort(data.currentValueUsd)}</dd>
          </div>
        </dl>

        <div className="note">Cost basis not reported by CoinGecko — P/L unavailable.</div>
        <div className="updated">
          <span className="dot" /> Updated {new Date(data.fetchedAt).toLocaleTimeString("en-US")}
        </div>
      </>
    );
  }

  // Full P/L layout (Strategy).
  const up = data.pnlUsd >= 0;
  const pctStr = `${data.pnlPercent >= 0 ? "+" : ""}${data.pnlPercent.toFixed(2)}%`;
  const avgCost = data.holdings > 0 ? data.costBasisUsd / data.holdings : 0;

  return (
    <>
      {head}

      <div className="pl">
        <span className="pl__badge">{up ? "▲" : "▼"}</span>
        <span className="pl__val">{fmtUsdShort(data.pnlUsd)}</span>
        <span className="pl__pct">{pctStr}</span>
      </div>

      {avgCost > 0 && (
        <div className="avgcost">
          Avg cost <strong>{fmtPrice(avgCost)}</strong> / {company.coinSymbol}
        </div>
      )}

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
