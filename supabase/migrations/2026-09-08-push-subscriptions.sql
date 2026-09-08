-- Push notification subscriptions for the PWA.
-- Each member can have multiple subscriptions (different devices).
create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  member_id uuid not null references members (id) on delete cascade,
  endpoint text not null,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz not null default now(),
  unique (member_id, endpoint)
);

alter table push_subscriptions enable row level security;

-- Members can read and manage their own subscriptions.
create policy "own subs readable"
  on push_subscriptions for select using (member_id = auth.uid());
create policy "own subs insert"
  on push_subscriptions for insert with check (member_id = auth.uid());
create policy "own subs delete"
  on push_subscriptions for delete using (member_id = auth.uid());
create policy "own subs update"
  on push_subscriptions for update using (member_id = auth.uid());

-- -----------------------------------------------------------------------
-- Auto-notify on new content via pg_net → Edge Function.
-- -----------------------------------------------------------------------

create or replace function notify_push(
  p_title text,
  p_body text,
  p_url text default '/'
) returns void
language plpgsql security definer as $$
declare
  func_url text;
  service_key text;
begin
  select decrypted_secret into func_url
    from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if func_url is null or service_key is null then return; end if;

  perform net.http_post(
    url := func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'title', p_title,
      'body', p_body,
      'url', p_url
    )
  );
end $$;

-- Trigger: new post (South Star or Talk Your Shit).
create or replace function on_new_post() returns trigger
language plpgsql security definer as $$
begin
  if new.board = 'south-star' then
    perform notify_push('New on South Star', left(new.title, 120), '/south-star/');
  elsif new.board = 'trash' then
    perform notify_push('Talk Your Shit', new.byline || ' posted', '/talk-your-shit/');
  end if;
  return new;
end $$;

drop trigger if exists push_on_new_post on posts;
create trigger push_on_new_post after insert on posts
  for each row execute function on_new_post();

-- Trigger: new quote.
create or replace function on_new_quote() returns trigger
language plpgsql security definer as $$
begin
  perform notify_push(
    'New Quote',
    '"' || left(new.text, 80) || '" — ' || new.attributed_to,
    '/quotes/'
  );
  return new;
end $$;

drop trigger if exists push_on_new_quote on quotes;
create trigger push_on_new_quote after insert on quotes
  for each row execute function on_new_quote();

-- Trigger: recap published.
create or replace function on_recap_published() returns trigger
language plpgsql security definer as $$
begin
  if old.status = 'draft' and new.status = 'published' then
    perform notify_push('Week ' || new.week || ' Recap', new.title, '/season/recap/');
  end if;
  return new;
end $$;

drop trigger if exists push_on_recap_published on recaps;
create trigger push_on_recap_published after update on recaps
  for each row execute function on_recap_published();
