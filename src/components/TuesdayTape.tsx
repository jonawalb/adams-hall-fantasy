"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const PREVIEW_ID = "preview";
const MAX_BYTES = 50 * 1024 * 1024;
// Members allowed to post: the commissioner plus this ESPN owner (Nishok).
const TAPE_CREW_OWNER = "{C2489537-0A8B-4E67-9914-7A2C71341A12}";

interface Video {
  id: number;
  title: string;
  url: string | null;
  storage_path: string | null;
  posted_by: string;
  created_at: string;
  poster?: { display_name: string } | null;
}

/** Turn a pasted link into something embeddable, or null to show a plain link. */
function embedUrl(url: string): string | null {
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const drive = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(url);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  const streamable = /streamable\.com\/(?:e\/)?([\w]+)/.exec(url);
  if (streamable) return `https://streamable.com/e/${streamable[1]}`;
  const vimeo = /vimeo\.com\/(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

function Player({ v, signed }: { v: Video; signed: string | null }) {
  if (v.storage_path) {
    return signed ? (
      <video controls preload="metadata" src={signed} className="aspect-video w-full rounded-sm bg-black" />
    ) : (
      <div className="aspect-video w-full animate-pulse rounded-sm bg-felt-deep" />
    );
  }
  const e = v.url ? embedUrl(v.url) : null;
  if (e)
    return (
      <iframe
        src={e}
        title={v.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-sm bg-black"
      />
    );
  return (
    <a href={v.url ?? "#"} target="_blank" rel="noreferrer" className="font-head block rounded-sm border border-gold-deep p-4 text-gold hover:bg-gold hover:text-felt-deep">
      Open the tape ↗
    </a>
  );
}

export default function TuesdayTape() {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : PREVIEW_ID;

  const [videos, setVideos] = useState<Video[]>([]);
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
      .order("created_at", { ascending: false })
      .then(async ({ data, error: err }) => {
        if (err) setError(err.message);
        const list = (data as unknown as Video[]) ?? [];
        setVideos(list);
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
      .then(({ data }) => setCanPost(Boolean(data?.is_commissioner || data?.espn_owner_id === TAPE_CREW_OWNER)));
  }, [supabase, user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || !form.title.trim() || (!form.url.trim() && !file)) return;
    if (file && file.size > MAX_BYTES) {
      setError("That file is over 50MB. Upload it to YouTube (unlisted) or Drive and paste the link instead.");
      return;
    }
    setBusy(true);
    setError(null);
    let storage_path: string | null = null;
    if (file && supabase) {
      setProgress("Uploading…");
      const ext = file.name.split(".").pop() ?? "mp4";
      storage_path = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(storage_path, file, { contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        setBusy(false);
        setProgress(null);
        return;
      }
    }
    const row = { title: form.title.trim(), url: form.url.trim() || null, storage_path, posted_by: myId };
    if (!supabase) {
      setVideos((vs) => [{ id: Date.now(), created_at: new Date().toISOString(), poster: { display_name: "Preview" }, ...row }, ...vs]);
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

  async function remove(v: Video) {
    if (v.posted_by !== myId) return;
    setVideos((vs) => vs.filter((x) => x.id !== v.id));
    if (!supabase) return;
    if (v.storage_path) await supabase.storage.from("videos").remove([v.storage_path]);
    const { error: err } = await supabase.from("videos").delete().eq("id", v.id);
    if (err) {
      setError(err.message);
      reload();
    }
  }

  const [latest, ...archive] = videos;
  const input = "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Nishok&rsquo;s Tuesday Tape</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">THE WEEKLY TAPE</h2>
        </div>
        {latest && <p className="text-xs text-cream-dim">Latest: {fmtDate(latest.created_at)}</p>}
      </header>

      {latest ? (
        <div className="panel panel-gold p-3 sm:p-4">
          <Player v={latest} signed={signed[latest.id] ?? null} />
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <p className="font-head text-lg font-semibold">{latest.title}</p>
            <p className="text-xs text-cream-dim">
              {latest.poster?.display_name ? `by ${latest.poster.display_name} · ` : ""}
              {fmtDate(latest.created_at)}
              {latest.posted_by === myId && (
                <button type="button" onClick={() => remove(latest)} className="ml-3 hover:text-blood">
                  remove
                </button>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="panel flex min-h-40 items-center justify-center p-6 text-center">
          <p className="text-sm text-cream-dim">No tape yet. Tuesday is coming.</p>
        </div>
      )}

      {canPost && (
        <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-2">
          <p className="kicker sm:col-span-2">Post this week&rsquo;s tape</p>
          <input required placeholder="Title (e.g. Week 3: everyone is a fraud)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} sm:col-span-2`} />
          <input placeholder="Paste a YouTube / Drive / Streamable link" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={input} />
          <label className={`${input} cursor-pointer text-cream-dim`}>
            {file ? `${file.name} (${(file.size / 1048576).toFixed(1)} MB)` : "…or upload a file under 50MB"}
            <input type="file" accept="video/mp4,video/quicktime,video/webm,image/gif" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {error && <p className="text-sm text-blood sm:col-span-2">{error}</p>}
          <button disabled={busy} className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40 sm:col-span-2">
            {progress ?? "Post the tape"}
          </button>
        </form>
      )}
      {!canPost && error && <p className="text-sm text-blood">{error}</p>}

      {archive.length > 0 && (
        <details className="panel p-4">
          <summary className="kicker cursor-pointer">The archive · {archive.length}</summary>
          <ul className="mt-2 divide-y divide-line text-sm">
            {archive.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-head font-semibold">{v.title}</span>
                  <span className="ml-2 text-xs text-cream-dim">{fmtDate(v.created_at)}</span>
                </span>
                <span className="flex items-center gap-3 text-xs">
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
                      open ↗
                    </a>
                  )}
                  {v.storage_path && signed[v.id] && (
                    <a href={signed[v.id]} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright">
                      play ↗
                    </a>
                  )}
                  {v.posted_by === myId && (
                    <button type="button" onClick={() => remove(v)} className="text-cream-dim hover:text-blood">
                      remove
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
