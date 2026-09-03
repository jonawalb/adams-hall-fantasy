import QuoteWall from "@/components/QuoteWall";

export default function QuotesPage() {
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">Sixty-four bonks enter. One survives.</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">THE BONK BRACKET</h1>
      </header>

      <div
        className="rise rounded-sm border-2 border-dashed border-gold p-6 text-center"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(216,161,63,0.14) 0 14px, transparent 14px 28px)",
        }}
      >
        <p className="font-display text-3xl text-gold-bright sm:text-4xl">🚧 CURRENTLY IN PROGRESS 🚧</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-cream-dim">
          The March Madness style bracket where the league votes on the best joke, burn, and bonk
          of the year is under construction. Submit your bonks below now. They&rsquo;ll be seeded when
          the bracket opens.
        </p>
      </div>

      <header>
        <p className="kicker">The Bonk Pool · things that were actually said</p>
        <p className="mt-1 max-w-2xl text-sm text-cream-dim">
          Any member can post a bonk and react to it. Reactions decide the seeds.
        </p>
      </header>
      <QuoteWall />
    </div>
  );
}
