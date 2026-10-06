create table if not exists public.user_training_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_training_state enable row level security;

drop policy if exists "Users can read their training state" on public.user_training_state;
create policy "Users can read their training state"
  on public.user_training_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their training state" on public.user_training_state;
create policy "Users can insert their training state"
  on public.user_training_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their training state" on public.user_training_state;
create policy "Users can update their training state"
  on public.user_training_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their training state" on public.user_training_state;
create policy "Users can delete their training state"
  on public.user_training_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_training_state from anon;
grant select, insert, update, delete on public.user_training_state to authenticated;
