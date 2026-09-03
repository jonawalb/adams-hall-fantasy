"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

interface Q {
  text: string;
  attributed_to: string;
  context: string | null;
}

const PREVIEW: Q = {
  text: "I'm not saying I threw the week, I'm saying the week threw me.",
  attributed_to: "Sample Member",
  context: "After benching his QB1 for a bye-week player",
};

/** Newest quote on the wall, for the dashboard. */
export default function LatestQuote() {
  const supabase = getSupabase();
  const [quote, setQuote] = useState<Q | null>(() => (supabase ? null : PREVIEW));

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("quotes")
      .select("text, attributed_to, context")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setQuote((data?.[0] as Q) ?? null));
  }, [supabase]);

  return (
    <div className="panel p-5">
      <h2 className="kicker">Latest from the wall</h2>
      {quote ? (
        <>
          <blockquote className="mt-3 text-lg leading-snug">&ldquo;{quote.text}&rdquo;</blockquote>
          <p className="mt-2 text-sm text-cream-dim">
            — {quote.attributed_to}
            {quote.context && ` · ${quote.context}`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-cream-dim">Nothing posted yet. Be the first to incriminate someone.</p>
      )}
      <Link href="/quotes" className="font-head mt-3 inline-block text-sm uppercase tracking-wider text-gold hover:text-gold-bright">
        The wall →
      </Link>
    </div>
  );
}
