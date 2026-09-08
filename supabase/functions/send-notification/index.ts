// Supabase Edge Function: send Web Push notifications to all subscribed members.
// Called by: commissioner manual broadcast, database triggers (pg_net), or cron.
//
// Secrets needed (set via `supabase secrets set`):
//   VAPID_PRIVATE_KEY — the Web Push VAPID private key
//   VAPID_SUBJECT     — e.g. "mailto:admin@adamshallfantasyleague.com"

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY =
  "BG1ahdkxGdXGktBATsHJANuomwqupx0ydncfV1gWTtavvATEJpZ0jR5UIlyeJY0ojf3ySbtFgD172RgwRmbVf6I";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth: accept either a valid user JWT (commissioner check) or service_role key.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (token !== serviceRoleKey) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    const { data: member } = await userClient
      .from("members")
      .select("is_commissioner")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    if (!member?.is_commissioner) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const { title, body, url } = await req.json();
  if (!body) return new Response("Missing body", { status: 400 });

  // Configure web-push VAPID.
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@adamshallfantasyleague.com";
  webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, vapidPrivate);

  // Read all subscriptions with service_role (bypasses RLS).
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: subs } = await admin.from("push_subscriptions").select("*");

  if (!subs || subs.length === 0) {
    return Response.json({ sent: 0, failed: 0 });
  }

  const payload = JSON.stringify({ title: title ?? "AHFL", body, url: url ?? "/" });
  let sent = 0;
  let failed = 0;
  const stale: number[] = [];

  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
    };
    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (err: unknown) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) stale.push(sub.id);
    }
  }

  // Clean up expired subscriptions.
  if (stale.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", stale);
  }

  return Response.json({ sent, failed, cleaned: stale.length });
});
