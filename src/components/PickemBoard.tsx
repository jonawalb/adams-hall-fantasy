"use client";

import { useEffect, useState } from "react";

interface TeamSide {
  abbr: string;
  name: string;
  logo?: string;
  color?: string;
}

export interface PickemGame {
  id: string;
  date: string;
  name?: string;
  home: TeamSide;
  away: TeamSide;
}

const STORAGE_KEY = "ahfl-pickem-2026-wk1";

export default function PickemBoard({ games }: { games: PickemGame[] }) {
  const [picks, setPicks] = useState<Record<string, "home" | "away">>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage is unavailable during prerender, so picks must load
    // post-hydration; the `loaded` flag stops the save effect from
    // clobbering stored picks with the initial empty state.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPicks(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  }, [picks, loaded]);

  const pick = (gameId: string, side: "home" | "away") =>
    setPicks((p) => ({ ...p, [gameId]: side }));

  const made = Object.keys(picks).length;

  return (
    <div className="space-y-4">
      <div className="panel sticky top-16 z-30 flex items-center justify-between px-4 py-2.5 backdrop-blur">
        <span className="font-head text-sm uppercase tracking-wider text-cream-dim">
          Picks made
        </span>
        <span className="font-mono-num text-lg">
          <span className={made === games.length ? "text-gold-bright" : ""}>{made}</span>
          <span className="text-cream-dim"> / {games.length}</span>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g, i) => {
          const kickoff = new Date(g.date);
          const dateStr = kickoff.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/New_York",
          });
          return (
            <div key={g.id} className="panel rise p-4" style={{ animationDelay: `${i * 40}ms` }}>
              <p className="text-xs text-cream-dim">{dateStr} ET</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["away", "home"] as const).map((side) => {
                  const t = g[side];
                  const selected = picks[g.id] === side;
                  return (
                    <button
                      key={side}
                      onClick={() => pick(g.id, side)}
                      className={`flex items-center gap-2 rounded-sm border px-3 py-2.5 text-left transition-all ${
                        selected
                          ? "border-gold bg-gold/15 text-gold-bright"
                          : "border-line bg-felt-deep/40 text-cream hover:border-line-strong"
                      }`}
                    >
                      {t.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logo} alt="" className="h-7 w-7 shrink-0" />
                      )}
                      <span>
                        <span className="font-head block text-base font-semibold leading-tight">
                          {t.abbr}
                        </span>
                        <span className="block text-[0.65rem] leading-tight text-cream-dim">
                          {side === "home" ? "Home" : "Away"}
                        </span>
                      </span>
                      {selected && <span className="ml-auto text-gold-bright">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        disabled={made < games.length}
        className="font-head w-full rounded-sm bg-gold py-3 text-base font-bold uppercase tracking-widest text-felt-deep transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        onClick={() => alert("Saved locally. League-wide submission goes live with logins.")}
      >
        {made < games.length ? `Pick all ${games.length} to submit` : "Submit picks"}
      </button>
    </div>
  );
}
