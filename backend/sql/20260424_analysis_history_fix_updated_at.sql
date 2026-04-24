-- Fix para error: record "new" has no field "updated_at"
-- Ejecutar en Supabase SQL Editor.

alter table public.analysis_history
add column if not exists updated_at timestamptz;

update public.analysis_history
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.analysis_history
alter column updated_at set default now();

alter table public.analysis_history
alter column updated_at set not null;

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
