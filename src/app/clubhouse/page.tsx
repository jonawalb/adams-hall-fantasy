import Link from "next/link";
import { loadSeason } from "@/lib/espn";
import { champion, standings } from "@/lib/stats";
import LatestQuote from "@/components/LatestQuote";

const fmt = (n: number) => n.toFixed(1);

export default function ClubhousePage() {
  const s2026 = loadSeason(2026)!;
  const s2025 = loadSeason(2025)!;
  const champ = champion(s2025);
  const lines2026 = standings(s2026);
  const hasGames = lines2026.some((l) => l.wins + l.losses + l.ties > 0);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rise relative overflow-hidden rounded panel panel-gold px-6 py-12 text-center sm:py-16">
        <p className="kicker">Est. 2021 · Ten Franchises · Members Only</p>
        <h1 className="font-display mt-4 text-4xl leading-tight text-gold-bright sm:text-6xl">
          ADAMS HALL
        </h1>
        <p className="font-head mt-1 text-xl uppercase tracking-[0.35em] text-cream sm:text-2xl">
          Fantasy League
        </p>
        <div className="rule-gold mx-auto mt-6 w-48" />
        <p className="mt-6 text-sm text-cream-dim">
          <span className="live-dot mr-2 inline-block h-2 w-2 rounded-full bg-live align-middle" />
          2026 season · Week 1 kicks off Sept 10
        </p>
      </section>

      {/* Champion banner */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rise panel panel-gold p-5" style={{ animationDelay: "80ms" }}>
          <p className="kicker">Reigning Champion · 2025</p>
          <p className="font-display mt-3 text-2xl text-gold-bright">
            {champ ? champ.name : "TBD"}
          </p>
          {champ && (
            <p className="mt-1 text-sm text-cream-dim">
              {champ.ownerName} · {champ.wins}–{champ.losses} · {fmt(champ.pointsFor)} PF
            </p>
          )}
        </div>
        <div className="rise panel p-5" style={{ animationDelay: "160ms" }}>
          <LatestQuote />
        </div>
      </section>

      {/* Current standings + sidebar */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="panel p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="kicker">Standings · 2026</h2>
            <Link href="/standings" className="font-head text-sm uppercase tracking-wider text-gold hover:text-gold-bright">
              Full table →
            </Link>
          </div>
          {hasGames ? (
            <table className="mt-4 w-full text-sm">
              <tbody>
                {lines2026.slice(0, 6).map((l, i) => (
                  <tr key={l.team.id} className="border-t border-line">
                    <td className="font-mono-num w-8 py-2 text-cream-dim">{i + 1}</td>
                    <td className="py-2">
                      <span className="font-head text-base font-semibold">{l.team.name}</span>
                      <span className="ml-2 text-xs text-cream-dim">{l.team.ownerFirst}</span>
                    </td>
                    <td className="font-mono-num py-2 text-right">{l.wins}–{l.losses}</td>
                    <td className="font-mono-num hidden py-2 pl-4 text-right text-cream-dim sm:table-cell">
                      {fmt(l.pointsFor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-sm text-cream-dim">
              Nothing to see yet — first kickoff Sept 10. Check back Week 1.
            </p>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Link
            href="/pickem"
            className="block rounded border border-gold-deep bg-gradient-to-br from-raised to-felt p-5 transition-colors hover:border-gold"
          >
            <h2 className="kicker">NFL Pick&rsquo;Em</h2>
            <p className="mt-2 text-sm text-cream-dim">
              All 16 NFL games · lock at kickoff · don&rsquo;t be the guy who forgets
            </p>
            <p className="font-head mt-3 text-sm uppercase tracking-wider text-gold">Make your picks →</p>
          </Link>
          <Link
            href="/halls"
            className="block rounded border border-line bg-gradient-to-br from-raised to-felt p-5 transition-colors hover:border-gold-deep"
          >
            <h2 className="kicker">Hall of Champions</h2>
            <p className="mt-2 text-sm text-cream-dim">
              Five seasons of glory and shame, forever on record.
            </p>
            <p className="font-head mt-3 text-sm uppercase tracking-wider text-gold">View the halls →</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
