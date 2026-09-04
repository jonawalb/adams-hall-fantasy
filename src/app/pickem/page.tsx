import slateData from "../../../data/nfl/slate.json";
import PickemBoard from "@/components/PickemBoard";
import type { Slate } from "@/lib/pickem";
import { availableSeasons, loadSeason } from "@/lib/espn";

export default function PickemPage() {
  const slate = slateData as unknown as Slate;
  const years = availableSeasons();
  const owners = loadSeason(years[years.length - 1])!.teams.map((t) => ({ ownerId: t.ownerId, name: t.ownerName }));
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">NFL Week {slate.currentWeek} · {slate.season} · Live from ESPN</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">PICK&rsquo;EM</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          One pick per game, every game, every week. Tap your picks, hit Submit, and they lock at
          kickoff. Once a game starts, everyone&rsquo;s picks go public and the leaderboard keeps
          score.
        </p>
      </header>
      <PickemBoard slate={slate} owners={owners} />
    </div>
  );
}
