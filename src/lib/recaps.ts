"use client";

import { useSyncExternalStore } from "react";

export interface Recap {
  id: number;
  season: number;
  week: number;
  title: string;
  teaser: string | null;
  body: string;
  cover: { logos?: string[]; headline?: string } | null;
  status: "draft" | "published";
  created_at: string;
  published_at: string | null;
}

export const RECAP_FIELDS = "id, season, week, title, teaser, body, cover, status, created_at, published_at";

const noop = () => () => {};
/** Reads ?id= from the URL after hydration (static export has no dynamic routes). */
export function useQueryId(): number | null {
  return useSyncExternalStore(
    noop,
    () => {
      const v = new URLSearchParams(window.location.search).get("id");
      return v ? Number(v) : null;
    },
    () => null,
  );
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
