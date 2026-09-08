"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const PREVIEW_ID = "preview";
const JORGE_OWNER = "{3C8B8C86-A5CE-4EDE-8B8C-86A5CE5EDE7F}";

type Result = "pending" | "won" | "lost" | "push" | "cashout";

interface Bet {
  id: number;
  description: string;
  share_url: string | null;
  odds: string | null;
  stake: string | null;
  result: Result | null;
  note: string | null;
  posted_by: string;
  created_at: string;
}

const RESULT_STYLES: Record<string, string> = {
  won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  lost: "bg-blood/20 text-blood border-blood/40",
  push: "bg-cream-dim/20 text-cream-dim border-cream-dim/40",
  cashout: "bg-gold/20 text-gold border-gold/40",
  pending: "bg-gold-deep/20 text-gold-bright border-gold-deep/40 animate-pulse",
};

const RESULT_LABELS: Record<string, string> = {
  won: "W",
  lost: "L",
  push: "PUSH",
  cashout: "CASH",
  pending: "LIVE",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isFanDuelLink(url: string): boolean {
  return /fanduel\.com/i.test(url);
}

function Stats({ bets }: { bets: Bet[] }) {
  const resolved = bets.filter((b) => b.result && b.result !== "pending");
  const wins = resolved.filter((b) => b.result === "won").length;
  const losses = resolved.filter((b) => b.result === "lost").length;
  const pushes = resolved.filter((b) => b.result === "push").length;
  const pending = bets.filter((b) => !b.result || b.result === "pending").length;
  const total = resolved.length;
  const pct = total > 0 ? ((wins / total) * 100).toFixed(0) : "—";

  let streak = 0;
  let streakType: "won" | "lost" | null = null;
  for (const b of resolved) {
    if (!streakType) {
      streakType = b.result === "won" ? "won" : b.result === "lost" ? "lost" : null;
      if (streakType) streak = 1;
    } else if (b.result === streakType) {
      streak++;
    } else {
      break;
    }
  }
  const streakLabel = streakType === "won" ? `${streak}W` : streakType === "lost" ? `${streak}L` : "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[
        { label: "Record", value: `${wins}-${losses}${pushes ? `-${pushes}` : ""}` },
        { label: "Win %", value: `${pct}%` },
        { label: "Streak", value: streakLabel },
        { label: "Pending", value: String(pending) },
        { label: "Total", value: String(bets.length) },
      ].map((s) => (
        <div key={s.label} className="panel p-3 text-center">
          <p className="kicker">{s.label}</p>
          <p className="font-display mt-1 text-xl text-gold-bright">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function BetCard({
  bet,
  canEdit,
  onUpdate,
  onRemove,
}: {
  bet: Bet;
  canEdit: boolean;
  onUpdate: (id: number, result: Result) => void;
  onRemove: (id: number) => void;
}) {
  const result = bet.result ?? "pending";
  return (
    <div className="panel flex gap-3 p-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border text-xs font-bold uppercase tracking-wider ${RESULT_STYLES[result]}`}
      >
        {RESULT_LABELS[result]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-head text-sm font-semibold leading-tight">{bet.description}</p>
          <p className="shrink-0 text-xs text-cream-dim">
            {fmtDate(bet.created_at)} · {fmtTime(bet.created_at)}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream-dim">
          {bet.odds && <span>Odds: <span className="text-cream">{bet.odds}</span></span>}
          {bet.stake && <span>Stake: <span className="text-cream">{bet.stake}</span></span>}
          {bet.share_url && (
            <a
              href={bet.share_url}
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:text-gold-bright"
            >
              {isFanDuelLink(bet.share_url) ? "View on FanDuel ↗" : "Bet slip ↗"}
            </a>
          )}
        </div>
        {bet.note && <p className="mt-1.5 text-xs italic text-cream-dim">&ldquo;{bet.note}&rdquo;</p>}
        {canEdit && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["won", "lost", "push", "cashout", "pending"] as Result[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onUpdate(bet.id, r)}
                className={`rounded-sm border px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  result === r
                    ? RESULT_STYLES[r]
                    : "border-line text-cream-dim hover:border-gold hover:text-cream"
                }`}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onRemove(bet.id)}
              className="ml-auto text-xs text-cream-dim hover:text-blood"
            >
              delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JorgesBook() {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const [bets, setBets] = useState<Bet[]>([]);
  const [canPost, setCanPost] = useState(!supabase);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", share_url: "", odds: "", stake: "", note: "" });
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("bets")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setBets((data as Bet[]) ?? []);
      });
  }, [supabase, version]);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("members")
      .select("is_commissioner, espn_owner_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setCanPost(Boolean(data?.is_commissioner || data?.espn_owner_id === JORGE_OWNER)),
      );
  }, [supabase, user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || !form.description.trim()) return;
    setBusy(true);
    setError(null);
    const row = {
      description: form.description.trim(),
      share_url: form.share_url.trim() || null,
      odds: form.odds.trim() || null,
      stake: form.stake.trim() || null,
      note: form.note.trim() || null,
      result: "pending" as const,
      posted_by: myId,
    };
    if (!supabase) {
      setBets((bs) => [{ id: Date.now(), created_at: new Date().toISOString(), ...row }, ...bs]);
    } else {
      const { error: err } = await supabase.from("bets").insert(row);
      if (err) setError(err.message);
      else reload();
    }
    setForm({ description: "", share_url: "", odds: "", stake: "", note: "" });
    setShowForm(false);
    setBusy(false);
  }

  async function updateResult(id: number, result: Result) {
    if (!supabase) return;
    const { error: err } = await supabase.from("bets").update({ result }).eq("id", id);
    if (err) setError(err.message);
    else setBets((bs) => bs.map((b) => (b.id === id ? { ...b, result } : b)));
  }

  async function removeBet(id: number) {
    if (!supabase) return;
    setBets((bs) => bs.filter((b) => b.id !== id));
    const { error: err } = await supabase.from("bets").delete().eq("id", id);
    if (err) {
      setError(err.message);
      reload();
    }
  }

  const input =
    "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  const pending = bets.filter((b) => !b.result || b.result === "pending");
  const resolved = bets.filter((b) => b.result && b.result !== "pending");

  return (
    <section className="space-y-6">
      <Stats bets={bets} />

      {canPost && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="font-head w-full rounded-sm border border-dashed border-gold-deep px-4 py-3 text-sm font-bold uppercase tracking-widest text-gold hover:border-gold hover:bg-gold/10"
        >
          + Log a bet
        </button>
      )}

      {canPost && showForm && (
        <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-2">
          <p className="kicker sm:col-span-2">New bet</p>
          <input
            required
            placeholder="What's the bet? (e.g. Chiefs ML, Mahomes 300+ yds parlay)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${input} sm:col-span-2`}
          />
          <input
            placeholder="FanDuel share link (optional)"
            value={form.share_url}
            onChange={(e) => setForm({ ...form, share_url: e.target.value })}
            className={`${input} sm:col-span-2`}
          />
          <input
            placeholder="Odds (e.g. +150, -110)"
            value={form.odds}
            onChange={(e) => setForm({ ...form, odds: e.target.value })}
            className={input}
          />
          <input
            placeholder="Stake (e.g. $25)"
            value={form.stake}
            onChange={(e) => setForm({ ...form, stake: e.target.value })}
            className={input}
          />
          <input
            placeholder="Trash talk / notes (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className={`${input} sm:col-span-2`}
          />
          {error && <p className="text-sm text-blood sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={busy}
              className="font-head flex-1 rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40"
            >
              Lock it in
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="font-head rounded-sm border border-line px-4 py-2 text-sm uppercase tracking-wider text-cream-dim hover:text-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!canPost && error && <p className="text-sm text-blood">{error}</p>}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="kicker">Live bets · {pending.length}</p>
          {pending.map((b) => (
            <BetCard key={b.id} bet={b} canEdit={canPost} onUpdate={updateResult} onRemove={removeBet} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="kicker">Settled · {resolved.length}</p>
          {resolved.map((b) => (
            <BetCard key={b.id} bet={b} canEdit={canPost} onUpdate={updateResult} onRemove={removeBet} />
          ))}
        </div>
      )}

      {bets.length === 0 && !error && (
        <div className="panel flex min-h-40 items-center justify-center p-6 text-center">
          <p className="text-sm text-cream-dim">No bets logged yet. Jorge is scared.</p>
        </div>
      )}
    </section>
  );
}
