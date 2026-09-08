"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

interface Notification {
  id: number;
  kind: string;
  target_type: string;
  target_id: number;
  target_title: string | null;
  body: string | null;
  read: boolean;
  created_at: string;
  sender?: { display_name: string } | null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function kindIcon(kind: string): string {
  if (kind === "comment") return "💬";
  if (kind === "reply") return "↩️";
  if (kind === "reaction") return "🔥";
  return "🔔";
}

function targetLabel(type: string): string {
  if (type === "post") return "post";
  if (type === "bet") return "bet";
  return type;
}

export default function NotificationBell() {
  const supabase = getSupabase();
  const user = useUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("notifications")
      .select("id, kind, target_type, target_id, target_title, body, read, created_at, sender:members!notifications_actor_fkey(display_name)")
      .eq("recipient", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifications((data as unknown as Notification[]) ?? []));
  }, [supabase, user]);

  async function markAllRead() {
    if (!supabase || !user) return;
    await supabase.from("notifications").update({ read: true }).eq("recipient", user.id).eq("read", false);
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  }

  if (!supabase || !user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open && unread > 0) markAllRead(); }}
        className="relative rounded-sm px-2 py-1.5 text-cream-dim hover:text-cream"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clipRule="evenodd" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blood px-1 text-[0.6rem] font-bold text-cream">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-y-auto rounded-sm border border-line-strong bg-felt-deep shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="font-head text-xs font-semibold uppercase tracking-wider text-cream">Notifications</p>
            {notifications.length > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-cream-dim hover:text-gold">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-cream-dim">No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`border-b border-line px-3 py-2 text-sm ${n.read ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-base">{kindIcon(n.kind)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-semibold text-cream">{n.sender?.display_name ?? "Someone"}</span>
                    <span className="text-cream-dim">
                      {n.kind === "comment" ? " commented on your " : n.kind === "reply" ? " replied to your comment on " : " reacted to your "}
                      {targetLabel(n.target_type)}
                    </span>
                    {n.target_title && <span className="text-cream-dim"> &ldquo;{n.target_title.slice(0, 40)}{n.target_title.length > 40 ? "…" : ""}&rdquo;</span>}
                    <span className="ml-1.5 text-cream-dim/60">{timeAgo(n.created_at)}</span>
                  </p>
                  {n.body && <p className="mt-0.5 text-xs text-cream-dim line-clamp-2">{n.body}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
