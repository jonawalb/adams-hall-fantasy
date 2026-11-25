"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

// Site-wide Turkey Bowl call-out under the nav for Thanksgiving week.
// Disappears on its own after TURKEY_UNTIL; the copy follows the week's deadlines.
export const TURKEY_UNTIL = "2026-12-02T12:00Z";
const MATCHUP_LOCK = "2026-11-26T01:00Z"; // GB @ LAR, Wed 8 PM ET
const WISHBONE_LOCK = "2026-11-29T18:00Z"; // Sun 1 PM ET
const WEEK_FINAL = "2026-12-01T06:00Z"; // after Monday night

const HIDE_ON = ["/season/thanksgiving", "/login", "/welcome"];
const noopSubscribe = () => () => {};
// getSnapshot must return a stable value, so read the clock once per page load.
let loadedAt = 0;
const clientNow = () => (loadedAt ||= Date.now());

function message(now: number): string {
  if (now < Date.parse(MATCHUP_LOCK)) return "Rivalry Week is here. Matchup Pick'Em locks tonight at 8 PM ET";
  if (now < Date.parse(WISHBONE_LOCK)) return "Pull the Wishbone: call out one rival before Sunday 1 PM ET";
  if (now < Date.parse(WEEK_FINAL)) return "The Wishbone has snapped. See who's getting carved";
  return "The Leftovers Awards are served";
}

export default function TurkeyStrip() {
  const pathname = usePathname() ?? "";
  // Prerendered HTML has no clock; render after hydration only.
  const now = useSyncExternalStore(noopSubscribe, clientNow, () => 0);
  if (!now || now >= Date.parse(TURKEY_UNTIL)) return null;
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  return (
    <Link
      href="/season/thanksgiving"
      className="font-head block border-b border-gold/40 bg-gold/10 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wider text-gold-bright hover:bg-gold/20"
    >
      🦃 Turkey Bowl · {message(now)} →
    </Link>
  );
}
