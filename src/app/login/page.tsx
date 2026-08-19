"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = getSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-10">
      <header className="rise text-center">
        <p className="kicker">Members Only</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright">SIGN IN</h1>
      </header>
      <div className="panel panel-gold rise p-6" style={{ animationDelay: "100ms" }}>
        <form className={`space-y-4 ${supabase ? "" : "opacity-50"}`} onSubmit={signIn}>
          <div>
            <label htmlFor="email" className="kicker mb-1.5 block">Email</label>
            <input
              id="email"
              type="email"
              required
              disabled={!supabase || busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@adamshall.league"
              className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 text-cream placeholder:text-cream-dim/50 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="kicker mb-1.5 block">Password</label>
            <input
              id="password"
              type="password"
              required
              disabled={!supabase || busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 focus:border-gold focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-blood">{error}</p>}
          <button
            type="submit"
            disabled={!supabase || busy}
            className="font-head w-full rounded-sm bg-gold py-2.5 font-bold uppercase tracking-widest text-felt-deep transition-opacity hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Checking…" : "Enter the clubhouse"}
          </button>
        </form>
        <p className="mt-4 border-t border-line pt-4 text-center text-xs text-cream-dim">
          {supabase
            ? "Invite-only. No signups — accounts are issued by the commissioner."
            : "Preview mode: Supabase isn't configured, so the whole site is open locally. Auth activates automatically once NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."}
        </p>
      </div>
    </div>
  );
}
