"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import type { Member } from "@/lib/pickem";

interface Row {
  member_id: string;
  rival_id: string;
  trash: string | null;
}

interface Props {
  season: number;
  week: number;
  lockAt: string;
  /** Fantasy points this week by ESPN owner GUID; null until final. */
  scores: Record<string, number | null>;
}

const noopSubscribe = () => () => {};
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export default function Wishbone({ season, week, lockAt, scores }: Props) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : "preview";
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rival, setRival] = useState("");
  const [trash, setTrash] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const locked = hydrated && new Date(lockAt) <= clock;

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from("members").select("id, display_name, espn_owner_id").order("display_name"),
      supabase.from("wishbones").select("member_id, rival_id, trash").eq("season", season).eq("week", week),
    ]).then(([m, w]) => {
      setMembers((m.data as Member[]) ?? []);
      if (w.error) {
        if (/does not exist|schema cache|PGRST205|42P01/i.test(w.error.message + (w.error.code ?? ""))) setMissing(true);
        else setError(w.error.message);
        return;
      }
      setRows((w.data as Row[]) ?? []);
    });
  }, [supabase, season, week]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const first = (id: string) => (byId.get(id)?.display_name ?? "?").split(" ")[0];
  const pts = (id: string) => {
    const g = byId.get(id)?.espn_owner_id;
    return g ? scores[g] ?? null : null;
  };
  const mine = rows.find((r) => r.member_id === myId);
  const wanted = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of rows) c.set(r.rival_id, (c.get(r.rival_id) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  async function submit() {
    if (!myId || !rival || !supabase) return;
    setSaving(true);
    const row = { season, week, member_id: myId, rival_id: rival, trash: trash.trim() || null };
    const { error: err } = await supabase.from("wishbones").upsert(row, { onConflict: "season,week,member_id" });
    setSaving(false);
    if (err) {
      setError(err.message.includes("policy") ? "The wishbone already snapped. Locked." : err.message);
      return;
    }
    setRows((all) => [...all.filter((r) => r.member_id !== myId), row]);
    setError(null);
  }

  return (
    <section className="panel panel-gold space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="kicker">The Wishbone</p>
          <h2 className="font-display text-2xl text-gold-bright">PICK YOUR RIVAL</h2>
        </div>
        <span className="text-xs text-cream-dim">{locked ? "Snapped. Locked." : `Locks ${fmt(lockAt)} ET`}</span>
      </div>
      <p className="max-w-2xl text-sm text-cream-dim">
        Name one league member. Outscore them this week and they get carved on this page. Get outscored
        and you do. It doesn&rsquo;t have to be your opponent, and your pick is public the second you submit.
      </p>

      {missing && <p className="text-sm text-cream-dim">The wishbone opens once the commissioner runs tonight&rsquo;s setup.</p>}
      {error && <p className="rounded-sm border border-blood/60 bg-blood/10 px-3 py-2 text-sm">{error}</p>}

      {!missing && !locked && myId && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={rival || mine?.rival_id || ""}
            onChange={(e) => setRival(e.target.value)}
            className="rounded-sm border border-line bg-felt-deep px-3 py-2 text-sm"
          >
            <option value="">Choose a rival…</option>
            {members
              .filter((m) => m.id !== myId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
          </select>
          <input
            value={trash}
            maxLength={140}
            onChange={(e) => setTrash(e.target.value)}
            placeholder={mine?.trash ?? "Say something (optional)"}
            className="min-w-48 flex-1 rounded-sm border border-line bg-felt-deep px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!rival || saving}
            onClick={submit}
            className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-30"
          >
            {saving ? "Pulling…" : mine ? "Change pick" : "Pull"}
          </button>
        </div>
      )}

      {!missing && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ul className="space-y-2 lg:col-span-2">
            {rows.map((r) => {
              const a = pts(r.member_id);
              const b = pts(r.rival_id);
              const done = a != null && b != null;
              const carved = done ? (a > b ? r.rival_id : a < b ? r.member_id : null) : null;
              return (
                <li key={r.member_id} className="border-t border-line pt-2 text-sm">
                  <span className="font-head font-semibold">{first(r.member_id)}</span>
                  <span className="text-cream-dim"> 🦴 called out </span>
                  <span className="font-head font-semibold">{first(r.rival_id)}</span>
                  {done && (
                    <span className="font-mono-num ml-2 text-xs text-cream-dim">
                      {a!.toFixed(1)}–{b!.toFixed(1)}
                    </span>
                  )}
                  {carved && <span className="ml-2 text-xs font-semibold text-blood">🔪 {first(carved)} CARVED</span>}
                  {r.trash && <p className="mt-0.5 text-xs italic text-cream-dim">&ldquo;{r.trash}&rdquo;</p>}
                </li>
              );
            })}
            {rows.length === 0 && <li className="text-sm text-cream-dim">Nobody has pulled yet. Cowards.</li>}
          </ul>
          <div>
            <p className="kicker text-blood">Most wanted</p>
            <ul className="mt-2 space-y-1 text-sm">
              {wanted.map(([id, n]) => (
                <li key={id} className="flex justify-between border-t border-line pt-1">
                  <span className="font-head font-semibold">{first(id)}</span>
                  <span className="font-mono-num text-cream-dim">
                    {n} call-out{n === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
              {wanted.length === 0 && <li className="text-cream-dim">—</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
