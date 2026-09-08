import JorgesBook from "@/components/JorgesBook";

export default function JorgesBookPage() {
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">The Degenerate Ledger</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">JORGE&rsquo;S BOOK</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Every FanDuel bet, logged for the record. No hiding. No deleting. Just receipts.
        </p>
      </header>
      <JorgesBook />
    </div>
  );
}
