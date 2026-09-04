import TheVault from "@/components/TheVault";
export default function ArchivePage() {
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">2026 Season · The Vault</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">RECAPS &amp; TAPES</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">Every Tuesday Morning Paper and every Tuesday Tape, forever.</p>
      </header>
      <TheVault />
    </div>
  );
}
