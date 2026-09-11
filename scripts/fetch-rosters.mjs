// Fetch all 32 NFL team rosters from ESPN and save a compact
// player-name → team-abbreviation lookup to data/nfl/rosters.json.
// Usage: node scripts/fetch-rosters.mjs
import fs from "fs";
import path from "path";

const TEAMS = [
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN",
  "DET","GB","HOU","IND","JAX","KC","LAC","LAR","LV","MIA",
  "MIN","NE","NO","NYG","NYJ","PHI","PIT","SEA","SF","TB","TEN","WSH",
];

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";
const FILE = path.join(process.cwd(), "data", "nfl", "rosters.json");

const players = {};
let total = 0;

for (const abbr of TEAMS) {
  const url = `${BASE}/${abbr}/roster`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`${abbr}: HTTP ${res.status}`); continue; }
    const data = await res.json();
    let count = 0;
    for (const group of data.athletes ?? []) {
      for (const athlete of group.items ?? []) {
        if (athlete.fullName) {
          players[athlete.fullName] = abbr;
          count++;
        }
      }
    }
    total += count;
    console.log(`${abbr}: ${count} players`);
  } catch (err) {
    console.warn(`${abbr}: ${err.message}`);
  }
}

fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), players }, null, 1));
console.log(`saved ${total} players → ${FILE}`);
