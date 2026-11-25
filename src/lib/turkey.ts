// Thanksgiving Week ("Turkey Bowl") data: rivalry cards for every league
// matchup in the holiday week, plus the Leftovers Awards once it is final.
import { Season, teamById } from "./espn";
import { Owner, currentOwners, series } from "./rivalry";
import { seasonBlunders } from "./blunders";

export const TURKEY = {
  season: 2026,
  week: 12,
  /** Wishbone picks lock at the first Sunday kickoff (1 PM ET Nov 29). */
  wishboneLock: "2026-11-29T18:00Z",
};

const f1 = (n: number) => n.toFixed(1);

export interface TurkeySide {
  ownerId: string;
  owner: string;
  first: string;
  team: string;
  logo: string | null;
  record: string;
  wins: number; // all-time vs the other side
  points: number; // this week (0 until played)
}

export interface TurkeyCard {
  home: TurkeySide;
  away: TurkeySide;
  meetings: number;
  ties: number;
  playoffMeetings: number;
  streak: string | null;
  closest: string | null;
  biggest: string | null;
  headline: string;
  decided: boolean;
  winner: "home" | "away" | "tie" | null;
}

function record(season: Season, teamId: number, week: number): string {
  let w = 0, l = 0, t = 0;
  for (const g of season.games) {
    if (g.week >= week || g.tier !== "NONE" || g.winner === "UNDECIDED") continue;
    if (g.homeId !== teamId && g.awayId !== teamId) continue;
    if (g.winner === "TIE") t++;
    else if ((g.winner === "HOME") === (g.homeId === teamId)) w++;
    else l++;
  }
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
}

/** One trash-talk line from the series facts, worst news first. */
function headline(a: TurkeySide, b: TurkeySide, n: number, streakSide: TurkeySide | null, streakN: number): string {
  if (n === 0) return `First meeting ever. Somebody's getting carved for the first time.`;
  const [lead, trail] = a.wins >= b.wins ? [a, b] : [b, a];
  if (lead.wins === trail.wins) return `Dead even at ${lead.wins}–${trail.wins}. Thanksgiving decides who gets the bigger piece.`;
  if (trail.wins === 0) return `${lead.first} is ${lead.wins}–0 all-time. ${trail.first} has never won this. Not once.`;
  if (lead.wins >= trail.wins * 3) return `${lead.first} owns this series ${lead.wins}–${trail.wins}. ${trail.first} is the turkey.`;
  if (streakSide && streakN >= 3) return `${streakSide.first} has won ${streakN} straight. Pass the gravy, it's a blowout tradition.`;
  return `${lead.first} leads ${lead.wins}–${trail.wins}. ${trail.first} wants a seat at the big table.`;
}

export function turkeyCards(seasons: Season[]): TurkeyCard[] {
  const season = seasons.find((s) => s.year === TURKEY.season);
  if (!season) return [];
  const owners = currentOwners(seasons);
  const byId = new Map(owners.map((o) => [o.id, o]));
  return season.games
    .filter((g) => g.week === TURKEY.week)
    .map((g) => {
      const ht = teamById(season, g.homeId);
      const at = teamById(season, g.awayId);
      const ho = byId.get(ht.ownerId) as Owner;
      const ao = byId.get(at.ownerId) as Owner;
      const s = series(seasons, ho, ao);
      // Count only meetings before this one.
      const past = s.meetings.filter((m) => !(m.year === TURKEY.season && m.week >= TURKEY.week));
      const hw = past.filter((m) => m.winner === "a").length;
      const aw = past.filter((m) => m.winner === "b").length;
      const side = (t: typeof ht, o: Owner, wins: number, pts: number): TurkeySide => ({
        ownerId: o.id,
        owner: o.name,
        first: t.ownerFirst,
        team: t.name,
        logo: t.logo,
        record: record(season, t.id, TURKEY.week),
        wins,
        points: Math.round(pts * 10) / 10,
      });
      const home = side(ht, ho, hw, g.homePts);
      const away = side(at, ao, aw, g.awayPts);
      // Streak across past meetings, newest first.
      let streakSide: TurkeySide | null = null;
      let streakN = 0;
      for (const m of [...past].reverse()) {
        const w = m.winner === "a" ? home : m.winner === "b" ? away : null;
        if (!w) break;
        if (!streakSide) streakSide = w;
        if (w !== streakSide) break;
        streakN++;
      }
      const closest = past.length ? past.reduce((x, y) => (y.margin < x.margin ? y : x)) : null;
      const biggest = past.length ? past.reduce((x, y) => (y.margin > x.margin ? y : x)) : null;
      const who = (m: typeof closest) => (m ? (m.winner === "a" ? home.first : m.winner === "b" ? away.first : "Nobody") : "");
      const decided = g.winner !== "UNDECIDED";
      return {
        home,
        away,
        meetings: past.length,
        ties: past.filter((m) => m.winner === "tie").length,
        playoffMeetings: past.filter((m) => m.playoff).length,
        streak: streakSide && streakN >= 2 ? `${streakSide.first} W${streakN}` : null,
        closest: closest ? `${who(closest)} by ${f1(closest.margin)} · ${closest.year} wk ${closest.week}` : null,
        biggest: biggest ? `${who(biggest)} by ${f1(biggest.margin)} · ${biggest.year} wk ${biggest.week}` : null,
        headline: headline(home, away, past.length, streakSide, streakN),
        decided,
        winner: !decided ? null : g.winner === "HOME" ? "home" : g.winner === "AWAY" ? "away" : "tie",
      };
    });
}

/** This week's fantasy points by owner GUID (null until the week is played). */
export function turkeyScores(seasons: Season[]): Record<string, number | null> {
  const season = seasons.find((s) => s.year === TURKEY.season);
  const out: Record<string, number | null> = {};
  if (!season) return out;
  for (const g of season.games.filter((x) => x.week === TURKEY.week)) {
    const done = g.winner !== "UNDECIDED";
    out[teamById(season, g.homeId).ownerId] = done ? g.homePts : null;
    out[teamById(season, g.awayId).ownerId] = done ? g.awayPts : null;
  }
  return out;
}

export interface Award {
  emoji: string;
  title: string;
  who: string;
  line: string;
}

/** Leftovers Awards: null until every holiday-week matchup is final. */
export function leftovers(seasons: Season[]): Award[] | null {
  const season = seasons.find((s) => s.year === TURKEY.season);
  if (!season) return null;
  const games = season.games.filter((g) => g.week === TURKEY.week);
  if (!games.length || games.some((g) => g.winner === "UNDECIDED")) return null;
  const name = (id: number) => teamById(season, id).ownerFirst;
  const scores = games.flatMap((g) => [
    { id: g.homeId, pts: g.homePts, opp: g.awayId, oppPts: g.awayPts },
    { id: g.awayId, pts: g.awayPts, opp: g.homeId, oppPts: g.homePts },
  ]);
  const top = scores.reduce((a, b) => (b.pts > a.pts ? b : a));
  const low = scores.reduce((a, b) => (b.pts < a.pts ? b : a));
  const margins = games.map((g) => ({ g, m: Math.abs(g.homePts - g.awayPts) }));
  const blow = margins.reduce((a, b) => (b.m > a.m ? b : a));
  const close = margins.reduce((a, b) => (b.m < a.m ? b : a));
  const winLose = (g: (typeof games)[number]) =>
    g.homePts >= g.awayPts ? [g.homeId, g.awayId] : [g.awayId, g.homeId];
  const [bw, bl] = winLose(blow.g);
  const [cw, cl] = winLose(close.g);
  const awards: Award[] = [
    { emoji: "👨‍🍳", title: "Top Chef", who: name(top.id), line: `Cooked ${f1(top.pts)}, the best plate of the week.` },
    { emoji: "🥧", title: "Stuffed", who: name(bl), line: `Got stuffed by ${name(bw)} by ${f1(blow.m)}. Seconds, thirds, fourths.` },
    { emoji: "😴", title: "Food Coma", who: name(low.id), line: `Put up ${f1(low.pts)} and slept through the whole thing.` },
    { emoji: "🫗", title: "Pass the Gravy", who: name(cw), line: `Squeaked past ${name(cl)} by ${f1(close.m)}. Barely made it to the table.` },
  ];
  const wk = seasonBlunders(season).find((b) => b.week === TURKEY.week);
  const b = wk?.blunderOfWeek;
  if (b) {
    const call = b.worstCall
      ? ` Started ${b.worstCall.started.name ?? "a corpse"} (${f1(b.worstCall.started.points)}) over ${b.worstCall.benched.name ?? "the right guy"} (${f1(b.worstCall.benched.points)}).`
      : "";
    awards.push({ emoji: "🦃", title: "Turkey of the Week", who: name(b.teamId), line: `Left ${f1(b.left)} on the bench.${call}` });
  }
  return awards;
}
