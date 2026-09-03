"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabase } from "@/lib/supabase";

// next/image with `unoptimized` uses src verbatim — prepend basePath ourselves.
const CREST = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/crest.png`;

type State = "waiting" | "ready" | "expired" | "saving";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Supabase sends used/expired links back with #error=...; read it once, before
// the client strips the hash, and keep it stable for useSyncExternalStore.
let hashErrorCache: string | null | undefined;
const noopSubscribe = () => () => {};
function readHashError(): string | null {
  if (hashErrorCache === undefined) {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    hashErrorCache = hash.get("error")
      ? (hash.get("error_description")?.replace(/\+/g, " ") ?? "This link is invalid or has expired.")
      : null;
  }
  return hashErrorCache;
}

/**
 * Landing page for invitation + password-recovery emails. Supabase puts a
 * session in the URL hash; once detected, the member sets their display
 * name and password, then enters the clubhouse.
 */
export default function WelcomePage() {
  const supabase = getSupabase();
  const router = useRouter();
  const [state, setState] = useState<State>("waiting");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const linkError = useSyncExternalStore(noopSubscribe, readHashError, () => null);
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    if (linkError) return;
    let cancelled = false;
    const adopt = (name?: string) => {
      if (cancelled) return;
      setDisplayName((cur) => cur || name || "");
      setState((s) => (s === "waiting" ? "ready" : s));
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) adopt(data.session.user.user_metadata?.display_name);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) adopt(session.user.user_metadata?.display_name);
    });
    // Hash processing is async; if no session shows up, the link is dead.
    const timer = setTimeout(() => {
      if (!cancelled) setState((s) => (s === "waiting" ? "expired" : s));
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [supabase, linkError]);

  const view: State = linkError ? "expired" : state;

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email) return;
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${BASE}/welcome/`,
    });
    if (err) setError(err.message);
    else setResent(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setState("saving");
    const { data, error: updateErr } = await supabase.auth.updateUser({
      password,
      data: { display_name: displayName },
    });
    if (updateErr) {
      setError(updateErr.message);
      setState("ready");
      return;
    }
    // Best-effort sync of the members row (created by the DB trigger).
    if (data.user && displayName) {
      await supabase
        .from("members")
        .update({ display_name: displayName })
        .eq("id", data.user.id);
    }
    router.replace("/");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-10">
      <header className="rise text-center">
        <Image
          src={CREST}
          alt="Adams Hall Fantasy League crest"
          width={128}
          height={128}
          className="mx-auto mb-4 drop-shadow-[0_0_24px_rgba(216,161,63,0.25)]"
          priority
        />
        <p className="kicker">Welcome to the League</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright">
          CLAIM YOUR SEAT
        </h1>
      </header>

      {!supabase && (
        <div className="panel rise p-6 text-center text-sm text-cream-dim">
          Preview mode: Supabase isn&apos;t configured. This page activates
          once invitation emails are live.
        </div>
      )}

      {supabase && view === "waiting" && (
        <div className="flex min-h-[20vh] items-center justify-center">
          <p className="kicker live-dot">Checking your invitation…</p>
        </div>
      )}

      {supabase && view === "expired" && (
        <div className="panel rise p-6 text-center">
          <p className="text-cream">
            {linkError ? "This link has already been used or has expired." : "This invitation link is invalid or has expired."}
          </p>
          <p className="mt-2 text-sm text-cream-dim">
            Links only work once. Enter your email and we&rsquo;ll send a fresh one that brings you
            straight back here to set your password.
          </p>
          {resent ? (
            <p className="mt-4 text-sm text-gold">Sent. Check your inbox (and spam), then tap the newest link once.</p>
          ) : (
            <form onSubmit={resend} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@adamshall.league"
                className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 text-cream placeholder:text-cream-dim/50 focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="font-head shrink-0 rounded-sm bg-gold px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-felt-deep hover:bg-gold-bright"
              >
                Send a fresh link
              </button>
            </form>
          )}
          {error && <p className="mt-2 text-sm text-blood">{error}</p>}
        </div>
      )}

      {supabase && (view === "ready" || view === "saving") && (
        <div className="panel panel-gold rise p-6" style={{ animationDelay: "100ms" }}>
          <form className="space-y-4" onSubmit={save}>
            <div>
              <label htmlFor="displayName" className="kicker mb-1.5 block">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                required
                disabled={state === "saving"}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 text-cream focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="kicker mb-1.5 block">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                disabled={state === "saving"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 placeholder:text-cream-dim/50 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="kicker mb-1.5 block">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                disabled={state === "saving"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 focus:border-gold focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-blood">{error}</p>}
            <button
              type="submit"
              disabled={state === "saving"}
              className="font-head w-full rounded-sm bg-gold py-2.5 font-bold uppercase tracking-widest text-felt-deep transition-opacity hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "saving" ? "Saving…" : "Enter the clubhouse"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
