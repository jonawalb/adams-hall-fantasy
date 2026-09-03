// Pick'em data shapes (from data/nfl/slate.json) and pure scoring helpers.

export type Side = "home" | "away";

export interface TeamSide {
  abbr: string;
  name: string;
  logo?: string;
  color?: string;
  score: number;
}

export interface Game {
  id: string;
  date: string;
  name: string;
  state: "pre" | "in" | "post";
  completed: boolean;
  winner: Side | null;
  detail: string;
  home: TeamSide;
  away: TeamSide;
}

export interface WeekSlate {
  season: number;
  week: number;
  games: Game[];
}

export interface Slate {
  season: number;
  currentWeek: number;
  fetchedAt?: string;
  weeks: Record<string, WeekSlate>;
}

export interface PickRow {
  member_id: string;
  season: number;
  week: number;
  game_id: string;
  pick: Side;
}

export interface Member {
  id: string;
  display_name: string;
}

export function hasKickedOff(game: Game, now: Date = new Date()): boolean {
  return new Date(game.date).getTime() <= now.getTime();
}

/** Correct picks for one member across the given games. */
export function scoreMember(games: Game[], picks: PickRow[], memberId: string): number {
  const mine = new Map(picks.filter((p) => p.member_id === memberId).map((p) => [p.game_id, p.pick]));
  let correct = 0;
  for (const g of games) {
    if (!g.completed || !g.winner) continue;
    if (mine.get(g.id) === g.winner) correct++;
  }
  return correct;
}

export interface LeaderRow {
  member: Member;
  correct: number;
  made: number;
}

/** Leaderboard for a set of games, sorted by correct desc then name. */
export function leaderboard(games: Game[], picks: PickRow[], members: Member[]): LeaderRow[] {
  const ids = new Set(games.map((g) => g.id));
  return members
    .map((member) => ({
      member,
      correct: scoreMember(games, picks, member.id),
      made: picks.filter((p) => p.member_id === member.id && ids.has(p.game_id)).length,
    }))
    .sort((a, b) => b.correct - a.correct || a.member.display_name.localeCompare(b.member.display_name));
}

export function formatKickoff(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
