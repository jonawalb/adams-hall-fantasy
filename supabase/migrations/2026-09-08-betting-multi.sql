-- Add bettor_tag to separate Jorge's and Ethan's bets.
alter table bets add column if not exists bettor_tag text not null default 'jorge';

-- Widen insert/update/delete: commissioner, Jorge, or Ethan can manage their own bets.
create or replace function is_bettor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (
        is_commissioner
        or espn_owner_id = '{3C8B8C86-A5CE-4EDE-8B8C-86A5CE5EDE7F}'  -- Jorge
        or espn_owner_id = '{63997D52-0196-4BC4-B322-161E7342C352}'  -- Ethan
      )
  );
$$;

-- Replace the old Jorge-only policies.
drop policy if exists "bets insert by jorge" on bets;
drop policy if exists "bets update by jorge" on bets;
drop policy if exists "bets delete by jorge" on bets;

create policy "bets insert by bettor"
  on bets for insert with check (posted_by = auth.uid() and is_bettor());
create policy "bets update by bettor"
  on bets for update using (posted_by = auth.uid() and is_bettor());
create policy "bets delete by bettor"
  on bets for delete using (posted_by = auth.uid() and is_bettor());
