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
import GambleYouWuss, { Owner } from "@/components/StillToPick";

const PREVIEW_ID = "preview";
const PREVIEW_MEMBERS: Member[] = [{ id: PREVIEW_ID, display_name: "You (preview)" }];
const noopSubscribe = () => () => {};

export default function PickemBoard({ slate, owners }: { slate: Slate; owners: Owner[] }) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const weekNumbers = useMemo(
    () => Object.keys(slate.weeks).map(Number).sort((a, b) => a - b),
    [slate.weeks],
  );
  const [week, setWeek] = useState(slate.currentWeek);
  const games = useMemo(() => slate.weeks[week]?.games ?? [], [slate.weeks, week]);
  const isCurrent = week === slate.currentWeek;

  const [picks, setPicks] = useState<PickRow[]>([]);
  const [serverCounts, setServerCounts] = useState<Map<string, number> | null>(null);
  const [countsVersion, setCountsVersion] = useState(0);
  const [draft, setDraft] = useState<Record<string, Side>>({});
  const [saving, setSaving] = useState(false);
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
    supabase
      .rpc("pick_counts", { p_season: slate.season, p_week: slate.currentWeek })
      .then(({ data }) => {
        const m = new Map<string, number>();
        for (const r of (data as { member_id: string; picks: number }[] | null) ?? []) m.set(r.member_id, Number(r.picks));
        setServerCounts(m);
      });
  }, [supabase, slate.season, slate.currentWeek, countsVersion]);

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from("members").select("id, display_name, espn_owner_id").order("display_name"),
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
    if (week === slate.currentWeek) for (const [gid, side] of Object.entries(draft)) map.set(gid, side);
    return map;
  }, [picks, myId, week, draft, slate.currentWeek]);

  function choose(game: Game, side: Side) {
    if (!myId || !isCurrent || (now && hasKickedOff(game, now))) return;
    setDraft((d) => ({ ...d, [game.id]: side }));
  }

  const draftCount = Object.keys(draft).length;

  async function submit() {
    if (!myId || !draftCount) return;
    const rows = Object.entries(draft).map(([game_id, pick]) => ({
      member_id: myId,
      season: slate.season,
      week,
      game_id,
      pick,
      kickoff: games.find((g) => g.id === game_id)?.date ?? new Date().toISOString(),
    }));
    const merged: PickRow[] = rows.map(({ member_id, season, week: w, game_id, pick }) => ({ member_id, season, week: w, game_id, pick }));
    const apply = () => {
      setPicks((all) => [...all.filter((p) => !(p.member_id === myId && p.week === week && draft[p.game_id])), ...merged]);
      setDraft({});
      setError(null);
      setCountsVersion((v) => v + 1);
    };
    if (!supabase) return apply();
    setSaving(true);
    const { error: err } = await supabase.from("picks").upsert(rows, { onConflict: "member_id,season,week,game_id" });
    setSaving(false);
    if (err) {
      setError(err.message.includes("policy") ? "One of those games has already kicked off. Change that pick and resubmit." : err.message);
      return;
    }
    apply();
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? "?";
  const weekCounts = useMemo(() => {
    if (serverCounts && week === slate.currentWeek) return serverCounts;
    const ids = new Set(games.map((g) => g.id));
    const c = new Map<string, number>();
    for (const p of picks) if (p.week === week && ids.has(p.game_id)) c.set(p.member_id, (c.get(p.member_id) ?? 0) + 1);
    return c;
  }, [picks, games, week, serverCounts, slate.currentWeek]);
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
          {draftCount > 0 && <span className="ml-3 text-xs text-gold">{draftCount} unsaved</span>}
        </span>
      </div>

      {error && <p className="rounded-sm border border-blood/60 bg-blood/10 px-3 py-2 text-sm">{error}</p>}
      {!loaded && <p className="kicker live-dot">Loading picks…</p>}
      {loaded && (
        <GambleYouWuss owners={owners} members={members} counts={weekCounts} locked={openGames === 0} />
      )}

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

      {isCurrent && (
        <button
          type="button"
          disabled={!draftCount || saving || !myId}
          onClick={submit}
          className="font-head w-full rounded-sm bg-gold py-3 text-base font-bold uppercase tracking-widest text-felt-deep transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? "Saving…" : draftCount ? `Submit ${draftCount} pick${draftCount === 1 ? "" : "s"}` : made === games.length ? "All picks submitted" : `${games.length - made} still to pick`}
        </button>
      )}

      <PickemLeaderboard slate={slate} week={week} picks={picks} members={members} myId={myId} />
    </div>
  );
}
