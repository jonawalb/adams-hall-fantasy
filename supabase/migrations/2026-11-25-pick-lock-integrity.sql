-- Run once in the Supabase SQL editor.
-- Matchup Pick'Em rows saved while the site had no NFL slate for that week
-- were stored with lock_at = NULL, and the RLS policies treat NULL as "never
-- locks", so those picks stayed editable after the matchup was decided.
-- 1) See which rows are affected (run this first and note the output):
select member_id, week, matchup_id, created_at, updated_at
from matchup_picks where season = 2026 and lock_at is null order by week, updated_at;

-- 2) Backfill each week's real lock (first NFL kickoff; weeks 8 and 9 = commissioner extensions).
update matchup_picks mp set lock_at = l.lock_at
from (values
  (1, timestamptz '2026-09-10T00:20Z'),
  (2, timestamptz '2026-09-18T00:15Z'),
  (3, timestamptz '2026-09-25T00:15Z'),
  (4, timestamptz '2026-10-02T00:15Z'),
  (5, timestamptz '2026-10-09T00:15Z'),
  (6, timestamptz '2026-10-16T00:15Z'),
  (7, timestamptz '2026-10-23T00:15Z'),
  (8, timestamptz '2026-10-30T01:00Z'),
  (9, timestamptz '2026-11-06T02:00Z'),
  (10, timestamptz '2026-11-13T01:15Z'),
  (11, timestamptz '2026-11-20T01:15Z'),
  (12, timestamptz '2026-11-26T01:00Z')
) as l(week, lock_at)
where mp.season = 2026 and mp.week = l.week and mp.lock_at is null;

-- 3) Never accept a pick without a lock again.
drop policy if exists "own matchup picks insert" on matchup_picks;
create policy "own matchup picks insert"
  on matchup_picks for insert with check (member_id = auth.uid() and lock_at is not null and lock_at > now());
drop policy if exists "own matchup picks update" on matchup_picks;
create policy "own matchup picks update"
  on matchup_picks for update
  using (member_id = auth.uid() and lock_at is not null and lock_at > now())
  with check (member_id = auth.uid() and lock_at is not null and lock_at > now());

-- 4) NFL picks: the update policy had no WITH CHECK, so a pick row could be
-- rewritten with any kickoff. Require the new row to still be before kickoff.
drop policy if exists "own picks update before kickoff" on picks;
create policy "own picks update before kickoff"
  on picks for update
  using (member_id = auth.uid() and kickoff > now())
  with check (member_id = auth.uid() and kickoff > now());
