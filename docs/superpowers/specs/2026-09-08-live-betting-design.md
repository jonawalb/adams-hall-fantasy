# Live-Tracking Parlay-Aware Betting System

## Overview

Replace the flat bet entry system with structured parlay support, auto-resolution via ESPN scores, and third-party verification. Bettors (Jorge, Ethan) log bets as easily as today; the system tracks legs, auto-settles game-outcome bets, and notifies verifiers for anything it can't resolve.

## Data Model

### Modified: `bets` table

Add columns:
- `bet_type text not null default 'single' check (bet_type in ('single', 'parlay'))` — single or parlay
- `combined_odds text` — for parlays, the combined line (e.g. "+850")

Existing columns stay unchanged (`description`, `odds`, `stake`, `result`, `share_url`, `note`, `bettor_tag`, `posted_by`).

For **single bets**, `description`/`odds`/`stake` still populate directly (backward-compatible).
For **parlays**, `description` becomes a summary (e.g. "3-Leg Parlay"), `odds` holds the combined odds, and individual legs live in `bet_legs`.

### New: `bet_legs` table

```sql
create table bet_legs (
  id bigint generated always as identity primary key,
  bet_id bigint not null references bets (id) on delete cascade,
  leg_order int not null,
  description text not null,          -- "Chiefs ML", "Bills -3", "Over 47.5 KC/LV"
  market_type text not null default 'other'
    check (market_type in ('moneyline', 'spread', 'over_under', 'prop', 'other')),
  team_abbr text,                     -- nullable, for matching against ESPN scores
  event_id text,                      -- ESPN game ID, nullable for props
  line numeric,                       -- spread value or total, nullable
  odds text,                          -- American odds for this leg, e.g. "+150"
  result text check (result is null or result in ('pending', 'won', 'lost', 'push')),
  resolved_by uuid references members (id),
  resolved_at timestamptz,
  unique (bet_id, leg_order)
);
```

RLS: all members can read, only non-bettors can update `result` (enforced by a policy that checks `posted_by` on the parent bet).

### New: `bet_verification_crew` (concept, not a table)

Hardcoded in the Edge Function / trigger logic:
- Jorge's bets → notify Nishok, Jonathan, Ethan
- Ethan's bets → notify Nishok, Jonathan, Jorge

Anyone who isn't the bettor can tap to verify. The bettor's own resolve buttons are disabled on their own bets.

## Bet Entry UX

### Single bets (unchanged)

Type: `Chiefs ML +150 $25` — parser extracts odds and stake. One line = single bet.

### Parlays (new: multi-line detection)

Type multiple lines in the same text input (switch from `<input>` to `<textarea>`):

```
Chiefs ML +150
Bills -3 -110
Over 47.5 KC/LV -110
$10
```

**Detection logic:** if the input has 2+ non-empty lines after trimming, it's a parlay. The last line that matches a `$` pattern becomes the stake for the whole bet; every other line is a leg.

**Smart parse per leg:** each line runs through `smartParse()` independently, extracting `description` and `odds`.

**Live preview:** shows each parsed leg with its odds, and at the bottom: combined parlay odds (multiply implied probabilities) and potential payout.

**Market type detection:** best-effort from the description text:
- Contains "ML" or team name only → `moneyline`
- Contains `+` or `-` followed by a number ≤ 20 → `spread`
- Contains "over" or "under" → `over_under`
- Contains "TD", "yards", "passing", etc. → `prop`
- Otherwise → `other`

**ESPN event_id matching:** skip for now. Legs start with `event_id = null`. The auto-resolution cron will attempt fuzzy matching against the current week's NFL games by team abbreviation.

### FanDuel link

Stays as an optional "view on FanDuel" reference. No scraping.

## Auto-Resolution

### Cron job: `resolve_bets`

Runs every 15 minutes via `pg_cron`. Calls an Edge Function `resolve-bets` that:

1. Fetches the current NFL week's scoreboard from ESPN (`site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`)
2. Loads all pending `bet_legs` with `result IS NULL OR result = 'pending'`
3. For each leg, attempts to match:
   - **By `event_id`** if set (exact match)
   - **By `team_abbr`** if set — find the ESPN game involving that team this week
4. If a game is **final** (`state = "post"`, `completed = true`):
   - **Moneyline:** did the team win? → won/lost
   - **Spread:** team score + line > opponent score? → won/lost/push
   - **Over/Under:** total points vs line → won/lost/push
   - **Prop/Other:** skip (needs manual verification)
5. Updates `bet_legs.result`, sets `resolved_by = null` (system), `resolved_at = now()`
6. For each bet where all legs are now resolved:
   - All won → bet result = 'won'
   - Any lost → bet result = 'lost'
   - Mix of won + push → recalculate (won with reduced odds)
7. For legs that couldn't be resolved and the game is final:
   - Send push notification to the verification crew (not the bettor)
   - Title: "Verify Bet Leg"
   - Body: "{bettor_name}'s bet: {leg_description} — game is over, needs manual W/L"
   - URL: `/betting/{tag}s-book/`

### NFL game windows

The cron runs `*/15 * * * *` (every 15 min, 24/7 — cheap and simple). The Edge Function returns early if no pending legs exist, so off-season it's a no-op.

## Manual Verification

### Who can verify

RLS policy on `bet_legs`:
```sql
-- Anyone signed in can read legs
create policy "legs readable" on bet_legs for select
  using (auth.uid() is not null);

-- Only non-bettors can resolve legs
create policy "legs resolve by non-bettor" on bet_legs for update
  using (
    auth.uid() is not null
    and not exists (
      select 1 from bets where bets.id = bet_legs.bet_id and bets.posted_by = auth.uid()
    )
  );
```

### UI

On each bet card's legs:
- **If you're the bettor:** leg status shows (green check / red X / gold dot) but no buttons
- **If you're a verifier:** each pending leg shows Won / Lost / Push buttons
- Tapping a button updates the leg, and if all legs are now settled, auto-resolves the parent bet

### Push notification for unresolved legs

When the cron finds a game is final but a leg is `prop` or `other` type, it fires `notify_push()` — but targeted. A new Edge Function variant or a modified `send-notification` that accepts a list of member_ids to notify (instead of broadcasting to all).

## Parlay Display

### BetCard (updated)

For parlay bets, the card expands to show a vertical leg list:

```
┌──────────────────────────────────┐
│ [LIVE]  3-Leg Parlay   Sep 8    │
│         +850  $10  To win $85   │
│                                  │
│  ✅ Chiefs ML +150       W       │
│  🟡 Bills -3 -110       LIVE    │
│  🟡 Over 47.5 -110      LIVE    │
│                                  │
│  "Jorge actually cooked here"    │
│                                  │
│  [Won] [Lost] [Push]  ← Bills   │
│  [Won] [Lost] [Push]  ← O/U    │
└──────────────────────────────────┘
```

- Won legs: green check + strikethrough-ish style
- Lost legs: red X, and the whole card immediately flips to LOST
- Pending legs: gold dot with LIVE badge if the game is in progress
- Resolve buttons only appear for verifiers, only on pending legs

### Stats (updated)

The Stats component already computes W/L/streak/P&L. No changes needed — it reads from `bets.result` which is still the source of truth for the overall bet outcome. Legs are internal detail.

## Migration Plan

One SQL migration that:
1. Adds `bet_type` and `combined_odds` to `bets`
2. Creates `bet_legs` table with RLS
3. Backfills: for every existing bet, create a single `bet_legs` row (leg_order=1, copies description/odds/result from the parent bet)

This makes existing bets show up correctly in the new leg-aware UI without any data loss.

## Edge Functions

### `resolve-bets` (new)

Called by pg_cron every 15 minutes. Fetches ESPN scores, matches pending legs, auto-resolves what it can, notifies verifiers for the rest.

### `send-notification` (modified)

Add an optional `member_ids` array parameter. If provided, only send to those members' push subscriptions (instead of all). This supports targeted verification notifications.

## Files Touched

- `supabase/migrations/2026-09-08-bet-legs.sql` — new migration
- `supabase/functions/resolve-bets/index.ts` — new Edge Function
- `supabase/functions/send-notification/index.ts` — add member_ids filter
- `src/components/BetBook.tsx` — textarea for parlays, leg display, verifier buttons
- `src/lib/parlayParser.ts` — new: multi-line parse logic, market type detection, combined odds calc
- `supabase/schema.sql` — updated with new tables
