import { availableSeasons, loadSeason } from "@/lib/espn";
import { TURKEY, leftovers, turkeyCards, turkeyScores } from "@/lib/turkey";
import { LeftoversAwards, TurkeyCards } from "@/components/TurkeyBowl";
import Wishbone from "@/components/Wishbone";

export default function ThanksgivingPage() {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const cards = turkeyCards(seasons);
  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">
          {TURKEY.season} · Week {TURKEY.week} · Rivalry Week
        </p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">🦃 THE TURKEY BOWL</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Five matchups, every one with history. The all-time series, the streaks and the worst beatdowns are below,
          and the Matchup Pick&rsquo;Em locks at Wednesday night&rsquo;s GB @ LAR kickoff.
        </p>
      </header>
      <section className="space-y-3">
        <p className="kicker">Tale of the tape · all-time series, all seasons</p>
        <TurkeyCards cards={cards} />
      </section>
      <Wishbone season={TURKEY.season} week={TURKEY.week} lockAt={TURKEY.wishboneLock} scores={turkeyScores(seasons)} />
      <LeftoversAwards awards={leftovers(seasons)} />
    </div>
  );
}
