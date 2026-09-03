// College football snapshot for /cfb: AP Top 25 + this week's FBS slate +
// last week's results. Public ESPN endpoints, no auth.
// Usage: node scripts/fetch-cfb.mjs
import fs from "fs";
import path from "path";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const FILE = path.join(process.cwd(), "data", "cfb.json");

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function side(c) {
  return {
    abbr: c.team.abbreviation,
    name: c.team.displayName,
    short: c.team.shortDisplayName ?? c.team.name,
    logo: c.team.logo ?? c.team.logos?.[0]?.href ?? null,
    color: c.team.color ?? null,
    rank: c.curatedRank?.current && c.curatedRank.current <= 25 ? c.curatedRank.current : null,
    score: Number(c.score ?? 0),
    record: c.records?.[0]?.summary ?? null,
    conferenceId: c.team.conferenceId ?? null,
    winner: Boolean(c.winner),
  };
}

function normalizeGames(json) {
  return (json.events ?? [])
    .map((e) => {
      const c = e.competitions[0];
      const home = c.competitors.find((x) => x.homeAway === "home");
      const away = c.competitors.find((x) => x.homeAway === "away");
      if (!home || !away) return null;
      return {
        id: e.id,
        date: e.date,
        name: e.shortName ?? e.name,
        state: c.status?.type?.state ?? "pre",
        completed: Boolean(c.status?.type?.completed),
        detail: c.status?.type?.shortDetail ?? "",
        venue: c.venue?.fullName ?? null,
        broadcast: c.broadcasts?.[0]?.names?.[0] ?? null,
        spread: c.odds?.[0]?.details ?? null,
        overUnder: c.odds?.[0]?.overUnder ?? null,
        headline: c.headlines?.[0]?.shortLinkText ?? null,
        home: side(home),
        away: side(away),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const rankJson = await getJson(`${BASE}/rankings`);
const ap = rankJson.rankings.find((r) => /^AP/.test(r.name)) ?? rankJson.rankings[0];
const rankings = (ap?.ranks ?? []).map((r) => ({
  rank: r.current,
  previous: r.previous || null,
  trend: r.trend ?? "-",
  team: r.team.location ?? r.team.nickname ?? r.team.displayName,
  mascot: r.team.name ?? "",
  abbr: r.team.abbreviation,
  logo: r.team.logos?.[0]?.href ?? null,
  record: r.recordSummary ?? null,
  points: r.points ?? null,
  firstPlaceVotes: r.firstPlaceVotes ?? 0,
}));

const sb = await getJson(`${BASE}/scoreboard?groups=80&limit=300`);
const season = sb.season?.year;
const week = sb.week?.number ?? 1;
const thisWeek = normalizeGames(sb);
let lastWeek = [];
if (week > 1) {
  try {
    lastWeek = normalizeGames(await getJson(`${BASE}/scoreboard?groups=80&limit=300&seasontype=2&week=${week - 1}&dates=${season}`));
  } catch (err) {
    console.warn(`last week skipped: ${err.message}`);
  }
}

fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(
  FILE,
  JSON.stringify({ season, week, poll: ap?.name ?? "AP Top 25", fetchedAt: new Date().toISOString(), rankings, thisWeek, lastWeek }, null, 1),
);
console.log(`cfb: ${season} week ${week}, ${rankings.length} ranked, ${thisWeek.length} games this week, ${lastWeek.length} last week → ${FILE}`);
