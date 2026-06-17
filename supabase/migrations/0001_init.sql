-- user_state: one row per user, mirroring the old Firestore users/{uid} document.
-- The whole UserState lives in a JSONB column so the app's engines/components
-- stay intact across the Firebase -> Supabase migration.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Owner-only access (mirrors the old firestore.rules): a user may read/write
-- ONLY their own row.
alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own" on public.user_state
  for delete using (auth.uid() = user_id);

-- Realtime: broadcast row changes so other devices update live. RLS is still
-- enforced on the stream, so each client only receives changes to its own row.
do $$
begin
  alter publication supabase_realtime add table public.user_state;
exception
  when duplicate_object then null; -- already in the publication
end $$;
