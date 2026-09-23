import { loadLeagueLegacy } from "@/lib/league-legacy";

const sign = (n: number) => (n > 0 ? "+" : "") + n.toFixed(1);
const fmt = (n: number) => n.toFixed(1);
const fmtVal = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2);

const VERSUS_LABELS: Record<string, string> = {
  closest_game_ever: "Closest Game Ever",
  biggest_blowout: "Biggest Blowout",
  highest_scoring_game: "Highest Scoring Game",
  most_lopsided_rivalry: "Most Lopsided Rivalry",
  most_matchups: "Most Matchups",
  most_contested: "Most Contested",
  closest_long_running_series: "Closest Long-Running Series",
  longest_active_streak: "Longest Active Streak",
};

export default function AnalyticsPage() {
  const ll = loadLeagueLegacy();

  return (
    <div className="space-y-14">
      <header className="rise">
        <p className="kicker">League Legacy · Deep Cuts</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">
          ANALYTICS
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Advanced metrics from five seasons of Adams Hall history — playoff
          luck, draft value, transaction skill, and head-to-head superlatives.
        </p>
      </header>

      {/* ── Playoff Analytics ─────────────────────────────────── */}
      <section className="space-y-6">
        <header className="rise">
          <p className="kicker">Postseason</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">
            PLAYOFF ANALYTICS
          </h2>
        </header>

        {/* Expected Wins */}
        <div className="panel rise overflow-x-auto p-5">
          <p className="kicker mb-3">
            Expected Wins vs. Actual — did the bracket help or hurt?
          </p>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="font-head text-left text-xs uppercase tracking-wider text-cream-dim">
                <th className="pb-2">Manager</th>
                <th className="pb-2 text-right">Actual W</th>
                <th className="pb-2 text-right">Expected W</th>
                <th className="pb-2 text-right">+/−</th>
              </tr>
            </thead>
            <tbody>
              {ll.playoff_expected_wins.map((p, i) => (
                <tr
                  key={p.name}
                  className="border-t border-line"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="font-head py-2 font-semibold">{p.name}</td>
                  <td className="font-mono-num py-2 text-right">{p.actual_w}</td>
                  <td className="font-mono-num py-2 text-right text-cream-dim">
                    {p.expected_w}
                  </td>
                  <td
                    className={`font-mono-num py-2 text-right font-semibold ${
                      p.diff > 0
                        ? "text-gold-bright"
                        : p.diff < 0
                          ? "text-blood"
                          : "text-cream-dim"
                    }`}
                  >
                    {sign(p.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Playoff Scoring Leaders + Streaks side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel rise p-5">
            <p className="kicker mb-3">All-Time Playoff Scoring</p>
            <ol className="space-y-2 text-sm">
              {ll.playoff_scoring.map((p, i) => (
                <li
                  key={p.name}
                  className="flex items-baseline justify-between border-b border-line/50 pb-1.5 last:border-0"
                >
                  <span>
                    <span className="font-mono-num mr-2 text-cream-dim">
                      {i + 1}.
                    </span>
                    <span className="font-head font-semibold">{p.name}</span>
                  </span>
                  <span className="font-mono-num text-gold-bright">
                    {fmt(p.total_pts)}
                    <span className="ml-2 text-xs text-cream-dim">
                      ({fmt(p.avg_per_season)} avg)
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="panel rise p-5" style={{ animationDelay: "70ms" }}>
            <p className="kicker mb-3">Playoff Appearance Streaks</p>
            <ol className="space-y-2 text-sm">
              {ll.playoff_appearance_streaks.map((s, i) => (
                <li
                  key={`${s.name}-${s.seasons}`}
                  className="flex items-baseline justify-between border-b border-line/50 pb-1.5 last:border-0"
                >
                  <span>
                    <span className="font-head font-semibold">{s.name}</span>
                    {s.active && (
                      <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-gold-bright">
                        active
                      </span>
                    )}
                  </span>
                  <span className="font-mono-num text-cream-dim">
                    {s.streak} seasons · {s.seasons}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Versus Superlatives ────────────────────────────────── */}
      <section className="space-y-6">
        <header className="rise">
          <p className="kicker">Head-to-Head</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">
            VERSUS SUPERLATIVES
          </h2>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(ll.versus_records).map(([key, value], i) => (
            <div
              key={key}
              className="panel panel-gold rise p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <p className="kicker">
                {VERSUS_LABELS[key] ?? key.replace(/_/g, " ")}
              </p>
              <p className="font-head mt-2 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transaction Rankings ───────────────────────────────── */}
      <section className="space-y-6">
        <header className="rise">
          <p className="kicker">In-Season Moves</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">
            TRANSACTION RANKINGS
          </h2>
        </header>

        {/* Headline stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Transactions",
              value: ll.transaction_stats.total_transactions.toLocaleString(),
            },
            {
              label: "Waiver Moves",
              value: ll.transaction_stats.total_waiver_moves.toLocaleString(),
            },
            { label: "Trades", value: ll.transaction_stats.total_trades.toString() },
          ].map((s, i) => (
            <div
              key={s.label}
              className="panel panel-gold rise p-5 text-center"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <p className="kicker">{s.label}</p>
              <p className="font-mono-num mt-2 text-3xl text-gold-bright">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Waiver + Manager rankings side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel rise p-5">
            <p className="kicker mb-3">
              Waiver Wire Value{" "}
              <span className="text-cream-dim">(avg/season)</span>
            </p>
            <ol className="space-y-2 text-sm">
              {ll.transaction_stats.waiver_rankings.map((r, i) => (
                <li
                  key={r.name}
                  className="flex items-baseline justify-between border-b border-line/50 pb-1.5 last:border-0"
                >
                  <span>
                    <span className="font-mono-num mr-2 text-cream-dim">
                      {r.rank}.
                    </span>
                    <span className="font-head font-semibold">{r.name}</span>
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      r.value >= 0 ? "text-gold-bright" : "text-blood"
                    }`}
                  >
                    {fmtVal(r.value)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="panel rise p-5" style={{ animationDelay: "70ms" }}>
            <p className="kicker mb-3">
              Overall Manager Value{" "}
              <span className="text-cream-dim">(avg/season)</span>
            </p>
            <ol className="space-y-2 text-sm">
              {ll.transaction_stats.manager_rankings.map((r, i) => (
                <li
                  key={r.name}
                  className="flex items-baseline justify-between border-b border-line/50 pb-1.5 last:border-0"
                >
                  <span>
                    <span className="font-mono-num mr-2 text-cream-dim">
                      {r.rank}.
                    </span>
                    <span className="font-head font-semibold">{r.name}</span>
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      r.value >= 0 ? "text-gold-bright" : "text-blood"
                    }`}
                  >
                    {fmtVal(r.value)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Draft Steals & Busts ───────────────────────────────── */}
      <section className="space-y-6">
        <header className="rise">
          <p className="kicker">Draft Day</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">
            DRAFT STEALS &amp; BUSTS
          </h2>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Steals */}
          <div className="panel panel-gold rise p-5">
            <p className="kicker mb-3">Best Picks All-Time</p>
            <ol className="space-y-3 text-sm">
              {ll.draft_records.top_picks_all_time.map((p, i) => (
                <li
                  key={`${p.player}-${p.year}`}
                  className="border-b border-line/50 pb-2 last:border-0"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-head font-semibold">
                      {p.player}{" "}
                      <span className="text-xs text-cream-dim">
                        {p.position} · {p.team}
                      </span>
                    </span>
                    <span className="font-mono-num text-lg text-gold-bright">
                      +{p.value.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    {p.year} · Rd {p.round_pick} · {p.franchise}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Busts */}
          <div
            className="panel rise border-blood/40 p-5"
            style={{ animationDelay: "70ms" }}
          >
            <p className="kicker text-blood mb-3">Worst Picks All-Time</p>
            <ol className="space-y-3 text-sm">
              {ll.draft_records.worst_picks_all_time.map((p, i) => (
                <li
                  key={`${p.player}-${p.year}`}
                  className="border-b border-line/50 pb-2 last:border-0"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-head font-semibold">
                      {p.player}{" "}
                      <span className="text-xs text-cream-dim">
                        {p.position} · {p.team}
                      </span>
                    </span>
                    <span className="font-mono-num text-lg text-blood">
                      {p.value.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    {p.year} · Rd {p.round_pick} · {p.franchise}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Draft Rankings by Member */}
        <div className="panel rise p-5">
          <p className="kicker mb-3">
            All-Time Draft Rankings{" "}
            <span className="text-cream-dim">(avg pick value)</span>
          </p>
          <ol className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {ll.draft_rankings.map((r) => (
              <li
                key={r.name}
                className="flex items-baseline justify-between border-b border-line/50 pb-1.5"
              >
                <span>
                  <span className="font-mono-num mr-2 text-cream-dim">
                    #{r.rank}
                  </span>
                  <span className="font-head font-semibold">{r.name}</span>
                </span>
                <span
                  className={`font-mono-num font-semibold ${
                    r.value >= 0 ? "text-gold-bright" : "text-blood"
                  }`}
                >
                  {fmtVal(r.value)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
