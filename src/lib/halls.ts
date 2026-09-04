// Hall of Champions / Hall of Shame, straight from ESPN final ranks.
import { Season, Team } from "./espn";

/** Last place = worst regular-season record (fewest wins, then most losses, then fewest points). */
export function lastPlaceTeam(season: Season): Team | null {
  if (!season.teams.length) return null;
  return [...season.teams].sort((a, b) => a.wins - b.wins || b.losses - a.losses || a.pointsFor - b.pointsFor)[0];
}

export interface HallRow {
  year: number;
  champion: Team | null;
  runnerUp: Team | null;
  lastPlace: Team | null;
  teams: number;
}

export function hallRows(seasons: Season[]): HallRow[] {
  return seasons
    .filter((s) => s.isCompleted)
    .map((s) => {
      return {
        year: s.year,
        champion: s.teams.find((t) => t.finalRank === 1) ?? null,
        runnerUp: s.teams.find((t) => t.finalRank === 2) ?? null,
        lastPlace: lastPlaceTeam(s),
        teams: s.teams.length,
      };
    })
    .sort((a, b) => b.year - a.year);
}

export interface Tally {
  owner: string;
  count: number;
  years: number[];
}

export function tally(rows: HallRow[], pick: (r: HallRow) => Team | null): Tally[] {
  const map = new Map<string, Tally>();
  for (const r of rows) {
    const t = pick(r);
    if (!t) continue;
    const cur = map.get(t.ownerId) ?? { owner: t.ownerName, count: 0, years: [] };
    cur.count++;
    cur.years.push(r.year);
    map.set(t.ownerId, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));
}
