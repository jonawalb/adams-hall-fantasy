import { availableSeasons, loadSeason } from "@/lib/espn";
import { WeekBlunders, seasonBlunders } from "@/lib/blunders";

const f1 = (n: number) => n.toFixed(1);

function Week({ w, open }: { w: WeekBlunders; open?: boolean }) {
  const b = w.blunderOfWeek;
  return (
    <details open={open} className="panel p-4">
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-xl text-gold-bright">Week {w.week}</span>
        {b && (
          <span className="text-xs text-cream-dim">
            Blunder of the week: <span className="font-head font-semibold text-cream">{b.owner}</span> left {f1(b.left)} on the bench
          </span>
        )}
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="kicker text-blood">Bench blunders · points left on the bench</p>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {w.bench.map((t, i) => (
                <tr key={t.teamId} className="border-t border-line align-top">
                  <td className="font-mono-num w-6 py-1.5 text-cream-dim">{i + 1}</td>
                  <td className="py-1.5">
                    <span className="font-head font-semibold">{t.owner}</span>
                    <span className="ml-1 text-xs text-cream-dim">{t.team}</span>
                    {t.worstCall && (
                      <p className="mt-0.5 text-xs text-cream-dim">
                        Started {t.worstCall.started.name} ({f1(t.worstCall.started.points)}) over {t.worstCall.benched.name} ({f1(t.worstCall.benched.points)})
                      </p>
                    )}
                  </td>
                  <td className="font-mono-num py-1.5 text-right">
                    <span className={t.left >= 20 ? "text-blood" : ""}>{f1(t.left)}</span>
                    <span className="block text-[0.65rem] text-cream-dim">{f1(t.actual)} of {f1(t.optimal)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="kicker">Waiver wire · adds this week and what they scored</p>
          {w.waivers.length ? (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {w.waivers.map((x, i) => (
                  <tr key={`${x.teamId}-${x.player}-${i}`} className="border-t border-line">
                    <td className="py-1.5">
                      <span className="font-head font-semibold">{x.owner}</span>
                      <span className="ml-1 text-xs text-cream-dim">{x.type.toLowerCase()} add</span>
                      <p className="text-xs text-cream-dim">
                        {x.player}
                        {x.pos ? ` · ${x.pos}` : ""}
                      </p>
                    </td>
                    <td className="font-mono-num py-1.5 text-right">
                      {x.points === null ? <span className="text-cream-dim">off roster</span> : <span className={x.points <= 3 ? "text-blood" : ""}>{f1(x.points)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-cream-dim">No waiver moves recorded.</p>
          )}
        </div>
      </div>
    </details>
  );
}

export default function BadDecisionsPage() {
  const seasons = availableSeasons()
    .map((y) => loadSeason(y)!)
    .map((s) => ({ season: s, weeks: seasonBlunders(s) }))
    .filter((x) => x.weeks.length)
    .sort((a, b) => b.season.year - a.season.year);

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">Every Tuesday, receipts</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">BAD DECISIONS</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Points left on the bench, the single worst start-sit call, and every waiver add graded by what
          it actually scored. Built from the lineup archive the site pulls nightly.
        </p>
      </header>
      {seasons.length === 0 && <p className="text-sm text-cream-dim">No completed weeks archived yet. Check back Tuesday.</p>}
      {seasons.map(({ season, weeks }, si) => (
        <section key={season.year} className="space-y-3">
          <h2 className="kicker">{season.year} season</h2>
          {weeks.map((w, i) => (
            <Week key={w.week} w={w} open={si === 0 && i === 0} />
          ))}
        </section>
      ))}
    </div>
  );
}
