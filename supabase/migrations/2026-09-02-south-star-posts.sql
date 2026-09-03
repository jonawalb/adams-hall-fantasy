-- Run once in the Supabase SQL editor.
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
