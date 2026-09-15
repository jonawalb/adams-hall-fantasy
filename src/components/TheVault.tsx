"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const MAX_BYTES = 50 * 1024 * 1024;
const JORGE_OWNER = "{3C8B8C86-A5CE-4EDE-8B8C-86A5CE5EDE7F}";
const NISHOK_OWNER = "{C2489537-0A8B-4E67-9914-7A2C71341A12}";

interface Video {
  id: number;
  title: string;
  url: string | null;
  storage_path: string | null;
  posted_by: string;
  category: string;
  created_at: string;
  poster?: { display_name: string } | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

function seasonYear(iso: string): number {
  const d = new Date(iso);
  return d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
}

function groupBySeason(items: Video[]): { year: number; items: Video[] }[] {
  const map = new Map<number, Video[]>();
  for (const v of items) {
    const y = seasonYear(v.created_at);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(v);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
}

function UploadForm({ category, onDone, canPost }: { category: "recap" | "tape"; onDone: () => void; canPost: boolean }) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : "preview";
  const [form, setForm] = useState({ title: "", url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  if (!canPost) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!myId || !form.title.trim() || (!form.url.trim() && !file) || !supabase) return;
    if (file && file.size > MAX_BYTES) {
      setError("File is over 50MB.");
      return;
    }
    setBusy(true);
    setError(null);
    let storage_path: string | null = null;
    if (file) {
      setProgress("Uploading…");
      const ext = file.name.split(".").pop() ?? "m4a";
      const prefix = category === "recap" ? "recap" : "tape";
      storage_path = `${prefix}-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(storage_path, file, { contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        setBusy(false);
        setProgress(null);
        return;
      }
    }
    const row = { title: form.title.trim(), url: form.url.trim() || null, storage_path, posted_by: myId, category };
    const { error: err } = await supabase.from("videos").insert(row);
    if (err) setError(err.message);
    else {
      setForm({ title: "", url: "" });
      setFile(null);
      onDone();
    }
    setProgress(null);
    setBusy(false);
  }

  const isRecap = category === "recap";
  const input = "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 sm:grid-cols-2">
      <p className="kicker sm:col-span-2">Upload {isRecap ? "a recap" : "a tape"}</p>
      <input required placeholder={isRecap ? "Title (e.g. Week 3 Recap)" : "Title (e.g. Week 3 Meme Deck)"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} sm:col-span-2`} />
      <input placeholder="Paste a link (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={input} />
      <label className={`${input} cursor-pointer text-cream-dim`}>
        {file ? `${file.name} (${(file.size / 1048576).toFixed(1)} MB)` : isRecap ? "…or upload audio under 50MB" : "…or upload video under 50MB"}
        <input type="file" accept={isRecap ? "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,video/mp4,video/quicktime" : "video/mp4,video/quicktime,video/webm,image/gif"} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {error && <p className="text-sm text-blood sm:col-span-2">{error}</p>}
      <button disabled={busy} className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40 sm:col-span-2">
        {progress ?? (isRecap ? "Upload recap" : "Upload tape")}
      </button>
    </form>
  );
}

export default function TheVault() {
  const supabase = getSupabase();
  const user = useUser();
  const [recaps, setRecaps] = useState<Video[]>([]);
  const [tapes, setTapes] = useState<Video[]>([]);
  const [signed, setSigned] = useState<Record<number, string>>({});
  const [canRecap, setCanRecap] = useState(false);
  const [canTape, setCanTape] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("videos")
      .select("id, title, url, storage_path, posted_by, category, created_at, poster:members(display_name)")
      .in("category", ["recap", "tape"])
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const list = (data as unknown as Video[]) ?? [];
        setRecaps(list.filter((v) => v.category === "recap"));
        setTapes(list.filter((v) => v.category === "tape"));
        const urls: Record<number, string> = {};
        for (const v of list.filter((x) => x.storage_path)) {
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
      .then(({ data }) => {
        const isCom = Boolean(data?.is_commissioner);
        const owner = data?.espn_owner_id;
        setCanRecap(isCom || owner === JORGE_OWNER);
        setCanTape(isCom || owner === NISHOK_OWNER);
      });
  }, [supabase, user]);

  const myId = user?.id ?? null;
  const recapSeasons = groupBySeason(recaps);
  const tapeSeasons = groupBySeason(tapes);

  async function remove(v: Video) {
    if (v.posted_by !== myId || !supabase) return;
    if (v.storage_path) await supabase.storage.from("videos").remove([v.storage_path]);
    await supabase.from("videos").delete().eq("id", v.id);
    reload();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-4">
        <header>
          <p className="kicker">Jorge&rsquo;s Weekly Recap</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">TUESDAY MORNING RECAP</h2>
        </header>

        <UploadForm category="recap" onDone={reload} canPost={canRecap} />

        {recaps.length === 0 && <p className="text-sm text-cream-dim">{supabase ? "No recaps yet." : "Preview mode."}</p>}
        {recapSeasons.map(({ year, items }) => (
          <div key={year} className="space-y-2">
            <p className="kicker">{year} Season</p>
            {items.map((r) => (
              <div key={r.id} className="panel flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">🎙️</span>
                  <div className="min-w-0">
                    <p className="font-head font-semibold truncate">{r.title}</p>
                    <p className="text-xs text-cream-dim">
                      {fmtDate(r.created_at)}
                      {r.poster?.display_name ? ` · ${r.poster.display_name}` : ""}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-3 text-xs">
                  {r.storage_path && signed[r.id] && (
                    <a href={signed[r.id]} target="_blank" rel="noreferrer" className="font-head uppercase tracking-wider text-gold hover:text-gold-bright">
                      Listen ↗
                    </a>
                  )}
                  {r.url && !r.storage_path && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-head uppercase tracking-wider text-gold hover:text-gold-bright">
                      Listen ↗
                    </a>
                  )}
                  {r.posted_by === myId && (
                    <button type="button" onClick={() => remove(r)} className="text-cream-dim hover:text-blood">
                      remove
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <header>
          <p className="kicker">Nishok&rsquo;s Meme Deck</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">THE WEEKLY TAPE</h2>
        </header>

        <UploadForm category="tape" onDone={reload} canPost={canTape} />

        {tapes.length === 0 && <p className="text-sm text-cream-dim">{supabase ? "No tape yet." : "Preview mode."}</p>}
        {tapeSeasons.map(({ year, items }) => (
          <div key={year} className="space-y-2">
            <p className="kicker">{year} Season</p>
            {items.map((v) => (
              <div key={v.id} className="panel flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-head font-semibold truncate">{v.title}</p>
                  <p className="text-xs text-cream-dim">
                    {fmtDate(v.created_at)}
                    {v.poster?.display_name ? ` · ${v.poster.display_name}` : ""}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-3 text-xs">
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noreferrer" className="font-head uppercase tracking-wider text-gold hover:text-gold-bright">
                      Watch ↗
                    </a>
                  )}
                  {v.storage_path && signed[v.id] && (
                    <a href={signed[v.id]} target="_blank" rel="noreferrer" className="font-head uppercase tracking-wider text-gold hover:text-gold-bright">
                      Play ↗
                    </a>
                  )}
                  {v.posted_by === myId && (
                    <button type="button" onClick={() => remove(v)} className="text-cream-dim hover:text-blood">
                      remove
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
