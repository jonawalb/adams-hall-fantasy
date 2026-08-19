import { Game, Season, Team, teamById } from "./espn";

export interface TeamLine {
  team: Team;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  allPlayWins: number;
  allPlayLosses: number;
  luck: number; // actual win% minus all-play win% (positive = lucky)
}

export interface H2HCell {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface WeekResult {
  week: number;
  game: Game;
  home: Team;
  away: Team;
  margin: number;
}

/** Completed regular-season games only. */
export function regSeasonGames(season: Season): Game[] {
  return season.games.filter(
    (g) => g.week <= season.regSeasonWeeks && g.winner !== "UNDECIDED"
  );
}

export function completedWeeks(season: Season): number[] {
  return [...new Set(regSeasonGames(season).map((g) => g.week))].sort((a, b) => a - b);
}

export function standings(season: Season): TeamLine[] {
  const lines = new Map<number, TeamLine>();
  for (const t of season.teams) {
    lines.set(t.id, {
      team: t,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      allPlayWins: 0,
      allPlayLosses: 0,
      luck: 0,
    });
  }

  // All-play: each completed reg-season week, rank every team's score against the field.
  for (const week of completedWeeks(season)) {
    const scores: { id: number; pts: number }[] = [];
    for (const g of regSeasonGames(season).filter((g) => g.week === week)) {
      scores.push({ id: g.homeId, pts: g.homePts }, { id: g.awayId, pts: g.awayPts });
    }
    for (const s of scores) {
      const line = lines.get(s.id);
      if (!line) continue;
      line.allPlayWins += scores.filter((o) => o.id !== s.id && s.pts > o.pts).length;
      line.allPlayLosses += scores.filter((o) => o.id !== s.id && s.pts < o.pts).length;
    }
  }

  for (const line of lines.values()) {
    const gp = line.wins + line.losses + line.ties;
    const ap = line.allPlayWins + line.allPlayLosses;
    line.luck = gp && ap ? line.wins / gp - line.allPlayWins / ap : 0;
  }

  return [...lines.values()].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor
  );
}

/** teams[i] vs teams[j] head-to-head across the given seasons (reg season + playoffs). */
export function h2hMatrix(seasons: Season[]): Map<string, H2HCell> {
  const cells = new Map<string, H2HCell>();
  const key = (a: string, b: string) => `${a}|${b}`;
  for (const season of seasons) {
    for (const g of season.games) {
      if (g.winner === "UNDECIDED") continue;
      const home = teamById(season, g.homeId);
      const away = teamById(season, g.awayId);
      const upd = (a: Team, b: Team, ptsA: number, ptsB: number) => {
        const k = key(a.ownerId, b.ownerId);
        const c = cells.get(k) ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
        if (ptsA > ptsB) c.wins++;
        else if (ptsA < ptsB) c.losses++;
        else c.ties++;
        c.pointsFor += ptsA;
        c.pointsAgainst += ptsB;
        cells.set(k, c);
      };
      upd(home, away, g.homePts, g.awayPts);
      upd(away, home, g.awayPts, g.homePts);
    }
  }
  return cells;
}

export function weekResults(season: Season, week: number): WeekResult[] {
  return season.games
    .filter((g) => g.week === week)
    .map((g) => ({
      week,
      game: g,
      home: teamById(season, g.homeId),
      away: teamById(season, g.awayId),
      margin: Math.abs(g.homePts - g.awayPts),
    }))
    .sort((a, b) => b.margin - a.margin);
}

export interface WeeklyAwards {
  week: number;
  topScore: { team: Team; pts: number };
  toiletBowl: { team: Team; pts: number };
  narrowestWin: WeekResult | null;
  biggestBlowout: WeekResult | null;
}

export function weeklyAwards(season: Season, week: number): WeeklyAwards | null {
  const games = regSeasonGames(season).filter((g) => g.week === week);
  if (!games.length) return null;
  const scores = games.flatMap((g) => [
    { team: teamById(season, g.homeId), pts: g.homePts },
    { team: teamById(season, g.awayId), pts: g.awayPts },
  ]);
  scores.sort((a, b) => b.pts - a.pts);
  const results = weekResults(season, week).filter((r) => r.game.winner !== "UNDECIDED");
  return {
    week,
    topScore: scores[0],
    toiletBowl: scores[scores.length - 1],
    narrowestWin: results.length ? results[results.length - 1] : null,
    biggestBlowout: results.length ? results[0] : null,
  };
}

export interface RecordEntry {
  label: string;
  holder: string;
  detail: string;
  value: string;
  shame?: boolean;
}

export function recordBook(seasons: Season[]): RecordEntry[] {
  interface Scored { team: Team; pts: number; week: number; year: number; opp: Team; oppPts: number }
  const all: Scored[] = [];
  for (const season of seasons) {
    for (const g of season.games) {
      if (g.winner === "UNDECIDED") continue;
      const home = teamById(season, g.homeId);
      const away = teamById(season, g.awayId);
      all.push({ team: home, pts: g.homePts, week: g.week, year: season.year, opp: away, oppPts: g.awayPts });
      all.push({ team: away, pts: g.awayPts, week: g.week, year: season.year, opp: home, oppPts: g.homePts });
    }
  }
  if (!all.length) return [];
  const fmt = (n: number) => n.toFixed(1);
  const hi = all.reduce((a, b) => (b.pts > a.pts ? b : a));
  const lo = all.reduce((a, b) => (b.pts < a.pts ? b : a));
  const wins = all.filter((s) => s.pts > s.oppPts);
  const blowout = wins.reduce((a, b) => (b.pts - b.oppPts > a.pts - a.oppPts ? b : a));
  const squeaker = wins.reduce((a, b) => (b.pts - b.oppPts < a.pts - a.oppPts ? b : a));
  const heartbreak = all
    .filter((s) => s.pts < s.oppPts)
    .reduce((a, b) => (b.pts > a.pts ? b : a)); // most points in a loss

  const bySeasonPF = seasons
    .filter((s) => s.isCompleted)
    .flatMap((s) => s.teams.map((t) => ({ t, year: s.year })));
  const entries: RecordEntry[] = [
    {
      label: "Single-week high",
      holder: hi.team.name,
      detail: `${hi.team.ownerFirst} · Week ${hi.week}, ${hi.year} vs ${hi.opp.name}`,
      value: fmt(hi.pts),
    },
    {
      label: "Single-week low",
      holder: lo.team.name,
      detail: `${lo.team.ownerFirst} · Week ${lo.week}, ${lo.year} vs ${lo.opp.name}`,
      value: fmt(lo.pts),
      shame: true,
    },
    {
      label: "Biggest blowout",
      holder: blowout.team.name,
      detail: `${fmt(blowout.pts)}–${fmt(blowout.oppPts)} over ${blowout.opp.name} · Wk ${blowout.week}, ${blowout.year}`,
      value: `+${fmt(blowout.pts - blowout.oppPts)}`,
    },
    {
      label: "Closest win",
      holder: squeaker.team.name,
      detail: `${fmt(squeaker.pts)}–${fmt(squeaker.oppPts)} over ${squeaker.opp.name} · Wk ${squeaker.week}, ${squeaker.year}`,
      value: `+${fmt(squeaker.pts - squeaker.oppPts)}`,
    },
    {
      label: "Toughest beat",
      holder: heartbreak.team.name,
      detail: `Scored ${fmt(heartbreak.pts)}, lost to ${heartbreak.opp.name}'s ${fmt(heartbreak.oppPts)} · Wk ${heartbreak.week}, ${heartbreak.year}`,
      value: fmt(heartbreak.pts),
      shame: true,
    },
  ];
  if (bySeasonPF.length) {
    const pfKing = bySeasonPF.reduce((a, b) => (b.t.pointsFor > a.t.pointsFor ? b : a));
    entries.push({
      label: "Most points, season",
      holder: pfKing.t.name,
      detail: `${pfKing.t.ownerFirst} · ${pfKing.year} (${pfKing.t.wins}-${pfKing.t.losses})`,
      value: fmt(pfKing.t.pointsFor),
    });
  }
  return entries;
}

export function champion(season: Season): Team | null {
  if (!season.isCompleted) return null;
  const byRank = season.teams.find((t) => t.finalRank === 1);
  if (byRank) return byRank;
  const finals = season.games.filter((g) => g.tier === "WINNERS_BRACKET");
  if (!finals.length) return null;
  const lastWeek = Math.max(...finals.map((g) => g.week));
  const final = finals.find((g) => g.week === lastWeek && g.winner !== "UNDECIDED");
  if (!final) return null;
  return teamById(season, final.winner === "HOME" ? final.homeId : final.awayId);
}
