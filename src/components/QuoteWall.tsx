"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const EMOJI = ["😂", "🔥", "💀", "🤡", "🫡"];
const PREVIEW_ID = "preview";

interface Quote {
  id: number;
  text: string;
  attributed_to: string;
  context: string | null;
  said_on: string | null;
  submitted_by: string;
  submitter?: { display_name: string } | null;
}

interface Reaction {
  quote_id: number;
  member_id: string;
  emoji: string;
}

const PREVIEW_QUOTES: Quote[] = [
  {
    id: 1,
    text: "I'm not saying I threw the week, I'm saying the week threw me.",
    attributed_to: "Sample Member",
    context: "After benching his QB1 for a bye-week player",
    said_on: "2025-11-12",
    submitted_by: PREVIEW_ID,
    submitter: { display_name: "Preview" },
  },
];

export default function QuoteWall() {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const [quotes, setQuotes] = useState<Quote[]>(() => (supabase ? [] : PREVIEW_QUOTES));
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ text: "", attributed_to: "", context: "", said_on: "" });

  // Bump `version` to refetch from Supabase.
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase
        .from("quotes")
        .select("id, text, attributed_to, context, said_on, submitted_by, submitter:members(display_name)")
        .order("created_at", { ascending: false }),
      supabase.from("quote_reactions").select("quote_id, member_id, emoji"),
    ]).then(([q, r]) => {
      if (q.error || r.error) setError((q.error ?? r.error)?.message ?? "Load failed");
      setQuotes((q.data as unknown as Quote[]) ?? []);
      setReactions((r.data as Reaction[]) ?? []);
    });
  }, [supabase, version]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || !form.text.trim() || !form.attributed_to.trim()) return;
    setBusy(true);
    const row = {
      text: form.text.trim(),
      attributed_to: form.attributed_to.trim(),
      context: form.context.trim() || null,
      said_on: form.said_on || null,
      submitted_by: myId,
    };
    if (!supabase) {
      setQuotes((qs) => [{ id: Date.now(), ...row, submitter: { display_name: "Preview" } }, ...qs]);
    } else {
      const { error: err } = await supabase.from("quotes").insert(row);
      if (err) setError(err.message);
      else load();
    }
    setForm({ text: "", attributed_to: "", context: "", said_on: "" });
    setBusy(false);
  }

  async function remove(q: Quote) {
    if (q.submitted_by !== myId) return;
    setQuotes((qs) => qs.filter((x) => x.id !== q.id));
    if (!supabase) return;
    const { error: err } = await supabase.from("quotes").delete().eq("id", q.id);
    if (err) {
      setError(err.message);
      load();
    }
  }

  async function toggle(quoteId: number, emoji: string) {
    if (!myId) return;
    const mine = reactions.some((r) => r.quote_id === quoteId && r.member_id === myId && r.emoji === emoji);
    setReactions((rs) =>
      mine
        ? rs.filter((r) => !(r.quote_id === quoteId && r.member_id === myId && r.emoji === emoji))
        : [...rs, { quote_id: quoteId, member_id: myId, emoji }],
    );
    if (!supabase) return;
    const q = supabase.from("quote_reactions");
    const { error: err } = mine
      ? await q.delete().match({ quote_id: quoteId, member_id: myId, emoji })
      : await q.insert({ quote_id: quoteId, member_id: myId, emoji });
    if (err) {
      setError(err.message);
      load();
    }
  }

  const input =
    "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="panel-gold rise grid gap-3 p-5 sm:grid-cols-2">
        <p className="kicker sm:col-span-2">Submit a quote</p>
        <textarea
          required
          rows={2}
          placeholder="What was said"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className={`${input} sm:col-span-2`}
        />
        <input
          required
          placeholder="Who said it"
          value={form.attributed_to}
          onChange={(e) => setForm({ ...form, attributed_to: e.target.value })}
          className={input}
        />
        <input
          type="date"
          value={form.said_on}
          onChange={(e) => setForm({ ...form, said_on: e.target.value })}
          className={input}
        />
        <input
          placeholder="Context (optional)"
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
          className={`${input} sm:col-span-2`}
        />
        <button
          disabled={busy || !myId}
          className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40 sm:col-span-2"
        >
          Post to the wall
        </button>
      </form>

      {error && <p className="rounded-sm border border-blood/60 bg-blood/10 px-3 py-2 text-sm">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quotes.map((q, i) => (
          <figure key={q.id} className="panel rise flex flex-col p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="font-display text-4xl leading-none text-gold-deep">&ldquo;</span>
            <blockquote className="mt-1 grow text-lg leading-snug">{q.text}</blockquote>
            <figcaption className="mt-4 border-t border-line pt-3 text-sm">
              <p className="font-head font-semibold">— {q.attributed_to}</p>
              <p className="mt-0.5 text-xs text-cream-dim">
                {[q.context, q.said_on].filter(Boolean).join(" · ")}
                {q.submitter?.display_name && (
                  <span className="block">submitted by {q.submitter.display_name}</span>
                )}
              </p>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {EMOJI.map((emoji) => {
                  const rs = reactions.filter((r) => r.quote_id === q.id && r.emoji === emoji);
                  const mine = rs.some((r) => r.member_id === myId);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggle(q.id, emoji)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        mine ? "border-gold bg-gold/15 text-gold-bright" : "border-line bg-raised hover:border-line-strong"
                      }`}
                    >
                      {emoji}
                      {rs.length > 0 && <span className="font-mono-num ml-1">{rs.length}</span>}
                    </button>
                  );
                })}
                {q.submitted_by === myId && (
                  <button
                    type="button"
                    onClick={() => remove(q)}
                    className="ml-auto text-xs text-cream-dim hover:text-blood"
                  >
                    delete
                  </button>
                )}
              </p>
            </figcaption>
          </figure>
        ))}
        {quotes.length === 0 && (
          <p className="text-sm text-cream-dim sm:col-span-2 lg:col-span-3">
            The wall is empty. Somebody say something regrettable.
          </p>
        )}
      </section>
    </div>
  );
}
