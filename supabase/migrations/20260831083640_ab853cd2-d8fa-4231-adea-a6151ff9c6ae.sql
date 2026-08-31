create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.device_tokens to authenticated;
grant all on public.device_tokens to service_role;
alter table public.device_tokens enable row level security;
drop policy if exists "own tokens select" on public.device_tokens;
create policy "own tokens select" on public.device_tokens for select to authenticated using (auth.uid() = user_id);
drop policy if exists "own tokens insert" on public.device_tokens;
create policy "own tokens insert" on public.device_tokens for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "own tokens update" on public.device_tokens;
create policy "own tokens update" on public.device_tokens for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own tokens delete" on public.device_tokens;
create policy "own tokens delete" on public.device_tokens for delete to authenticated using (auth.uid() = user_id);
create index if not exists idx_device_tokens_user on public.device_tokens(user_id);