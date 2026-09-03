// College football snapshot helpers (data/cfb.json from scripts/fetch-cfb.mjs).

export interface CfbSide {
  abbr: string;
  name: string;
  short: string;
  logo: string | null;
  color: string | null;
  rank: number | null;
  score: number;
  record: string | null;
  conferenceId: string | null;
  winner: boolean;
}

export interface CfbGame {
  id: string;
  date: string;
  name: string;
  state: "pre" | "in" | "post";
  completed: boolean;
  detail: string;
  venue: string | null;
  broadcast: string | null;
  spread: string | null;
  overUnder: number | null;
  headline: string | null;
  home: CfbSide;
  away: CfbSide;
}

export interface CfbRank {
  rank: number;
  previous: number | null;
  trend: string;
  team: string;
  mascot: string;
  abbr: string;
  logo: string | null;
  record: string | null;
  points: number | null;
  firstPlaceVotes: number;
}

export interface CfbSnapshot {
  season: number;
  week: number;
  poll: string;
  fetchedAt: string;
  rankings: CfbRank[];
  thisWeek: CfbGame[];
  lastWeek: CfbGame[];
}

export const winnerOf = (g: CfbGame): CfbSide => (g.home.winner || g.home.score > g.away.score ? g.home : g.away);
export const loserOf = (g: CfbGame): CfbSide => (winnerOf(g) === g.home ? g.away : g.home);
export const margin = (g: CfbGame): number => Math.abs(g.home.score - g.away.score);
export const total = (g: CfbGame): number => g.home.score + g.away.score;

const winPct = (record: string | null): number => {
  const m = /^(\d+)-(\d+)/.exec(record ?? "");
  if (!m) return 0.5;
  const w = Number(m[1]);
  const l = Number(m[2]);
  return w + l ? w / (w + l) : 0.5;
};

export interface Carnage {
  upset: CfbGame | null;
  blowout: CfbGame | null;
  shootout: CfbGame | null;
  nailBiter: CfbGame | null;
  cupcake: CfbGame | null;
}

/** Awards from a set of completed games. */
export function carnage(games: CfbGame[]): Carnage {
  const done = games.filter((g) => g.completed);
  if (!done.length) return { upset: null, blowout: null, shootout: null, nailBiter: null, cupcake: null };
  // Upset: the loser was ranked and the winner was unranked or ranked lower (bigger gap = bigger upset).
  const upsets = done
    .filter((g) => loserOf(g).rank && (!winnerOf(g).rank || (winnerOf(g).rank ?? 99) > (loserOf(g).rank ?? 0)))
    .sort((a, b) => (winnerOf(b).rank ?? 40) - (loserOf(b).rank ?? 0) - ((winnerOf(a).rank ?? 40) - (loserOf(a).rank ?? 0)));
  const ranked = done.filter((g) => g.home.rank || g.away.rank);
  const by = (arr: CfbGame[], f: (g: CfbGame) => number, max = true) =>
    arr.length ? arr.reduce((x, y) => ((max ? f(y) > f(x) : f(y) < f(x)) ? y : x)) : null;
  return {
    upset: upsets[0] ?? null,
    blowout: by(done, margin),
    shootout: by(done, total),
    nailBiter: by(done, margin, false),
    // Cupcake: a ranked team hanging the biggest margin on an unranked opponent.
    cupcake: by(ranked.filter((g) => winnerOf(g).rank && !loserOf(g).rank), margin),
  };
}

/** The scheduled game between the two worst records this week. */
export function bitchBoyBowl(games: CfbGame[]): CfbGame | null {
  const upcoming = games.filter((g) => !g.completed && g.home.record && g.away.record);
  if (!upcoming.length) return null;
  return upcoming.reduce((x, y) => {
    const fx = winPct(x.home.record) + winPct(x.away.record);
    const fy = winPct(y.home.record) + winPct(y.away.record);
    return fy < fx ? y : x;
  });
}

export function formatKickoffET(date: string): string {
  return new Date(date).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}
