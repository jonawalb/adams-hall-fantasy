-- Run once in the Supabase SQL editor.
-- Thanksgiving Wishbone: each member names one rival for the week. Whoever
-- scores fewer fantasy points that week is "Carved". Picks are public right
-- away (calling someone out is the point) and lock at lock_at, which the
-- server fixes per week below so the browser can't move it.
create table if not exists wishbones (
  id bigint generated always as identity primary key,
  season int not null,
  week int not null,
  member_id uuid not null references members (id) on delete cascade,
  rival_id uuid not null references members (id) on delete cascade,
  trash text check (char_length(trash) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, week, member_id),
  check (rival_id <> member_id)
);

create or replace function wishbone_lock(p_season int, p_week int) returns timestamptz
language sql immutable as $$
  select case when p_season = 2026 and p_week = 12 then timestamptz '2026-11-29T18:00Z' end;
$$;

alter table wishbones enable row level security;
drop policy if exists "wishbones readable by members" on wishbones;
create policy "wishbones readable by members"
  on wishbones for select using (auth.uid() is not null);
drop policy if exists "own wishbone insert" on wishbones;
create policy "own wishbone insert"
  on wishbones for insert
  with check (member_id = auth.uid() and wishbone_lock(season, week) > now());
drop policy if exists "own wishbone update" on wishbones;
create policy "own wishbone update"
  on wishbones for update
  using (member_id = auth.uid() and wishbone_lock(season, week) > now())
  with check (member_id = auth.uid() and wishbone_lock(season, week) > now());
drop trigger if exists wishbones_touch on wishbones;
create trigger wishbones_touch before update on wishbones
  for each row execute function touch_updated_at();
