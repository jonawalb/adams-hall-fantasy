-- Jorge's Book: bet tracking for Jorge Velasco.
create table if not exists bets (
  id bigint generated always as identity primary key,
  posted_by uuid not null references members (id) on delete cascade,
  description text not null,
  share_url text,
  odds text,
  stake text,
  result text check (result is null or result in ('pending', 'won', 'lost', 'push', 'cashout')),
  note text,
  created_at timestamptz not null default now()
);
alter table bets enable row level security;

-- Everyone can read bets.
create policy "bets readable by members"
  on bets for select using (auth.uid() is not null);

-- Only Jorge and commissioner can post.
create or replace function is_jorge() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (is_commissioner or espn_owner_id = '{3C8B8C86-A5CE-4EDE-8B8C-86A5CE5EDE7F}')
  );
$$;

create policy "bets insert by jorge"
  on bets for insert with check (posted_by = auth.uid() and is_jorge());
create policy "bets update by jorge"
  on bets for update using (posted_by = auth.uid() and is_jorge());
create policy "bets delete by jorge"
  on bets for delete using (posted_by = auth.uid() and is_jorge());
