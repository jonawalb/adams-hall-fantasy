"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";
import {
  pushSupported,
  pushPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications";

/**
 * Notification on/off toggle for the Account page.
 * Shows the current state and lets the member enable or disable push.
 */
export default function NotificationToggle() {
  const user = useUser();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported());
    isSubscribed().then(setSubscribed);
  }, []);

  if (!supported) {
    return (
      <div className="panel space-y-2 p-5">
        <p className="kicker">Notifications</p>
        <p className="text-sm text-cream-dim">
          Add this site to your Home Screen first, then notifications will be available here.
        </p>
      </div>
    );
  }

  if (pushPermission() === "denied") {
    return (
      <div className="panel space-y-2 p-5">
        <p className="kicker">Notifications</p>
        <p className="text-sm text-cream-dim">
          Notifications were blocked. Open Settings → AHFL → Notifications to re-enable.
        </p>
      </div>
    );
  }

  async function toggle() {
    if (!user) return;
    setBusy(true);
    setMsg(null);
    if (subscribed) {
      const ok = await unsubscribeFromPush(user.id);
      if (ok) {
        setSubscribed(false);
        setMsg("Notifications disabled.");
      }
    } else {
      const ok = await subscribeToPush(user.id);
      if (ok) {
        setSubscribed(true);
        setMsg("Notifications enabled!");
      } else {
        setMsg("Could not enable — check your browser permissions.");
      }
    }
    setBusy(false);
  }

  return (
    <div className="panel space-y-3 p-5">
      <p className="kicker">Notifications</p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream-dim">
          {subscribed ? "Push notifications are on." : "Push notifications are off."}
        </p>
        <button
          onClick={toggle}
          disabled={busy}
          className={`font-head rounded-sm px-4 py-2 text-sm font-bold uppercase tracking-widest disabled:opacity-60 ${
            subscribed
              ? "border border-line text-cream-dim hover:text-cream"
              : "bg-gold text-felt-deep"
          }`}
        >
          {busy ? "…" : subscribed ? "Turn off" : "Turn on"}
        </button>
      </div>
      {msg && <p className="text-sm text-gold">{msg}</p>}
    </div>
  );
}
