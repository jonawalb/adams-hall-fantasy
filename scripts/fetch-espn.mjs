// Refresh ESPN league data into data/espn/.
// Usage: node scripts/fetch-espn.mjs [year ...]   (defaults to 2025 2026)
// For locked seasons (2021-2024), set ESPN_S2 and SWID env vars from a logged-in
// espn.com browser session (Application > Cookies > espn_s2 / SWID).
import fs from "fs";
import path from "path";

const LEAGUE_ID = 833808174;
const VIEWS = "view=mTeam&view=mStandings&view=mSettings&view=mMatchupScore";
const OUT = path.join(process.cwd(), "data", "espn");

const years = process.argv.slice(2).map(Number).filter(Boolean);
const targets = years.length ? years : [2025, 2026];

const headers = {};
if (process.env.ESPN_S2 && process.env.SWID) {
  headers.Cookie = `espn_s2=${process.env.ESPN_S2}; SWID=${process.env.SWID}`;
}

fs.mkdirSync(OUT, { recursive: true });

for (const year of targets) {
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${LEAGUE_ID}?${VIEWS}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`${year}: HTTP ${res.status}${res.status === 401 ? " (needs ESPN_S2/SWID cookies)" : ""}`);
    continue;
  }
  const data = await res.json();
  const file = path.join(OUT, `season-${year}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`${year}: saved ${file} (${fs.statSync(file).size} bytes)`);
}
