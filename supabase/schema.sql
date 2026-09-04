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

-- Members may fix their own display name (set on the /welcome page).
create policy "own member row update"
  on members for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-provision the members row when an invited account is created.
-- Invite metadata comes from scripts/invite-members.mjs.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into members (id, display_name, espn_owner_id, is_commissioner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.raw_user_meta_data->>'espn_owner_id',
    coalesce((new.raw_user_meta_data->>'is_commissioner')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

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

-- ---------------------------------------------------------------------------
-- Added 2026-09-02 (see supabase/migrations/ for the deltas applied to the
-- live project).

-- Other members' picks stay hidden until kickoff.
drop policy if exists "picks readable by members" on picks;
create policy "picks readable by members"
  on picks for select
  using (auth.uid() is not null and (member_id = auth.uid() or kickoff <= now()));

-- The South Star Narrative: member-written blog posts.
create table if not exists posts (
  id bigint generated always as identity primary key,
  title text not null,
  byline text not null,
  body text not null,
  author uuid not null references members (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table posts enable row level security;
create policy "posts readable by members"
  on posts for select using (auth.uid() is not null);
create policy "posts insert by members"
  on posts for insert with check (author = auth.uid());
create policy "own posts delete"
  on posts for delete using (author = auth.uid());
create table if not exists videos (
  id bigint generated always as identity primary key,
  title text not null,
  url text,
  storage_path text,
  posted_by uuid not null references members (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (url is not null or storage_path is not null)
);
alter table videos enable row level security;

create or replace function is_tape_crew() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (is_commissioner or espn_owner_id = '{C2489537-0A8B-4E67-9914-7A2C71341A12}')
  );
$$;

create policy "videos readable by members"
  on videos for select using (auth.uid() is not null);
create policy "videos insert by tape crew"
  on videos for insert with check (posted_by = auth.uid() and is_tape_crew());
create policy "own videos delete"
  on videos for delete using (posted_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'image/gif'])
on conflict (id) do nothing;

create policy "videos bucket read by members"
  on storage.objects for select using (bucket_id = 'videos' and auth.uid() is not null);
create policy "videos bucket upload by tape crew"
  on storage.objects for insert with check (bucket_id = 'videos' and is_tape_crew());
create policy "videos bucket delete own"
  on storage.objects for delete using (bucket_id = 'videos' and owner = auth.uid());
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

-- Boards share the posts table: 'south-star' (parody blog) and 'trash' (Talk Your Shit forum).
alter table posts add column if not exists board text not null default 'south-star';
create index if not exists posts_board_created_idx on posts (board, created_at desc);
returns table (member_id uuid, picks bigint)
language sql stable security definer set search_path = public as $$
  select member_id, count(*)
  from picks
  where season = p_season and week = p_week and auth.uid() is not null
  group by member_id;
$$;
