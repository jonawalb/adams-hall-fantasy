-- Run once in the Supabase SQL editor.
-- Other members' picks stay hidden until the game kicks off, so nobody can
-- copy picks through the API. Your own picks are always readable.
drop policy if exists "picks readable by members" on picks;
create policy "picks readable by members"
  on picks for select
  using (auth.uid() is not null and (member_id = auth.uid() or kickoff <= now()));
