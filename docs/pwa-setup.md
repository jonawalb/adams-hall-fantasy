# AHFL PWA + Push Notifications Setup

The site is now a Progressive Web App. Members add it to their Home Screen and it runs as a standalone app with push notifications — no App Store, no cost.

## One-time Supabase setup (~10 min)

### 1. Run the migration

Dashboard → SQL Editor → paste the contents of:
```
supabase/migrations/2026-09-08-push-subscriptions.sql
```

### 2. Enable pg_net

Dashboard → Database → Extensions → search "pg_net" → Enable

### 3. Store Vault secrets

Dashboard → Settings → Vault → + New Secret:

| Name                | Value                                                |
|---------------------|------------------------------------------------------|
| `push_function_url` | `https://<your-project-ref>.supabase.co/functions/v1/send-notification` |
| `service_role_key`  | Your service_role key (Dashboard → Settings → API)   |

### 4. Deploy the Edge Function

```bash
supabase functions deploy send-notification
```

### 5. Set Edge Function secrets

```bash
supabase secrets set VAPID_PRIVATE_KEY="2PQmtsJSqQAaiD2Vsa8gHiRgNHaW-yup311Y2-LHk3g"
supabase secrets set VAPID_SUBJECT="mailto:admin@adamshallfantasyleague.com"
```

### 6. Push to GitHub

The site deploys via GitHub Pages as usual. Done.

### 7. Pick'Em deadline reminder (optional)

Enable pg_cron (Dashboard → Database → Extensions) and run:

```sql
select cron.schedule(
  'pickem-reminder',
  '0 21 * * 4',
  $$select notify_push('Picks Due', 'NFL Pick''Em locks at kickoff — get your picks in!', '/pickem/')$$
);
```

---

## How members install it

1. Open `adamshallfantasyleague.com` in **Safari** on iPhone
2. Tap the **Share** button (bottom bar) → **Add to Home Screen**
3. Open "AHFL" from the Home Screen
4. The "Stay in the loop" banner appears → tap **Enable**
5. Accept the notification prompt

That's it — it's an app on their phone now.

## What triggers notifications

| Event                    | Auto? | Title                |
|--------------------------|-------|----------------------|
| Commissioner broadcast   | Manual (Account → Send Notification) | Custom |
| New South Star post      | Auto  | "New on South Star"  |
| New Talk Your Shit post  | Auto  | "Talk Your Shit"     |
| New quote                | Auto  | "New Quote"          |
| Published recap          | Auto  | "Week X Recap"       |
| Pick'Em deadline         | Auto (if pg_cron set up) | "Picks Due" |

## VAPID keys

```
Public:  BG1ahdkxGdXGktBATsHJANuomwqupx0ydncfV1gWTtavvATEJpZ0jR5UIlyeJY0ojf3ySbtFgD172RgwRmbVf6I
Private: 2PQmtsJSqQAaiD2Vsa8gHiRgNHaW-yup311Y2-LHk3g
```
