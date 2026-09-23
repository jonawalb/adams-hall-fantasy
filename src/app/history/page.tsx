import { availableSeasons, loadSeason, LOCKED_SEASONS } from "@/lib/espn";
import { champion, standings } from "@/lib/stats";
import { loadLeagueLegacy } from "@/lib/league-legacy";

const fmt = (n: number) => n.toFixed(1);

function trophyIcons(t: { champion?: number; runner_up?: number; third?: number }) {
  const out: string[] = [];
  if (t.champion) out.push(`🏆×${t.champion}`);
  if (t.runner_up) out.push(`🥈×${t.runner_up}`);
  if (t.third) out.push(`🥉×${t.third}`);
  return out.join("  ");
}

export default function HistoryPage() {
  const synced = availableSeasons();
  const completed = synced
    .map((y) => loadSeason(y)!)
    .filter((s) => s.isCompleted)
    .reverse();
  const missing = LOCKED_SEASONS.filter((y) => !synced.includes(y));

  const ll = loadLeagueLegacy();
  const llStandings = ll.all_time_standings;
  const champsByYear = new Map(ll.season_champions.map((c) => [c.year, c]));
  const chumpsByYear = new Map(ll.season_chumpions.map((c) => [c.year, c]));

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">Five Seasons of Beef</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">LEAGUE HISTORY</h1>
      </header>

      {/* League Ratings */}
      <section className="panel rise overflow-x-auto p-5">
        <p className="kicker">Power Rankings · All-Time</p>
        <h2 className="font-display mt-1 text-xl text-gold-bright">LEAGUE RATINGS</h2>
        <table className="mt-4 w-full min-w-[640px] text-sm">
          <thead>
            <tr className="font-head text-left text-xs uppercase tracking-wider text-cream-dim">
              <th className="w-8 pb-2">#</th>
              <th className="pb-2">Manager</th>
              <th className="pb-2 text-right">Rating</th>
              <th className="pb-2 text-right">Record</th>
              <th className="pb-2 text-right">Win%</th>
              <th className="pb-2 text-right">All-Play</th>
              <th className="hidden pb-2 text-right sm:table-cell">Seasons</th>
              <th className="hidden pb-2 text-right md:table-cell">Trophies</th>
            </tr>
          </thead>
          <tbody>
            {llStandings.map((s, i) => (
              <tr
                key={s.name}
                className={`border-t border-line ${i < 3 ? "" : "opacity-80"}`}
              >
                <td className="font-mono-num py-2.5 text-cream-dim">{s.rank}</td>
                <td className="font-head py-2.5 font-semibold">{s.name}</td>
                <td className="font-mono-num py-2.5 text-right text-gold-bright">
                  {s.league_rating}
                </td>
                <td className="font-mono-num py-2.5 text-right">{s.record}</td>
                <td className="font-mono-num py-2.5 text-right">
                  .{(s.win_pct * 1000).toFixed(0).padStart(3, "0")}
                </td>
                <td className="font-mono-num py-2.5 text-right text-cream-dim">
                  .{(s.all_play_win_pct * 1000).toFixed(0).padStart(3, "0")}
                </td>
                <td className="font-mono-num hidden py-2.5 text-right text-cream-dim sm:table-cell">
                  {s.num_seasons}
                </td>
                <td className="hidden py-2.5 text-right text-xs md:table-cell">
                  {trophyIcons(s.trophies) || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-cream-dim">
          Ratings powered by League Legacy. Higher is better — starts at 1500, adjusts with wins, losses, and margin.
        </p>
      </section>

      {/* Season-by-season with enriched champion data */}
      <section className="space-y-6">
        <h2 className="kicker">Season by Season</h2>
        {completed.map((season, si) => {
          const champ = champion(season);
          const lines = standings(season);
          const llChamp = champsByYear.get(season.year);
          const llChump = chumpsByYear.get(season.year);
          return (
            <section
              key={season.year}
              className={`panel rise p-6 ${si === 0 ? "panel-gold" : ""}`}
              style={{ animationDelay: `${si * 70}ms` }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-gold-bright">
                  {season.year}
                </h2>
                {champ && (
                  <p className="font-head text-sm uppercase tracking-wider text-cream-dim">
                    🏆 {champ.name} ({champ.ownerName})
                  </p>
                )}
              </div>

              {/* League Legacy champion breakdown */}
              {llChamp && (
                <div className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-cream-dim">🥇 Champion: </span>
                    <span className="font-head font-semibold">{llChamp.champion}</span>
                    {llChamp.champion === "Jorge Velasco" && (
                      <span className="ml-1 italic text-cream-dim">Damn, that was a long time ago</span>
                    )}
                  </div>
                  <div>
                    <span className="text-cream-dim">🥈 Runner-up: </span>
                    <span className="font-head font-semibold">{llChamp.runner_up}</span>
                  </div>
                  <div>
                    <span className="text-cream-dim">🥉 Third: </span>
                    <span className="font-head font-semibold">{llChamp.third}</span>
                  </div>
                  <div>
                    <span className="text-cream-dim">👑 In-Season: </span>
                    <span className="font-head">{llChamp.in_season_champ}</span>
                  </div>
                  <div>
                    <span className="text-cream-dim">📊 Points: </span>
                    <span className="font-head">{llChamp.points_champ}</span>
                  </div>
                  <div>
                    <span className="text-cream-dim">⚔️ All-Play: </span>
                    <span className="font-head">{llChamp.all_play_champ}</span>
                  </div>
                </div>
              )}

              <div className="rule-gold mt-3" />
              <ol className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                {lines.map((l, i) => (
                  <li
                    key={l.team.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span>
                      <span className="font-mono-num mr-2 text-cream-dim">
                        {i + 1}.
                      </span>
                      <span className="font-head font-semibold">
                        {l.team.name}
                      </span>
                      <span className="ml-1.5 text-xs text-cream-dim">
                        {l.team.ownerFirst}
                      </span>
                    </span>
                    <span className="font-mono-num text-cream-dim">
                      {l.wins}–{l.losses} · {fmt(l.pointsFor)}
                    </span>
                  </li>
                ))}
              </ol>

              {/* Chumpion for this season */}
              {llChump && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blood">
                    Cellar Dwellers
                  </p>
                  <div className="mt-1 grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-cream-dim">🌮 Last Place: </span>
                      <span className="text-blood">{llChump.last_place}</span>
                    </div>
                    <div>
                      <span className="text-cream-dim">🤮 Lowest Scorer: </span>
                      <span className="text-blood">{llChump.lowest_scorer}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </section>

      {/* Hall of Shame summary */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker text-blood">The Bottom of the Barrel</p>
          <h2 className="font-display mt-1 text-2xl text-blood sm:text-3xl">
            SEASON CHUMPIONS
          </h2>
        </header>
        <div className="panel rise overflow-x-auto p-5">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="font-head text-left text-xs uppercase tracking-wider text-cream-dim">
                <th className="pb-2">Season</th>
                <th className="pb-2">Last Place 🌮</th>
                <th className="pb-2">Lowest Scorer 🤮</th>
                <th className="pb-2">Worst All-Around 💩</th>
              </tr>
            </thead>
            <tbody>
              {ll.season_chumpions.map((c) => (
                <tr key={c.year} className="border-t border-line">
                  <td className="font-mono-num py-2 text-cream-dim">{c.year}</td>
                  <td className="font-head py-2 text-blood">{c.last_place}</td>
                  <td className="font-head py-2 text-blood">{c.lowest_scorer}</td>
                  <td className="font-head py-2 text-blood">
                    {c.worst_all_around}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {missing.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {[...missing].reverse().map((year, i) => (
            <div
              key={year}
              className="panel rise p-6 opacity-80"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl text-cream-dim">{year}</h2>
                <span className="font-head rounded-sm border border-line-strong px-2 py-0.5 text-xs uppercase tracking-wider text-cream-dim">
                  🔒 Awaiting sync
                </span>
              </div>
              <p className="mt-3 text-sm text-cream-dim">
                ESPN keeps this season behind login. One-time cookie grab (SWID +
                espn_s2) unlocks the full archive — standings, every matchup, and
                more years of rivalry data.
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
