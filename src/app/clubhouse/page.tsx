import Link from "next/link";
import { loadSeason } from "@/lib/espn";
import { champion, recordBook, standings, weeklyAwards } from "@/lib/stats";
import LatestQuote from "@/components/LatestQuote";

const fmt = (n: number) => n.toFixed(1);

export default function ClubhousePage() {
  const s2025 = loadSeason(2025)!;
  const champ = champion(s2025);
  const lines2025 = standings(s2025);
  const luckiest = [...lines2025].sort((a, b) => b.luck - a.luck)[0];
  const robbed = [...lines2025].sort((a, b) => a.luck - b.luck)[0];
  const finalWeekAwards = weeklyAwards(s2025, s2025.regSeasonWeeks);
  const records = recordBook([s2025]).slice(0, 3);

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
          2026 season · Draft complete · Week 1 kicks off Sept 10
        </p>
      </section>

      {/* Champion + luck */}
      <section className="grid gap-4 sm:grid-cols-3">
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
          <p className="kicker text-moss">Luckiest Team · 2025</p>
          <p className="font-head mt-3 text-xl font-semibold">{luckiest.team.name}</p>
          <p className="mt-1 text-sm text-cream-dim">
            {luckiest.wins}–{luckiest.losses} actual vs {luckiest.allPlayWins}–{luckiest.allPlayLosses} all-play
          </p>
        </div>
        <div className="rise panel p-5" style={{ animationDelay: "240ms" }}>
          <p className="kicker text-blood">Most Robbed · 2025</p>
          <p className="font-head mt-3 text-xl font-semibold">{robbed.team.name}</p>
          <p className="mt-1 text-sm text-cream-dim">
            {robbed.wins}–{robbed.losses} actual vs {robbed.allPlayWins}–{robbed.allPlayLosses} all-play
          </p>
        </div>
      </section>

      {/* Standings preview + sidebar */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="panel p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="kicker">Final Standings · 2025</h2>
            <Link href="/standings" className="font-head text-sm uppercase tracking-wider text-gold hover:text-gold-bright">
              Full table →
            </Link>
          </div>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {lines2025.slice(0, 6).map((l, i) => (
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
        </div>

        <div className="space-y-4 lg:col-span-2">
          <LatestQuote />
          <Link
            href="/pickem"
            className="block rounded border border-gold-deep bg-gradient-to-br from-raised to-felt p-5 transition-colors hover:border-gold"
          >
            <h2 className="kicker">Week 1 Pick&rsquo;Em is open</h2>
            <p className="mt-2 text-sm text-cream-dim">
              All 16 NFL games · lock at kickoff · don&rsquo;t be the guy who forgets
            </p>
            <p className="font-head mt-3 text-sm uppercase tracking-wider text-gold">Make your picks →</p>
          </Link>
        </div>
      </section>

      {/* Records + final week awards */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="kicker">From the Record Book</h2>
            <Link href="/records" className="font-head text-sm uppercase tracking-wider text-gold hover:text-gold-bright">
              All records →
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {records.map((r) => (
              <li key={r.label} className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <div>
                  <p className="font-head font-semibold">{r.label}</p>
                  <p className="text-xs text-cream-dim">{r.holder} · {r.detail}</p>
                </div>
                <span className={`font-mono-num text-lg ${r.shame ? "text-blood" : "text-gold-bright"}`}>
                  {r.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {finalWeekAwards && (
          <div className="panel p-5">
            <h2 className="kicker">Week {finalWeekAwards.week} Awards · 2025</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="border-t border-line pt-3">
                🏆 <span className="font-head font-semibold">Top score</span> — {finalWeekAwards.topScore.team.name}{" "}
                <span className="font-mono-num text-gold-bright">{fmt(finalWeekAwards.topScore.pts)}</span>
              </li>
              <li className="border-t border-line pt-3">
                🚽 <span className="font-head font-semibold">Toilet bowl</span> — {finalWeekAwards.toiletBowl.team.name}{" "}
                <span className="font-mono-num text-blood">{fmt(finalWeekAwards.toiletBowl.pts)}</span>
              </li>
              {finalWeekAwards.narrowestWin && (
                <li className="border-t border-line pt-3">
                  😅 <span className="font-head font-semibold">Narrowest escape</span> —{" "}
                  {finalWeekAwards.narrowestWin.game.winner === "HOME"
                    ? finalWeekAwards.narrowestWin.home.name
                    : finalWeekAwards.narrowestWin.away.name}{" "}
                  by <span className="font-mono-num">{fmt(finalWeekAwards.narrowestWin.margin)}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
