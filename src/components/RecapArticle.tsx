"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useIsCommissioner } from "@/lib/useIsCommissioner";
import { RECAP_FIELDS, Recap, fmtDate, useQueryId } from "@/lib/recaps";
import { renderLite } from "@/lib/markdownLite";

export default function RecapArticle() {
  const supabase = getSupabase();
  const isCommissioner = useIsCommissioner();
  const id = useQueryId();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(() => (supabase ? "loading" : "missing"));

  useEffect(() => {
    if (!supabase) return;
    let q = supabase.from("recaps").select(RECAP_FIELDS);
    q = id ? q.eq("id", id) : q.eq("status", "published").order("published_at", { ascending: false });
    q.limit(1).then(({ data }) => {
      const r = (data?.[0] as Recap) ?? null;
      setRecap(r);
      setState(r ? "ready" : "missing");
    });
  }, [supabase, id]);

  if (state === "loading") return <p className="kicker live-dot">Loading…</p>;
  if (state === "missing" || !recap)
    return (
      <div className="panel p-6 text-center text-sm text-cream-dim">
        {supabase ? "No recap here. It may still be a draft." : "Preview mode: recaps live in Supabase."}
      </div>
    );

  return (
    <article className="mx-auto max-w-3xl">
      <header className="rise border-b border-line pb-6">
        <p className="kicker">
          The Weekly Recap · {recap.season} Week {recap.week}
          {recap.status === "draft" && <span className="ml-2 rounded-sm bg-blood/30 px-1.5 text-cream">DRAFT</span>}
        </p>
        <h1 className="font-display mt-2 text-3xl leading-tight text-gold-bright sm:text-5xl">{recap.title}</h1>
        {recap.teaser && <p className="mt-3 text-lg text-cream-dim">{recap.teaser}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-cream-dim">
          <span>{fmtDate(recap.published_at ?? recap.created_at)}</span>
          {isCommissioner && (
            <Link href={`/season/recap/edit/?id=${recap.id}`} className="font-head uppercase tracking-wider text-gold hover:text-gold-bright">
              Edit
            </Link>
          )}
          <Link href="/season/archive" className="font-head uppercase tracking-wider text-cream-dim hover:text-cream">
            All recaps
          </Link>
        </p>
      </header>
      <div className="mt-6 space-y-5">{renderLite(recap.body)}</div>
    </article>
  );
}
