import fs from "fs";
import path from "path";

export interface Team {
  id: number;
  name: string;
  abbrev: string;
  logo: string | null;
  ownerId: string;
  ownerName: string;
  ownerFirst: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  playoffSeed: number;
  finalRank: number | null;
}

export interface Game {
  week: number;
  tier: string; // NONE | WINNERS_BRACKET | LOSERS_CONSOLATION_LADDER | ...
  homeId: number;
  awayId: number;
  homePts: number;
  awayPts: number;
  winner: "HOME" | "AWAY" | "TIE" | "UNDECIDED";
}

export interface Season {
  year: number;
  leagueName: string;
  regSeasonWeeks: number;
  playoffTeamCount: number;
  currentMatchupPeriod: number;
  isCompleted: boolean;
  teams: Team[];
  games: Game[];
}

const DATA_DIR = path.join(process.cwd(), "data", "espn");

/** Display-name overrides by current owner GUID (the league's choice, not ESPN's). */
const OWNER_NAME_OVERRIDES: Record<string, string> = {
  "{DD52DE43-FADF-409D-809E-6E6707F0216F}": "Bitch Boy",
};

/**
 * Members who changed ESPN accounts mid-history. Old GUID → current GUID, so
 * head-to-head and career stats follow the person, not the login.
 */
const OWNER_ALIASES: Record<string, string> = {
  // Junul Smith: 2021–2023 account → 2024+ account
  "{94DF2E22-DA25-4A27-A696-3BA15055F177}": "{294E9BB0-3CB9-4B62-BE44-BD0420CAD9C4}",
};

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const BENCH_SLOTS = new Set(["BE", "IR"]);

interface BoxLineup {
  playerId: number;
  name: string | null;
  pos: string | null;
  slot: string;
  points: number;
}
interface BoxSide {
  teamId: number;
  points: number;
  lineup: BoxLineup[];
}
interface BoxFile {
  season: number;
  scoringPeriodId: number;
  matchups: { id: number; matchupPeriodId: number; home: BoxSide; away: BoxSide }[];
}

function starterPoints(lineup: BoxLineup[]): number {
  return Math.round(lineup.filter((e) => !BENCH_SLOTS.has(e.slot)).reduce((s, e) => s + e.points, 0) * 10) / 10;
}

function patchFromBoxscores(year: number, games: Game[], teams: Team[]): void {
  const undecided = games.filter((g) => g.winner === "UNDECIDED" && g.homePts === 0 && g.awayPts === 0);
  if (!undecided.length) return;

  const boxDir = path.join(DATA_DIR, "boxscores");
  if (!fs.existsSync(boxDir)) return;

  const files = fs.readdirSync(boxDir).filter((f) => f.startsWith(`${year}-wk`));
  const boxes: BoxFile[] = files.map((f) => JSON.parse(fs.readFileSync(path.join(boxDir, f), "utf8")));

  const lookup = new Map<string, { homePts: number; awayPts: number }>();
  for (const box of boxes) {
    for (const m of box.matchups) {
      const hp = m.home.points || starterPoints(m.home.lineup);
      const ap = m.away.points || starterPoints(m.away.lineup);
      if (hp > 0 || ap > 0) {
        lookup.set(`${m.matchupPeriodId}-${m.home.teamId}-${m.away.teamId}`, { homePts: hp, awayPts: ap });
      }
    }
  }

  const pf = new Map<number, number>();
  const pa = new Map<number, number>();
  const wins = new Map<number, number>();
  const losses = new Map<number, number>();

  for (const g of undecided) {
    const key = `${g.week}-${g.homeId}-${g.awayId}`;
    const pts = lookup.get(key);
    if (!pts) continue;
    g.homePts = pts.homePts;
    g.awayPts = pts.awayPts;
    g.winner = pts.homePts > pts.awayPts ? "HOME" : pts.awayPts > pts.homePts ? "AWAY" : "TIE";

    pf.set(g.homeId, (pf.get(g.homeId) ?? 0) + pts.homePts);
    pf.set(g.awayId, (pf.get(g.awayId) ?? 0) + pts.awayPts);
    pa.set(g.homeId, (pa.get(g.homeId) ?? 0) + pts.awayPts);
    pa.set(g.awayId, (pa.get(g.awayId) ?? 0) + pts.homePts);

    if (g.winner === "HOME") {
      wins.set(g.homeId, (wins.get(g.homeId) ?? 0) + 1);
      losses.set(g.awayId, (losses.get(g.awayId) ?? 0) + 1);
    } else if (g.winner === "AWAY") {
      wins.set(g.awayId, (wins.get(g.awayId) ?? 0) + 1);
      losses.set(g.homeId, (losses.get(g.homeId) ?? 0) + 1);
    }
  }

  for (const t of teams) {
    if (t.pointsFor === 0 && pf.has(t.id)) {
      t.pointsFor += pf.get(t.id)!;
      t.pointsAgainst += pa.get(t.id) ?? 0;
      t.wins += wins.get(t.id) ?? 0;
      t.losses += losses.get(t.id) ?? 0;
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function loadSeason(year: number): Season | null {
  const file = path.join(DATA_DIR, `season-${year}.json`);
  if (!fs.existsSync(file)) return null;
  let raw: any = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(raw)) raw = raw[0];

  const memberNames = new Map<string, string>();
  for (const m of raw.members ?? []) {
    memberNames.set(m.id, titleCase(`${m.firstName ?? ""} ${m.lastName ?? ""}`));
  }

  const teams: Team[] = (raw.teams ?? []).map((t: any) => {
    const rec = t.record?.overall ?? {};
    const rawOwnerId: string = t.owners?.[0] ?? "";
    const ownerId = OWNER_ALIASES[rawOwnerId] ?? rawOwnerId;
    const override = OWNER_NAME_OVERRIDES[ownerId];
    const ownerName = override ?? memberNames.get(rawOwnerId) ?? memberNames.get(ownerId) ?? "Unknown";
    return {
      id: t.id,
      name: (t.name ?? `${t.location ?? ""} ${t.nickname ?? ""}`).trim(),
      abbrev: t.abbrev ?? "",
      logo: t.logo ?? null,
      ownerId,
      ownerName,
      ownerFirst: override ? ownerName : ownerName.split(" ")[0],
      wins: rec.wins ?? 0,
      losses: rec.losses ?? 0,
      ties: rec.ties ?? 0,
      pointsFor: rec.pointsFor ?? 0,
      pointsAgainst: rec.pointsAgainst ?? 0,
      playoffSeed: t.playoffSeed ?? 0,
      finalRank: t.rankCalculatedFinal || null,
    };
  });

  const games: Game[] = (raw.schedule ?? [])
    .filter((g: any) => g.home?.teamId != null && g.away?.teamId != null)
    .map((g: any) => ({
      week: g.matchupPeriodId,
      tier: g.playoffTierType ?? "NONE",
      homeId: g.home.teamId,
      awayId: g.away.teamId,
      homePts: g.home.totalPoints ?? 0,
      awayPts: g.away.totalPoints ?? 0,
      winner: g.winner ?? "UNDECIDED",
    }));

  // Patch UNDECIDED games with scores computed from boxscore lineups
  patchFromBoxscores(year, games, teams);

  const settings = raw.settings ?? {};
  const status = raw.status ?? {};
  const regSeasonWeeks = settings.scheduleSettings?.matchupPeriodCount ?? 14;
  const finalWeek = Math.max(regSeasonWeeks, ...games.map((g) => g.week));

  return {
    year,
    leagueName: settings.name ?? "Adams Hall Fantasy League",
    regSeasonWeeks,
    playoffTeamCount: settings.scheduleSettings?.playoffTeamCount ?? 6,
    currentMatchupPeriod: status.currentMatchupPeriod ?? 1,
    isCompleted:
      games.length > 0 &&
      games.filter((g) => g.week === finalWeek).every((g) => g.winner !== "UNDECIDED") &&
      (status.currentMatchupPeriod ?? 1) >= finalWeek,
    teams,
    games,
  };
}

export function availableSeasons(): number[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .map((f) => /^season-(\d{4})\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort();
}

/** Seasons ESPN says exist but we haven't synced yet (need espn_s2/SWID cookies). */
export const LOCKED_SEASONS = [2021, 2022, 2023, 2024];

export function teamById(season: Season, id: number): Team {
  const t = season.teams.find((t) => t.id === id);
  if (!t) throw new Error(`No team ${id} in ${season.year}`);
  return t;
}
