-- Call the resolve-bets Edge Function every 15 minutes.
create or replace function call_resolve_bets() returns void
language plpgsql security definer as $$
declare
  func_url text;
  service_key text;
begin
  select decrypted_secret into func_url
    from vault.decrypted_secrets where name = 'resolve_bets_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if func_url is null or service_key is null then return; end if;

  perform net.http_post(
    url := func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
end $$;

select cron.schedule('resolve-bets', '*/15 * * * *', 'select call_resolve_bets()');
