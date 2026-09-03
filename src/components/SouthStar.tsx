"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const PREVIEW_ID = "preview";

interface Post {
  id: number;
  title: string;
  byline: string;
  body: string;
  author: string;
  created_at: string;
  poster?: { display_name: string } | null;
}

const PREVIEW_POSTS: Post[] = [
  {
    id: 1,
    title: "Why I Benched My Kicker on Principle",
    byline: "Dylan Morse",
    body: "Friends, neighbors, fellow Vermonters.\n\nThere comes a time in every commissioner's life when he must look at his lineup and ask: what would a ninth-generation native do?\n\nThe answer, as always, is nothing. Nothing at all.",
    author: PREVIEW_ID,
    created_at: "2026-09-01T12:00:00Z",
    poster: { display_name: "Preview" },
  },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function SouthStar() {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;
  const [myName, setMyName] = useState("");
  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("members")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setMyName(data?.display_name ?? ""));
  }, [supabase, user]);

  const [posts, setPosts] = useState<Post[]>(() => (supabase ? [] : PREVIEW_POSTS));
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ title: "", byline: "", body: "" });

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("posts")
      .select("id, title, byline, body, author, created_at, poster:members(display_name)")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setPosts((data as unknown as Post[]) ?? []);
      });
  }, [supabase, version]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || !form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    const row = {
      title: form.title.trim(),
      byline: form.byline.trim() || myName || "Anonymous Vermonter",
      body: form.body.trim(),
      author: myId,
    };
    if (!supabase) {
      setPosts((ps) => [{ id: Date.now(), created_at: new Date().toISOString(), poster: { display_name: "Preview" }, ...row }, ...ps]);
    } else {
      const { error: err } = await supabase.from("posts").insert(row);
      if (err) setError(err.message);
      else reload();
    }
    setForm({ title: "", byline: "", body: "" });
    setWriting(false);
    setBusy(false);
  }

  async function remove(p: Post) {
    if (p.author !== myId) return;
    setPosts((ps) => ps.filter((x) => x.id !== p.id));
    if (!supabase) return;
    const { error: err } = await supabase.from("posts").delete().eq("id", p.id);
    if (err) {
      setError(err.message);
      reload();
    }
  }

  const input =
    "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSubscribed(true)}
          className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep"
        >
          {subscribed ? "Subscribed. Nothing will happen." : "Subscribe — free, unfortunately"}
        </button>
        <button
          type="button"
          onClick={() => setWriting((w) => !w)}
          disabled={!myId}
          className="font-head rounded-sm border border-gold-deep px-4 py-2 text-sm font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-felt-deep disabled:opacity-40"
        >
          {writing ? "Never mind" : "Write a post"}
        </button>
      </div>

      {writing && (
        <form onSubmit={submit} className="panel-gold rise grid gap-3 p-5">
          <p className="kicker">New dispatch</p>
          <input
            required
            placeholder="Headline"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={`${input} font-display text-xl`}
          />
          <input
            placeholder={`Byline (defaults to ${myName || "your name"}) — write as anyone you like`}
            value={form.byline}
            onChange={(e) => setForm({ ...form, byline: e.target.value })}
            className={input}
          />
          <textarea
            required
            rows={10}
            placeholder="A deep dive into the issues that matter least. Blank lines make paragraphs."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={input}
          />
          <button
            disabled={busy}
            className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40"
          >
            Publish
          </button>
        </form>
      )}

      {error && <p className="rounded-sm border border-blood/60 bg-blood/10 px-3 py-2 text-sm">{error}</p>}

      <section className="space-y-4">
        {posts.map((p, i) => {
          const isOpen = open === p.id;
          const paragraphs = p.body.split(/\n\s*\n/);
          return (
            <article key={p.id} className="panel rise p-5 sm:p-6" style={{ animationDelay: `${i * 60}ms` }}>
              <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} className="w-full text-left">
                <h2 className="font-display text-2xl leading-tight text-gold-bright sm:text-3xl">{p.title}</h2>
                <p className="mt-2 text-sm">
                  <span className="font-head font-semibold uppercase tracking-wider">By {p.byline}</span>
                  <span className="text-cream-dim"> · {fmtDate(p.created_at)}</span>
                </p>
                {p.poster?.display_name && (
                  <p className="mt-0.5 text-[0.65rem] uppercase tracking-wider text-cream-dim/70">
                    posted by {p.poster.display_name}
                  </p>
                )}
                {!isOpen && (
                  <p className="mt-3 line-clamp-2 text-base leading-relaxed text-cream-dim">{paragraphs[0]}</p>
                )}
              </button>
              {isOpen && (
                <div className="mt-4 max-w-2xl space-y-4 text-lg leading-relaxed">
                  {paragraphs.map((para, j) => (
                    <p key={j}>{para}</p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-cream-dim">
                <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} className="hover:text-gold">
                  {isOpen ? "Collapse" : "Read the whole thing"}
                </button>
                {p.author === myId && (
                  <button type="button" onClick={() => remove(p)} className="hover:text-blood">
                    Retract
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {posts.length === 0 && (
          <p className="text-sm text-cream-dim">No dispatches yet. The South awaits its narrative.</p>
        )}
      </section>
    </div>
  );
}
