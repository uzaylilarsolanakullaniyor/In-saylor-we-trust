// ============================================================
// STEP 5 — CoinGecko integration.
// Fetches treasury holdings for bitcoin/ethereum/solana, filters to
// the company we care about (flexible substring match), and computes P/L.
//
// The contract NEVER sees this data. It's display-only, computed here.
// ============================================================

import { COMPANIES, type Company } from "./contract";

// --- Resolve API base + auth header from the chosen tier. ---
const TIER = import.meta.env.VITE_COINGECKO_TIER ?? "demo";
const API_KEY = import.meta.env.VITE_COINGECKO_API_KEY ?? "";

const BASE_URL =
  TIER === "pro"
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";

const KEY_HEADER = TIER === "pro" ? "x-cg-pro-api-key" : "x-cg-demo-api-key";

// --- Shape of a single company entry in the API response. ---
// (Only the fields we use; the real payload has more.)
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

/**
 * Fetch + filter + compute P/L for ONE company.
 * Returns a CompanyPnL even on failure (with `.error` set) so the UI
 * can render a graceful "data unavailable" state instead of crashing.
 */
export async function fetchCompanyPnL(company: Company): Promise<CompanyPnL> {
  const empty = (error: string): CompanyPnL => ({
    company,
    holdings: 0,
    costBasisUsd: 0,
    currentValueUsd: 0,
    pnlUsd: 0,
    pnlPercent: 0,
    fetchedAt: Date.now(),
    error,
  });

  try {
    const res = await fetch(
      `${BASE_URL}/companies/public_treasury/${company.coinId}`,
      { headers: { [KEY_HEADER]: API_KEY, accept: "application/json" } },
    );

    if (!res.ok) {
      return empty(`CoinGecko ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as TreasuryResponse;

    // FLEXIBLE FILTER: case-insensitive substring match against the
    // company's known aliases (e.g. "strategy" matches "MicroStrategy").
    const hit = data.companies?.find((c) => {
      const name = (c.name ?? "").toLowerCase();
      return company.match.some((alias) => name.includes(alias));
    });

    if (!hit) {
      return empty(`"${company.label}" not found in ${company.coinId} list`);
    }

    // P/L MATH — the core of the panel.
    const costBasisUsd = hit.total_entry_value_usd ?? 0;
    const currentValueUsd = hit.total_current_value_usd ?? 0;
    const pnlUsd = currentValueUsd - costBasisUsd;
    // Guard against divide-by-zero if cost basis is missing.
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
  } catch (e) {
    return empty(e instanceof Error ? e.message : "Unknown fetch error");
  }
}

/** Fetch all three companies in parallel. */
export async function fetchAllPnL(): Promise<CompanyPnL[]> {
  return Promise.all(COMPANIES.map(fetchCompanyPnL));
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

export const fmtPercent = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
