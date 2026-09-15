"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import CommentThread from "@/components/CommentThread";

const MAX_BYTES = 400 * 1024 * 1024;
const JORGE_OWNER = "{3C8B8C86-A5CE-4EDE-8B8C-86A5CE5EDE7F}";

interface Recap {
  id: number;
  title: string;
  url: string | null;
  storage_path: string | null;
  posted_by: string;
  created_at: string;
  poster?: { display_name: string } | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

function AudioPlayer({ r, signed }: { r: Recap; signed: string | null }) {
  if (r.storage_path) {
    return signed ? (
      <audio controls preload="metadata" src={signed} className="w-full" />
    ) : (
      <div className="h-12 w-full animate-pulse rounded-sm bg-felt-deep" />
    );
  }
  if (r.url) {
    return (
      <a href={r.url} target="_blank" rel="noreferrer" className="font-head block rounded-sm border border-gold-deep p-4 text-gold hover:bg-gold hover:text-felt-deep">
        Listen to the recap ↗
      </a>
    );
  }
  return null;
}

export default function TuesdayRecap() {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : "preview";

  const [recaps, setRecaps] = useState<Recap[]>([]);
  const [signed, setSigned] = useState<Record<number, string>>({});
  const [canPost, setCanPost] = useState(!supabase);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("videos")
      .select("id, title, url, storage_path, posted_by, created_at, poster:members(display_name)")
      .eq("category", "recap")
      .order("created_at", { ascending: false })
      .then(async ({ data, error: err }) => {
        if (err) setError(err.message);
        const list = (data as unknown as Recap[]) ?? [];
        setRecaps(list);
        const urls: Record<number, string> = {};
        for (const v of list.filter((x) => x.storage_path).slice(0, 8)) {
          const { data: s } = await supabase.storage.from("videos").createSignedUrl(v.storage_path!, 3600);
          if (s?.signedUrl) urls[v.id] = s.signedUrl;
        }
        setSigned(urls);
      });
  }, [supabase, version]);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("members")
      .select("is_commissioner, espn_owner_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setCanPost(Boolean(data?.is_commissioner || data?.espn_owner_id === JORGE_OWNER)));
  }, [supabase, user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || !form.title.trim() || (!form.url.trim() && !file)) return;
    if (file && file.size > MAX_BYTES) {
      setError("File is over 400MB. Compress the audio or upload to a hosting service and paste the link.");
      return;
    }
    setBusy(true);
    setError(null);
    let storage_path: string | null = null;
    if (file && supabase) {
      setProgress("Uploading…");
      const ext = file.name.split(".").pop() ?? "mp3";
      storage_path = `recap-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(storage_path, file, { contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        setBusy(false);
        setProgress(null);
        return;
      }
    }
    const row = { title: form.title.trim(), url: form.url.trim() || null, storage_path, posted_by: myId, category: "recap" as const };
    if (!supabase) {
      setRecaps((rs) => [{ id: Date.now(), created_at: new Date().toISOString(), poster: { display_name: "Preview" }, ...row }, ...rs]);
    } else {
      const { error: err } = await supabase.from("videos").insert(row);
      if (err) setError(err.message);
      else reload();
    }
    setForm({ title: "", url: "" });
    setFile(null);
    setProgress(null);
    setBusy(false);
  }

  async function remove(r: Recap) {
    if (r.posted_by !== myId) return;
    setRecaps((rs) => rs.filter((x) => x.id !== r.id));
    if (!supabase) return;
    if (r.storage_path) await supabase.storage.from("videos").remove([r.storage_path]);
    const { error: err } = await supabase.from("videos").delete().eq("id", r.id);
    if (err) {
      setError(err.message);
      reload();
    }
  }

  const [latest, ...archive] = recaps;
  const input = "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Jorge&rsquo;s Weekly Recap</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">TUESDAY MORNING RECAP</h2>
        </div>
        {latest && <p className="text-xs text-cream-dim">Latest: {fmtDate(latest.created_at)}</p>}
      </header>

      {latest ? (
        <div className="panel panel-gold p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/20 text-2xl">🎙️</span>
            <div>
              <p className="font-head text-lg font-semibold">{latest.title}</p>
              <p className="text-xs text-cream-dim">
                {latest.poster?.display_name ? `by ${latest.poster.display_name} · ` : ""}
                {fmtDate(latest.created_at)}
              </p>
            </div>
            {latest.posted_by === myId && (
              <button type="button" onClick={() => remove(latest)} className="ml-auto text-xs text-cream-dim hover:text-blood">
                remove
              </button>
            )}
          </div>
          <AudioPlayer r={latest} signed={signed[latest.id] ?? null} />
        </div>
      ) : (
        <div className="panel flex min-h-40 items-center justify-center p-6 text-center">
          <p className="text-sm text-cream-dim">No recap yet. Tuesday is coming.</p>
        </div>
      )}

      {canPost && (
        <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-2">
          <p className="kicker sm:col-span-2">Upload this week&rsquo;s recap</p>
          <input required placeholder="Title (e.g. Week 1: Cookies, Crumbs, and 0.8 Points)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} sm:col-span-2`} />
          <input placeholder="Paste a link (YouTube, Drive, etc.)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={input} />
          <label className={`${input} cursor-pointer text-cream-dim`}>
            {file ? `${file.name} (${(file.size / 1048576).toFixed(1)} MB)` : "…or upload audio/video under 400MB"}
            <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,video/mp4,video/quicktime" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {error && <p className="text-sm text-blood sm:col-span-2">{error}</p>}
          <button disabled={busy} className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40 sm:col-span-2">
            {progress ?? "Post the recap"}
          </button>
        </form>
      )}
      {!canPost && error && <p className="text-sm text-blood">{error}</p>}

      {archive.length > 0 && (
        <details className="panel p-4">
          <summary className="kicker cursor-pointer">Previous recaps · {archive.length}</summary>
          <ul className="mt-2 divide-y divide-line text-sm">
            {archive.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-head font-semibold">{r.title}</span>
                  <span className="ml-2 text-xs text-cream-dim">{fmtDate(r.created_at)}</span>
                </span>
                <span className="flex items-center gap-3 text-xs">
                  {r.storage_path && signed[r.id] && (
                    <a href={signed[r.id]} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
                      listen ↗
                    </a>
                  )}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
                      open ↗
                    </a>
                  )}
                  {r.posted_by === myId && (
                    <button type="button" onClick={() => remove(r)} className="text-cream-dim hover:text-blood">
                      remove
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <CommentThread board="recap-comments" />
    </section>
  );
}
