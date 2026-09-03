import { availableSeasons, loadSeason } from "@/lib/espn";
import { RecordEntry, recordBook } from "@/lib/stats";
import { Scope, scopedSeasons } from "@/lib/scope";
import { playoffRecords } from "@/lib/playoffs";
import SubNav from "@/components/SubNav";

const TABS = [
  { href: "/records", label: "All-time" },
  { href: "/records/regular", label: "Regular Season" },
  { href: "/records/playoffs", label: "Playoffs" },
];

function Grid({ entries, shame }: { entries: RecordEntry[]; shame?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map((r, i) => (
        <div key={r.label} className={`panel rise p-5 ${shame ? "border-blood/40" : "panel-gold"}`} style={{ animationDelay: `${i * 70}ms` }}>
          <p className={`kicker ${shame ? "text-blood" : ""}`}>{r.label}</p>
          <p className={`font-mono-num mt-2 text-3xl ${shame ? "text-blood" : "text-gold-bright"}`}>{r.value}</p>
          <p className="font-head mt-1 text-lg font-semibold">{r.holder}</p>
          <p className="mt-1 text-xs text-cream-dim">{r.detail}</p>
        </div>
      ))}
    </div>
  );
}

export default function RecordsView({ scope, current }: { scope: Scope; current: string }) {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const scoped = scopedSeasons(seasons, scope);
  const records = recordBook(scoped).filter((r) => scope !== "playoffs" || r.label !== "Most points, season");
  const champ = scope === "playoffs" ? playoffRecords(seasons) : [];
  const glory = [...champ.filter((r) => !r.shame), ...records.filter((r) => !r.shame)];
  const shame = [...champ.filter((r) => r.shame), ...records.filter((r) => r.shame)];
  const kicker = { all: "All games, 2021–present", regular: "Regular season only, 2021–present", playoffs: "Postseason weeks · championships first" }[scope];
  const title = { all: "THE RECORD BOOK", regular: "REGULAR SEASON RECORDS", playoffs: "PLAYOFF RECORDS" }[scope];

  return (
    <div className="space-y-10">
      <header className="rise space-y-4">
        <div>
          <p className="kicker">Etched in Brass · {kicker}</p>
          <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">{title}</h1>
        </div>
        <SubNav items={TABS} current={current} />
      </header>
      <section>
        <h2 className="kicker mb-4">Hall of Fame</h2>
        <Grid entries={glory} />
      </section>
      <section>
        <h2 className="kicker mb-4 text-blood">Hall of Shame</h2>
        <Grid entries={shame} shame />
      </section>
      <p className="text-xs text-cream-dim">Records rebuild automatically as seasons sync.</p>
    </div>
  );
}
