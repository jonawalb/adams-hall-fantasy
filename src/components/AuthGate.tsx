"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type State = "checking" | "in" | "out" | "preview" | "error";

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

    let timer: ReturnType<typeof setTimeout>;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setState("error");
        return;
      }
      setState(data.session ? "in" : "out");
    }).catch(() => {
      setState("error");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? "in" : "out");
    });

    // Safety: don't let "checking" hang forever — bounce to login after 5s.
    timer = setTimeout(() => {
      setState((s) => (s === "checking" ? "out" : s));
    }, 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase]);

  const isLogin = pathname?.startsWith("/login");
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

  if (state === "error" && !isPublic) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-head text-lg text-gold-bright">Session expired</p>
        <p className="text-sm text-cream-dim">
          Your login session couldn&rsquo;t be restored. This can happen in private
          browsing or if cookies are blocked.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="font-head rounded-sm bg-gold px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-felt-deep hover:bg-gold-bright"
        >
          Sign in again
        </button>
      </div>
    );
  }

  if (state === "in" || (state === "out" && isPublic)) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="kicker live-dot">Checking credentials…</p>
    </div>
  );
}
