-- Lapse initial schema
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_timelapses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  entry_date date not null,
  video_url text not null,
  streak_count integer not null default 0 check (streak_count >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.daily_timelapses enable row level security;

-- Any authenticated user can read both users' profiles and timelapses.
drop policy if exists "authenticated can read profiles" on public.profiles;
create policy "authenticated can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "authenticated can read timelapses" on public.daily_timelapses;
create policy "authenticated can read timelapses"
on public.daily_timelapses
for select
to authenticated
using (true);

-- Users can update only their own profile.
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Users can insert/update/delete only their own timelapse rows.
drop policy if exists "users can insert own timelapses" on public.daily_timelapses;
create policy "users can insert own timelapses"
on public.daily_timelapses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own timelapses" on public.daily_timelapses;
create policy "users can update own timelapses"
on public.daily_timelapses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own timelapses" on public.daily_timelapses;
create policy "users can delete own timelapses"
on public.daily_timelapses
for delete
to authenticated
using (auth.uid() = user_id);

-- Storage setup for timelapse videos.
insert into storage.buckets (id, name, public)
values ('timelapses', 'timelapses', false)
on conflict (id) do nothing;

drop policy if exists "authenticated can read timelapse objects" on storage.objects;
create policy "authenticated can read timelapse objects"
on storage.objects
for select
to authenticated
using (bucket_id = 'timelapses');

drop policy if exists "users can upload own timelapse objects" on storage.objects;
create policy "users can upload own timelapse objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'timelapses'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own timelapse objects" on storage.objects;
create policy "users can update own timelapse objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'timelapses'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'timelapses'
  and (storage.foldername(name))[1] = auth.uid()::textn
);

drop policy if exists "users can delete own timelapse objects" on storage.objects;
create policy "users can delete own timelapse objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'timelapses'
  and (storage.foldername(name))[1] = auth.uid()::text
);
