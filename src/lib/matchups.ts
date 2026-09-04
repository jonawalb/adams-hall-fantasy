// Build-time data for Matchup Pick'Em: the league schedule by week, with
// results where decided and the lock time (first NFL kickoff that week).
import { Season, teamById } from "./espn";
import type { Slate } from "./pickem";

export interface SideInfo {
  teamId: number;
  name: string;
  owner: string;
  ownerId: string;
  logo: string | null;
  points: number;
}

export interface PickemMatchup {
  id: string;
  week: number;
  playoff: boolean;
  home: SideInfo;
  away: SideInfo;
  winnerTeamId: number | null;
}

export interface PickemWeek {
  week: number;
  lockAt: string | null;
  matchups: PickemMatchup[];
}

export function pickemWeeks(season: Season, slate: Slate | null): PickemWeek[] {
  const weeks = [...new Set(season.games.map((g) => g.week))].sort((a, b) => a - b);
  return weeks.map((week) => {
    const nfl = slate?.weeks[String(week)]?.games ?? [];
    const lockAt = nfl.length ? nfl.map((g) => g.date).sort()[0] : null;
    const matchups = season.games
      .filter((g) => g.week === week)
      .map((g) => {
        const home = teamById(season, g.homeId);
        const away = teamById(season, g.awayId);
        const side = (t: typeof home, pts: number): SideInfo => ({
          teamId: t.id,
          name: t.name,
          owner: t.ownerFirst,
          ownerId: t.ownerId,
          logo: t.logo,
          points: Math.round(pts * 10) / 10,
        });
        return {
          id: `${season.year}-${week}-${g.homeId}-${g.awayId}`,
          week,
          playoff: g.tier === "WINNERS_BRACKET",
          home: side(home, g.homePts),
          away: side(away, g.awayPts),
          winnerTeamId: g.winner === "HOME" ? home.id : g.winner === "AWAY" ? away.id : null,
        };
      });
    return { week, lockAt, matchups };
  });
}
