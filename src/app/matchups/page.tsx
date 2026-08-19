import { loadSeason, teamById } from "@/lib/espn";
import MatchupBrowser, { MatchupView } from "@/components/MatchupBrowser";

export default function MatchupsPage() {
  const season = loadSeason(2025)!;

  const matchups: MatchupView[] = season.games
    .filter((g) => g.winner !== "UNDECIDED")
    .map((g) => {
      const home = teamById(season, g.homeId);
      const away = teamById(season, g.awayId);
      const homeWon = g.winner === "HOME";
      return {
        week: g.week,
        label: g.week > season.regSeasonWeeks ? `P${g.week - season.regSeasonWeeks}` : `Wk ${g.week}`,
        playoff: g.tier === "WINNERS_BRACKET",
        away: { name: away.name, owner: away.ownerFirst, pts: g.awayPts, won: !homeWon && g.winner !== "TIE" },
        home: { name: home.name, owner: home.ownerFirst, pts: g.homePts, won: homeWon },
        margin: Math.abs(g.homePts - g.awayPts),
      };
    })
    .sort((a, b) => a.week - b.week || b.margin - a.margin);

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">2025 Season · Live 2026 scores land here in-season</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">MATCHUPS</h1>
      </header>
      <MatchupBrowser matchups={matchups} />
    </div>
  );
}
