-- Add category column to videos so Cameos and Tuesday Tape coexist.
alter table videos add column if not exists category text not null default 'tape'
  check (category in ('tape', 'cameo'));

-- Helper: can this user post cameos? (commissioner, tape crew, or Jorge)
create or replace function is_cameo_crew() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (
        is_commissioner
        or espn_owner_id = '{C2489537-0A8B-4E67-9914-7A2C71341A12}'  -- Nishok
        or espn_owner_id = '{3C8B8C86-A5CE-4EDE-8B8C-86A5CE5EDE7F}'  -- Jorge
      )
  );
$$;

-- Widen the videos insert policy: tape crew for tapes, cameo crew for cameos.
drop policy if exists "videos insert by tape crew" on videos;
create policy "videos insert by authorized posters"
  on videos for insert with check (
    posted_by = auth.uid()
    and (
      (category = 'tape' and is_tape_crew())
      or (category = 'cameo' and is_cameo_crew())
    )
  );

-- Widen the storage insert policy so Jorge can upload files too.
drop policy if exists "videos bucket upload by tape crew" on storage.objects;
create policy "videos bucket upload by poster"
  on storage.objects for insert with check (
    bucket_id = 'videos'
    and (is_tape_crew() or is_cameo_crew())
  );
