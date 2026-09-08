"use client";

import { getSupabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY =
  "BG1ahdkxGdXGktBATsHJANuomwqupx0ydncfV1gWTtavvATEJpZ0jR5UIlyeJY0ojf3ySbtFgD172RgwRmbVf6I";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** True when the browser + context supports Web Push (PWA on iOS 16.4+). */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current permission state, or "unsupported". */
export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/** Register the SW if it isn't already. */
export async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

/**
 * Subscribe to push notifications and save the subscription to Supabase.
 * Returns true on success, false on failure or denial.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !pushSupported()) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await ensureSW();
  if (!reg) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
  });

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      member_id: userId,
      endpoint: json.endpoint,
      keys_p256dh: json.keys?.p256dh ?? "",
      keys_auth: json.keys?.auth ?? "",
    },
    { onConflict: "member_id,endpoint" },
  );

  return !error;
}

/**
 * Unsubscribe from push and remove the subscription from Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const reg = await navigator.serviceWorker?.ready;
  const sub = await reg?.pushManager?.getSubscription();
  if (sub) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("member_id", userId)
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }

  return true;
}

/** Check whether this browser has an active push subscription. */
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker?.ready;
  const sub = await reg?.pushManager?.getSubscription();
  return !!sub;
}
