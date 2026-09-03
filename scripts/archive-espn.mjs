// Nightly ESPN archive. Accumulates everything ESPN only keeps for the
// current season — transactions (waivers, trades, adds/drops), the activity
// feed, the draft, per-week lineups — into data/espn/ so the league's history
// survives forever. Merges by id: nothing already archived is ever dropped.
//
// Usage: node scripts/archive-espn.mjs [year ...]   (defaults to current season)
// Public league: no cookies needed for the current/previous season. Older
// seasons need ESPN_S2 + SWID env vars.
import fs from "fs";
import path from "path";

const LEAGUE_ID = 833808174;
const BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";
const OUT = path.join(process.cwd(), "data", "espn");

const headers = {};
if (process.env.ESPN_S2 && process.env.SWID) {
  headers.Cookie = `espn_s2=${process.env.ESPN_S2}; SWID=${process.env.SWID}`;
}

const POSITIONS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" };
const SLOTS = { 0: "QB", 2: "RB", 4: "WR", 6: "TE", 7: "OP", 16: "D/ST", 17: "K", 20: "BE", 21: "IR", 23: "FLEX" };

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1));
  console.log(`  saved ${path.relative(process.cwd(), file)} (${fs.statSync(file).size} bytes)`);
}
async function get(year, query, extraHeaders = {}) {
  const url = `${BASE}/${year}/segments/0/leagues/${LEAGUE_ID}?${query}`;
  const res = await fetch(url, { headers: { ...headers, ...extraHeaders } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${query}`);
  const json = await res.json();
  return Array.isArray(json) ? json[0] : json;
}
/** Merge `items` into an archived array keyed by `key`; newer wins. */
function mergeById(file, items, key = "id") {
  const existing = readJson(file, []);
  const map = new Map(existing.map((x) => [x[key], x]));
  let added = 0;
  for (const it of items) {
    if (!map.has(it[key])) added++;
    map.set(it[key], it);
  }
  const out = [...map.values()];
  writeJson(file, out);
  console.log(`  ${path.basename(file)}: +${added} new, ${out.length} total`);
  return out;
}

function slimPlayer(p) {
  return {
    id: p.id,
    name: p.fullName,
    pos: POSITIONS[p.defaultPositionId] ?? String(p.defaultPositionId),
    proTeamId: p.proTeamId ?? null,
  };
}

async function archiveSeason(year) {
  console.log(`== ${year}`);
  const status = await get(year, "view=mStatus");
  const currentPeriod = status.scoringPeriodId ?? status.status?.currentMatchupPeriod ?? 1;
  const finalPeriod = status.status?.finalScoringPeriod ?? 18;
  const lastPeriod = Math.min(currentPeriod, finalPeriod);

  // Transactions + draft + activity feed (ESPN drops these after the season).
  const tx = await get(year, "view=mTransactions2");
  mergeById(path.join(OUT, `transactions-${year}.json`), tx.transactions ?? []);

  const draft = await get(year, "view=mDraftDetail");
  if (draft.draftDetail?.picks?.length)
    writeJson(path.join(OUT, `draft-${year}.json`), {
      drafted: draft.draftDetail.drafted,
      inProgress: draft.draftDetail.inProgress,
      picks: draft.draftDetail.picks,
    });

  const comm = await get(year, "view=kona_league_communication");
  mergeById(path.join(OUT, `activity-${year}.json`), comm.communication?.topics ?? []);

  // Player index so playerIds in transactions stay readable forever.
  const playersFile = path.join(OUT, `players-${year}.json`);
  const players = readJson(playersFile, {});
  const filter = JSON.stringify({ players: { limit: 3000, sortPercOwned: { sortAsc: false, sortPriority: 1 } } });
  try {
    const info = await get(year, "view=kona_player_info", { "X-Fantasy-Filter": filter });
    for (const e of info.players ?? []) if (e.player?.fullName) players[e.player.id] = slimPlayer(e.player);
  } catch (err) {
    console.warn(`  player index skipped: ${err.message}`);
  }

  // Per-week lineups with points. Past weeks are frozen once archived.
  for (let week = 1; week <= lastPeriod; week++) {
    const file = path.join(OUT, "boxscores", `${year}-wk${String(week).padStart(2, "0")}.json`);
    if (week < currentPeriod && fs.existsSync(file)) continue;
    let box;
    try {
      box = await get(year, `view=mBoxscore&view=mMatchupScore&scoringPeriodId=${week}`);
    } catch (err) {
      console.warn(`  week ${week} boxscore skipped: ${err.message}`);
      continue;
    }
    const side = (s) => ({
      teamId: s.teamId,
      points: s.totalPoints ?? 0,
      lineup: (s.rosterForCurrentScoringPeriod?.entries ?? []).map((e) => {
        const p = e.playerPoolEntry?.player;
        if (p?.fullName) players[p.id] = slimPlayer(p);
        return {
          playerId: e.playerId,
          name: p?.fullName ?? null,
          pos: POSITIONS[p?.defaultPositionId] ?? null,
          slot: SLOTS[e.lineupSlotId] ?? String(e.lineupSlotId),
          points: e.playerPoolEntry?.appliedStatTotal ?? 0,
        };
      }),
    });
    const matchups = (box.schedule ?? [])
      .filter((g) => g.matchupPeriodId === week || g.home?.rosterForCurrentScoringPeriod)
      .filter((g) => g.home?.teamId != null && g.away?.teamId != null)
      .map((g) => ({
        id: g.id,
        matchupPeriodId: g.matchupPeriodId,
        tier: g.playoffTierType ?? "NONE",
        winner: g.winner ?? "UNDECIDED",
        home: side(g.home),
        away: side(g.away),
      }));
    if (!matchups.length) continue;
    writeJson(file, { season: year, scoringPeriodId: week, archivedAt: new Date().toISOString(), matchups });
  }

  writeJson(playersFile, players);
}

const years = process.argv.slice(2).map(Number).filter(Boolean);
let targets = years;
if (!targets.length) {
  const now = new Date();
  // ESPN seasons roll over in the spring; before June, the "current" season is last year's.
  targets = [now.getUTCMonth() >= 5 ? now.getUTCFullYear() : now.getUTCFullYear() - 1];
}
for (const y of targets) {
  try {
    await archiveSeason(y);
  } catch (err) {
    console.error(`${y}: ${err.message}`);
    process.exitCode = 1;
  }
}
