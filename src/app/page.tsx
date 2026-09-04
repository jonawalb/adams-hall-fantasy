import brethrenData from "../../data/brethren.json";
import { availableSeasons, loadSeason } from "@/lib/espn";
import { careers } from "@/lib/brethren";
import TuesdayTape from "@/components/TuesdayTape";
import RecapCard from "@/components/RecapCard";

const f1 = (n: number) => n.toFixed(1);
type Extra = { bio: string; photo: string };
const extras = brethrenData as unknown as Record<string, Extra | string>;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function BrethrenPage() {
  const seasons = availableSeasons().map((y) => loadSeason(y)!);
  const lines = careers(seasons).sort((a, b) => a.firstSeason - b.firstSeason || a.name.localeCompare(b.name));

  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <TuesdayTape />
        <RecapCard />
      </div>

      <section className="space-y-4">
        <header className="rise">
          <p className="kicker">Est. 2021 · Ten Franchises · One Group Chat</p>
          <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">ABOUT THE BRETHREN</h1>
          <p className="mt-2 max-w-2xl text-sm text-cream-dim">
            The ten men who make this league what it is, which is a problem.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lines.map((c, i) => {
            const extra = extras[c.ownerId];
            const bio = typeof extra === "object" ? extra.bio : "";
            const photo = typeof extra === "object" ? extra.photo : "";
            const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <article key={c.ownerId} className="panel rise flex gap-4 p-5" style={{ animationDelay: `${i * 60}ms` }}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${BASE}${photo}`} alt={c.name} className="h-20 w-20 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="font-display flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border border-gold-deep bg-felt-deep text-2xl text-gold">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-head text-lg font-semibold leading-tight">{c.name}</p>
                  <p className="truncate text-xs text-cream-dim">{c.team}</p>
                  <p className="font-mono-num mt-2 text-sm">
                    {c.wins}–{c.losses}
                    {c.ties ? `–${c.ties}` : ""}
                    <span className="text-cream-dim"> · since {c.firstSeason} · {f1(c.pointsFor)} PF</span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                    {c.titles.length > 0 && <span className="text-gold-bright">🏆 {c.titles.join(", ")}</span>}
                    {c.sackos.length > 0 && <span className="text-blood">💩 {c.sackos.join(", ")}</span>}
                    {c.playoffs > 0 && <span className="text-cream-dim">{c.playoffs}× playoffs</span>}
                  </p>
                  <p className={`mt-2 text-sm leading-snug ${bio ? "" : "italic text-cream-dim/70"}`}>
                    {bio || "Bio pending. The commissioner is collecting dirt."}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
