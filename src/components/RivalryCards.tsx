import type { OwnerCard } from "@/lib/rivalry";

const rec = (x: { wins: number; losses: number }) => `${x.wins}–${x.losses}`;

export default function RivalryCards({ cards }: { cards: OwnerCard[] }) {
  return (
    <section className="space-y-4">
      <header>
        <p className="kicker">Rivalry Cards</p>
        <h2 className="font-display mt-1 text-2xl text-gold-bright">WHO OWNS WHOM</h2>
        <p className="mt-1 text-sm text-cream-dim">
          Nemesis and victim need at least three meetings. Computed from every matchup since 2021,
          playoffs included.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <div key={c.owner.id} className="panel rise p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="font-head text-lg font-semibold">{c.owner.name}</p>
            <p className="text-xs text-cream-dim">{c.owner.team}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="kicker !text-blood">Nemesis</dt>
                <dd className="text-right">
                  {c.nemesis ? (
                    <>
                      <span className="font-head font-semibold">{c.nemesis.owner.first}</span>
                      <span className="font-mono-num ml-2 text-blood">{rec(c.nemesis)}</span>
                    </>
                  ) : (
                    <span className="text-cream-dim">fears no one</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="kicker">Victim</dt>
                <dd className="text-right">
                  {c.victim ? (
                    <>
                      <span className="font-head font-semibold">{c.victim.owner.first}</span>
                      <span className="font-mono-num ml-2 text-gold-bright">{rec(c.victim)}</span>
                    </>
                  ) : (
                    <span className="text-cream-dim">owns no one</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="kicker !text-cream-dim">Most played</dt>
                <dd className="text-right">
                  {c.mostPlayed ? (
                    <>
                      <span className="font-head font-semibold">{c.mostPlayed.owner.first}</span>
                      <span className="font-mono-num ml-2">
                        {rec(c.mostPlayed)}
                        <span className="text-cream-dim"> · {c.mostPlayed.games} games</span>
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
