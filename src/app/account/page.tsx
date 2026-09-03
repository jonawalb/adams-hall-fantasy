"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const input =
  "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 text-cream placeholder:text-cream-dim/50 focus:border-gold focus:outline-none";

export default function AccountPage() {
  const supabase = getSupabase();
  const user = useUser();
  const [displayName, setDisplayName] = useState("");
  const [loadedName, setLoadedName] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("members")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setLoadedName(true);
      });
  }, [supabase, user]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !displayName.trim()) return;
    setBusy(true);
    setMsg(null);
    const name = displayName.trim();
    const { error: metaErr } = await supabase.auth.updateUser({ data: { display_name: name } });
    const { error: rowErr } = await supabase.from("members").update({ display_name: name }).eq("id", user.id);
    setBusy(false);
    const err = metaErr ?? rowErr;
    setMsg(err ? { kind: "err", text: err.message } : { kind: "ok", text: "Display name updated." });
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setMsg(null);
    if (password.length < 8) return setMsg({ kind: "err", text: "Password must be at least 8 characters." });
    if (password !== confirm) return setMsg({ kind: "err", text: "Passwords don't match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    setPassword("");
    setConfirm("");
    setMsg({ kind: "ok", text: "Password changed. Use it next time you sign in." });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="rise">
        <p className="kicker">Your seat</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright">ACCOUNT</h1>
        {user?.email && <p className="mt-1 text-sm text-cream-dim">{user.email}</p>}
      </header>

      {!supabase && <p className="panel p-4 text-sm text-cream-dim">Preview mode: Supabase isn&apos;t configured.</p>}

      {msg && (
        <p className={`rounded-sm border px-3 py-2 text-sm ${msg.kind === "ok" ? "border-gold/50 text-gold" : "border-blood/60 bg-blood/10 text-cream"}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={saveName} className="panel panel-gold space-y-3 p-5">
        <label htmlFor="displayName" className="kicker block">Display name</label>
        <input
          id="displayName"
          required
          disabled={!supabase || busy || !loadedName}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="What the league sees"
          className={input}
        />
        <button disabled={!supabase || busy} className="font-head w-full rounded-sm bg-gold py-2.5 font-bold uppercase tracking-widest text-felt-deep disabled:opacity-60">
          Save name
        </button>
      </form>

      <form onSubmit={savePassword} className="panel space-y-3 p-5">
        <label htmlFor="password" className="kicker block">New password</label>
        <input id="password" type="password" required minLength={8} disabled={!supabase || busy} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={input} />
        <label htmlFor="confirm" className="kicker block">Confirm</label>
        <input id="confirm" type="password" required disabled={!supabase || busy} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
        <button disabled={!supabase || busy} className="font-head w-full rounded-sm border border-gold-deep py-2.5 font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-felt-deep disabled:opacity-60">
          Change password
        </button>
      </form>
    </div>
  );
}
