// Bad Decisions: bench blunders and waiver whiffs from the nightly archive
// (data/espn/boxscores/*.json + transactions-YYYY.json + players-YYYY.json).
import fs from "fs";
import path from "path";
import { Season } from "./espn";

const DATA = path.join(process.cwd(), "data", "espn");

interface LineupEntry {
  playerId: number;
  name: string | null;
  pos: string | null;
  slot: string;
  points: number;
}
interface BoxSide {
  teamId: number;
  points: number;
  lineup: LineupEntry[];
}
interface BoxFile {
  season: number;
  scoringPeriodId: number;
  matchups: { home: BoxSide; away: BoxSide; matchupPeriodId: number }[];
}

const ELIGIBLE: Record<string, string[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  "D/ST": ["D/ST"],
  K: ["K"],
  FLEX: ["RB", "WR", "TE"],
  OP: ["QB", "RB", "WR", "TE"],
};
const BENCH = new Set(["BE", "IR"]);

export interface BenchBlunder {
  teamId: number;
  team: string;
  owner: string;
  actual: number;
  optimal: number;
  left: number;
  worstCall: { started: LineupEntry; benched: LineupEntry; swing: number } | null;
}

export interface WaiverWhiff {
  teamId: number;
  team: string;
  owner: string;
  player: string;
  pos: string | null;
  points: number | null; // null = not on the roster's box score that week
  type: string;
}

export interface WeekBlunders {
  week: number;
  bench: BenchBlunder[];
  waivers: WaiverWhiff[];
  blunderOfWeek: BenchBlunder | null;
}

function optimalLineup(lineup: LineupEntry[]): { optimal: number; worstCall: BenchBlunder["worstCall"] } {
  const starters = lineup.filter((e) => !BENCH.has(e.slot));
  const bench = lineup.filter((e) => BENCH.has(e.slot));
  // Slot template = what the team actually started (dedicated slots first, flex last).
  const slots = starters.map((e) => e.slot).sort((a, b) => (ELIGIBLE[a]?.length ?? 9) - (ELIGIBLE[b]?.length ?? 9));
  const pool = [...lineup].sort((a, b) => b.points - a.points);
  const used = new Set<number>();
  let optimal = 0;
  for (const slot of slots) {
    const ok = ELIGIBLE[slot] ?? [slot];
    const best = pool.find((p) => !used.has(p.playerId) && p.pos && ok.includes(p.pos));
    if (best) {
      used.add(best.playerId);
      optimal += best.points;
    }
  }
  let worstCall: BenchBlunder["worstCall"] = null;
  for (const s of starters) {
    const ok = ELIGIBLE[s.slot] ?? [s.slot];
    for (const b of bench) {
      if (!b.pos || !ok.includes(b.pos)) continue;
      const swing = b.points - s.points;
      if (swing > (worstCall?.swing ?? 0)) worstCall = { started: s, benched: b, swing };
    }
  }
  return { optimal: Math.round(optimal * 10) / 10, worstCall };
}

export function seasonBlunders(season: Season): WeekBlunders[] {
  const dir = path.join(DATA, "boxscores");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${season.year}-wk`)).sort();
  const players: Record<string, { name: string; pos: string }> = JSON.parse(
    fs.existsSync(path.join(DATA, `players-${season.year}.json`)) ? fs.readFileSync(path.join(DATA, `players-${season.year}.json`), "utf8") : "{}",
  );
  const txFile = path.join(DATA, `transactions-${season.year}.json`);
  const transactions: { type: string; status: string; scoringPeriodId: number; teamId: number; items: { type: string; playerId: number; toTeamId: number; fromTeamId: number }[] }[] =
    fs.existsSync(txFile) ? JSON.parse(fs.readFileSync(txFile, "utf8")) : [];
  const teamName = (id: number) => season.teams.find((t) => t.id === id);

  const out: WeekBlunders[] = [];
  for (const f of files) {
    const box: BoxFile = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const sides = box.matchups.flatMap((m) => [m.home, m.away]);
    if (!sides.length || sides.every((s) => s.points === 0)) continue; // week not played
    const bench: BenchBlunder[] = sides
      .map((s) => {
        const t = teamName(s.teamId);
        const actual = Math.round(s.lineup.filter((e) => !BENCH.has(e.slot)).reduce((a, e) => a + e.points, 0) * 10) / 10;
        const { optimal, worstCall } = optimalLineup(s.lineup);
        return {
          teamId: s.teamId,
          team: t?.name ?? `Team ${s.teamId}`,
          owner: t?.ownerFirst ?? "?",
          actual,
          optimal,
          left: Math.round((optimal - actual) * 10) / 10,
          worstCall,
        };
      })
      .sort((a, b) => b.left - a.left);

    const pointsFor = (playerId: number) => {
      for (const s of sides) {
        const e = s.lineup.find((x) => x.playerId === playerId);
        if (e) return e.points;
      }
      return null;
    };
    const waivers: WaiverWhiff[] = transactions
      .filter((t) => (t.type === "WAIVER" || t.type === "FREEAGENT") && t.status === "EXECUTED" && t.scoringPeriodId === box.scoringPeriodId)
      .flatMap((t) =>
        t.items
          .filter((it) => it.type === "ADD")
          .map((it) => {
            const team = teamName(it.toTeamId);
            const p = players[String(it.playerId)];
            return {
              teamId: it.toTeamId,
              team: team?.name ?? `Team ${it.toTeamId}`,
              owner: team?.ownerFirst ?? "?",
              player: p?.name ?? `Player ${it.playerId}`,
              pos: p?.pos ?? null,
              points: pointsFor(it.playerId),
              type: t.type === "WAIVER" ? "Waiver" : "Free agent",
            };
          }),
      )
      .sort((a, b) => (a.points ?? 99) - (b.points ?? 99));

    out.push({ week: box.scoringPeriodId, bench, waivers, blunderOfWeek: bench[0]?.left > 0 ? bench[0] : null });
  }
  return out.sort((a, b) => b.week - a.week);
}
