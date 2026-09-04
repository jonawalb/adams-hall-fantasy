import slateData from "../../../../data/nfl/slate.json";
import { availableSeasons, loadSeason } from "@/lib/espn";
import { pickemWeeks } from "@/lib/matchups";
import type { Slate } from "@/lib/pickem";
import MatchupPickem from "@/components/MatchupPickem";

export default function MatchupPickemPage() {
  const years = availableSeasons();
  const season = loadSeason(years[years.length - 1])!;
  const slate = slateData as unknown as Slate;
  const weeks = pickemWeeks(season, slate.season === season.year ? slate : null);
  const owners = season.teams.map((t) => ({ ownerId: t.ownerId, name: t.ownerName }));
  const currentWeek = Math.min(Math.max(season.currentMatchupPeriod, 1), weeks.length ? weeks[weeks.length - 1].week : 1);
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">{season.year} · League Matchups · Everyone&rsquo;s picks are public</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">MATCHUP PICK&rsquo;EM</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Pick the winner of every league matchup and hit Submit. Submitted picks are public right
          away, so the whole league can see exactly who bet against whom. Locks at the week&rsquo;s
          first NFL kickoff.
        </p>
      </header>
      <MatchupPickem season={season.year} weeks={weeks} currentWeek={currentWeek} owners={owners} />
    </div>
  );
}
