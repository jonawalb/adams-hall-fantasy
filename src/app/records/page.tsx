import { availableSeasons, loadSeason } from "@/lib/espn";
import { recordBook } from "@/lib/stats";

export default function RecordsPage() {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const records = recordBook(seasons);
  const glory = records.filter((r) => !r.shame);
  const shame = records.filter((r) => r.shame);

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">Etched in Brass · 2021–present · All-time</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">THE RECORD BOOK</h1>
      </header>

      <section>
        <h2 className="kicker mb-4">Hall of Fame</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {glory.map((r, i) => (
            <div key={r.label} className="panel panel-gold rise p-5" style={{ animationDelay: `${i * 70}ms` }}>
              <p className="kicker">{r.label}</p>
              <p className="font-mono-num mt-2 text-3xl text-gold-bright">{r.value}</p>
              <p className="font-head mt-1 text-lg font-semibold">{r.holder}</p>
              <p className="mt-1 text-xs text-cream-dim">{r.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="kicker mb-4 text-blood">Hall of Shame</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {shame.map((r, i) => (
            <div
              key={r.label}
              className="panel rise border-blood/40 p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <p className="kicker text-blood">{r.label}</p>
              <p className="font-mono-num mt-2 text-3xl text-blood">{r.value}</p>
              <p className="font-head mt-1 text-lg font-semibold">{r.holder}</p>
              <p className="mt-1 text-xs text-cream-dim">{r.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-cream-dim">
        Records rebuild automatically as seasons sync. Blunder-of-the-week (bench-mismanagement
        detection) arrives once per-roster data is pulled.
      </p>
    </div>
  );
}
