import type { Feud } from "@/lib/feud";

const f1 = (n: number) => n.toFixed(1);

function Heat({ score, max }: { score: number; max: number }) {
  const pct = Math.max(6, Math.round((score / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-felt-deep">
      <div className="h-full rounded-full bg-gradient-to-r from-gold-deep via-gold to-blood" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function FeudFeatured({ feuds }: { feuds: Feud[] }) {
  const max = feuds[0]?.score ?? 1;
  return (
    <section className="space-y-4">
      <header>
        <p className="kicker">The Feud Index</p>
        <h2 className="font-display mt-1 text-2xl text-gold-bright">THE LEAGUE&rsquo;S REAL RIVALRIES</h2>
        <p className="mt-1 max-w-2xl text-sm text-cream-dim">
          Every pairing scored on volume, closeness, playoff stakes, title games, one-score finishes,
          series lead changes, and recency. Built from the raw ESPN matchup log, 2021 to now.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {feuds.map((f, i) => {
          const lead = f.aWins >= f.bWins ? f.a : f.b;
          const leadW = Math.max(f.aWins, f.bWins);
          const trailW = Math.min(f.aWins, f.bWins);
          return (
            <article
              key={`${f.a.id}|${f.b.id}`}
              className={`rise flex flex-col p-5 ${i === 0 ? "panel panel-gold" : "panel"}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="kicker">
                    #{f.rank} · {f.name}
                  </p>
                  <h3 className="font-display mt-1 text-xl leading-tight text-gold-bright sm:text-2xl">
                    {f.a.first} <span className="text-cream-dim">vs</span> {f.b.first}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="font-mono-num text-3xl leading-none">
                    {leadW}
                    <span className="text-cream-dim">–</span>
                    {trailW}
                  </p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-cream-dim">
                    {leadW === trailW ? "even" : `${lead.first} leads`}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Heat score={f.score} max={max} />
                <p className="mt-1 flex justify-between text-[0.65rem] uppercase tracking-wider text-cream-dim">
                  <span>Feud score {f.score}</span>
                  <span>
                    {f.meetings.length} games · avg margin {f1(f.avgMargin)}
                    {f.playoffMeetings ? ` · ${f.playoffMeetings} playoff` : ""}
                  </span>
                </p>
              </div>
              <p className="mt-3 text-sm leading-snug">{f.tagline}</p>
              {f.receipts.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-cream-dim">
                  {f.receipts.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="text-gold">▸</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[0.65rem] uppercase tracking-wider text-cream-dim/70">
                {f.a.team} · {f.b.team}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function FeudTable({ feuds }: { feuds: Feud[] }) {
  return (
    <section className="space-y-4">
      <header>
        <p className="kicker">Full Index</p>
        <h2 className="font-display mt-1 text-2xl text-gold-bright">ALL {feuds.length} FEUDS, RANKED</h2>
      </header>
      <div className="panel overflow-x-auto p-4">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="kicker text-left">
              <th className="py-1 pr-2 font-normal">#</th>
              <th className="py-1 font-normal">Feud</th>
              <th className="py-1 font-normal">Type</th>
              <th className="py-1 text-right font-normal">Record</th>
              <th className="py-1 text-right font-normal">Games</th>
              <th className="py-1 text-right font-normal">Playoff</th>
              <th className="py-1 text-right font-normal">Titles</th>
              <th className="py-1 text-right font-normal">Avg Mrg</th>
              <th className="py-1 text-right font-normal">Score</th>
            </tr>
          </thead>
          <tbody>
            {feuds.map((f) => (
              <tr key={`${f.a.id}|${f.b.id}`} className="border-t border-line">
                <td className="font-mono-num py-1.5 pr-2 text-cream-dim">{f.rank}</td>
                <td className="font-head py-1.5 font-semibold">
                  {f.a.first} vs {f.b.first}
                </td>
                <td className="py-1.5 text-xs text-cream-dim">{f.name}</td>
                <td className="font-mono-num py-1.5 text-right">
                  {f.aWins}–{f.bWins}
                  {f.ties ? `–${f.ties}` : ""}
                </td>
                <td className="font-mono-num py-1.5 text-right">{f.meetings.length}</td>
                <td className="font-mono-num py-1.5 text-right">{f.playoffMeetings || "·"}</td>
                <td className="font-mono-num py-1.5 text-right">{f.titleGames.length || "·"}</td>
                <td className="font-mono-num py-1.5 text-right">{f1(f.avgMargin)}</td>
                <td className="font-mono-num py-1.5 text-right text-gold-bright">{f.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
