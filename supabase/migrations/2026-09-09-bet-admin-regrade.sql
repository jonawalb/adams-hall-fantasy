-- Admin re-grading: let commissioners and Ethan undo/change leg and bet results.

-- Who can admin-override bet results (regrade legs, undo settlements).
create or replace function is_bet_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (
        is_commissioner                                                    -- Jonathan
        or espn_owner_id = '{63997D52-0196-4BC4-B322-161E7342C352}'      -- Ethan
        or espn_owner_id = '{C2489537-0A8B-4E67-9914-7A2C71341A12}'      -- Nishok
      )
  );
$$;

-- Widen leg update: non-bettors can still grade pending legs,
-- but bet admins can update ANY leg (including already-resolved ones).
drop policy if exists "legs resolve by non-bettor" on bet_legs;
create policy "legs resolve by non-bettor or admin"
  on bet_legs for update using (
    auth.uid() is not null
    and (
      -- Admin override: can regrade any leg on any bet.
      is_bet_admin()
      -- Non-bettor grading: can grade legs on bets they didn't post.
      or not exists (
        select 1 from bets where bets.id = bet_legs.bet_id and bets.posted_by = auth.uid()
      )
    )
  );

-- Update settle_bet to handle undo: when legs go back to pending,
-- the parent bet should revert to pending too.
create or replace function settle_bet(p_bet_id bigint) returns void
language plpgsql security definer as $$
declare
  total_legs int;
  resolved_legs int;
  won_legs int;
  lost_legs int;
  push_legs int;
begin
  select count(*),
         count(case when result in ('won', 'lost', 'push') then 1 end),
         count(case when result = 'won' then 1 end),
         count(case when result = 'lost' then 1 end),
         count(case when result = 'push' then 1 end)
  into total_legs, resolved_legs, won_legs, lost_legs, push_legs
  from bet_legs where bet_id = p_bet_id;

  if total_legs = 0 then return; end if;

  -- Any lost leg = entire bet lost.
  if lost_legs > 0 then
    update bets set result = 'lost' where id = p_bet_id and result is distinct from 'lost';
    return;
  end if;

  -- All legs resolved and all won (or push) = bet won.
  if resolved_legs = total_legs and won_legs > 0 then
    update bets set result = 'won' where id = p_bet_id and result is distinct from 'won';
    return;
  end if;

  -- All legs are pushes = bet is push.
  if resolved_legs = total_legs and push_legs = total_legs then
    update bets set result = 'push' where id = p_bet_id and result is distinct from 'push';
    return;
  end if;

  -- Still have unresolved legs (or legs were undone) = back to pending.
  if resolved_legs < total_legs then
    update bets set result = 'pending' where id = p_bet_id and result is distinct from 'pending';
    return;
  end if;
end $$;

-- Re-create trigger to fire on ALL result changes (including undo).
drop trigger if exists leg_resolved on bet_legs;
create trigger leg_resolved after update on bet_legs
  for each row execute function on_leg_resolved();

-- Update the trigger function to fire on any result change, not just non-null.
create or replace function on_leg_resolved() returns trigger
language plpgsql security definer as $$
begin
  if old.result is distinct from new.result then
    perform settle_bet(new.bet_id);
  end if;
  return new;
end $$;
