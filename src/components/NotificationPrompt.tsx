"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";
import {
  pushSupported,
  pushPermission,
  isSubscribed,
  subscribeToPush,
} from "@/lib/notifications";

/**
 * Floating banner prompting the member to enable push notifications.
 * Only shows when:
 *  - Running as an installed PWA (display-mode: standalone)
 *  - Push is supported (iOS 16.4+ / modern browsers)
 *  - Notification permission hasn't been granted yet
 *  - The member hasn't dismissed the prompt this session
 */
export default function NotificationPrompt() {
  const user = useUser();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Only prompt inside the installed PWA, not a plain browser tab.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    if (!pushSupported()) return;
    if (pushPermission() === "denied") return;

    isSubscribed().then((yes) => {
      if (!yes) setShow(true);
    });
  }, [user]);

  if (!show) return null;

  async function enable() {
    if (!user) return;
    setBusy(true);
    const ok = await subscribeToPush(user.id);
    setBusy(false);
    if (ok) setShow(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-sm border border-gold-deep/60 bg-felt-deep/95 p-4 shadow-lg backdrop-blur-sm sm:left-auto sm:right-6 sm:max-w-sm">
      <p className="font-head text-sm font-semibold uppercase tracking-wider text-gold">
        Stay in the loop
      </p>
      <p className="mt-1 text-sm text-cream-dim">
        Get notified when picks are due, new posts drop, or the commissioner has something to say.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={enable}
          disabled={busy}
          className="font-head flex-1 rounded-sm bg-gold py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable"}
        </button>
        <button
          onClick={() => setShow(false)}
          className="font-head rounded-sm border border-line px-4 py-2 text-sm uppercase tracking-widest text-cream-dim hover:text-cream"
        >
          Later
        </button>
      </div>
    </div>
  );
}
