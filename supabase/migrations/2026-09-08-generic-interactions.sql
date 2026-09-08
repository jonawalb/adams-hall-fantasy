-- Replace post-specific tables with generic ones that work across posts, bets, etc.
drop table if exists post_comments cascade;
drop table if exists post_reactions cascade;

-- Generic reactions: target_type ('post','bet'), target_id references the row.
create table if not exists reactions (
  id bigint generated always as identity primary key,
  target_type text not null,
  target_id bigint not null,
  member_id uuid not null references members (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, member_id, emoji)
);
alter table reactions enable row level security;
create policy "reactions readable by members"
  on reactions for select using (auth.uid() is not null);
create policy "own reactions insert"
  on reactions for insert with check (member_id = auth.uid());
create policy "own reactions delete"
  on reactions for delete using (member_id = auth.uid());
create index reactions_target_idx on reactions (target_type, target_id);

-- Generic comments with threading.
create table if not exists comments (
  id bigint generated always as identity primary key,
  target_type text not null,
  target_id bigint not null,
  parent_id bigint references comments (id) on delete cascade,
  author uuid not null references members (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table comments enable row level security;
create policy "comments readable by members"
  on comments for select using (auth.uid() is not null);
create policy "comments insert by members"
  on comments for insert with check (author = auth.uid());
create policy "own comments delete"
  on comments for delete using (author = auth.uid());
create index comments_target_idx on comments (target_type, target_id);

-- Notifications: created when someone comments on your post/bet.
create table if not exists notifications (
  id bigint generated always as identity primary key,
  recipient uuid not null references members (id) on delete cascade,
  actor uuid not null references members (id) on delete cascade,
  kind text not null check (kind in ('comment', 'reply', 'reaction')),
  target_type text not null,
  target_id bigint not null,
  target_title text,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "own notifications readable"
  on notifications for select using (recipient = auth.uid());
create policy "notifications insert by members"
  on notifications for insert with check (actor = auth.uid());
create policy "own notifications update"
  on notifications for update using (recipient = auth.uid());
create index notifications_recipient_idx on notifications (recipient, read, created_at desc);
