"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type State = "checking" | "in" | "out" | "preview";

/**
 * Client-side auth gate for the static export. With Supabase configured,
 * every page except /login requires a session; page shells are public by
 * nature of static hosting, but all league data lives behind Supabase RLS.
 * Without config (local dev), renders a preview banner instead of a gate.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<State>(supabase ? "checking" : "preview");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? "in" : "out");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const isLogin = pathname?.startsWith("/login");
  // /welcome must stay reachable without a session (invite links land there
  // with the auth token in the URL hash) AND with one (to set the password).
  const isPublic = isLogin || pathname?.startsWith("/welcome");

  useEffect(() => {
    if (state === "out" && !isPublic) router.replace("/login");
    if (state === "in" && isLogin) router.replace("/");
  }, [state, isPublic, isLogin, router]);

  if (state === "preview") {
    return (
      <>
        <div className="border-b border-gold-deep/40 bg-raised/60 py-1.5 text-center">
          <p className="kicker !text-cream-dim">
            Local preview · no login required · Supabase not configured
          </p>
        </div>
        {children}
      </>
    );
  }

  if (state === "in" || (state === "out" && isPublic)) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="kicker live-dot">Checking credentials…</p>
    </div>
  );
}
