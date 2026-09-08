"use client";

import { FormEvent, useState } from "react";
import { useIsCommissioner } from "@/lib/useIsCommissioner";

const SEND_URL =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") +
  "/functions/v1/send-notification";

const input =
  "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2.5 text-cream placeholder:text-cream-dim/50 focus:border-gold focus:outline-none";

/**
 * Commissioner-only form to broadcast a push notification to the whole league.
 */
export default function SendNotification() {
  const isCom = useIsCommissioner();
  const [title, setTitle] = useState("AHFL");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (!isCom) return null;

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch(SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, url }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMsg({ kind: "ok", text: `Sent to ${data.sent} member(s).` });
      setBody("");
    } catch (err: unknown) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed" });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={send} className="panel panel-gold space-y-3 p-5">
      <p className="kicker">Send notification</p>
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={input}
      />
      <textarea
        required
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body"
        className={input}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link (e.g. /pickem)"
        className={input}
      />
      <button
        disabled={busy}
        className="font-head w-full rounded-sm bg-gold py-2.5 font-bold uppercase tracking-widest text-felt-deep disabled:opacity-60"
      >
        {busy ? "Sending…" : "Broadcast to league"}
      </button>
      {msg && (
        <p className={`text-sm ${msg.kind === "ok" ? "text-gold" : "text-live"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
