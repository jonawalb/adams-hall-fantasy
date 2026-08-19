import { loadSeason, LOCKED_SEASONS } from "@/lib/espn";
import { champion, standings } from "@/lib/stats";

const fmt = (n: number) => n.toFixed(1);

export default function HistoryPage() {
  const s2025 = loadSeason(2025)!;
  const champ = champion(s2025);
  const lines = standings(s2025);

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">Five Seasons of Beef</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">LEAGUE HISTORY</h1>
      </header>

      {/* 2025 full recap */}
      <section className="panel panel-gold rise p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-gold-bright">2025</h2>
          {champ && (
            <p className="font-head text-sm uppercase tracking-wider text-cream-dim">
              🏆 {champ.name} ({champ.ownerName})
            </p>
          )}
        </div>
        <div className="rule-gold mt-3" />
        <ol className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {lines.map((l, i) => (
            <li key={l.team.id} className="flex items-baseline justify-between gap-3">
              <span>
                <span className="font-mono-num mr-2 text-cream-dim">{i + 1}.</span>
                <span className="font-head font-semibold">{l.team.name}</span>
                <span className="ml-1.5 text-xs text-cream-dim">{l.team.ownerFirst}</span>
              </span>
              <span className="font-mono-num text-cream-dim">
                {l.wins}–{l.losses} · {fmt(l.pointsFor)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Locked seasons */}
      <section className="grid gap-4 sm:grid-cols-2">
        {[...LOCKED_SEASONS].reverse().map((year, i) => (
          <div key={year} className="panel rise p-6 opacity-80" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-cream-dim">{year}</h2>
              <span className="font-head rounded-sm border border-line-strong px-2 py-0.5 text-xs uppercase tracking-wider text-cream-dim">
                🔒 Awaiting sync
              </span>
            </div>
            <p className="mt-3 text-sm text-cream-dim">
              ESPN keeps this season behind login. One-time cookie grab (SWID + espn_s2) unlocks the
              full archive — standings, every matchup, and four more years of rivalry data.
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
