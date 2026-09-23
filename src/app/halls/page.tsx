import { availableSeasons, loadSeason } from "@/lib/espn";
import { hallRows, tally } from "@/lib/halls";
import { loadLeagueLegacy } from "@/lib/league-legacy";

const f1 = (n: number) => n.toFixed(1);
const pct = (n: number) => (n * 100).toFixed(1) + "%";

export default function HallsPage() {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const rows = hallRows(seasons);
  const champs = tally(rows, (r) => r.champion);
  const sackos = tally(rows, (r) => r.lastPlace);
  const ll = loadLeagueLegacy();

  return (
    <div className="space-y-12">
      {/* ─── Hall of Champions ─── */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker">Immortality, such as it is</p>
          <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">HALL OF CHAMPIONS</h1>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <article key={r.year} className="panel panel-gold rise p-5" style={{ animationDelay: `${i * 70}ms` }}>
              <p className="font-display text-4xl leading-none text-gold-bright">{r.year}</p>
              {r.champion ? (
                <>
                  <p className="font-head mt-3 text-xl font-semibold">{r.champion.name}</p>
                  <p className="text-sm text-cream-dim">{r.champion.ownerName}</p>
                  {r.champion.ownerName === "Jorge Velasco" && (
                    <p className="mt-1 text-xs italic text-cream-dim">Damn, that was a long time ago</p>
                  )}
                  <p className="font-mono-num mt-2 text-sm">
                    {r.champion.wins}–{r.champion.losses} · {f1(r.champion.pointsFor)} PF · {r.champion.playoffSeed ? `${r.champion.playoffSeed} seed` : ""}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-cream-dim">Unresolved.</p>
              )}
              {r.runnerUp && (
                <p className="mt-3 border-t border-line pt-2 text-xs text-cream-dim">
                  Runner-up: {r.runnerUp.name} ({r.runnerUp.ownerFirst})
                </p>
              )}
            </article>
          ))}
        </div>
        <div className="panel p-4">
          <p className="kicker">Ring count</p>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {champs.map((t) => (
              <li key={t.owner}>
                <span className="font-head font-semibold">{t.owner}</span>
                <span className="font-mono-num ml-2 text-gold-bright">{t.count}</span>
                <span className="ml-1 text-xs text-cream-dim">({t.years.join(", ")})</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Hall of Shame ─── */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker text-blood">Worst regular-season record. Every year. Forever on record.</p>
          <h2 className="font-display mt-2 text-3xl text-blood sm:text-4xl">HALL OF SHAME</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <article key={r.year} className="panel rise border-blood/40 p-5" style={{ animationDelay: `${i * 70}ms` }}>
              <p className="font-display text-4xl leading-none text-cream-dim">{r.year}</p>
              {r.lastPlace ? (
                <>
                  <p className="font-head mt-3 text-xl font-semibold">{r.lastPlace.name}</p>
                  <p className="text-sm text-cream-dim">{r.lastPlace.ownerName}</p>
                  <p className="font-mono-num mt-2 text-sm text-blood">
                    {r.lastPlace.wins}–{r.lastPlace.losses} · {f1(r.lastPlace.pointsFor)} PF · last of {r.teams}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-cream-dim">Unresolved.</p>
              )}
            </article>
          ))}
        </div>
        <div className="panel p-4">
          <p className="kicker text-blood">Sacko count</p>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {sackos.map((t) => (
              <li key={t.owner}>
                <span className="font-head font-semibold">{t.owner}</span>
                <span className="font-mono-num ml-2 text-blood">{t.count}</span>
                <span className="ml-1 text-xs text-cream-dim">({t.years.join(", ")})</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── League Ratings ─── */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker">Elo-style power rankings across all seasons</p>
          <h2 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">LEAGUE RATINGS</h2>
        </header>
        <div className="panel rise overflow-x-auto p-5">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="font-head text-left text-xs uppercase tracking-wider text-cream-dim">
                <th className="w-8 pb-2">#</th>
                <th className="pb-2">Member</th>
                <th className="pb-2 text-right">Rating</th>
                <th className="pb-2 text-right">Record</th>
                <th className="pb-2 text-right">Win %</th>
                <th className="pb-2 text-right">All-Play</th>
                <th className="pb-2 text-right">Seasons</th>
              </tr>
            </thead>
            <tbody>
              {ll.all_time_standings.map((s, i) => (
                <tr key={s.name} className={`border-t border-line ${i < 3 ? "" : "opacity-80"}`}>
                  <td className="font-mono-num py-2.5 text-cream-dim">{i + 1}</td>
                  <td className="py-2.5">
                    <span className="font-head font-semibold">{s.name}</span>
                  </td>
                  <td className="font-mono-num py-2.5 text-right text-gold-bright">{s.league_rating}</td>
                  <td className="font-mono-num py-2.5 text-right">{s.record}</td>
                  <td className="font-mono-num py-2.5 text-right">{pct(s.win_pct)}</td>
                  <td className="font-mono-num py-2.5 text-right text-cream-dim">{pct(s.all_play_win_pct)}</td>
                  <td className="font-mono-num py-2.5 text-right text-cream-dim">{s.num_seasons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Championship Droughts ─── */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker text-blood">Still searching for the ring</p>
          <h2 className="font-display mt-2 text-3xl text-blood sm:text-4xl">CHAMPIONSHIP DROUGHTS</h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ll.championship_droughts.map((d, i) => {
            const neverWon = d.status.includes("never");
            return (
              <div
                key={d.name}
                className={`panel rise p-5 ${neverWon ? "border-blood/40" : ""}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <p className="font-head text-lg font-semibold">{d.name}</p>
                <p className={`font-mono-num mt-1 text-xl ${neverWon ? "text-blood" : "text-cream-dim"}`}>
                  {d.status}
                </p>
                {d.seasons != null && (
                  <p className="mt-1 text-xs text-cream-dim">{d.seasons} season{d.seasons !== 1 ? "s" : ""} in the league</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Achievement Badges ─── */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker">Achievements earned vs. blunders committed</p>
          <h2 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">ACHIEVEMENT BADGES</h2>
        </header>
        <div className="panel rise overflow-x-auto p-5">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="font-head text-left text-xs uppercase tracking-wider text-cream-dim">
                <th className="pb-2">Member</th>
                <th className="pb-2 text-right">Achievements</th>
                <th className="pb-2 text-right">Blunders</th>
                <th className="pb-2 text-right">Total Badges</th>
              </tr>
            </thead>
            <tbody>
              {ll.achievements_summary.map((a) => (
                <tr key={a.name} className="border-t border-line">
                  <td className="py-2.5">
                    <span className="font-head font-semibold">{a.name}</span>
                  </td>
                  <td className="font-mono-num py-2.5 text-right text-gold-bright">
                    {a.achievements_total}
                    <span className="ml-1 text-xs text-cream-dim">({a.achievements} unique)</span>
                  </td>
                  <td className="font-mono-num py-2.5 text-right text-blood">
                    {a.blunders_total}
                    <span className="ml-1 text-xs text-cream-dim">({a.blunders} unique)</span>
                  </td>
                  <td className="font-mono-num py-2.5 text-right">{a.total_badges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Draft Intelligence ─── */}
      <section className="space-y-4">
        <header className="rise">
          <p className="kicker">All-time average draft pick value by member</p>
          <h2 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">DRAFT INTELLIGENCE</h2>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {ll.draft_rankings.map((d, i) => {
            const positive = d.value >= 0;
            return (
              <div
                key={d.name}
                className={`panel rise flex items-center justify-between p-4 ${positive ? "panel-gold" : "border-blood/40"}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono-num text-cream-dim">#{d.rank}</span>
                  <span className="font-head font-semibold">{d.name}</span>
                </div>
                <span className={`font-mono-num text-xl ${positive ? "text-gold-bright" : "text-blood"}`}>
                  {positive ? "+" : ""}{d.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
