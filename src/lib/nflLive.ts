"use client";

// Live NFL scoreboard straight from ESPN in the browser (CORS is open), so the
// pick'em never waits on a GitHub Actions cron to learn the new week or a
// final score. The build-time data/nfl/slate.json stays as the fallback.
import { useEffect, useState } from "react";
import type { Game, GameOdds, Slate, WeekSlate } from "./pickem";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

/* eslint-disable @typescript-eslint/no-explicit-any */
function side(c: any) {
  return {
    abbr: c.team.abbreviation,
    name: c.team.displayName,
    logo: c.team.logo,
    color: c.team.color,
    score: Number(c.score ?? 0),
  };
}

function odds(c: any): GameOdds | undefined {
  const o = c.odds?.[0];
  if (!o) return undefined;
  const ml = (s: string) => o.moneyline?.[s]?.close?.odds ?? o.moneyline?.[s]?.open?.odds ?? null;
  return {
    provider: o.provider?.displayName ?? null,
    details: o.details ?? null,
    overUnder: o.overUnder ?? null,
    moneyline: { home: ml("home"), away: ml("away") },
  };
}

function normalize(json: any): WeekSlate | null {
  if (json?.season?.type !== 2) return null; // regular season only
  const games: Game[] = (json.events ?? []).map((e: any) => {
    const c = e.competitions[0];
    const home = c.competitors.find((x: any) => x.homeAway === "home");
    const away = c.competitors.find((x: any) => x.homeAway === "away");
    const completed = Boolean(c.status?.type?.completed);
    let winner: Game["winner"] = null;
    if (completed) winner = home.winner ? "home" : away.winner ? "away" : null;
    return {
      id: e.id,
      date: e.date,
      name: e.shortName ?? e.name,
      state: c.status?.type?.state ?? "pre",
      completed,
      winner,
      detail: c.status?.type?.shortDetail ?? "",
      home: side(home),
      away: side(away),
      odds: odds(c),
    };
  });
  games.sort((a, b) => a.date.localeCompare(b.date));
  return { season: json.season.year, week: json.week.number, games };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchWeek(season?: number, week?: number): Promise<WeekSlate | null> {
  const url = week ? `${BASE}?seasontype=2&dates=${season}&week=${week}` : BASE;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return normalize(await res.json());
}

/** Overlay a fresh week onto the slate, keeping odds ESPN drops after the final. */
function merge(slate: Slate, fresh: WeekSlate): Slate {
  const prior = slate.weeks[fresh.week]?.games ?? [];
  const games = fresh.games.map((g) => (g.odds ? g : { ...g, odds: prior.find((p) => p.id === g.id)?.odds }));
  return { ...slate, weeks: { ...slate.weeks, [fresh.week]: { ...fresh, games } } };
}

/**
 * The build-time slate, upgraded in the browser with ESPN's current week and
 * the week before it. Refreshes every 2 minutes so scores and locks stay live.
 */
export function useLiveSlate(base: Slate): Slate {
  const [slate, setSlate] = useState(base);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 120_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cur = await fetchWeek();
        if (!alive || !cur || cur.season !== base.season) return;
        const prev = cur.week > 1 ? await fetchWeek(cur.season, cur.week - 1) : null;
        if (!alive) return;
        setSlate((s) => {
          let next = merge(s, cur);
          if (prev) next = merge(next, prev);
          return { ...next, currentWeek: Math.max(cur.week, s.currentWeek), fetchedAt: new Date().toISOString() };
        });
      } catch {
        // offline or ESPN hiccup: keep the build-time slate
      }
    })();
    return () => {
      alive = false;
    };
  }, [base.season, tick]);
  return slate;
}

/** Earliest kickoff for one week, fetched live when the build-time slate lacks it. */
export function useWeekFirstKickoff(season: number, week: number, known: string | null): string | null {
  const [fetched, setFetched] = useState<Record<number, string | null>>({});
  useEffect(() => {
    if (known || week in fetched) return;
    let alive = true;
    fetchWeek(season, week)
      .then((w) => {
        if (!alive) return;
        const first = w?.games.map((g) => g.date).sort()[0] ?? null;
        setFetched((f) => ({ ...f, [week]: first }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [season, week, known, fetched]);
  return known ?? fetched[week] ?? null;
}
