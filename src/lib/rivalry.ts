// Head-to-head series derived from ESPN matchup history (no ESPN rivalry
// designations exist for this league — every card here is computed).
import { Season, teamById } from "./espn";

export interface Owner {
  id: string;
  first: string;
  name: string;
  team: string; // team name in the newest season
}

export interface Meeting {
  year: number;
  week: number;
  playoff: boolean;
  aTeam: string;
  bTeam: string;
  aPts: number;
  bPts: number;
  winner: "a" | "b" | "tie";
  margin: number; // absolute
}

export interface Series {
  a: Owner;
  b: Owner;
  meetings: Meeting[];
  aWins: number;
  bWins: number;
  ties: number;
  aPts: number;
  bPts: number;
  avgMargin: number;
  streak: { side: "a" | "b"; n: number } | null;
  biggest: Meeting | null;
  closest: Meeting | null;
  playoffMeetings: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Current owners, taken from the newest season (franchises are permanent). */
export function currentOwners(seasons: Season[]): Owner[] {
  const latest = seasons[seasons.length - 1];
  return latest.teams.map((t) => ({ id: t.ownerId, first: t.ownerFirst, name: t.ownerName, team: t.name }));
}

export function series(seasons: Season[], a: Owner, b: Owner): Series {
  const meetings: Meeting[] = [];
  for (const season of seasons) {
    for (const g of season.games) {
      if (g.winner === "UNDECIDED") continue;
      const home = teamById(season, g.homeId);
      const away = teamById(season, g.awayId);
      const ids = [home.ownerId, away.ownerId];
      if (!ids.includes(a.id) || !ids.includes(b.id)) continue;
      const aIsHome = home.ownerId === a.id;
      const aPts = aIsHome ? g.homePts : g.awayPts;
      const bPts = aIsHome ? g.awayPts : g.homePts;
      meetings.push({
        year: season.year,
        week: g.week,
        playoff: g.tier === "WINNERS_BRACKET",
        aTeam: aIsHome ? home.name : away.name,
        bTeam: aIsHome ? away.name : home.name,
        aPts: r1(aPts),
        bPts: r1(bPts),
        winner: aPts > bPts ? "a" : aPts < bPts ? "b" : "tie",
        margin: r1(Math.abs(aPts - bPts)),
      });
    }
  }
  meetings.sort((x, y) => x.year - y.year || x.week - y.week);

  const aWins = meetings.filter((m) => m.winner === "a").length;
  const bWins = meetings.filter((m) => m.winner === "b").length;
  const ties = meetings.length - aWins - bWins;
  const decided = meetings.filter((m) => m.winner !== "tie");

  let streak: Series["streak"] = null;
  for (let i = meetings.length - 1; i >= 0; i--) {
    const w = meetings[i].winner;
    if (w === "tie") break;
    if (!streak) streak = { side: w, n: 1 };
    else if (streak.side === w) streak.n++;
    else break;
  }

  return {
    a,
    b,
    meetings,
    aWins,
    bWins,
    ties,
    aPts: r1(meetings.reduce((s, m) => s + m.aPts, 0)),
    bPts: r1(meetings.reduce((s, m) => s + m.bPts, 0)),
    avgMargin: meetings.length ? r1(meetings.reduce((s, m) => s + m.margin, 0) / meetings.length) : 0,
    streak,
    biggest: decided.length ? decided.reduce((x, y) => (y.margin > x.margin ? y : x)) : null,
    closest: decided.length ? decided.reduce((x, y) => (y.margin < x.margin ? y : x)) : null,
    playoffMeetings: meetings.filter((m) => m.playoff).length,
  };
}

/** Every pairing among current owners that has actually met. */
export function allSeries(seasons: Season[], owners: Owner[]): Series[] {
  const out: Series[] = [];
  for (let i = 0; i < owners.length; i++)
    for (let j = i + 1; j < owners.length; j++) {
      const s = series(seasons, owners[i], owners[j]);
      if (s.meetings.length) out.push(s);
    }
  return out;
}

export interface OwnerCard {
  owner: Owner;
  nemesis: { owner: Owner; wins: number; losses: number } | null; // worst record against (min 3 games)
  victim: { owner: Owner; wins: number; losses: number } | null; // best record against (min 3 games)
  mostPlayed: { owner: Owner; games: number; wins: number; losses: number } | null;
}

export function ownerCards(all: Series[], owners: Owner[]): OwnerCard[] {
  return owners.map((owner) => {
    const mine = all
      .filter((s) => s.a.id === owner.id || s.b.id === owner.id)
      .map((s) => {
        const me = s.a.id === owner.id;
        return {
          owner: me ? s.b : s.a,
          wins: me ? s.aWins : s.bWins,
          losses: me ? s.bWins : s.aWins,
          games: s.meetings.length,
        };
      });
    const eligible = mine.filter((x) => x.games >= 3);
    const pct = (x: { wins: number; losses: number }) => x.wins / Math.max(1, x.wins + x.losses);
    const byWorst = [...eligible].sort((x, y) => pct(x) - pct(y) || y.games - x.games);
    const byBest = [...eligible].sort((x, y) => pct(y) - pct(x) || y.games - x.games);
    const byGames = [...mine].sort((x, y) => y.games - x.games);
    const nemesis = byWorst[0] && pct(byWorst[0]) < 0.5 ? byWorst[0] : null;
    const victim = byBest[0] && pct(byBest[0]) > 0.5 ? byBest[0] : null;
    return { owner, nemesis, victim, mostPlayed: byGames[0] ?? null };
  });
}
