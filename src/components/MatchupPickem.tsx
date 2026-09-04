"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import type { PickemMatchup, PickemWeek } from "@/lib/matchups";
import type { Member } from "@/lib/pickem";
import StillToPick from "@/components/StillToPick";

const PREVIEW_ID = "preview";
const PREVIEW_MEMBERS: Member[] = [{ id: PREVIEW_ID, display_name: "You (preview)" }];
const noopSubscribe = () => () => {};

interface Row {
  member_id: string;
  season: number;
  week: number;
  matchup_id: string;
  pick_team_id: number;
}

interface Props {
  season: number;
  weeks: PickemWeek[];
  currentWeek: number;
}

const fmtLock = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export default function MatchupPickem({ season, weeks, currentWeek }: Props) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const [week, setWeek] = useState(currentWeek);
  const [picks, setPicks] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>(() => (supabase ? [] : PREVIEW_MEMBERS));
  const [error, setError] = useState<string | null>(null);
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
      supabase.from("matchup_picks").select("member_id, season, week, matchup_id, pick_team_id").eq("season", season),
    ]).then(([m, p]) => {
      if (m.error || p.error) setError((m.error ?? p.error)?.message ?? "Load failed");
      setMembers((m.data as Member[]) ?? []);
      setPicks((p.data as Row[]) ?? []);
    });
  }, [supabase, season]);

  const wk = weeks.find((w) => w.week === week) ?? weeks[0];
  const weekCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of picks) if (p.week === wk.week) c.set(p.member_id, (c.get(p.member_id) ?? 0) + 1);
    return c;
  }, [picks, wk.week]);
  const locked = Boolean(now && wk.lockAt && new Date(wk.lockAt) <= now);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? "?";
  const first = (id: string) => nameOf(id).split(" ")[0];

  function choose(m: PickemMatchup, teamId: number) {
    if (!myId || locked) return;
    setDraft((d) => ({ ...d, [m.id]: teamId }));
  }

  const draftCount = Object.keys(draft).length;

  async function submit() {
    if (!myId || !draftCount) return;
    const rows: Row[] = Object.entries(draft).map(([matchup_id, pick_team_id]) => ({ member_id: myId, season, week: wk.week, matchup_id, pick_team_id }));
    const apply = () => {
      setPicks((all) => [...all.filter((p) => !(p.member_id === myId && draft[p.matchup_id])), ...rows]);
      setDraft({});
      setError(null);
    };
    if (!supabase) return apply();
    setSaving(true);
    const { error: err } = await supabase
      .from("matchup_picks")
      .upsert(rows.map((r) => ({ ...r, lock_at: wk.lockAt })), { onConflict: "member_id,season,week,matchup_id" });
    setSaving(false);
    if (err) {
      setError(err.message.includes("policy") ? "This week has locked." : err.message);
      return;
    }
    apply();
  }

  // Scoring + fun stats across every decided matchup this season.
  const stats = useMemo(() => {
    const decided = weeks.flatMap((w) => w.matchups.filter((m) => m.winnerTeamId));
    const byMatchup = new Map(weeks.flatMap((w) => w.matchups).map((m) => [m.id, m]));
    const correct = new Map<string, number>();
    const made = new Map<string, number>();
    const contrarian = new Map<string, number>();
    const against = new Map<string, { owner: string; against: number; total: number }>();
    for (const p of picks) {
      const m = byMatchup.get(p.matchup_id);
      if (!m) continue;
      made.set(p.member_id, (made.get(p.member_id) ?? 0) + 1);
      for (const side of [m.home, m.away]) {
        const a = against.get(side.ownerId) ?? { owner: side.owner, against: 0, total: 0 };
        a.total++;
        if (p.pick_team_id !== side.teamId) a.against++;
        against.set(side.ownerId, a);
      }
      if (m.winnerTeamId && p.pick_team_id === m.winnerTeamId) {
        correct.set(p.member_id, (correct.get(p.member_id) ?? 0) + 1);
        const votes = picks.filter((x) => x.matchup_id === m.id);
        const mine = votes.filter((x) => x.pick_team_id === p.pick_team_id).length;
        if (mine * 2 < votes.length) contrarian.set(p.member_id, (contrarian.get(p.member_id) ?? 0) + 1);
      }
    }
    const weekRows = (w: number) =>
      members
        .map((mem) => ({
          member: mem,
          correct: picks.filter((p) => p.member_id === mem.id && p.week === w && byMatchup.get(p.matchup_id)?.winnerTeamId === p.pick_team_id).length,
          made: picks.filter((p) => p.member_id === mem.id && p.week === w).length,
        }))
        .sort((a, b) => b.correct - a.correct || a.member.display_name.localeCompare(b.member.display_name));
    const seasonRows = members
      .map((mem) => ({ member: mem, correct: correct.get(mem.id) ?? 0, made: made.get(mem.id) ?? 0, contrarian: contrarian.get(mem.id) ?? 0 }))
      .sort((a, b) => b.correct - a.correct || a.member.display_name.localeCompare(b.member.display_name));
    const faith = [...against.values()].filter((a) => a.total > 0).sort((a, b) => b.against / b.total - a.against / a.total);
    return { decided: decided.length, weekRows, seasonRows, faith };
  }, [picks, members, weeks]);

  const decidedGames = weeks.flatMap((w) => w.matchups.filter((m) => m.winnerTeamId)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {weeks.map((w) => (
          <button
            key={w.week}
            onClick={() => setWeek(w.week)}
            className={`font-head rounded-sm px-3 py-1 text-sm font-semibold uppercase tracking-wider ${
              w.week === week ? "bg-gold text-felt-deep" : "border border-line text-cream-dim hover:text-cream"
            }`}
          >
            Wk {w.week}
          </button>
        ))}
      </div>

      <div className="panel sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 backdrop-blur">
        <span className="font-head text-sm uppercase tracking-wider text-cream-dim">
          Week {wk.week}{wk.matchups[0]?.playoff ? " · Playoffs" : ""}
        </span>
        <span className="text-xs text-cream-dim">
          {locked ? "Locked" : wk.lockAt ? `Locks ${fmtLock(wk.lockAt)} ET` : "Open"} · {picks.filter((p) => p.week === wk.week).length} picks in
          {draftCount > 0 && <span className="ml-2 text-gold">· {draftCount} unsaved</span>}
        </span>
      </div>
      {error && <p className="rounded-sm border border-blood/60 bg-blood/10 px-3 py-2 text-sm">{error}</p>}
      <StillToPick members={members} counts={weekCounts} total={wk.matchups.length} locked={locked} label={`Week ${wk.week} matchups`} />

      <div className="space-y-3">
        {wk.matchups.map((m, i) => {
          const votes = picks.filter((p) => p.matchup_id === m.id);
          const mine = draft[m.id] ?? votes.find((p) => p.member_id === myId)?.pick_team_id;
          return (
            <div key={m.id} className="panel rise p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="grid grid-cols-2 gap-3">
                {([m.away, m.home] as const).map((side) => {
                  const backers = votes.filter((p) => p.pick_team_id === side.teamId);
                  const selected = mine === side.teamId;
                  const won = m.winnerTeamId === side.teamId;
                  return (
                    <div key={side.teamId} className="min-w-0">
                      <button
                        disabled={locked || !myId}
                        onClick={() => choose(m, side.teamId)}
                        className={`flex w-full items-center gap-2 rounded-sm border px-3 py-2.5 text-left transition-all disabled:cursor-default ${
                          selected ? "border-gold bg-gold/15 text-gold-bright" : "border-line bg-felt-deep/40 enabled:hover:border-line-strong"
                        } ${won ? "ring-1 ring-gold-bright" : ""}`}
                      >
                        {side.logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={side.logo} alt="" className="h-8 w-8 shrink-0 rounded-sm object-cover" />
                        )}
                        <span className="min-w-0">
                          <span className="font-head block truncate text-base font-semibold leading-tight">{side.name}</span>
                          <span className="block text-[0.65rem] uppercase tracking-wider text-cream-dim">{side.owner}</span>
                        </span>
                        {m.winnerTeamId ? (
                          <span className={`font-mono-num ml-auto text-base ${won ? "text-gold-bright" : "text-cream-dim"}`}>{side.points.toFixed(1)}</span>
                        ) : (
                          <span className="font-mono-num ml-auto text-lg">{backers.length}</span>
                        )}
                      </button>
                      <p className="mt-1.5 min-h-4 text-[0.65rem] leading-tight text-cream-dim">
                        {backers.length
                          ? backers.map((p) => first(p.member_id)).join(", ")
                          : votes.length
                            ? "nobody"
                            : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
              {votes.length > 0 && votes.every((p) => p.pick_team_id === votes[0].pick_team_id) && votes.length >= 3 && (
                <p className="mt-2 text-xs text-gold">
                  Unanimous: {votes.length} against {votes[0].pick_team_id === m.home.teamId ? m.away.owner : m.home.owner}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!locked && (
        <button
          type="button"
          disabled={!draftCount || saving || !myId}
          onClick={submit}
          className="font-head w-full rounded-sm bg-gold py-3 text-base font-bold uppercase tracking-widest text-felt-deep transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? "Saving…" : draftCount ? `Submit ${draftCount} pick${draftCount === 1 ? "" : "s"}` : "Picks submitted"}
        </button>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4">
          <p className="kicker">Week {wk.week} leaderboard</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {stats.weekRows(wk.week).map((r, i) => (
                <tr key={r.member.id} className={`border-t border-line ${r.member.id === myId ? "text-gold-bright" : ""}`}>
                  <td className="font-mono-num w-8 py-1.5 text-cream-dim">{i + 1}</td>
                  <td className="font-head py-1.5 font-semibold">{r.member.display_name}</td>
                  <td className="font-mono-num py-1.5 text-right">
                    {r.correct}
                    <span className="text-cream-dim"> / {wk.matchups.length}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel p-4">
          <p className="kicker">{season} season</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {stats.seasonRows.map((r, i) => (
                <tr key={r.member.id} className={`border-t border-line ${r.member.id === myId ? "text-gold-bright" : ""}`}>
                  <td className="font-mono-num w-8 py-1.5 text-cream-dim">{i + 1}</td>
                  <td className="font-head py-1.5 font-semibold">{r.member.display_name}</td>
                  <td className="font-mono-num py-1.5 text-right">
                    {r.correct}
                    <span className="text-cream-dim"> / {decidedGames}</span>
                  </td>
                  <td className="py-1.5 pl-2 text-right text-[0.65rem] uppercase tracking-wider text-cream-dim">
                    {r.contrarian ? `${r.contrarian} contrarian` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel panel-gold p-4">
          <p className="kicker text-blood">Faith Index · who the league bets against</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {stats.faith.map((f) => (
                <tr key={f.owner} className="border-t border-line">
                  <td className="font-head py-1.5 font-semibold">{f.owner}</td>
                  <td className="font-mono-num py-1.5 text-right">
                    <span className={f.against / f.total >= 0.6 ? "text-blood" : ""}>{Math.round((100 * f.against) / f.total)}%</span>
                    <span className="text-cream-dim"> against · {f.total} picks</span>
                  </td>
                </tr>
              ))}
              {stats.faith.length === 0 && (
                <tr>
                  <td className="py-2 text-cream-dim">No picks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
