"use client";

import { useState } from "react";

export interface MatchupSide {
  name: string;
  owner: string;
  pts: number;
  won: boolean;
}

export interface MatchupView {
  week: number;
  label: string;
  playoff: boolean;
  away: MatchupSide;
  home: MatchupSide;
  margin: number;
}

const fmt = (n: number) => n.toFixed(1);

export default function MatchupBrowser({ matchups }: { matchups: MatchupView[] }) {
  const weeks = [...new Set(matchups.map((m) => m.week))].sort((a, b) => a - b);
  const [week, setWeek] = useState(weeks[weeks.length - 1]);
  const games = matchups.filter((m) => m.week === week);

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={`font-head rounded-sm px-2.5 py-1 text-sm font-semibold ${
              w === week ? "bg-gold text-felt-deep" : "bg-raised text-cream-dim hover:text-cream"
            }`}
          >
            {matchups.find((m) => m.week === w)?.label}
          </button>
        ))}
      </nav>

      <section className="grid gap-4 sm:grid-cols-2">
        {games.map((g, i) => (
          <div
            key={`${g.week}-${i}`}
            className={`panel rise p-5 ${g.playoff ? "panel-gold" : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {g.playoff && <p className="kicker mb-3">Winners Bracket</p>}
            {[g.away, g.home].map((side, j) => (
              <div key={j} className={`flex items-baseline justify-between py-1 ${side.won ? "" : "opacity-60"}`}>
                <div>
                  <span className="font-head text-lg font-semibold">{side.name}</span>
                  <span className="ml-2 text-xs text-cream-dim">{side.owner}</span>
                </div>
                <span className={`font-mono-num text-xl ${side.won ? "text-gold-bright" : ""}`}>
                  {fmt(side.pts)}
                </span>
              </div>
            ))}
            <p className="mt-2 border-t border-line pt-2 text-xs text-cream-dim">
              Margin: <span className="font-mono-num">{fmt(g.margin)}</span>
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
