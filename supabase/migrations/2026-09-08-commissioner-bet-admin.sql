-- Let commissioner update result on any bet and delete any bet.
drop policy if exists "bets update by bettor" on bets;
create policy "bets update by bettor or commissioner"
  on bets for update using (
    (posted_by = auth.uid() and is_bettor()) or is_commissioner()
  );

drop policy if exists "bets delete by bettor" on bets;
create policy "bets delete by bettor or commissioner"
  on bets for delete using (
    (posted_by = auth.uid() and is_bettor()) or is_commissioner()
  );
