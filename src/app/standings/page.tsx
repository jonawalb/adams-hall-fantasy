import { loadSeason } from "@/lib/espn";
import { standings } from "@/lib/stats";

const fmt = (n: number) => n.toFixed(1);
const pct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(0)}%`;

export default function StandingsPage() {
  const seasons = [loadSeason(2026)!, loadSeason(2025)!];

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">The Table</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">STANDINGS</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          All-play is your record if you played every team every week. Luck is actual win rate minus
          all-play win rate — positive means the schedule carried you.
        </p>
      </header>

      {seasons.map((season) => {
        const lines = standings(season);
        const hasGames = lines.some((l) => l.wins + l.losses + l.ties > 0);
        return (
          <section key={season.year} className="panel rise overflow-x-auto p-5">
            <h2 className="kicker">
              {season.year} {season.isCompleted ? "· Final" : "· In progress"}
            </h2>
            {!hasGames ? (
              <p className="mt-4 text-sm text-cream-dim">
                Nothing to see yet — draft order is set, first kickoff Sept 10. Check back Week 1.
              </p>
            ) : (
              <table className="mt-4 w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="font-head text-left text-xs uppercase tracking-wider text-cream-dim">
                    <th className="w-8 pb-2">#</th>
                    <th className="pb-2">Team</th>
                    <th className="pb-2 text-right">W–L</th>
                    <th className="pb-2 text-right">PF</th>
                    <th className="pb-2 text-right">PA</th>
                    <th className="pb-2 text-right">All-Play</th>
                    <th className="pb-2 text-right">Luck*</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.team.id} className={`border-t border-line ${i < season.playoffTeamCount ? "" : "opacity-70"}`}>
                      <td className="font-mono-num py-2.5 text-cream-dim">{i + 1}</td>
                      <td className="py-2.5">
                        <span className="font-head text-base font-semibold">{l.team.name}</span>
                        <span className="ml-2 text-xs text-cream-dim">{l.team.ownerFirst}</span>
                        {i === 0 && season.isCompleted && <span className="ml-2">🏆</span>}
                      </td>
                      <td className="font-mono-num py-2.5 text-right">{l.wins}–{l.losses}</td>
                      <td className="font-mono-num py-2.5 text-right">{fmt(l.pointsFor)}</td>
                      <td className="font-mono-num py-2.5 text-right text-cream-dim">{fmt(l.pointsAgainst)}</td>
                      <td className="font-mono-num py-2.5 text-right text-cream-dim">
                        {l.allPlayWins}–{l.allPlayLosses}
                      </td>
                      <td className={`font-mono-num py-2.5 text-right ${l.luck > 0.02 ? "text-gold-bright" : l.luck < -0.02 ? "text-blood" : "text-cream-dim"}`}>
                        {pct(l.luck)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      <footer className="panel p-5 text-sm">
        <p className="kicker">* For Jorge, who can&rsquo;t read</p>
        <p className="mt-2 max-w-3xl text-cream-dim">
          Luck is your actual win rate minus your all-play win rate. All-play is the record you would
          have if you played every other team every single week, so it measures how good your scores
          actually were with the schedule removed. If you went 9–5 but your scores would only have
          beaten the field 45% of the time, you were lucky. The schedule handed you wins. If you
          scored like a 70% team and went 6–8, you were robbed, and everyone should feel bad for you.
          Nobody will.
        </p>
        <p className="font-mono-num mt-2 text-xs text-cream-dim">
          luck = wins ÷ games played − all-play wins ÷ all-play games
        </p>
      </footer>
    </div>
  );
}
