-- Emoji reactions on posts (one per member per post per emoji).
create table if not exists post_reactions (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, member_id, emoji)
);
alter table post_reactions enable row level security;
create policy "post reactions readable by members"
  on post_reactions for select using (auth.uid() is not null);
create policy "own post reactions insert"
  on post_reactions for insert with check (member_id = auth.uid());
create policy "own post reactions delete"
  on post_reactions for delete using (member_id = auth.uid());

-- Threaded comments on posts.
create table if not exists post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts (id) on delete cascade,
  parent_id bigint references post_comments (id) on delete cascade,
  author uuid not null references members (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table post_comments enable row level security;
create policy "post comments readable by members"
  on post_comments for select using (auth.uid() is not null);
create policy "post comments insert by members"
  on post_comments for insert with check (author = auth.uid());
create policy "own post comments delete"
  on post_comments for delete using (author = auth.uid());
