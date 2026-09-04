-- Run once in the Supabase SQL editor.
-- Who has submitted NFL picks this week, without exposing the picks
-- themselves (the picks select policy hides other members' picks until
-- kickoff). Callable by any signed-in member via supabase.rpc().
create or replace function pick_counts(p_season int, p_week int)
returns table (member_id uuid, picks bigint)
language sql stable security definer set search_path = public as $$
  select member_id, count(*)
  from picks
  where season = p_season and week = p_week and auth.uid() is not null
  group by member_id;
$$;
