import slate from "../../../data/nfl-week1.json";
import PickemBoard, { PickemGame } from "@/components/PickemBoard";

export default function PickemPage() {
  const games = slate.games as PickemGame[];
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">NFL Week {slate.week} · {slate.season} · Real schedule, live from ESPN</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">PICK&rsquo;EM</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          One pick per game, every game, every week. Picks lock at kickoff. Right now picks save to
          this browser only — once logins land, they save to the league board and the trash talk
          becomes permanent record.
        </p>
      </header>
      <PickemBoard games={games} />
    </div>
  );
}
