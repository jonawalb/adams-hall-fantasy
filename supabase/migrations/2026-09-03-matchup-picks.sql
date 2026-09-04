-- Run once in the Supabase SQL editor.
-- Matchup Pick'Em: members pick the winner of each league matchup. Picks are
-- public immediately (the point is seeing who the league bets against) and
-- lock at the week's first NFL kickoff.
create table if not exists matchup_picks (
  id bigint generated always as identity primary key,
  member_id uuid not null references members (id) on delete cascade,
  season int not null,
  week int not null,
  matchup_id text not null,
  pick_team_id int not null,
  lock_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, season, week, matchup_id)
);
alter table matchup_picks enable row level security;
create policy "matchup picks readable by members"
  on matchup_picks for select using (auth.uid() is not null);
create policy "own matchup picks insert"
  on matchup_picks for insert with check (member_id = auth.uid() and (lock_at is null or lock_at > now()));
create policy "own matchup picks update"
  on matchup_picks for update using (member_id = auth.uid() and (lock_at is null or lock_at > now()));
drop trigger if exists matchup_picks_touch on matchup_picks;
create trigger matchup_picks_touch before update on matchup_picks
  for each row execute function touch_updated_at();
