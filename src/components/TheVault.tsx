"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useIsCommissioner } from "@/lib/useIsCommissioner";
import { RECAP_FIELDS, Recap, fmtDate } from "@/lib/recaps";

interface Video {
  id: number;
  title: string;
  url: string | null;
  storage_path: string | null;
  created_at: string;
  poster?: { display_name: string } | null;
}

/** Archive of every recap and every Tuesday Tape. */
export default function TheVault() {
  const supabase = getSupabase();
  const isCommissioner = useIsCommissioner();
  const [recaps, setRecaps] = useState<Recap[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [signed, setSigned] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("recaps")
      .select(RECAP_FIELDS)
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .then(({ data }) => setRecaps((data as Recap[]) ?? []));
    supabase
      .from("videos")
      .select("id, title, url, storage_path, created_at, poster:members(display_name)")
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const list = (data as unknown as Video[]) ?? [];
        setVideos(list);
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
          <p className="kicker">Every Tuesday Morning Paper</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">RECAPS</h2>
        </header>
        {recaps.length === 0 && <p className="text-sm text-cream-dim">{supabase ? "Nothing filed yet." : "Preview mode."}</p>}
        {recaps.map((r) => (
          <Link key={r.id} href={r.status === "published" ? `/season/recap/?id=${r.id}` : `/season/recap/edit/?id=${r.id}`} className="panel block p-4 hover:border-gold-deep">
            <p className="kicker">
              {r.season} · Week {r.week}
              {r.status === "draft" && <span className="ml-2 rounded-sm bg-blood/30 px-1.5 text-cream">DRAFT</span>}
            </p>
            <p className="font-display mt-1 text-xl leading-tight text-gold-bright">{r.title}</p>
            {r.teaser && <p className="mt-1 text-sm text-cream-dim">{r.teaser}</p>}
            <p className="mt-2 text-xs text-cream-dim">{fmtDate(r.published_at ?? r.created_at)}</p>
          </Link>
        ))}
        {isCommissioner && supabase && (
          <Link href="/season/recap/edit/" className="font-head inline-block rounded-sm border border-line px-3 py-1.5 text-xs uppercase tracking-wider text-cream-dim hover:text-cream">
            New recap
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <header>
          <p className="kicker">Every Tuesday Tape</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">NISHOK&rsquo;S VAULT</h2>
        </header>
        {videos.length === 0 && <p className="text-sm text-cream-dim">{supabase ? "No tape yet." : "Preview mode."}</p>}
        {videos.map((v) => (
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
