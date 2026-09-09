-- Verifiers: members who can confirm/change bet results.
-- Jonathan (commissioner), Nishok, Colin M, Dylan.
create or replace function is_bet_verifier() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (
        is_commissioner                                                    -- Jonathan
        or espn_owner_id = '{C2489537-0A8B-4E67-9914-7A2C71341A12}'      -- Nishok
        or espn_owner_id = '{3AEDC062-A4DB-4A7D-9F19-C255055B2C61}'      -- Colin M
        or espn_owner_id = '{533F11EF-71ED-46D1-839D-67A3199CFA89}'      -- Dylan
      )
  );
$$;

-- Widen update: bettor can update own, verifier can update any, commissioner can update any.
drop policy if exists "bets update by bettor or commissioner" on bets;
create policy "bets update by bettor or verifier"
  on bets for update using (
    (posted_by = auth.uid() and is_bettor()) or is_bet_verifier()
  );

-- Track who verified a result.
alter table bets add column if not exists verified_by uuid references members (id);

-- Delete stays commissioner-only.
