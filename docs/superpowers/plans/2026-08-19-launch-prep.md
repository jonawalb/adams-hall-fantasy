# Launch Prep (Invites + Gate + History) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the invite-only account infrastructure (commissioner sends invitations; members set a password on a landing page) and harden the login gate so nothing renders without a session, closing the code-side gaps before the Pages launch.

**Architecture:** Static-export Next.js site; all auth is client-side Supabase. A roster file (`data/members.json`) drives an admin invite script run locally by the commissioner with the service-role key. Invite emails land on a new `/welcome` page where the member sets display name + password (the same page handles password recovery). A Postgres trigger creates the `members` row from invite metadata. AuthGate treats `/login` and `/welcome` as the only public routes.

**Tech Stack:** Next.js 16 (App Router, `output:'export'`), Tailwind v4, @supabase/supabase-js v2 (already a dependency), Supabase Auth admin API (invite flow), Postgres trigger + RLS.

**Spec:** `docs/superpowers/specs/2026-08-19-adams-hall-design.md`

## Global Constraints

- Static export only — no server components with runtime data, no API routes; every interactive page is `"use client"`.
- Preview mode must keep working: every Supabase call goes through `getSupabase()` which returns `null` when env vars are unset.
- Invite-only: 10 accounts, public signup stays disabled in the Supabase dashboard.
- Design language "Clubhouse": use existing classes (`panel`, `panel-gold`, `kicker`, `rise`, `font-display`, `font-head`, color tokens `gold`, `cream`, `felt-deep`, `blood`, `line`).
- Base path aware: any absolute URL uses `window.location.origin` + `process.env.NEXT_PUBLIC_BASE_PATH ?? ""`.
- No test framework is configured in this repo; verification is `npm run lint` + `npm run build` + manual preview.

---

### Task 1: Member roster file

**Files:**
- Create: `data/members.json`

**Interfaces:**
- Produces: JSON array of `{ display_name: string, email: string, espn_owner_id: string, is_commissioner: boolean }` consumed by Task 2's script.

- [x] **Step 1: Write the roster** with all 10 members prefilled from `data/espn/season-2026.json` (names + ESPN GUIDs), `email` left `""` for the commissioner to fill in, `is_commissioner: true` only for Jonathan Walberg.
- [x] **Step 2: Verify** `node -e "JSON.parse(require('fs').readFileSync('data/members.json'))"` parses.

### Task 2: Invite sender script

**Files:**
- Create: `scripts/invite-members.mjs`

**Interfaces:**
- Consumes: `data/members.json` (Task 1 shape); env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SITE_URL` (defaults to placeholder, printed loudly).
- Produces: Supabase auth users with `user_metadata = { display_name, espn_owner_id, is_commissioner }`, invite email redirecting to `${SITE_URL}/welcome/`.

- [x] **Step 1: Write the script.** For each roster entry with a non-empty email, call `supabase.auth.admin.inviteUserByEmail(email, { redirectTo, data })`. Log per-member outcome; "already registered" errors are skipped (idempotent re-runs); missing env vars exit(1) with instructions; entries with blank emails are listed as skipped.
- [x] **Step 2: Verify** `node --check scripts/invite-members.mjs` and a dry run without env vars prints the instruction message and exits 1.

### Task 3: Schema — auto-provision members row + display-name self-update

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: trigger `on_auth_user_created` on `auth.users` inserting into `members (id, display_name, espn_owner_id, is_commissioner)` from `raw_user_meta_data`; RLS policy `own member row update` allowing a member to update their own `display_name`.

- [x] **Step 1: Append** a `security definer` function `handle_new_user()` + trigger, using `coalesce(new.raw_user_meta_data->>'display_name', new.email)`, `on conflict (id) do nothing`.
- [x] **Step 2: Append** `create policy "own member row update" on members for update using (id = auth.uid()) with check (id = auth.uid());`
- [x] **Step 3: Verify** the file is valid SQL by eyeball (no local Postgres); it will be executed in the Supabase SQL editor during launch.

### Task 4: `/welcome` landing page (invite acceptance + password recovery)

**Files:**
- Create: `src/app/welcome/page.tsx`

**Interfaces:**
- Consumes: `getSupabase()`; Supabase session established from the invite/recovery URL hash (`detectSessionInUrl`).
- Produces: member with password set (`auth.updateUser({ password })`), `members.display_name` updated, redirect to `/`.

- [x] **Step 1: Write the page** (`"use client"`): waits for the session (hash processing), shows expired-link message if none arrives within ~4s; form = display name (prefilled from `user_metadata.display_name`) + password + confirm (min 8 chars, match check); submit calls `updateUser` then `from("members").update({ display_name }).eq("id", user.id)` then `router.replace("/")`. Preview mode (no Supabase) renders an explanatory panel.
- [x] **Step 2: Verify** `npm run build` passes and `/welcome` renders in preview mode at localhost:3000/welcome.

### Task 5: AuthGate — treat `/welcome` as public

**Files:**
- Modify: `src/components/AuthGate.tsx`

**Interfaces:**
- Consumes: existing `State` machine.
- Produces: unauthenticated users may reach `/login` and `/welcome`; authenticated users are no longer bounced away from `/welcome` (they need it to set their password).

- [x] **Step 1: Edit** — `isPublic = pathname startsWith /login or /welcome`; redirect `out && !isPublic → /login`; keep `in && isLogin → /`.
- [x] **Step 2: Verify** build + preview: all routes reachable in preview mode.

### Task 6: Login page — forgot password

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + basePath + "/welcome/" })`.
- Produces: "Forgot password?" link that emails a recovery link landing on `/welcome`.

- [x] **Step 1: Add** the link + success/error message state (requires email field filled).
- [x] **Step 2: Verify** build passes; link renders disabled in preview mode.

### Task 7: Nav — session-aware Sign In / Sign Out

**Files:**
- Modify: `src/components/Nav.tsx`

**Interfaces:**
- Consumes: `getSupabase()`, `onAuthStateChange`.
- Produces: button shows "Sign Out" (calls `auth.signOut()`, router to `/login`) when a session exists; "Sign In" otherwise; unchanged in preview mode.

- [x] **Step 1: Add** session state + handler.
- [x] **Step 2: Verify** build + preview (still shows "Sign In" in preview mode).

### Task 8: Verify + commit

- [x] **Step 1:** `npm run lint` — clean.
- [x] **Step 2:** `npm run build` — static export succeeds.
- [x] **Step 3:** Commit: `feat: invite infrastructure — roster, admin invite script, /welcome set-password landing, public-route gate, forgot password, session-aware nav`

---

## Launch-day items that are NOT code (checklist source)

1. User creates Supabase project; run `supabase/schema.sql`; disable email signups; set Site URL + redirect URLs to the Pages/domain `/welcome/`.
2. Fill emails into `data/members.json`; run invite script with service-role key (locally only — never commit the key).
3. Grab `espn_s2` + `SWID` cookies from a logged-in ESPN session; run `node scripts/fetch-espn.mjs 2021 2022 2023 2024`; unlock history page rendering for those seasons.
4. Create public GitHub repo (`gh repo create`), push, enable Pages (GitHub Actions source), set secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ESPN_S2`, `SWID`, and var `NEXT_PUBLIC_BASE_PATH`.
5. Deploy gate check: Supabase env secrets present so the built site ships with the gate ON.
6. Later: Squarespace domain → Pages custom domain; migrate Pick'Em off localStorage and quotes off sample data onto the Postgres tables (schema already supports both).
