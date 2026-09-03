// Championship-round records for the playoff record book.
import { Season, teamById } from "./espn";
import { RecordEntry } from "./stats";

export function playoffRecords(seasons: Season[]): RecordEntry[] {
  interface Final { year: number; winner: ReturnType<typeof teamById>; loser: ReturnType<typeof teamById>; wPts: number; lPts: number }
  const finals: Final[] = [];
  const playoffWins = new Map<string, { name: string; wins: number; games: number }>();
  const appearances = new Map<string, { name: string; n: number }>();

  for (const s of seasons) {
    const wb = s.games.filter((g) => g.tier === "WINNERS_BRACKET" && g.winner !== "UNDECIDED");
    if (!wb.length) continue;
    const finalWeek = Math.max(...wb.map((g) => g.week));
    for (const g of wb) {
      const home = teamById(s, g.homeId);
      const away = teamById(s, g.awayId);
      const w = g.winner === "HOME" ? home : away;
      const l = w === home ? away : home;
      for (const t of [home, away]) {
        const pw = playoffWins.get(t.ownerId) ?? { name: t.ownerName, wins: 0, games: 0 };
        pw.games++;
        if (t === w) pw.wins++;
        playoffWins.set(t.ownerId, pw);
      }
      if (g.week === finalWeek && wb.filter((x) => x.week === finalWeek).length === 1) {
        finals.push({ year: s.year, winner: w, loser: l, wPts: w === home ? g.homePts : g.awayPts, lPts: w === home ? g.awayPts : g.homePts });
      }
    }
    if (s.isCompleted)
      for (const t of s.teams)
        if (t.playoffSeed && t.playoffSeed <= s.playoffTeamCount) {
          const a = appearances.get(t.ownerId) ?? { name: t.ownerName, n: 0 };
          a.n++;
          appearances.set(t.ownerId, a);
        }
  }

  const f1 = (n: number) => n.toFixed(1);
  const out: RecordEntry[] = [];
  const titles = new Map<string, { name: string; years: number[] }>();
  for (const f of finals) {
    const t = titles.get(f.winner.ownerId) ?? { name: f.winner.ownerName, years: [] };
    t.years.push(f.year);
    titles.set(f.winner.ownerId, t);
  }
  const sortedTitles = [...titles.values()].sort((a, b) => b.years.length - a.years.length);
  if (sortedTitles.length) {
    const top = sortedTitles[0].years.length;
    const leaders = sortedTitles.filter((t) => t.years.length === top);
    out.push(
      leaders.length === 1
        ? { label: "Most championships", holder: leaders[0].name, detail: leaders[0].years.join(", "), value: String(top) }
        : { label: "Most championships", holder: `${leaders.length} owners tied`, detail: leaders.map((t) => `${t.name} (${t.years.join(", ")})`).join(" · "), value: String(top) },
    );
  }
  if (finals.length) {
    const hi = finals.reduce((a, b) => (b.wPts > a.wPts ? b : a));
    out.push({ label: "Highest title-game score", holder: hi.winner.name, detail: `${hi.winner.ownerFirst} · ${hi.year} final vs ${hi.loser.name}`, value: f1(hi.wPts) });
    const rout = finals.reduce((a, b) => (b.wPts - b.lPts > a.wPts - a.lPts ? b : a));
    out.push({ label: "Most lopsided final", holder: rout.winner.name, detail: `${f1(rout.wPts)}–${f1(rout.lPts)} over ${rout.loser.name} · ${rout.year}`, value: `+${f1(rout.wPts - rout.lPts)}` });
    const close = finals.reduce((a, b) => (b.wPts - b.lPts < a.wPts - a.lPts ? b : a));
    out.push({ label: "Closest final", holder: close.winner.name, detail: `${f1(close.wPts)}–${f1(close.lPts)} over ${close.loser.name} · ${close.year}`, value: `+${f1(close.wPts - close.lPts)}` });
    const lowWin = finals.reduce((a, b) => (b.wPts < a.wPts ? b : a));
    out.push({ label: "Ugliest title win", holder: lowWin.winner.name, detail: `${lowWin.winner.ownerFirst} won the ${lowWin.year} final scoring only this`, value: f1(lowWin.wPts), shame: true });
    const lostBig = finals.reduce((a, b) => (b.lPts > a.lPts ? b : a));
    out.push({ label: "Most points in a losing final", holder: lostBig.loser.name, detail: `${lostBig.loser.ownerFirst} scored this and still lost the ${lostBig.year} final to ${lostBig.winner.name}`, value: f1(lostBig.lPts), shame: true });
  }
  const pw = [...playoffWins.values()].sort((a, b) => b.wins - a.wins || a.games - b.games)[0];
  if (pw) out.push({ label: "Most playoff wins", holder: pw.name, detail: `${pw.wins}–${pw.games - pw.wins} in the bracket`, value: String(pw.wins) });
  const pl = [...playoffWins.values()].filter((x) => x.games >= 2).sort((a, b) => b.games - b.wins - (a.games - a.wins))[0];
  if (pl) out.push({ label: "Most playoff losses", holder: pl.name, detail: `${pl.wins}–${pl.games - pl.wins} in the bracket`, value: String(pl.games - pl.wins), shame: true });
  const ap = [...appearances.values()].sort((a, b) => b.n - a.n)[0];
  if (ap) out.push({ label: "Most playoff appearances", holder: ap.name, detail: `${ap.n} of ${seasons.filter((s) => s.isCompleted).length} completed seasons`, value: String(ap.n) });
  return out;
}
