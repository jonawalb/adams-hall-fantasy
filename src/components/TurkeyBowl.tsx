import Link from "next/link";
import type { Award, TurkeyCard, TurkeySide } from "@/lib/turkey";

function Side({ s, won, decided }: { s: TurkeySide; won: boolean; decided: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${decided && !won ? "opacity-60" : ""}`}>
      {s.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo} alt="" className="h-9 w-9 shrink-0 rounded-sm object-cover" />
      )}
      <div className="min-w-0">
        <p className="font-head truncate text-base font-semibold leading-tight">{s.first}</p>
        <p className="truncate text-[0.65rem] uppercase tracking-wider text-cream-dim">
          {s.team} · <span className="font-mono-num normal-case tracking-normal">{s.record}</span>
        </p>
      </div>
      {decided && <span className={`font-mono-num ml-auto text-lg ${won ? "text-gold-bright" : ""}`}>{s.points.toFixed(1)}</span>}
    </div>
  );
}

export function TurkeyCards({ cards, compact = false }: { cards: TurkeyCard[]; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}>
      {cards.map((c, i) => (
        <article key={c.home.ownerId} className="panel rise p-4" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Side s={c.away} won={c.winner === "away"} decided={c.decided} />
            <div className="text-center">
              <p className="font-mono-num text-xl text-gold-bright">
                {c.away.wins}–{c.home.wins}
              </p>
              <p className="text-[0.6rem] uppercase tracking-wider text-cream-dim">all-time</p>
            </div>
            <Side s={c.home} won={c.winner === "home"} decided={c.decided} />
          </div>
          <p className="mt-3 text-sm">{c.headline}</p>
          {!compact && (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-cream-dim">
              <div>
                <dt className="inline uppercase tracking-wider">Meetings </dt>
                <dd className="font-mono-num inline text-cream">
                  {c.meetings}
                  {c.playoffMeetings ? ` (${c.playoffMeetings} playoff)` : ""}
                </dd>
              </div>
              <div>
                <dt className="inline uppercase tracking-wider">Streak </dt>
                <dd className="font-mono-num inline text-cream">{c.streak ?? "—"}</dd>
              </div>
              {c.closest && (
                <div className="col-span-2">
                  <dt className="inline uppercase tracking-wider">Closest </dt>
                  <dd className="inline text-cream">{c.closest}</dd>
                </div>
              )}
              {c.biggest && (
                <div className="col-span-2">
                  <dt className="inline uppercase tracking-wider">Biggest beatdown </dt>
                  <dd className="inline text-cream">{c.biggest}</dd>
                </div>
              )}
            </dl>
          )}
        </article>
      ))}
    </div>
  );
}

export function LeftoversAwards({ awards }: { awards: Award[] | null }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="kicker">Served after Monday Night Football</p>
        <h2 className="font-display text-2xl text-gold-bright">THE LEFTOVERS AWARDS</h2>
      </div>
      {awards ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((a) => (
            <div key={a.title} className="panel p-4">
              <p className="kicker">
                {a.emoji} {a.title}
              </p>
              <p className="font-head mt-1 text-xl font-semibold">{a.who}</p>
              <p className="mt-1 text-sm text-cream-dim">{a.line}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="panel p-4 text-sm text-cream-dim">
          Still in the oven. Top Chef, Stuffed, Food Coma, Pass the Gravy and Turkey of the Week are handed out once
          every Week 12 matchup is final.
        </p>
      )}
    </section>
  );
}

export function TurkeyBanner() {
  return (
    <Link href="/season/thanksgiving" className="panel panel-gold rise flex flex-wrap items-center justify-between gap-3 p-4 hover:border-gold">
      <span>
        <span className="kicker">Week 12 · Rivalry Week</span>
        <span className="font-display block text-2xl text-gold-bright">🦃 THE TURKEY BOWL</span>
      </span>
      <span className="text-sm text-cream-dim">Tale of the tape, pull the Wishbone, Leftovers Awards →</span>
    </Link>
  );
}
