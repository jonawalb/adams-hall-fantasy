import quotesData from "../../../data/quotes.json";

export default function QuotesPage() {
  const quotes = [...quotesData.quotes].reverse();
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">Things That Were Actually Said</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">THE QUOTE WALL</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Sample quotes below — the real wall opens with logins: any member can submit a quote,
          react to it, and vote for Quote of the Year in December. Nothing said in the group chat is
          safe.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quotes.map((q, i) => (
          <figure key={q.id} className="panel rise flex flex-col p-5" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="font-display text-4xl leading-none text-gold-deep">&ldquo;</span>
            <blockquote className="mt-1 grow text-lg leading-snug">{q.text}</blockquote>
            <figcaption className="mt-4 border-t border-line pt-3 text-sm">
              <p className="font-head font-semibold">— {q.attributedTo}</p>
              <p className="mt-0.5 text-xs text-cream-dim">{q.context} · {q.date}</p>
              <p className="mt-2 space-x-2 text-sm">
                {Object.entries(q.reactions).map(([emoji, n]) => (
                  <span key={emoji} className="inline-block rounded-full bg-raised px-2 py-0.5 text-xs">
                    {emoji} {n as number}
                  </span>
                ))}
              </p>
            </figcaption>
          </figure>
        ))}

        <div className="rise flex min-h-40 flex-col items-center justify-center rounded border border-dashed border-line-strong p-5 text-center">
          <p className="font-head text-lg font-semibold text-cream-dim">+ Submit a quote</p>
          <p className="mt-1 text-xs text-cream-dim">Unlocks with member logins</p>
        </div>
      </section>
    </div>
  );
}
