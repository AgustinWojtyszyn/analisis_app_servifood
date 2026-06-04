create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint policy_acceptances_user_version_key unique (user_id, policy_version)
);

create index if not exists policy_acceptances_user_id_idx
on public.policy_acceptances (user_id);

create or replace function public.set_policy_acceptances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_policy_acceptances_updated_at on public.policy_acceptances;
create trigger trg_policy_acceptances_updated_at
before update on public.policy_acceptances
for each row execute function public.set_policy_acceptances_updated_at();

alter table public.policy_acceptances enable row level security;

drop policy if exists policy_acceptances_select_own on public.policy_acceptances;
create policy policy_acceptances_select_own
on public.policy_acceptances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists policy_acceptances_insert_own on public.policy_acceptances;
create policy policy_acceptances_insert_own
on public.policy_acceptances
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists policy_acceptances_update_own on public.policy_acceptances;
create policy policy_acceptances_update_own
on public.policy_acceptances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
