# Live-Tracking Parlay Betting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured parlay support with per-leg tracking, auto-resolution via ESPN scores, and third-party bet verification to the AHFL betting system.

**Architecture:** New `bet_legs` table stores individual legs. Multi-line textarea input auto-detects parlays. A Supabase Edge Function (`resolve-bets`) runs every 15 minutes via pg_cron, fetches the ESPN NFL scoreboard, auto-resolves moneyline/spread/over-under legs on completed games, and sends targeted push notifications to verifiers for anything it can't resolve. Bettors cannot grade their own bets.

**Tech Stack:** Next.js 16 (static export), Supabase (Postgres + Edge Functions + pg_cron), Web Push notifications, ESPN public scoreboard API.

**Spec:** `docs/superpowers/specs/2026-09-08-live-betting-design.md`

## Global Constraints

- Static export (`output: "export"`) — no server-side Next.js; all server logic lives in Supabase Edge Functions
- Supabase free tier — pg_cron available, Edge Functions available
- NFL only — no other sports leagues
- ESPN scoreboard API: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Team abbreviations use ESPN format (e.g. `KC`, `SEA`, `NE`, `BUF`)
- Existing `bets` table and `BetBook.tsx` must remain backward-compatible with current single bets
- `supabase/functions/` excluded from TypeScript checking (Deno runtime)

---

### Task 1: Database Migration — bet_legs table + bets columns + backfill

**Files:**
- Create: `supabase/migrations/2026-09-08-bet-legs.sql`
- Modify: `supabase/schema.sql` (append new table definitions)

**Interfaces:**
- Consumes: existing `bets` table, `members` table
- Produces: `bet_legs` table, `bet_type`/`combined_odds` columns on `bets`, `settle_bet(bigint)` function, RLS policies

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/2026-09-08-bet-legs.sql`:

```sql
-- Add parlay support columns to bets.
alter table bets add column if not exists bet_type text not null default 'single'
  check (bet_type in ('single', 'parlay'));
alter table bets add column if not exists combined_odds text;

-- Individual bet legs.
create table if not exists bet_legs (
  id bigint generated always as identity primary key,
  bet_id bigint not null references bets (id) on delete cascade,
  leg_order int not null,
  description text not null,
  market_type text not null default 'other'
    check (market_type in ('moneyline', 'spread', 'over_under', 'prop', 'other')),
  team_abbr text,
  event_id text,
  line numeric,
  odds text,
  result text check (result is null or result in ('pending', 'won', 'lost', 'push')),
  resolved_by uuid references members (id),
  resolved_at timestamptz,
  unique (bet_id, leg_order)
);

alter table bet_legs enable row level security;

create policy "legs readable by members"
  on bet_legs for select using (auth.uid() is not null);

create policy "legs insert by bettor"
  on bet_legs for insert with check (
    exists (select 1 from bets where bets.id = bet_legs.bet_id and bets.posted_by = auth.uid())
  );

-- Only non-bettors can resolve legs (the bettor can't grade their own).
create policy "legs resolve by non-bettor"
  on bet_legs for update using (
    auth.uid() is not null
    and not exists (
      select 1 from bets where bets.id = bet_legs.bet_id and bets.posted_by = auth.uid()
    )
  );

-- Settle a bet based on its legs' results. Called after any leg update.
create or replace function settle_bet(p_bet_id bigint) returns void
language plpgsql security definer as $$
declare
  total_legs int;
  resolved_legs int;
  won_legs int;
  lost_legs int;
begin
  select count(*), count(result), count(case when result = 'won' then 1 end),
         count(case when result = 'lost' then 1 end)
  into total_legs, resolved_legs, won_legs, lost_legs
  from bet_legs where bet_id = p_bet_id;

  if total_legs = 0 then return; end if;

  -- Any lost leg → entire bet lost.
  if lost_legs > 0 then
    update bets set result = 'lost' where id = p_bet_id and result != 'lost';
    return;
  end if;

  -- All legs resolved and all won (or push) → bet won.
  if resolved_legs = total_legs and won_legs > 0 then
    update bets set result = 'won' where id = p_bet_id and result != 'won';
    return;
  end if;
end $$;

-- Auto-settle the parent bet whenever a leg is resolved.
create or replace function on_leg_resolved() returns trigger
language plpgsql security definer as $$
begin
  if new.result is not null and (old.result is null or old.result != new.result) then
    perform settle_bet(new.bet_id);
  end if;
  return new;
end $$;

drop trigger if exists leg_resolved on bet_legs;
create trigger leg_resolved after update on bet_legs
  for each row execute function on_leg_resolved();

-- Backfill: create a single leg for every existing bet.
insert into bet_legs (bet_id, leg_order, description, odds, result)
select id, 1, description, odds, result from bets
where not exists (select 1 from bet_legs where bet_legs.bet_id = bets.id);
```

- [ ] **Step 2: Append to schema.sql**

Add the `bet_legs` table definition, RLS policies, and `settle_bet` function to the end of `supabase/schema.sql` (after the push_subscriptions block). Copy the `create table`, `alter table enable row level security`, and `create policy` statements (not the backfill INSERT).

- [ ] **Step 3: Run the migration**

Open the Supabase SQL Editor at `https://supabase.com/dashboard/project/ovehovuszzoyahclqjlz/sql/new` and paste+run the migration SQL. Verify "Success" with no errors.

- [ ] **Step 4: Verify**

Run in the SQL Editor:
```sql
select count(*) as legs from bet_legs;
select count(*) as bets from bets;
```
Both counts should match (every existing bet got backfilled with one leg).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/2026-09-08-bet-legs.sql supabase/schema.sql
git commit -m "feat(bets): add bet_legs table, parlay columns, settle_bet function"
```

---

### Task 2: Parlay Parser — multi-line input parsing + market detection

**Files:**
- Create: `src/lib/parlayParser.ts`

**Interfaces:**
- Consumes: nothing (pure functions)
- Produces:
  - `parseBetInput(raw: string): ParsedBet` — main entry point
  - `ParsedBet { type: 'single' | 'parlay'; legs: ParsedLeg[]; stake: string | null; combinedOdds: string | null; potentialPayout: number | null }`
  - `ParsedLeg { description: string; odds: string | null; marketType: MarketType; teamAbbr: string | null }`
  - `MarketType = 'moneyline' | 'spread' | 'over_under' | 'prop' | 'other'`

- [ ] **Step 1: Create parlayParser.ts**

Create `src/lib/parlayParser.ts`:

```typescript
export type MarketType = "moneyline" | "spread" | "over_under" | "prop" | "other";

export interface ParsedLeg {
  description: string;
  odds: string | null;
  marketType: MarketType;
  teamAbbr: string | null;
}

export interface ParsedBet {
  type: "single" | "parlay";
  legs: ParsedLeg[];
  stake: string | null;
  combinedOdds: string | null;
  potentialPayout: number | null;
}

const NFL_ABBRS = new Set([
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN",
  "DET","GB","HOU","IND","JAX","KC","LAC","LAR","LV","MIA",
  "MIN","NE","NO","NYG","NYJ","PHI","PIT","SEA","SF","TB","TEN","WSH",
]);

function parseOdds(text: string): { cleaned: string; odds: string | null } {
  let odds: string | null = null;
  let cleaned = text;
  const oddsMatch = cleaned.match(/(?:^|\s)([+-]\d{3,})\b/);
  if (oddsMatch) {
    odds = oddsMatch[1];
    cleaned = cleaned.replace(oddsMatch[0], "");
  }
  if (!odds) {
    const shortMatch = cleaned.match(/(?:^|\s)(-\d{2,3})\b/);
    if (shortMatch) {
      odds = shortMatch[1];
      cleaned = cleaned.replace(shortMatch[0], "");
    }
  }
  return { cleaned: cleaned.replace(/\s{2,}/g, " ").trim(), odds };
}

function detectMarketType(desc: string): MarketType {
  const d = desc.toLowerCase();
  if (/\bml\b|moneyline/i.test(d)) return "moneyline";
  if (/\b(over|under|o|u)\s*\d/i.test(d)) return "over_under";
  if (/[+-]\d{1,2}\.?5?\s/i.test(d) || /spread/i.test(d)) return "spread";
  if (/\b(td|touchdown|yard|passing|rushing|receiving|sack|int|reception)\b/i.test(d)) return "prop";
  // If it's just a team abbreviation, assume moneyline.
  const words = desc.replace(/[+-]\d+/g, "").trim().split(/\s+/);
  if (words.length <= 2 && words.some((w) => NFL_ABBRS.has(w.toUpperCase()))) return "moneyline";
  return "other";
}

function detectTeamAbbr(desc: string): string | null {
  const words = desc.toUpperCase().split(/\s+/);
  for (const w of words) {
    if (NFL_ABBRS.has(w)) return w;
  }
  return null;
}

function parseLeg(line: string): ParsedLeg {
  const { cleaned, odds } = parseOdds(line);
  return {
    description: cleaned,
    odds,
    marketType: detectMarketType(cleaned),
    teamAbbr: detectTeamAbbr(cleaned),
  };
}

function oddsToImplied(american: string): number {
  const n = parseFloat(american);
  if (isNaN(n)) return 0.5;
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100);
}

function impliedToAmerican(prob: number): string {
  if (prob <= 0 || prob >= 1) return "+100";
  if (prob >= 0.5) return `-${Math.round((prob / (1 - prob)) * 100)}`;
  return `+${Math.round(((1 - prob) / prob) * 100)}`;
}

function calcPayout(stake: number, americanOdds: number): number {
  if (americanOdds > 0) return stake * (americanOdds / 100);
  if (americanOdds < 0) return stake * (100 / Math.abs(americanOdds));
  return 0;
}

export function parseBetInput(raw: string): ParsedBet {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { type: "single", legs: [], stake: null, combinedOdds: null, potentialPayout: null };

  // Extract stake from any line matching $amount.
  let stake: string | null = null;
  const legLines: string[] = [];
  for (const line of lines) {
    const stakeMatch = line.match(/^\$\s?(\d+(?:\.\d{1,2})?)$/);
    if (stakeMatch && !stake) {
      stake = `$${stakeMatch[1]}`;
    } else if (!stake) {
      const inlineStake = line.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
      if (inlineStake && lines.length === 1) {
        stake = `$${inlineStake[1]}`;
      }
      legLines.push(line);
    } else {
      legLines.push(line);
    }
  }

  // For single-line input, extract stake from within the line.
  if (legLines.length === 1 && !stake) {
    const inlineStake = legLines[0].match(/\$\s?(\d+(?:\.\d{1,2})?)/);
    if (inlineStake) {
      stake = `$${inlineStake[1]}`;
      legLines[0] = legLines[0].replace(inlineStake[0], "").trim();
    }
  }

  const legs = legLines.map(parseLeg).filter((l) => l.description.length > 0);
  const type = legs.length > 1 ? "parlay" : "single";

  // Combined parlay odds.
  let combinedOdds: string | null = null;
  let potentialPayout: number | null = null;
  if (type === "parlay" && legs.every((l) => l.odds)) {
    const combined = legs.reduce((prob, l) => prob * oddsToImplied(l.odds!), 1);
    combinedOdds = impliedToAmerican(combined);
    if (stake) {
      const s = parseFloat(stake.replace("$", ""));
      const o = parseFloat(combinedOdds);
      if (!isNaN(s) && !isNaN(o)) potentialPayout = calcPayout(s, o);
    }
  } else if (type === "single" && legs[0]?.odds && stake) {
    const s = parseFloat(stake.replace("$", ""));
    const o = parseFloat(legs[0].odds);
    if (!isNaN(s) && !isNaN(o)) potentialPayout = calcPayout(s, o);
  }

  return { type, legs, stake, combinedOdds, potentialPayout };
}
```

- [ ] **Step 2: Verify the build passes**

```bash
cd ~/Projects/adams-hall-fantasy && npx next build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/lib/parlayParser.ts
git commit -m "feat(bets): add parlay parser with market detection and combined odds"
```

---

### Task 3: BetBook UI — textarea, parlay preview, leg display, verifier buttons

**Files:**
- Modify: `src/components/BetBook.tsx`

**Interfaces:**
- Consumes: `parseBetInput` from `src/lib/parlayParser.ts`, `bet_legs` table via Supabase client
- Produces: updated BetBook component with parlay entry, leg display, and non-bettor verification buttons

This is the largest task. The changes to `BetBook.tsx`:

1. **Replace `<input>` with `<textarea>`** for the quick-log field
2. **Use `parseBetInput()` instead of `smartParse()`** for the live preview
3. **Show parlay preview** — each parsed leg with odds, combined odds, payout at bottom
4. **On submit, insert bet + legs** — insert into `bets` then `bet_legs` for each leg
5. **Fetch legs alongside bets** — join or second query for `bet_legs`
6. **BetCard shows legs** — vertical checklist for parlays
7. **Verifier buttons** — only show resolve buttons to non-bettors, on pending legs
8. **Disable bettor's own resolve** — bettor sees status but no buttons

- [ ] **Step 1: Add leg state + fetching**

At the top of `BetBook.tsx`, add imports and leg type:

```typescript
import { parseBetInput, type ParsedBet } from "@/lib/parlayParser";
```

Add a `Leg` interface and update the `Bet` interface:

```typescript
interface Leg {
  id: number;
  bet_id: number;
  leg_order: number;
  description: string;
  market_type: string;
  team_abbr: string | null;
  odds: string | null;
  result: string | null;
  resolved_by: string | null;
}
```

Add `bet_type` and `combined_odds` to the `Bet` interface. Add a `legs` state: `const [legs, setLegs] = useState<Leg[]>([])`. Fetch legs in the same `useEffect` that fetches bets:

```typescript
supabase.from("bet_legs").select("*").order("leg_order")
  .then(({ data }) => setLegs((data as Leg[]) ?? []));
```

- [ ] **Step 2: Replace input with textarea + parseBetInput**

Change the quick-log `<input>` to a `<textarea>` with `rows={1}` that auto-grows:

```typescript
<textarea
  required
  autoFocus
  rows={1}
  placeholder="Chiefs ML +150 $25 — or one leg per line for a parlay"
  value={quickText}
  onChange={(e) => setQuickText(e.target.value)}
  onInput={(e) => {
    const t = e.target as HTMLTextAreaElement;
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  }}
  className={`${input} text-base resize-none`}
/>
```

Replace `smartParse(quickText)` with `parseBetInput(quickText)`. Update the preview section to show each parsed leg for parlays, with combined odds and payout at bottom.

- [ ] **Step 3: Update submit to insert bet + legs**

In the `submit()` function, after inserting the bet row, insert legs:

```typescript
const parsed = parseBetInput(quickText);
const betRow = {
  description: parsed.type === "parlay"
    ? `${parsed.legs.length}-Leg Parlay`
    : parsed.legs[0]?.description ?? "",
  share_url: shareUrl.trim() || null,
  odds: parsed.type === "parlay" ? parsed.combinedOdds : parsed.legs[0]?.odds ?? null,
  stake: parsed.stake,
  note: note.trim() || null,
  result: "pending" as const,
  posted_by: myId,
  bettor_tag: tag,
  bet_type: parsed.type,
  combined_odds: parsed.combinedOdds,
};

const { data: newBet, error: betErr } = await supabase
  .from("bets").insert(betRow).select("id").single();
if (betErr || !newBet) { setError(betErr?.message ?? "Failed"); setBusy(false); return; }

if (parsed.legs.length > 0) {
  const legRows = parsed.legs.map((leg, i) => ({
    bet_id: newBet.id,
    leg_order: i + 1,
    description: leg.description,
    market_type: leg.marketType,
    team_abbr: leg.teamAbbr,
    odds: leg.odds,
    result: "pending",
  }));
  await supabase.from("bet_legs").insert(legRows);
}
```

- [ ] **Step 4: Update BetCard to show legs**

Add a `LegList` sub-component inside `BetBook.tsx`:

```typescript
function LegList({ betLegs, canVerify, onResolveLeg }: {
  betLegs: Leg[];
  canVerify: boolean;
  onResolveLeg: (legId: number, result: string) => void;
}) {
  if (betLegs.length <= 1) return null;
  return (
    <div className="mt-2 space-y-1.5 border-t border-line pt-2">
      {betLegs.map((leg) => (
        <div key={leg.id} className="flex items-center gap-2 text-xs">
          <span className={`w-4 text-center ${
            leg.result === "won" ? "text-emerald-400" : leg.result === "lost" ? "text-blood" : "text-gold"
          }`}>
            {leg.result === "won" ? "✓" : leg.result === "lost" ? "✗" : "●"}
          </span>
          <span className={`flex-1 ${leg.result === "lost" ? "line-through text-cream-dim" : ""}`}>
            {leg.description}
          </span>
          {leg.odds && <span className="text-cream-dim">{leg.odds}</span>}
          {canVerify && (!leg.result || leg.result === "pending") && (
            <div className="flex gap-1">
              {(["won", "lost", "push"] as const).map((r) => (
                <button key={r} onClick={() => onResolveLeg(leg.id, r)}
                  className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream-dim hover:border-gold hover:text-cream">
                  {r === "won" ? "W" : r === "lost" ? "L" : "P"}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

In `BetCard`, add a prop for `betLegs: Leg[]` and `canVerify: boolean` and `onResolveLeg`. Render `<LegList>` inside the card after the description line. Pass `canVerify = !isBettor` where `isBettor = bet.posted_by === myId`.

- [ ] **Step 5: Wire up leg resolution**

Add a `resolveLeg` function:

```typescript
async function resolveLeg(legId: number, result: string) {
  if (!supabase || !user) return;
  const { error: err } = await supabase
    .from("bet_legs")
    .update({ result, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", legId);
  if (err) { setError(err.message); return; }
  setLegs((ls) => ls.map((l) => l.id === legId ? { ...l, result, resolved_by: user.id } : l));
  reload(); // re-fetch bets to pick up any settle_bet() side effects
}
```

Remove the old `updateResult` buttons for bets that have legs (the leg-level buttons replace them). Keep the old buttons only for legacy single bets that have no `bet_type` column (backward compat during transition).

- [ ] **Step 6: Remove old smartParse, clean up unused code**

Delete the `smartParse()` function from `BetBook.tsx` (replaced by `parseBetInput` from `parlayParser.ts`). Remove the old `parsed` / `preview` references and replace with the new parser output.

- [ ] **Step 7: Build and verify**

```bash
cd ~/Projects/adams-hall-fantasy && npx next build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully`

- [ ] **Step 8: Commit**

```bash
git add src/components/BetBook.tsx
git commit -m "feat(bets): parlay entry, leg display, and non-bettor verification UI"
```

---

### Task 4: Targeted Push Notifications — member_ids filter

**Files:**
- Modify: `supabase/functions/send-notification/index.ts`

**Interfaces:**
- Consumes: `push_subscriptions` table, `members` table
- Produces: accepts optional `member_ids: string[]` in the POST body; when provided, only sends to those members' subscriptions

- [ ] **Step 1: Update the Edge Function**

In `supabase/functions/send-notification/index.ts`, update the request body parsing:

```typescript
const { title, body, url, member_ids } = await req.json();
```

Update the subscription query to filter by member_ids when provided:

```typescript
let query = admin.from("push_subscriptions").select("*");
if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
  query = query.in("member_id", member_ids);
}
const { data: subs } = await query;
```

Everything else stays the same.

- [ ] **Step 2: Deploy**

```bash
cd ~/Projects/adams-hall-fantasy && npx supabase functions deploy send-notification
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-notification/index.ts
git commit -m "feat(push): add member_ids filter for targeted notifications"
```

---

### Task 5: Resolve-Bets Edge Function — ESPN scores + auto-resolution + verification notifications

**Files:**
- Create: `supabase/functions/resolve-bets/index.ts`

**Interfaces:**
- Consumes: ESPN scoreboard API, `bet_legs` table, `bets` table, `members` table, `send-notification` Edge Function (via internal fetch)
- Produces: auto-resolves pending legs, sends targeted push notifications for unresolvable legs

- [ ] **Step 1: Create the Edge Function**

Create `supabase/functions/resolve-bets/index.ts`:

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

interface EspnGame {
  id: string;
  completed: boolean;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  homeWinner: boolean;
  awayWinner: boolean;
  total: number;
}

async function fetchScoreboard(): Promise<EspnGame[]> {
  const res = await fetch(ESPN_SCOREBOARD);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events ?? []).map((e: any) => {
    const c = e.competitions[0];
    const home = c.competitors.find((x: any) => x.homeAway === "home");
    const away = c.competitors.find((x: any) => x.homeAway === "away");
    return {
      id: e.id,
      completed: Boolean(c.status?.type?.completed),
      homeAbbr: home?.team?.abbreviation ?? "",
      awayAbbr: away?.team?.abbreviation ?? "",
      homeScore: Number(home?.score ?? 0),
      awayScore: Number(away?.score ?? 0),
      homeWinner: Boolean(home?.winner),
      awayWinner: Boolean(away?.winner),
      total: Number(home?.score ?? 0) + Number(away?.score ?? 0),
    };
  });
}

function findGame(games: EspnGame[], leg: any): EspnGame | null {
  if (leg.event_id) return games.find((g) => g.id === leg.event_id) ?? null;
  if (leg.team_abbr) {
    const abbr = leg.team_abbr.toUpperCase();
    return games.find((g) => g.homeAbbr === abbr || g.awayAbbr === abbr) ?? null;
  }
  return null;
}

function resolveLeg(
  leg: any,
  game: EspnGame,
): "won" | "lost" | "push" | null {
  const abbr = (leg.team_abbr ?? "").toUpperCase();
  const isHome = game.homeAbbr === abbr;
  const teamScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;
  const teamWon = isHome ? game.homeWinner : game.awayWinner;

  switch (leg.market_type) {
    case "moneyline":
      return teamWon ? "won" : "lost";

    case "spread": {
      const line = Number(leg.line);
      if (isNaN(line)) return null;
      const adjusted = teamScore + line;
      if (adjusted > oppScore) return "won";
      if (adjusted < oppScore) return "lost";
      return "push";
    }

    case "over_under": {
      const line = Number(leg.line);
      if (isNaN(line)) return null;
      const desc = (leg.description ?? "").toLowerCase();
      const isOver = desc.includes("over") || desc.startsWith("o ");
      if (game.total > line) return isOver ? "won" : "lost";
      if (game.total < line) return isOver ? "lost" : "won";
      return "push";
    }

    default:
      return null; // prop/other — needs manual verification
  }
}

// Verification crew: everyone except the bettor.
// Hardcoded ESPN owner IDs for the three verifiers.
const VERIFIER_MAP: Record<string, string[]> = {};
// Built dynamically from members table at runtime.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Load pending legs.
  const { data: pendingLegs } = await admin
    .from("bet_legs")
    .select("*, bets!inner(id, posted_by, bettor_tag)")
    .or("result.is.null,result.eq.pending");

  if (!pendingLegs || pendingLegs.length === 0) {
    return Response.json({ message: "no pending legs", resolved: 0 });
  }

  const games = await fetchScoreboard();
  if (games.length === 0) {
    return Response.json({ message: "no games on scoreboard", resolved: 0 });
  }

  let resolved = 0;
  const needsVerification: { leg: any; game: EspnGame }[] = [];

  for (const leg of pendingLegs) {
    const game = findGame(games, leg);
    if (!game || !game.completed) continue;

    const result = resolveLeg(leg, game);
    if (result) {
      await admin
        .from("bet_legs")
        .update({ result, resolved_at: new Date().toISOString() })
        .eq("id", leg.id);
      resolved++;
    } else {
      needsVerification.push({ leg, game });
    }
  }

  // Send targeted notifications for legs needing manual verification.
  if (needsVerification.length > 0) {
    const { data: allMembers } = await admin.from("members").select("id, espn_owner_id, display_name");
    const memberMap = new Map((allMembers ?? []).map((m: any) => [m.id, m]));

    for (const { leg } of needsVerification) {
      const bet = leg.bets;
      const bettorId = bet.posted_by;
      const verifiers = (allMembers ?? [])
        .filter((m: any) => m.id !== bettorId)
        .map((m: any) => m.id);

      const bettorName = memberMap.get(bettorId)?.display_name ?? "Someone";
      const tag = bet.bettor_tag ?? "jorge";

      // Call send-notification with targeted member_ids.
      const notifUrl = `${supabaseUrl}/functions/v1/send-notification`;
      await fetch(notifUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          title: "Verify Bet",
          body: `${bettorName}: ${leg.description} — game over, needs W/L`,
          url: `/betting/${tag}s-book/`,
          member_ids: verifiers,
        }),
      });
    }
  }

  return Response.json({ resolved, needsVerification: needsVerification.length });
});
```

- [ ] **Step 2: Deploy**

```bash
cd ~/Projects/adams-hall-fantasy && npx supabase functions deploy resolve-bets
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/resolve-bets/
git commit -m "feat(bets): add resolve-bets Edge Function for auto-resolution via ESPN"
```

---

### Task 6: Cron Setup — schedule resolve-bets + notification trigger

**Files:**
- Create: `supabase/migrations/2026-09-08-bet-resolve-cron.sql`

**Interfaces:**
- Consumes: `resolve-bets` Edge Function URL, Vault secrets
- Produces: pg_cron job running every 15 minutes

- [ ] **Step 1: Write the cron migration**

Create `supabase/migrations/2026-09-08-bet-resolve-cron.sql`:

```sql
-- Call the resolve-bets Edge Function every 15 minutes.
-- Uses pg_net to POST to the Edge Function with the service_role key.
create or replace function call_resolve_bets() returns void
language plpgsql security definer as $$
declare
  func_url text;
  service_key text;
begin
  select decrypted_secret into func_url
    from vault.decrypted_secrets where name = 'resolve_bets_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if func_url is null or service_key is null then return; end if;

  perform net.http_post(
    url := func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
end $$;

select cron.schedule('resolve-bets', '*/15 * * * *', 'select call_resolve_bets()');
```

- [ ] **Step 2: Run the migration + add Vault secret**

In the Supabase SQL Editor, run the migration. Then add the Vault secret:

```sql
select vault.create_secret(
  'https://ovehovuszzoyahclqjlz.supabase.co/functions/v1/resolve-bets',
  'resolve_bets_url'
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-09-08-bet-resolve-cron.sql
git commit -m "feat(bets): pg_cron job to auto-resolve bets every 15 minutes"
```

- [ ] **Step 4: Final build + push**

```bash
cd ~/Projects/adams-hall-fantasy && npx next build && git push
```

Verify the build passes and all code is pushed to GitHub.

---

## Verification Checklist

After all tasks are complete:

1. **Single bet entry** — type "Chiefs ML +150 $25" → submits as single bet with 1 leg → shows in the bet book with the same UI as before
2. **Parlay entry** — type 3 lines + stake → submits as parlay → shows with leg checklist and combined odds
3. **Existing bets** — all prior bets still display correctly (backfilled with 1 leg each)
4. **Verifier buttons** — log in as non-bettor → see W/L/P buttons on pending legs. Log in as bettor → see status only, no buttons.
5. **Auto-resolution** — after an NFL game goes final, the cron resolves matching legs within 15 minutes. Parent bet auto-settles when all legs are decided.
6. **Verification notification** — for prop/other legs on completed games, push notification goes to non-bettors.
7. **Build passes** — `npx next build` succeeds with no TypeScript errors.
