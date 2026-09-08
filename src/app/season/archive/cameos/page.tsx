import Cameos from "@/components/Cameos";

export default function CameosPage() {
  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">2026 Season · The Vault</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">CAMEOS</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Guest clips from the squad. Jorge&rsquo;s domain.
        </p>
      </header>
      <Cameos />
    </div>
  );
}
