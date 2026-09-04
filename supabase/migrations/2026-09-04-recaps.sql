-- Run once in the Supabase SQL editor.
-- Weekly Recap articles. Drafts are visible only to the commissioner;
-- published recaps to every member.
create or replace function is_commissioner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where id = auth.uid() and is_commissioner);
$$;

create table if not exists recaps (
  id bigint generated always as identity primary key,
  season int not null,
  week int not null,
  title text not null,
  teaser text,
  body text not null,
  cover jsonb, -- e.g. {"logos": ["...","..."], "headline": "..."}
  status text not null default 'draft' check (status in ('draft', 'published')),
  author uuid references members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table recaps enable row level security;
create policy "recaps readable"
  on recaps for select using (auth.uid() is not null and (status = 'published' or is_commissioner()));
create policy "recaps commissioner insert"
  on recaps for insert with check (is_commissioner());
create policy "recaps commissioner update"
  on recaps for update using (is_commissioner());
create policy "recaps commissioner delete"
  on recaps for delete using (is_commissioner());
drop trigger if exists recaps_touch on recaps;
create trigger recaps_touch before update on recaps
  for each row execute function touch_updated_at();
