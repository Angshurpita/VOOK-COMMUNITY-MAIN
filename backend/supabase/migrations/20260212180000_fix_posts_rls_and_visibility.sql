-- Add visibility column to posts if it doesn't exist
alter table public.posts add column if not exists visibility text default 'public';

-- Ensure RLS is enabled
alter table public.posts enable row level security;

-- Fix Posts Insert Policy (Authenticated users can create posts as themselves)
drop policy if exists "Users can create posts." on public.posts;
drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert
  with check ( auth.uid() = user_id );

-- Allow Users to Update their own posts
drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  using ( auth.uid() = user_id );

-- Allow Users to Delete their own posts
drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  using ( auth.uid() = user_id );

-- Ensure Profiles Insert/Update Policies exist
drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Grant permissions
grant all on public.posts to postgres, service_role;
grant select, insert, update, delete on public.posts to authenticated;
grant select on public.posts to anon;
