// ============================================================
// STEP 5 — CoinGecko integration (via our cached serverless proxy).
//
// The browser no longer calls CoinGecko directly (that returned 401 client-side
// and didn't scale). Instead it calls OUR /api/treasuries endpoint, which
// fetches CoinGecko server-side and is cached by Vercel's CDN for 1 day.
//
// This file: fetch the cached payload, filter to our 3 companies (flexible
// substring match), and compute P/L. The contract NEVER sees this data.
// ============================================================

import { COMPANIES, type Company } from "./contract";

// --- Shape of a single company entry in the CoinGecko response. ---
interface TreasuryCompanyRaw {
  name: string;
  symbol: string;
  total_holdings: number; // amount of coin held
  total_entry_value_usd: number; // cost basis (USD)
  total_current_value_usd: number; // current market value (USD)
}

interface TreasuryResponse {
  companies: TreasuryCompanyRaw[];
}

// /api/treasuries returns { bitcoin: {...}, ethereum: {...}, solana: {...} }
// where each value is a TreasuryResponse OR an { error } object.
type CoinPayload = TreasuryResponse | { error: string };
type ApiPayload = Record<string, CoinPayload | undefined>;

// --- What our UI consumes: a company's holdings + computed P/L. ---
export interface CompanyPnL {
  company: Company;
  holdings: number; // coin amount
  costBasisUsd: number; // total_entry_value
  currentValueUsd: number; // total_value_usd
  pnlUsd: number; // current - cost
  pnlPercent: number; // pnl / cost * 100
  fetchedAt: number; // ms timestamp, for "last updated"
  error?: string; // set if this company couldn't be resolved
}

function emptyPnL(company: Company, error: string): CompanyPnL {
  return {
    company,
    holdings: 0,
    costBasisUsd: 0,
    currentValueUsd: 0,
    pnlUsd: 0,
    pnlPercent: 0,
    fetchedAt: Date.now(),
    error,
  };
}

// Compute P/L for one company from its coin's raw treasury response.
function computePnL(company: Company, data: CoinPayload | undefined): CompanyPnL {
  if (!data) return emptyPnL(company, `No data for ${company.coinId}`);
  if ("error" in data) return emptyPnL(company, `CoinGecko: ${data.error}`);

  // FLEXIBLE FILTER: case-insensitive substring match against the company's
  // known aliases (e.g. "strategy" matches "Strategy"/"MicroStrategy").
  const hit = data.companies?.find((c) => {
    const name = (c.name ?? "").toLowerCase();
    return company.match.some((alias) => name.includes(alias));
  });

  if (!hit) {
    return emptyPnL(company, `"${company.label}" not found in ${company.coinId} list`);
  }

  // P/L MATH — the core of the panel.
  const costBasisUsd = hit.total_entry_value_usd ?? 0;
  const currentValueUsd = hit.total_current_value_usd ?? 0;
  const pnlUsd = currentValueUsd - costBasisUsd;
  // Guard against divide-by-zero if cost basis is missing/zero.
  const pnlPercent = costBasisUsd > 0 ? (pnlUsd / costBasisUsd) * 100 : 0;

  return {
    company,
    holdings: hit.total_holdings ?? 0,
    costBasisUsd,
    currentValueUsd,
    pnlUsd,
    pnlPercent,
    fetchedAt: Date.now(),
  };
}

/**
 * Fetch the cached payload from our own /api/treasuries and compute P/L for
 * all three companies. Returns a graceful error state per company on failure
 * so the UI never crashes.
 */
export async function fetchAllPnL(): Promise<CompanyPnL[]> {
  let payload: ApiPayload = {};
  try {
    const res = await fetch("/api/treasuries", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return COMPANIES.map((c) => emptyPnL(c, `API ${res.status} ${res.statusText}`));
    }
    payload = (await res.json()) as ApiPayload;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return COMPANIES.map((c) => emptyPnL(c, msg));
  }

  return COMPANIES.map((c) => computePnL(c, payload[c.coinId]));
}

// --- Formatting helpers used by the UI. ---
export const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

// Compact USD for big treasury figures: $41.20B / $980.0M / $12,345
export const fmtUsdShort = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  return `${s}$${a.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const fmtCoin = (n: number, symbol: string) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${symbol}`;

// Per-coin price, e.g. $75,705 (no decimals for big prices, 2 for small).
export const fmtPrice = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 100 ? 0 : 2,
  });

export const fmtPercent = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
