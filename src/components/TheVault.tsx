"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Video {
  id: number;
  title: string;
  url: string | null;
  storage_path: string | null;
  category: string;
  created_at: string;
  poster?: { display_name: string } | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

export default function TheVault() {
  const supabase = getSupabase();
  const [recaps, setRecaps] = useState<Video[]>([]);
  const [tapes, setTapes] = useState<Video[]>([]);
  const [signed, setSigned] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("videos")
      .select("id, title, url, storage_path, category, created_at, poster:members(display_name)")
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
  }, [supabase]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-3">
        <header>
          <p className="kicker">Jorge&rsquo;s Weekly Recap</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">TUESDAY MORNING RECAP</h2>
        </header>
        {recaps.length === 0 && <p className="text-sm text-cream-dim">{supabase ? "No recaps yet." : "Preview mode."}</p>}
        {recaps.map((r) => (
          <div key={r.id} className="panel flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎙️</span>
              <div>
                <p className="font-head font-semibold">{r.title}</p>
                <p className="text-xs text-cream-dim">
                  {fmtDate(r.created_at)}
                  {r.poster?.display_name ? ` · ${r.poster.display_name}` : ""}
                </p>
              </div>
            </div>
            {r.storage_path && signed[r.id] && (
              <a href={signed[r.id]} target="_blank" rel="noreferrer" className="font-head text-xs uppercase tracking-wider text-gold hover:text-gold-bright">
                Listen ↗
              </a>
            )}
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer" className="font-head text-xs uppercase tracking-wider text-gold hover:text-gold-bright">
                Listen ↗
              </a>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <header>
          <p className="kicker">Nishok&rsquo;s Meme Deck</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">THE WEEKLY TAPE</h2>
        </header>
        {tapes.length === 0 && <p className="text-sm text-cream-dim">{supabase ? "No tape yet." : "Preview mode."}</p>}
        {tapes.map((v) => (
          <div key={v.id} className="panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-head font-semibold">{v.title}</p>
              <p className="text-xs text-cream-dim">
                {fmtDate(v.created_at)}
                {v.poster?.display_name ? ` · ${v.poster.display_name}` : ""}
              </p>
            </div>
            {v.url && (
              <a href={v.url} target="_blank" rel="noreferrer" className="font-head text-xs uppercase tracking-wider text-gold hover:text-gold-bright">
                Watch ↗
              </a>
            )}
            {v.storage_path && signed[v.id] && (
              <a href={signed[v.id]} target="_blank" rel="noreferrer" className="font-head text-xs uppercase tracking-wider text-gold hover:text-gold-bright">
                Play ↗
              </a>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
