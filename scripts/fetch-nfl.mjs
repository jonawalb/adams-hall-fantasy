// Refresh the NFL pick'em slate into data/nfl/slate.json.
// Usage: node scripts/fetch-nfl.mjs
// Fetches ESPN's public scoreboard for the current week (and re-fetches the
// previous week so late results finalize), merging into the existing file so
// every week of the season is preserved for leaderboards.
import fs from "fs";
import path from "path";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const FILE = path.join(process.cwd(), "data", "nfl", "slate.json");

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { season: null, currentWeek: null, weeks: {} };
  }
}

function side(competitor) {
  return {
    abbr: competitor.team.abbreviation,
    name: competitor.team.displayName,
    logo: competitor.team.logo,
    color: competitor.team.color,
    score: Number(competitor.score ?? 0),
  };
}

// DraftKings line as ESPN publishes it on the scoreboard. Moneylines are
// strings like "-170" / "+142" so the sign survives.
function odds(c) {
  const o = c.odds?.[0];
  if (!o) return undefined;
  const ml = (side) => o.moneyline?.[side]?.close?.odds ?? o.moneyline?.[side]?.open?.odds ?? null;
  return {
    provider: o.provider?.displayName ?? null,
    details: o.details ?? null, // e.g. "SEA -3"
    overUnder: o.overUnder ?? null,
    moneyline: { home: ml("home"), away: ml("away") },
  };
}

function normalize(json) {
  const games = (json.events ?? []).map((e) => {
    const c = e.competitions[0];
    const home = c.competitors.find((x) => x.homeAway === "home");
    const away = c.competitors.find((x) => x.homeAway === "away");
    const completed = Boolean(c.status?.type?.completed);
    let winner = null;
    if (completed) {
      if (home.winner) winner = "home";
      else if (away.winner) winner = "away";
    }
    return {
      id: e.id,
      date: e.date,
      name: e.shortName ?? e.name,
      state: c.status?.type?.state ?? "pre", // pre | in | post
      completed,
      winner,
      detail: c.status?.type?.shortDetail ?? "",
      home: side(home),
      away: side(away),
      odds: odds(c),
    };
  });
  games.sort((a, b) => a.date.localeCompare(b.date));
  return { season: json.season.year, week: json.week.number, games };
}

async function fetchWeek(season, week) {
  const url = week
    ? `${BASE}?seasontype=2&dates=${season}&week=${week}`
    : BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return normalize(await res.json());
}

// ESPN drops the line once a game is final; keep the last one we saw.
function keepOdds(slate, week) {
  const prior = slate.weeks[week.week]?.games ?? [];
  for (const g of week.games) {
    if (!g.odds) {
      const old = prior.find((p) => p.id === g.id);
      if (old?.odds) g.odds = old.odds;
    }
  }
  return week;
}

const slate = loadExisting();
const current = keepOdds(slate, await fetchWeek());
slate.season = current.season;
slate.currentWeek = current.week;
slate.fetchedAt = new Date().toISOString();
slate.weeks[current.week] = current;
console.log(`week ${current.week}: ${current.games.length} games (current)`);

if (current.week > 1) {
  const prev = keepOdds(slate, await fetchWeek(current.season, current.week - 1));
  slate.weeks[prev.week] = prev;
  console.log(`week ${prev.week}: ${prev.games.length} games (refreshed)`);
}

fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(slate, null, 1));
console.log(`saved ${FILE}`);
