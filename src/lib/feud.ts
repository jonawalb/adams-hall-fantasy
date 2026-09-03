// The Feud Index: an original rivalry rating built from raw ESPN matchup
// history. ESPN designates no rivalries for this league, so every card here
// is computed from scores, playoff tiers, and final ranks since 2021.
import { Season } from "./espn";
import { Meeting, Owner, Series, series } from "./rivalry";

export interface Feud extends Series {
  score: number;
  rank: number;
  name: string;
  tagline: string;
  receipts: string[];
  titleGames: Meeting[];
  eliminations: { a: number; b: number }; // playoff games won (opponent knocked out)
  leadChanges: number;
  oneScoreGames: number;
  highestCombined: Meeting | null;
  lastMet: number | null;
}

const ONE_SCORE = 10;

function championshipWeeks(seasons: Season[]): Map<number, number> {
  // The championship is the lone WINNERS_BRACKET game in a season's final
  // playoff week; consolation games share that week, so callers must also
  // check the meeting's playoff flag.
  const weeks = new Map<number, number>();
  for (const s of seasons) {
    const wb = s.games.filter((g) => g.tier === "WINNERS_BRACKET" && g.winner !== "UNDECIDED");
    if (!wb.length) continue;
    const finalWeek = Math.max(...wb.map((g) => g.week));
    if (wb.filter((g) => g.week === finalWeek).length === 1) weeks.set(s.year, finalWeek);
  }
  return weeks;
}

function leadChanges(meetings: Meeting[]): number {
  let diff = 0;
  let leader: "a" | "b" | null = null;
  let changes = 0;
  for (const m of meetings) {
    if (m.winner === "a") diff++;
    else if (m.winner === "b") diff--;
    const now: "a" | "b" | null = diff > 0 ? "a" : diff < 0 ? "b" : null;
    if (now && leader && now !== leader) changes++;
    if (now) leader = now;
  }
  return changes;
}

const pct = (w: number, l: number) => w / Math.max(1, w + l);
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
const f1 = (n: number) => n.toFixed(1);

function name(f: Omit<Feud, "name" | "tagline" | "receipts" | "rank">): { name: string; tagline: string } {
  const games = f.meetings.length;
  const lead = f.aWins >= f.bWins ? f.a : f.b;
  const trail = lead.id === f.a.id ? f.b : f.a;
  const leadW = Math.max(f.aWins, f.bWins);
  const trailW = Math.min(f.aWins, f.bWins);
  const combined = games ? (f.aPts + f.bPts) / games : 0;

  if (f.titleGames.length >= 2)
    return { name: "The Dynasty Line", tagline: `Two championship games between the same two people. This is the league's main event.` };
  if (f.titleGames.length === 1) {
    const t = f.titleGames[0];
    const champ = t.winner === "a" ? f.a : f.b;
    const loser = champ.id === f.a.id ? f.b : f.a;
    return { name: "The Title Fight", tagline: `Trophy on the line in ${t.year}. ${champ.first} has the ring and ${loser.first} has the memory.` };
  }
  if (games >= 5 && pct(leadW, trailW) >= 0.8)
    return { name: "The Landlord Situation", tagline: `${lead.first} is ${leadW}–${trailW} against ${trail.first}. Rent is due every time they meet.` };
  if (games >= 8 && Math.abs(f.aWins - f.bWins) <= 1)
    return { name: "The Coin Flip", tagline: `${games} games, ${f.aWins}–${f.bWins}, and the series lead has changed hands ${times(f.leadChanges)}. Nobody owns anybody.` };
  if (f.eliminations.a + f.eliminations.b >= 2)
    return { name: "The Bracket Grudge", tagline: `They keep finding each other in the playoffs. ${f.eliminations.a + f.eliminations.b} postseason meetings, each one ending somebody's year.` };
  if (games >= 4 && f.avgMargin <= 12)
    return { name: "The Nail-Biter Series", tagline: `Average margin ${f1(f.avgMargin)} points across ${games} games. ${f.oneScoreGames} of them decided by a single score.` };
  if (games >= 4 && combined >= 260)
    return { name: "The Shootout", tagline: `They average ${f1(combined)} combined points a meeting. Defense is not a concept here.` };
  if (f.streak && f.streak.n >= 3) {
    const s = f.streak.side === "a" ? f.a : f.b;
    return { name: "The Hot Hand", tagline: `${s.first} has won ${f.streak.n} straight in this series. The other guy would like a word.` };
  }
  return { name: "The Long War", tagline: `${games} meetings since 2021, ${f.aWins}–${f.bWins}. No trophy on the line, just years of it.` };
}

function receipts(f: Omit<Feud, "name" | "tagline" | "receipts" | "rank">): string[] {
  const out: string[] = [];
  const side = (w: Meeting["winner"]) => (w === "a" ? f.a : f.b);
  for (const t of f.titleGames)
    out.push(`${t.year} championship: ${side(t.winner).first} wins ${f1(Math.max(t.aPts, t.bPts))}–${f1(Math.min(t.aPts, t.bPts))}.`);
  if (f.eliminations.a || f.eliminations.b) {
    const parts = [];
    if (f.eliminations.a) parts.push(`${f.a.first} has ended ${f.b.first}'s playoffs ${f.eliminations.a}×`);
    if (f.eliminations.b) parts.push(`${f.b.first} has ended ${f.a.first}'s playoffs ${f.eliminations.b}×`);
    out.push(parts.join("; ") + ".");
  }
  if (f.biggest)
    out.push(`Biggest beatdown: ${side(f.biggest.winner).first} by ${f1(f.biggest.margin)} in ${f.biggest.year} week ${f.biggest.week}.`);
  if (f.closest && f.closest.margin < 5)
    out.push(`Closest call: ${side(f.closest.winner).first} by ${f1(f.closest.margin)} in ${f.closest.year} week ${f.closest.week}.`);
  if (f.streak && f.streak.n >= 2)
    out.push(`${side(f.streak.side).first} has won the last ${f.streak.n}.`);
  if (f.highestCombined && f.highestCombined.aPts + f.highestCombined.bPts >= 260)
    out.push(`Shootout of record: ${f1(f.highestCombined.aPts + f.highestCombined.bPts)} combined points in ${f.highestCombined.year} week ${f.highestCombined.week}.`);
  if (f.leadChanges >= 3) out.push(`Series lead has flipped ${times(f.leadChanges)}.`);
  return out.slice(0, 3);
}

export function feudIndex(seasons: Season[], owners: Owner[]): Feud[] {
  const titles = championshipWeeks(seasons);
  const latestCompleted = Math.max(...seasons.filter((s) => s.isCompleted).map((s) => s.year));
  const feuds: Omit<Feud, "rank">[] = [];

  for (let i = 0; i < owners.length; i++)
    for (let j = i + 1; j < owners.length; j++) {
      const s = series(seasons, owners[i], owners[j]);
      if (!s.meetings.length) continue;
      const titleGames = s.meetings.filter((m) => m.playoff && titles.get(m.year) === m.week);
      const playoff = s.meetings.filter((m) => m.playoff);
      const eliminations = {
        a: playoff.filter((m) => m.winner === "a").length,
        b: playoff.filter((m) => m.winner === "b").length,
      };
      const lc = leadChanges(s.meetings);
      const oneScore = s.meetings.filter((m) => m.margin <= ONE_SCORE).length;
      const games = s.meetings.length;
      const closeness = 1 - Math.abs(s.aWins - s.bWins) / games;
      const lastMet = games ? s.meetings[games - 1].year : null;

      const score =
        games * 4 +
        closeness * 20 +
        playoff.length * 6 +
        titleGames.length * 14 +
        oneScore * 3 +
        lc * 3 +
        (lastMet === latestCompleted ? 5 : 0) +
        (s.streak && s.streak.n >= 3 ? 4 : 0) +
        (games >= 5 && closeness <= 0.4 ? 8 : 0); // lopsided ownership is its own kind of feud

      const base = {
        ...s,
        score: Math.round(score),
        titleGames,
        eliminations,
        leadChanges: lc,
        oneScoreGames: oneScore,
        highestCombined: s.meetings.length
          ? s.meetings.reduce((x, y) => (y.aPts + y.bPts > x.aPts + x.bPts ? y : x))
          : null,
        lastMet,
      };
      feuds.push({ ...base, ...name(base), receipts: receipts(base) });
    }

  return feuds
    .sort((x, y) => y.score - x.score || y.meetings.length - x.meetings.length)
    .map((f, idx) => ({ ...f, rank: idx + 1 }));
}
