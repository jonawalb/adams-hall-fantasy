import { availableSeasons, loadSeason } from "@/lib/espn";
import { h2hMatrix } from "@/lib/stats";
import { allSeries, currentOwners, ownerCards } from "@/lib/rivalry";
import RivalryCards from "@/components/RivalryCards";
import SeriesPicker from "@/components/SeriesPicker";

export default function RivalriesPage() {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const cells = h2hMatrix(seasons);
  const rivalryOwners = currentOwners(seasons);
  const everySeries = allSeries(seasons, rivalryOwners);
  const cards = ownerCards(everySeries, rivalryOwners);
  // Owner roster from the newest season (franchises are permanent).
  const owners = seasons[seasons.length - 1].teams.map((t) => ({
    id: t.ownerId,
    first: t.ownerFirst,
    team: t.name,
  }));

  const pairs: { a: (typeof owners)[0]; b: (typeof owners)[0]; wins: number; losses: number; games: number }[] = [];
  for (let i = 0; i < owners.length; i++) {
    for (let j = i + 1; j < owners.length; j++) {
      const c = cells.get(`${owners[i].id}|${owners[j].id}`);
      if (!c) continue;
      pairs.push({ a: owners[i], b: owners[j], wins: c.wins, losses: c.losses, games: c.wins + c.losses + c.ties });
    }
  }
  const owned = [...pairs].sort((x, y) => Math.abs(y.wins - y.losses) - Math.abs(x.wins - x.losses))[0];
  const deadlocked = [...pairs].filter((p) => p.games >= 2).sort(
    (x, y) => Math.abs(x.wins - x.losses) - Math.abs(y.wins - y.losses) || y.games - x.games
  )[0];

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="kicker">Head-to-Head · All seasons (2021–present)</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">RIVALRIES</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Read across: the row owner&rsquo;s record against each column. Five full seasons of
          grudges, counted from the 2021 founding.
        </p>
      </header>

      {(owned || deadlocked) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {owned && (
            <div className="panel panel-gold rise p-5">
              <p className="kicker">Most Owned</p>
              <p className="font-head mt-2 text-lg font-semibold">
                {owned.wins > owned.losses ? owned.a.first : owned.b.first} owns{" "}
                {owned.wins > owned.losses ? owned.b.first : owned.a.first}
              </p>
              <p className="font-mono-num mt-1 text-2xl text-gold-bright">
                {Math.max(owned.wins, owned.losses)}–{Math.min(owned.wins, owned.losses)}
              </p>
            </div>
          )}
          {deadlocked && (
            <div className="panel rise p-5" style={{ animationDelay: "100ms" }}>
              <p className="kicker text-blood">Dead Heat</p>
              <p className="font-head mt-2 text-lg font-semibold">
                {deadlocked.a.first} vs {deadlocked.b.first}
              </p>
              <p className="font-mono-num mt-1 text-2xl">
                {deadlocked.wins}–{deadlocked.losses}
                <span className="ml-2 text-sm text-cream-dim">({deadlocked.games} games)</span>
              </p>
            </div>
          )}
        </section>
      )}

      <section className="panel rise overflow-x-auto p-5">
        <table className="w-full min-w-[720px] border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className="p-2" />
              {owners.map((o) => (
                <th key={o.id} className="font-head p-2 text-xs uppercase tracking-wider text-cream-dim">
                  {o.first}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {owners.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <th className="font-head p-2 text-left text-xs uppercase tracking-wider text-cream-dim">
                  {row.first}
                </th>
                {owners.map((col) => {
                  if (row.id === col.id)
                    return <td key={col.id} className="bg-felt-deep/60 p-2 text-cream-dim">—</td>;
                  const c = cells.get(`${row.id}|${col.id}`);
                  if (!c || c.wins + c.losses + c.ties === 0)
                    return <td key={col.id} className="p-2 text-cream-dim/50">·</td>;
                  const lead = c.wins > c.losses;
                  const trail = c.wins < c.losses;
                  return (
                    <td
                      key={col.id}
                      className={`font-mono-num p-2 ${lead ? "text-gold-bright" : trail ? "text-blood" : "text-cream-dim"}`}
                      title={`${row.first} vs ${col.first}: ${c.wins}-${c.losses}${c.ties ? `-${c.ties}` : ""} · PF ${c.pointsFor.toFixed(1)}`}
                    >
                      {c.wins}–{c.losses}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <RivalryCards cards={cards} />
      <SeriesPicker owners={rivalryOwners} all={everySeries} />
    </div>
  );
}
