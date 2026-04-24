-- Crea tabla base para almacenar resultados de analisis por usuario.
-- Ejecutar una vez en Supabase SQL Editor.

create table if not exists public.analysis_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  results jsonb not null,
  status text not null default 'active' check (status in ('active', 'exported', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_analysis_history_user_created_at
on public.analysis_history (user_id, created_at desc);

create index if not exists idx_analysis_history_user_status_created_at
on public.analysis_history (user_id, status, created_at desc);

-- Trigger para updated_at.
create or replace function public.set_updated_at_analysis_history()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_analysis_history_set_updated_at on public.analysis_history;
create trigger trg_analysis_history_set_updated_at
before update on public.analysis_history
for each row
execute function public.set_updated_at_analysis_history();

-- RLS (opcional cuando se usa service role en backend, recomendado para consultas cliente).
alter table public.analysis_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_history'
      and policyname = 'analysis_history_select_own'
  ) then
    create policy analysis_history_select_own
      on public.analysis_history
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_history'
      and policyname = 'analysis_history_insert_own'
  ) then
    create policy analysis_history_insert_own
      on public.analysis_history
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_history'
      and policyname = 'analysis_history_update_own'
  ) then
    create policy analysis_history_update_own
      on public.analysis_history
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_history'
      and policyname = 'analysis_history_delete_own'
  ) then
    create policy analysis_history_delete_own
      on public.analysis_history
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
