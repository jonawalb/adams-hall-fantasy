// Career lines for the Brethren page, from ESPN season snapshots.
import { Season } from "./espn";
import { lastPlaceTeam } from "./halls";

export interface Career {
  ownerId: string;
  name: string;
  first: string;
  team: string; // current team name
  logo: string | null;
  firstSeason: number;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  titles: number[];
  sackos: number[];
  playoffs: number;
}

export function careers(seasons: Season[]): Career[] {
  const latest = seasons[seasons.length - 1];
  return latest.teams.map((cur) => {
    const c: Career = {
      ownerId: cur.ownerId,
      name: cur.ownerName,
      first: cur.ownerFirst,
      team: cur.name,
      logo: cur.logo,
      firstSeason: latest.year,
      seasons: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      titles: [],
      sackos: [],
      playoffs: 0,
    };
    for (const s of seasons) {
      const t = s.teams.find((x) => x.ownerId === cur.ownerId);
      if (!t) continue;
      c.seasons++;
      c.firstSeason = Math.min(c.firstSeason, s.year);
      c.wins += t.wins;
      c.losses += t.losses;
      c.ties += t.ties;
      c.pointsFor += t.pointsFor;
      if (!s.isCompleted) continue;
      if (t.finalRank === 1) c.titles.push(s.year);
      if (lastPlaceTeam(s)?.id === t.id) c.sackos.push(s.year);
      if (t.playoffSeed && t.playoffSeed <= s.playoffTeamCount) c.playoffs++;
    }
    return c;
  });
}
