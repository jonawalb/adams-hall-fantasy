-- Run once in the Supabase SQL editor.
-- Nishok's Tuesday Tape: weekly videos, either an external link or a file
-- in the private 'videos' bucket (50MB cap). Posting is limited to the
-- commissioner and Nishok's member row; everyone signed in can watch.
create table if not exists videos (
  id bigint generated always as identity primary key,
  title text not null,
  url text,
  storage_path text,
  posted_by uuid not null references members (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (url is not null or storage_path is not null)
);
alter table videos enable row level security;

create or replace function is_tape_crew() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
    where id = auth.uid()
      and (is_commissioner or espn_owner_id = '{C2489537-0A8B-4E67-9914-7A2C71341A12}')
  );
$$;

create policy "videos readable by members"
  on videos for select using (auth.uid() is not null);
create policy "videos insert by tape crew"
  on videos for insert with check (posted_by = auth.uid() and is_tape_crew());
create policy "own videos delete"
  on videos for delete using (posted_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'image/gif'])
on conflict (id) do nothing;

create policy "videos bucket read by members"
  on storage.objects for select using (bucket_id = 'videos' and auth.uid() is not null);
create policy "videos bucket upload by tape crew"
  on storage.objects for insert with check (bucket_id = 'videos' and is_tape_crew());
create policy "videos bucket delete own"
  on storage.objects for delete using (bucket_id = 'videos' and owner = auth.uid());
