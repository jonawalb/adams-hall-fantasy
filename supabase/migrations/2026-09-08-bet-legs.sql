-- Add parlay support columns to bets.
alter table bets add column if not exists bet_type text not null default 'single'
  check (bet_type in ('single', 'parlay'));
alter table bets add column if not exists combined_odds text;

-- Individual bet legs.
create table if not exists bet_legs (
  id bigint generated always as identity primary key,
  bet_id bigint not null references bets (id) on delete cascade,
  leg_order int not null,
  description text not null,
  market_type text not null default 'other'
    check (market_type in ('moneyline', 'spread', 'over_under', 'prop', 'other')),
  team_abbr text,
  event_id text,
  line numeric,
  odds text,
  result text check (result is null or result in ('pending', 'won', 'lost', 'push')),
  resolved_by uuid references members (id),
  resolved_at timestamptz,
  unique (bet_id, leg_order)
);

alter table bet_legs enable row level security;

create policy "legs readable by members"
  on bet_legs for select using (auth.uid() is not null);

create policy "legs insert by bettor"
  on bet_legs for insert with check (
    exists (select 1 from bets where bets.id = bet_legs.bet_id and bets.posted_by = auth.uid())
  );

-- Only non-bettors can resolve legs (the bettor can't grade their own).
create policy "legs resolve by non-bettor"
  on bet_legs for update using (
    auth.uid() is not null
    and not exists (
      select 1 from bets where bets.id = bet_legs.bet_id and bets.posted_by = auth.uid()
    )
  );

-- Settle a bet based on its legs' results. Called after any leg update.
create or replace function settle_bet(p_bet_id bigint) returns void
language plpgsql security definer as $$
declare
  total_legs int;
  resolved_legs int;
  won_legs int;
  lost_legs int;
begin
  select count(*), count(result), count(case when result = 'won' then 1 end),
         count(case when result = 'lost' then 1 end)
  into total_legs, resolved_legs, won_legs, lost_legs
  from bet_legs where bet_id = p_bet_id;

  if total_legs = 0 then return; end if;

  -- Any lost leg = entire bet lost.
  if lost_legs > 0 then
    update bets set result = 'lost' where id = p_bet_id and result != 'lost';
    return;
  end if;

  -- All legs resolved and all won (or push) = bet won.
  if resolved_legs = total_legs and won_legs > 0 then
    update bets set result = 'won' where id = p_bet_id and result != 'won';
    return;
  end if;
end $$;

-- Auto-settle the parent bet whenever a leg is resolved.
create or replace function on_leg_resolved() returns trigger
language plpgsql security definer as $$
begin
  if new.result is not null and (old.result is null or old.result != new.result) then
    perform settle_bet(new.bet_id);
  end if;
  return new;
end $$;

drop trigger if exists leg_resolved on bet_legs;
create trigger leg_resolved after update on bet_legs
  for each row execute function on_leg_resolved();

-- Backfill: create a single leg for every existing bet.
insert into bet_legs (bet_id, leg_order, description, odds, result)
select id, 1, description, odds, result from bets
where not exists (select 1 from bet_legs where bet_legs.bet_id = bets.id);
