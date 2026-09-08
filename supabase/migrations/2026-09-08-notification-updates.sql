-- Additional notification triggers: pick deadline reminders + new bets.

-- -----------------------------------------------------------------------
-- 1. Pick deadline reminders (2 hours before lock)
-- -----------------------------------------------------------------------

-- Track which reminders have already been sent to avoid duplicates.
create table if not exists push_reminders_sent (
  id bigint generated always as identity primary key,
  reminder_key text not null unique,
  sent_at timestamptz not null default now()
);

-- Check for upcoming pick deadlines and send reminders.
-- Called every 30 minutes by pg_cron.
create or replace function check_pick_deadlines() returns void
language plpgsql security definer as $$
declare
  nfl_kickoff timestamptz;
  ahfl_lock timestamptz;
  reminder_key text;
begin
  -- NFL Pick'Em: find the earliest future kickoff from submitted picks.
  select min(kickoff) into nfl_kickoff
  from picks
  where kickoff > now()
    and kickoff <= now() + interval '2 hours 15 minutes';

  if nfl_kickoff is not null then
    reminder_key := 'nfl-' || date_trunc('day', nfl_kickoff)::date;
    if not exists (select 1 from push_reminders_sent where push_reminders_sent.reminder_key = check_pick_deadlines.reminder_key) then
      insert into push_reminders_sent (reminder_key) values (check_pick_deadlines.reminder_key);
      perform notify_push(
        'NFL Picks Lock Soon',
        'Picks lock at kickoff — get yours in!',
        '/pickem/'
      );
    end if;
  end if;

  -- AHFL Matchup Pick'Em: find the earliest future lock_at.
  select min(lock_at) into ahfl_lock
  from matchup_picks
  where lock_at > now()
    and lock_at <= now() + interval '2 hours 15 minutes';

  if ahfl_lock is not null then
    reminder_key := 'ahfl-' || date_trunc('day', ahfl_lock)::date;
    if not exists (select 1 from push_reminders_sent where push_reminders_sent.reminder_key = check_pick_deadlines.reminder_key) then
      insert into push_reminders_sent (reminder_key) values (check_pick_deadlines.reminder_key);
      perform notify_push(
        'Matchup Picks Lock Soon',
        'AHFL matchup picks lock in ~2 hours!',
        '/season/matchup-pickem/'
      );
    end if;
  end if;
end $$;

-- Clean up old reminders (keep last 30 days).
create or replace function cleanup_old_reminders() returns void
language sql security definer as $$
  delete from push_reminders_sent where sent_at < now() - interval '30 days';
$$;

-- Schedule: check every 30 minutes for upcoming deadlines.
-- (Requires pg_cron extension — enable via Dashboard → Database → Extensions)
select cron.schedule('pick-deadline-check', '*/30 * * * *', 'select check_pick_deadlines()');
select cron.schedule('reminder-cleanup', '0 6 * * 1', 'select cleanup_old_reminders()');

-- -----------------------------------------------------------------------
-- 2. New bet notification
-- -----------------------------------------------------------------------

create or replace function on_new_bet() returns trigger
language plpgsql security definer as $$
declare
  bettor_name text;
begin
  select display_name into bettor_name
  from members where id = new.posted_by;

  perform notify_push(
    coalesce(bettor_name, 'Someone') || ' Placed a Bet',
    left(new.description, 120),
    '/betting/' || new.bettor_tag || 's-book/'
  );
  return new;
end $$;

drop trigger if exists push_on_new_bet on bets;
create trigger push_on_new_bet after insert on bets
  for each row execute function on_new_bet();
