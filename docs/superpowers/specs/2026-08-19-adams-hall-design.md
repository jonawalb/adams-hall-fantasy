# Adams Hall Fantasy League — Site Design

Date: 2026-08-19 · Status: v0 localhost preview built; auth + live sync next

## Purpose

Private hub for the 10-member Adams Hall ESPN fantasy football league
(ESPN league 833808174, seasons 2021–present). Records engine + lore:
standings, live scores, rivalries, record book, weekly Pick'Em, quote
wall, historical archive. Every member gets a unique login; nothing is
visible without one.

## Stack

- **Next.js 16 (App Router, TypeScript, Tailwind v4)**, static export
  (`output: 'export'`) on **GitHub Pages** (user decision 2026-08-19:
  no Vercel). Auth is client-side: an AuthGate component redirects to
  /login without a Supabase session. Page *shells* are inherently
  public on static hosting; all league *data* is protected by Supabase
  RLS. ESPN sync + rebuild runs in GitHub Actions (cron + on push).
- **Supabase**: Auth (10 invite-only accounts, no public signup),
  Postgres (picks, quotes, reactions, votes), Row Level Security
- **ESPN data**: reverse-engineered `lm-api-reads.fantasy.espn.com` v3
  API. Current + 2025 seasons are publicly readable; 2021–2024 need
  `espn_s2` + `SWID` cookies (one-time grab, stored as env vars).
  Sync job pulls ESPN → JSON/Postgres on a schedule (GitHub Actions
  cron); gameday polling for near-live scores.
- **NFL schedule** for Pick'Em: public `site.api.espn.com` scoreboard API.
- Domain: purchased on Squarespace later, pointed at GitHub Pages
  (placeholder: testdomain.com).

## Architecture

- `data/espn/season-YYYY.json` — raw ESPN season snapshots
  (`scripts/fetch-espn.mjs` refreshes; env cookies unlock history)
- `src/lib/espn.ts` — normalize raw JSON → typed Season/Team/Game
- `src/lib/stats.ts` — derived stats: standings, all-play/luck index,
  head-to-head matrix, weekly awards, record book, champion resolution
- `src/lib/supabase.ts` + `src/components/AuthGate.tsx` — client auth;
  preview mode when env vars absent
- Pages (server components render at build; client only where
  interactive): `/` clubhouse dashboard · `/standings` · `/matchups`
  (client week nav) · `/rivalries` (H2H grid) · `/records` (fame +
  shame) · `/history` · `/pickem` (client board, localStorage for now)
  · `/quotes` · `/login`

## Design language: "The Clubhouse"

Dark felt green (#0a1410 family), brass gold (#d8a13f), chalk cream,
blood red accents. Fonts: Graduate (collegiate display), Barlow
Condensed (headings/stats), Barlow (body), IBM Plex Mono (numbers).
Film-grain overlay, brass-trimmed panels, staggered rise-in animations.

## Feature roadmap (approved 2026-08-19)

**v0 (done, this build):** real 2025/2026 data · standings + all-play
luck index · matchup browser w/ playoffs · H2H rivalry grid · record
book (fame + shame) · history w/ locked-season placeholders · Pick'Em
board w/ real Week 1 slate (localStorage) · quote wall (sample data) ·
login page + AuthGate (activate by setting Supabase env vars) · static
export + GitHub Pages workflow.

**v1 (next):** Supabase project (user creates, ~5 min) → auth live ·
picks + quotes + reactions in Postgres behind RLS · historical sync
2021–2024 via cookies · GitHub repo + Pages deploy + domain.

**v2:** gameday polling + TV mode · weekly auto-awards post · Monte
Carlo playoff odds w/ week-by-week chart · transactions (adds/drops/
trades/waiver ROI, scoring leaders by position — needs mTransactii/
mRoster views) · blunder-of-the-week (bench mismanagement) · email
digest + Pick'Em reminders (Resend) · AI weekly recap · preseason
predictions ballot · NFL playoff bracket challenge · side-bet ledger ·
member profile pages · trophy case + punishments.

## Non-goals

Public access, mobile app, non-ESPN league imports.

## Risks

- ESPN API is unofficial; endpoints/cookie auth can change. Mitigation:
  snapshot everything into our own storage; site renders from our data.
- espn_s2 cookie expires (~yearly); document the re-grab.
- League currently publicly readable — if ESPN privacy setting changes,
  current-season sync also needs the cookies (same code path).
- GitHub Pages on a free personal plan requires a PUBLIC repo. Until
  data moves fully into Supabase, ESPN snapshots in the repo (and in
  the built pages) are world-readable. Deploy gate: do not publish the
  Pages site until Supabase auth is configured, per the members-only
  requirement. Static shells remain public even after; league data
  does not.
- **Repo location: keep OFF ~/Desktop.** iCloud evicted the original
  working copy under disk pressure (dataless files hung every build).
  Canonical location is ~/Projects/adams-hall-fantasy with a Desktop
  symlink for convenience.
