"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useIsCommissioner } from "@/lib/useIsCommissioner";
import { RECAP_FIELDS, Recap, fmtDate } from "@/lib/recaps";

const PREVIEW: Recap = {
  id: 0,
  season: 2026,
  week: 1,
  title: "Week 1: Everyone Is a Fraud",
  teaser: "Five matchups, ten liars, one league-wide reckoning. Bijan “Slob on my Knob” Robinson had thoughts.",
  body: "",
  cover: { headline: "Everyone is a fraud" },
  status: "published",
  created_at: "2026-09-15T08:00:00Z",
  published_at: "2026-09-15T12:00:00Z",
};

/** Home-page card for the latest recap (commissioner also sees the latest draft). */
export default function RecapCard() {
  const supabase = getSupabase();
  const isCommissioner = useIsCommissioner();
  const [recap, setRecap] = useState<Recap | null>(() => (supabase ? null : PREVIEW));
  const [draft, setDraft] = useState<Recap | null>(null);
  const [loaded, setLoaded] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("recaps")
      .select(RECAP_FIELDS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setRecap((data?.[0] as Recap) ?? null);
        setLoaded(true);
      });
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !isCommissioner) return;
    supabase
      .from("recaps")
      .select(RECAP_FIELDS)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setDraft((data?.[0] as Recap) ?? null));
  }, [supabase, isCommissioner]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">The Weekly Recap</p>
          <h2 className="font-display mt-1 text-2xl text-gold-bright">TUESDAY MORNING PAPER</h2>
        </div>
        {recap && <p className="text-xs text-cream-dim">{fmtDate(recap.published_at ?? recap.created_at)}</p>}
      </header>

      {recap ? (
        <Link href={`/season/recap/?id=${recap.id}`} className="panel panel-gold group block overflow-hidden">
          <div className="relative flex min-h-48 flex-col justify-end bg-gradient-to-br from-felt-deep via-felt to-raised p-5">
            {recap.cover?.logos && recap.cover.logos.length > 0 && (
              <div className="absolute right-4 top-4 flex -space-x-2 opacity-90">
                {recap.cover.logos.slice(0, 5).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="h-9 w-9 rounded-full border border-felt-deep bg-felt-deep object-cover" />
                ))}
              </div>
            )}
            <p className="font-display text-5xl leading-none text-gold/40">WK {recap.week}</p>
            <h3 className="font-display mt-2 text-2xl leading-tight text-gold-bright transition-colors group-hover:text-gold sm:text-3xl">
              {recap.title}
            </h3>
            {recap.teaser && <p className="mt-2 max-w-xl text-sm text-cream-dim">{recap.teaser}</p>}
            <p className="font-head mt-3 text-xs uppercase tracking-widest text-gold">Read the recap →</p>
          </div>
        </Link>
      ) : (
        <div className="panel flex min-h-40 items-center justify-center p-6 text-center">
          <p className="text-sm text-cream-dim">{loaded ? "No recap published yet. Tuesday is coming." : "Loading…"}</p>
        </div>
      )}

      {isCommissioner && supabase && (
        <div className="flex flex-wrap gap-2 text-xs">
          {draft && (
            <Link href={`/season/recap/edit/?id=${draft.id}`} className="font-head rounded-sm border border-gold-deep px-3 py-1.5 uppercase tracking-wider text-gold hover:bg-gold hover:text-felt-deep">
              Edit draft · Wk {draft.week}
            </Link>
          )}
          <Link href="/season/recap/edit/" className="font-head rounded-sm border border-line px-3 py-1.5 uppercase tracking-wider text-cream-dim hover:text-cream">
            New recap
          </Link>
        </div>
      )}
    </section>
  );
}
