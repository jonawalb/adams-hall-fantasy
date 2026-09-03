import snapshot from "../../../data/cfb.json";
import { CfbGame, CfbSnapshot, bitchBoyBowl, carnage, formatKickoffET, loserOf, margin, total, winnerOf } from "@/lib/cfb";

const data = snapshot as unknown as CfbSnapshot;

function Team({ s, bold }: { s: CfbGame["home"]; bold?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${bold ? "text-gold-bright" : ""}`}>
      {s.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo} alt="" className="h-5 w-5" />
      )}
      {s.rank && <span className="font-mono-num text-xs text-cream-dim">#{s.rank}</span>}
      <span className="font-head font-semibold">{s.short}</span>
    </span>
  );
}

function GameRow({ g }: { g: CfbGame }) {
  const live = g.state === "in";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 text-sm">
      <div className="flex items-center gap-2">
        <Team s={g.away} bold={g.completed && g.away.winner} />
        <span className="text-cream-dim">at</span>
        <Team s={g.home} bold={g.completed && g.home.winner} />
        {g.home.rank && g.away.rank && (
          <span className="rounded-sm bg-gold/20 px-1.5 text-[0.6rem] uppercase tracking-wider text-gold-bright">Ranked vs Ranked</span>
        )}
      </div>
      <div className="font-mono-num flex items-center gap-3 text-xs text-cream-dim">
        {g.completed || live ? (
          <span className={live ? "live-dot text-gold" : "text-cream"}>
            {g.away.score}–{g.home.score} {live ? "" : "F"}
          </span>
        ) : (
          <span>{formatKickoffET(g.date)} ET</span>
        )}
        {g.spread && !g.completed && <span>{g.spread}</span>}
        {g.broadcast && !g.completed && <span>{g.broadcast}</span>}
      </div>
    </div>
  );
}

function Award({ label, g, line }: { label: string; g: CfbGame | null; line: (g: CfbGame) => string }) {
  return (
    <div className="panel p-4">
      <p className="kicker">{label}</p>
      {g ? (
        <>
          <p className="font-head mt-2 text-lg font-semibold">
            {winnerOf(g).short} {winnerOf(g).score}, {loserOf(g).short} {loserOf(g).score}
          </p>
          <p className="mt-1 text-xs text-cream-dim">{line(g)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-cream-dim">Nothing yet. Kickoff pending.</p>
      )}
    </div>
  );
}

export default function CfbPage() {
  const played = [...data.lastWeek.filter((g) => g.completed), ...data.thisWeek.filter((g) => g.completed)];
  const awards = carnage(played);
  const bowl = bitchBoyBowl(data.thisWeek);
  const ranked = data.thisWeek.filter((g) => g.home.rank || g.away.rank);
  const rest = data.thisWeek.filter((g) => !g.home.rank && !g.away.rank);
  const updated = new Date(data.fetchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", timeZone: "America/New_York" });

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="kicker">Saturday Sickos · {data.season} · Week {data.week} · updated {updated} ET</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">COLLEGE FOOTBALL</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          For no reason other than it&rsquo;s Saturday. {data.poll}, the FBS slate, and last week&rsquo;s
          carnage, refreshed nightly from ESPN. Lines are for entertainment purposes, like this league.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Award label="Upset of the Week" g={awards.upset} line={(g) => `#${loserOf(g).rank} went down${winnerOf(g).rank ? ` to #${winnerOf(g).rank}` : " to an unranked team"}. Somebody's AD is making calls.`} />
        <Award label="Biggest Beatdown" g={awards.blowout} line={(g) => `Margin of ${margin(g)}. The bus left at halftime.`} />
        <Award label="Shootout" g={awards.shootout} line={(g) => `${total(g)} combined points. Defensive coordinators were not consulted.`} />
        <Award label="Nail-Biter" g={awards.nailBiter} line={(g) => `Decided by ${margin(g)}. Somebody's kicker is sleeping fine, somebody's isn't.`} />
        <Award label="Cupcake Special" g={awards.cupcake} line={(g) => `#${winnerOf(g).rank} paid ${loserOf(g).short} to show up and lose by ${margin(g)}. Money well spent.`} />
        <div className="panel panel-gold p-4">
          <p className="kicker text-blood">Bitch Boy Bowl of the Week</p>
          {bowl ? (
            <>
              <p className="font-head mt-2 text-lg font-semibold">
                {bowl.away.short} ({bowl.away.record}) at {bowl.home.short} ({bowl.home.record})
              </p>
              <p className="mt-1 text-xs text-cream-dim">
                {formatKickoffET(bowl.date)} ET{bowl.broadcast ? ` · ${bowl.broadcast}` : ""}. The two worst records on the slate meet. Someone has to win. Neither deserves to.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-cream-dim">Awaiting a suitably bleak matchup.</p>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="panel p-4 lg:col-span-2">
          <p className="kicker">{data.poll}</p>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {data.rankings.map((r) => {
                const move = r.previous ? r.previous - r.rank : 0;
                return (
                  <tr key={r.rank} className="border-t border-line">
                    <td className="font-mono-num w-8 py-1.5 text-cream-dim">{r.rank}</td>
                    <td className="py-1.5">
                      <span className="inline-flex items-center gap-2">
                        {r.logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.logo} alt="" className="h-5 w-5" />
                        )}
                        <span className="font-head font-semibold">{r.team}</span>
                        <span className="hidden text-xs text-cream-dim sm:inline">{r.mascot}</span>
                      </span>
                    </td>
                    <td className="font-mono-num py-1.5 text-right text-xs text-cream-dim">{r.record}</td>
                    <td className={`font-mono-num w-10 py-1.5 text-right text-xs ${move > 0 ? "text-gold-bright" : move < 0 ? "text-blood" : "text-cream-dim"}`}>
                      {r.previous === null ? "NEW" : move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="space-y-6 lg:col-span-3">
          <div className="panel p-4">
            <p className="kicker">This Week · Ranked Teams</p>
            {ranked.map((g) => (
              <GameRow key={g.id} g={g} />
            ))}
          </div>
          <details className="panel p-4">
            <summary className="kicker cursor-pointer">The Other {rest.length} Games</summary>
            {rest.map((g) => (
              <GameRow key={g.id} g={g} />
            ))}
          </details>
        </section>
      </div>
    </div>
  );
}
