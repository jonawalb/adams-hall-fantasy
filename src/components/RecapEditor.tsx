"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { useIsCommissioner } from "@/lib/useIsCommissioner";
import { RECAP_FIELDS, Recap, useQueryId } from "@/lib/recaps";
import { renderLite } from "@/lib/markdownLite";

const input =
  "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

export default function RecapEditor() {
  const supabase = getSupabase();
  const user = useUser();
  const isCommissioner = useIsCommissioner();
  const router = useRouter();
  const id = useQueryId();
  const [recap, setRecap] = useState<Partial<Recap>>({ season: 2026, week: 1, title: "", teaser: "", body: "", status: "draft" });
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!supabase || !id) return;
    supabase
      .from("recaps")
      .select(RECAP_FIELDS)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRecap(data as Recap);
        setLoaded(true);
      });
  }, [supabase, id]);

  async function save(status: "draft" | "published") {
    if (!supabase || !user) return;
    if (!recap.title?.trim() || !recap.body?.trim()) return setMsg({ kind: "err", text: "Title and body are required." });
    setBusy(true);
    setMsg(null);
    const row = {
      season: recap.season,
      week: recap.week,
      title: recap.title.trim(),
      teaser: recap.teaser?.trim() || null,
      body: recap.body,
      cover: recap.cover ?? null,
      status,
      author: user.id,
      published_at: status === "published" ? (recap.published_at ?? new Date().toISOString()) : null,
    };
    const res = id
      ? await supabase.from("recaps").update(row).eq("id", id).select(RECAP_FIELDS).single()
      : await supabase.from("recaps").insert(row).select(RECAP_FIELDS).single();
    setBusy(false);
    if (res.error) return setMsg({ kind: "err", text: res.error.message });
    const saved = res.data as Recap;
    setRecap(saved);
    setMsg({ kind: "ok", text: status === "published" ? "Published. It's on the front page." : "Draft saved." });
    if (!id) router.replace(`/season/recap/edit/?id=${saved.id}`);
  }

  async function remove() {
    if (!supabase || !id) return;
    setBusy(true);
    const { error } = await supabase.from("recaps").delete().eq("id", id);
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    router.replace("/season/archive");
  }

  if (supabase && !isCommissioner) return <p className="panel p-6 text-sm text-cream-dim">Commissioner only.</p>;
  if (supabase && id && !loaded) return <p className="kicker live-dot">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <input type="number" value={recap.season ?? 2026} onChange={(e) => setRecap({ ...recap, season: Number(e.target.value) })} className={input} placeholder="Season" />
        <input type="number" value={recap.week ?? 1} onChange={(e) => setRecap({ ...recap, week: Number(e.target.value) })} className={input} placeholder="Week" />
        <div className="sm:col-span-2 flex items-center gap-2 text-xs text-cream-dim">
          Status: <span className={recap.status === "published" ? "text-gold" : ""}>{recap.status ?? "draft"}</span>
        </div>
      </div>
      <input value={recap.title ?? ""} onChange={(e) => setRecap({ ...recap, title: e.target.value })} className={`${input} font-display text-xl`} placeholder="Headline" />
      <input value={recap.teaser ?? ""} onChange={(e) => setRecap({ ...recap, teaser: e.target.value })} className={input} placeholder="Teaser (one line, shows on the front-page card)" />
      <div className="flex gap-2 text-xs">
        <button type="button" onClick={() => setPreview(false)} className={`font-head rounded-sm px-3 py-1 uppercase tracking-wider ${!preview ? "bg-gold text-felt-deep" : "border border-line text-cream-dim"}`}>
          Write
        </button>
        <button type="button" onClick={() => setPreview(true)} className={`font-head rounded-sm px-3 py-1 uppercase tracking-wider ${preview ? "bg-gold text-felt-deep" : "border border-line text-cream-dim"}`}>
          Preview
        </button>
        <span className="ml-auto self-center text-cream-dim">## for section headings · blank line between paragraphs · **bold**</span>
      </div>
      {preview ? (
        <div className="panel space-y-5 p-5">{renderLite(recap.body ?? "")}</div>
      ) : (
        <textarea value={recap.body ?? ""} onChange={(e) => setRecap({ ...recap, body: e.target.value })} rows={28} className={`${input} font-mono text-[0.85rem] leading-relaxed`} placeholder="## Intro&#10;&#10;…" />
      )}
      {msg && <p className={`text-sm ${msg.kind === "ok" ? "text-gold" : "text-blood"}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy || !supabase} onClick={() => save("draft")} className="font-head rounded-sm border border-gold-deep px-4 py-2 text-sm font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-felt-deep disabled:opacity-40">
          Save draft
        </button>
        <button disabled={busy || !supabase} onClick={() => save("published")} className="font-head rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40">
          {recap.status === "published" ? "Update published" : "Publish"}
        </button>
        {recap.status === "published" && (
          <button disabled={busy} onClick={() => save("draft")} className="font-head rounded-sm border border-line px-4 py-2 text-sm uppercase tracking-widest text-cream-dim hover:text-cream">
            Unpublish
          </button>
        )}
        {id && (
          <button disabled={busy} onClick={remove} className="font-head ml-auto rounded-sm border border-blood/60 px-4 py-2 text-sm uppercase tracking-widest text-blood hover:bg-blood/20">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
