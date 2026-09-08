// Fetch Palantir (PLTR) daily closing prices for the "should've invested" tracker.
// Uses Yahoo Finance v8 chart API (public, no auth).
// Usage: node scripts/fetch-pltr.mjs
import fs from "fs";
import path from "path";

const SYMBOL = "PLTR";
const FILE = path.join(process.cwd(), "data", "pltr.json");

async function fetchPrices() {
  // 6 months of daily data covers any bet history
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?range=6mo&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AHFL/1.0)" },
  });
  if (!res.ok) {
    console.error(`Yahoo Finance returned ${res.status}`);
    process.exit(0); // don't fail the build
  }
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    console.error("No chart data returned");
    process.exit(0);
  }

  const timestamps = result.timestamp;
  const closes = result.indicators?.quote?.[0]?.close;
  if (!timestamps || !closes) {
    console.error("Missing price data");
    process.exit(0);
  }

  const prices = {};
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    prices[date] = Math.round(closes[i] * 100) / 100;
  }

  const dates = Object.keys(prices).sort();
  const current = prices[dates[dates.length - 1]];

  const data = {
    symbol: SYMBOL,
    updated: new Date().toISOString(),
    current,
    prices,
  };

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`PLTR: $${current} (${dates.length} trading days saved)`);
}

fetchPrices().catch((e) => {
  console.error("PLTR fetch failed:", e.message);
  process.exit(0); // non-fatal
});
