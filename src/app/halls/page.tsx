import { availableSeasons, loadSeason } from "@/lib/espn";
import { hallRows, tally } from "@/lib/halls";

const f1 = (n: number) => n.toFixed(1);

export default function HallsPage() {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const rows = hallRows(seasons);
  const champs = tally(rows, (r) => r.champion);
  const sackos = tally(rows, (r) => r.lastPlace);

  return (
    <div className="space-y-12">
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
    </div>
  );
}
