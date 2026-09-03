import QuoteWall from "@/components/QuoteWall";

export default function QuotesPage() {
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">Things That Were Actually Said</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">THE QUOTE WALL</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Any member can post a quote and react to it. Quote of the Year voting opens in December.
          Nothing said in the group chat is safe.
        </p>
      </header>
      <QuoteWall />
    </div>
  );
}
