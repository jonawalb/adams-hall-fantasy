"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import {
  Game,
  Member,
  PickRow,
  Side,
  Slate,
  formatKickoff,
  hasKickedOff,
} from "@/lib/pickem";
import PickemLeaderboard from "@/components/PickemLeaderboard";

const PREVIEW_ID = "preview";
const PREVIEW_MEMBERS: Member[] = [{ id: PREVIEW_ID, display_name: "You (preview)" }];
const noopSubscribe = () => () => {};

export default function PickemBoard({ slate }: { slate: Slate }) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const weekNumbers = useMemo(
    () => Object.keys(slate.weeks).map(Number).sort((a, b) => a - b),
    [slate.weeks],
  );
  const [week, setWeek] = useState(slate.currentWeek);
  const games = slate.weeks[week]?.games ?? [];
  const isCurrent = week === slate.currentWeek;

  const [picks, setPicks] = useState<PickRow[]>([]);
  const [members, setMembers] = useState<Member[]>(() => (supabase ? [] : PREVIEW_MEMBERS));
  const [loaded, setLoaded] = useState(!supabase);
  const [error, setError] = useState<string | null>(null);
  // Prerendered HTML carries no clock; lock states appear after hydration and refresh each minute.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const now = hydrated ? clock : null;

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from("members").select("id, display_name").order("display_name"),
      supabase
        .from("picks")
        .select("member_id, season, week, game_id, pick")
        .eq("season", slate.season),
    ]).then(([m, p]) => {
      if (m.error || p.error) setError((m.error ?? p.error)?.message ?? "Load failed");
      setMembers((m.data as Member[]) ?? []);
      setPicks((p.data as PickRow[]) ?? []);
      setLoaded(true);
    });
  }, [supabase, slate.season]);

  const myPicks = useMemo(() => {
    const map = new Map<string, Side>();
    for (const p of picks) if (p.member_id === myId && p.week === week) map.set(p.game_id, p.pick);
    return map;
  }, [picks, myId, week]);

  async function choose(game: Game, side: Side) {
    if (!myId || !isCurrent || (now && hasKickedOff(game, now))) return;
    const row: PickRow = { member_id: myId, season: slate.season, week, game_id: game.id, pick: side };
    const previous = picks;
    setPicks((all) => [...all.filter((p) => !(p.member_id === myId && p.game_id === game.id)), row]);
    if (!supabase) return;
    const { error: err } = await supabase
      .from("picks")
      .upsert({ ...row, kickoff: game.date }, { onConflict: "member_id,season,week,game_id" });
    if (err) {
      setPicks(previous);
      setError(err.message.includes("policy") ? "That game has locked." : err.message);
    } else {
      setError(null);
    }
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? "?";
  const made = games.filter((g) => myPicks.has(g.id)).length;
  const openGames = games.filter((g) => !(now && hasKickedOff(g, now))).length;

  return (
    <div className="space-y-6">
      {weekNumbers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {weekNumbers.map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`font-head rounded-sm px-3 py-1 text-sm font-semibold uppercase tracking-wider ${
                w === week ? "bg-gold text-felt-deep" : "border border-line text-cream-dim hover:text-cream"
              }`}
            >
              Week {w}
            </button>
          ))}
        </div>
      )}

      <div className="panel sticky top-16 z-30 flex items-center justify-between px-4 py-2.5 backdrop-blur">
        <span className="font-head text-sm uppercase tracking-wider text-cream-dim">
          {isCurrent ? "Your picks" : `Week ${week} · final`}
        </span>
        <span className="font-mono-num text-lg">
          <span className={made === games.length ? "text-gold-bright" : ""}>{made}</span>
          <span className="text-cream-dim"> / {games.length}</span>
          {isCurrent && openGames < games.length && (
            <span className="ml-3 text-xs text-cream-dim">{games.length - openGames} locked</span>
          )}
        </span>
      </div>

      {error && <p className="rounded-sm border border-blood/60 bg-blood/10 px-3 py-2 text-sm">{error}</p>}
      {!loaded && <p className="kicker live-dot">Loading picks…</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g, i) => {
          const locked = !isCurrent || Boolean(now && hasKickedOff(g, now));
          const mine = myPicks.get(g.id);
          return (
            <div key={g.id} className="panel rise p-4" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center justify-between text-xs text-cream-dim">
                <span>{formatKickoff(g.date)} ET</span>
                {locked && (
                  <span className={g.state === "in" ? "live-dot text-gold" : ""}>
                    {g.completed ? "Final" : g.state === "in" ? "Live" : "Locked"}
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["away", "home"] as const).map((side) => {
                  const t = g[side];
                  const selected = mine === side;
                  const won = g.winner === side;
                  const pickers = locked
                    ? picks.filter((p) => p.game_id === g.id && p.pick === side && p.member_id !== myId)
                    : [];
                  return (
                    <button
                      key={side}
                      disabled={locked || !myId}
                      onClick={() => choose(g, side)}
                      className={`flex flex-col rounded-sm border px-3 py-2.5 text-left transition-all disabled:cursor-default ${
                        selected
                          ? "border-gold bg-gold/15 text-gold-bright"
                          : "border-line bg-felt-deep/40 text-cream enabled:hover:border-line-strong"
                      } ${won ? "ring-1 ring-gold-bright" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        {t.logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logo} alt="" className="h-7 w-7 shrink-0" />
                        )}
                        <span className="font-head text-base font-semibold leading-tight">{t.abbr}</span>
                        {locked && g.state !== "pre" && (
                          <span className="font-mono-num ml-auto text-base">{t.score}</span>
                        )}
                        {selected && !locked && <span className="ml-auto text-gold-bright">✓</span>}
                        {selected && locked && (
                          <span className={`ml-2 text-xs ${g.completed ? (won ? "text-gold-bright" : "text-blood") : ""}`}>
                            {g.completed ? (won ? "✓" : "✗") : "you"}
                          </span>
                        )}
                      </span>
                      {pickers.length > 0 && (
                        <span className="mt-1.5 block text-[0.65rem] leading-tight text-cream-dim">
                          {pickers.map((p) => nameOf(p.member_id).split(" ")[0]).join(", ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <PickemLeaderboard slate={slate} week={week} picks={picks} members={members} myId={myId} />
    </div>
  );
}
