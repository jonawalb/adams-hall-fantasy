-- Adams Hall Fantasy League — Supabase schema
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Auth model: 10 invite-only accounts created by the commissioner in the
-- dashboard (Authentication → Users → Invite). Public signups stay OFF
-- (Authentication → Providers → Email → disable signups).

-- Members: one row per league member, linked to their auth account.
create table if not exists members (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  espn_owner_id text unique, -- ESPN member GUID, e.g. {75AC5FD8-...}
  is_commissioner boolean not null default false,
  created_at timestamptz not null default now()
);

-- Weekly NFL pick'em picks: one row per member per game.
create table if not exists picks (
  id bigint generated always as identity primary key,
  member_id uuid not null references members (id) on delete cascade,
  season int not null,
  week int not null,
  game_id text not null, -- ESPN scoreboard event id
  pick text not null check (pick in ('home', 'away')),
  kickoff timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, season, week, game_id)
);

-- Quote wall.
create table if not exists quotes (
  id bigint generated always as identity primary key,
  text text not null,
  attributed_to text not null,
  context text,
  said_on date,
  submitted_by uuid not null references members (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Emoji reactions on quotes: one per member per quote per emoji.
create table if not exists quote_reactions (
  id bigint generated always as identity primary key,
  quote_id bigint not null references quotes (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (quote_id, member_id, emoji)
);

-- Row Level Security: everything requires a signed-in member.
alter table members enable row level security;
alter table picks enable row level security;
alter table quotes enable row level security;
alter table quote_reactions enable row level security;

create policy "members readable by members"
  on members for select using (auth.uid() is not null);

create policy "picks readable by members"
  on picks for select using (auth.uid() is not null);
create policy "own picks insert"
  on picks for insert with check (member_id = auth.uid() and kickoff > now());
create policy "own picks update before kickoff"
  on picks for update using (member_id = auth.uid() and kickoff > now());

create policy "quotes readable by members"
  on quotes for select using (auth.uid() is not null);
create policy "quotes insert by members"
  on quotes for insert with check (submitted_by = auth.uid());
create policy "own quotes delete"
  on quotes for delete using (submitted_by = auth.uid());

create policy "reactions readable by members"
  on quote_reactions for select using (auth.uid() is not null);
create policy "own reactions insert"
  on quote_reactions for insert with check (member_id = auth.uid());
create policy "own reactions delete"
  on quote_reactions for delete using (member_id = auth.uid());

-- Keep picks.updated_at fresh.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists picks_touch on picks;
create trigger picks_touch before update on picks
  for each row execute function touch_updated_at();
