// Game scopes: regular season vs playoffs. "Playoffs" means every postseason
// week — winners bracket and consolation alike — because that is how the
// league talks about it. Scoping hands callers season copies with the games
// filtered, so every stat helper stays scope-agnostic.
import { Game, Season } from "./espn";

export type Scope = "all" | "regular" | "playoffs";

export const SCOPE_LABEL: Record<Scope, string> = {
  all: "All games",
  regular: "Regular season",
  playoffs: "Playoffs",
};

export function inScope(season: Season, g: Game, scope: Scope): boolean {
  if (scope === "regular") return g.week <= season.regSeasonWeeks;
  if (scope === "playoffs") return g.week > season.regSeasonWeeks;
  return true;
}

export function scopedSeasons(seasons: Season[], scope: Scope): Season[] {
  if (scope === "all") return seasons;
  return seasons.map((s) => ({ ...s, games: s.games.filter((g) => inScope(s, g, scope)) }));
}
