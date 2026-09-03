// Hall of Champions / Hall of Shame, straight from ESPN final ranks.
import { Season, Team } from "./espn";

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
      const ranked = s.teams.filter((t) => t.finalRank);
      const worst = ranked.length ? Math.max(...ranked.map((t) => t.finalRank!)) : 0;
      return {
        year: s.year,
        champion: s.teams.find((t) => t.finalRank === 1) ?? null,
        runnerUp: s.teams.find((t) => t.finalRank === 2) ?? null,
        lastPlace: worst ? s.teams.find((t) => t.finalRank === worst) ?? null : null,
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
