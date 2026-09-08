import BetBook from "@/components/BetBook";
import { ETHAN } from "@/lib/bettors";

export default function EthansBookPage() {
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">The Commissioner&rsquo;s Gambles</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">ETHAN&rsquo;S BOOK</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          The commissioner puts his money where his mouth is. Every bet. Every receipt. Every L.
        </p>
      </header>
      <BetBook bettor={ETHAN} tag="ethan" />
    </div>
  );
}
