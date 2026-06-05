// ============================================================
// Vercel Serverless Function — server-side CoinGecko proxy + cache.
//
// Why this exists:
//  - CoinGecko's free treasury endpoint returns 200 server-side but 401 from
//    the browser (it wants a key for client-side calls). Calling it here, on
//    Vercel's server, sidesteps that entirely — no API key needed.
//  - The Cache-Control header makes Vercel's CDN store the response for 1 DAY,
//    so CoinGecko is hit ~once per day TOTAL, no matter how many visitors.
//    This keeps us far under any rate limit and shields users from outages.
//
// The browser calls /api/treasuries (same origin -> no CORS, no 401).
// ============================================================

const COINS = ["bitcoin", "ethereum", "solana"] as const;

export default async function handler(_req: unknown, res: any) {
  const out: Record<string, unknown> = {};

  // Fetch all three coins in parallel; tolerate per-coin failures so one
  // bad response doesn't blank the whole page.
  await Promise.all(
    COINS.map(async (coin) => {
      try {
        const r = await fetch(
          `https://api.coingecko.com/api/v3/companies/public_treasury/${coin}`,
          { headers: { accept: "application/json" } },
        );
        out[coin] = r.ok ? await r.json() : { error: `HTTP ${r.status}` };
      } catch (e) {
        out[coin] = { error: e instanceof Error ? e.message : "fetch failed" };
      }
    }),
  );

  // Cache at Vercel's CDN for 24h. `stale-while-revalidate` lets the CDN serve
  // the last good copy for another 24h while it refreshes in the background,
  // so users never wait on (or see) a CoinGecko hiccup.
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=86400",
  );
  res.status(200).json(out);
}
