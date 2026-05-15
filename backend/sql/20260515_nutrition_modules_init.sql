create table if not exists public.nutrition_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  content text null,
  status text not null default 'borrador' check (status in ('borrador', 'publicado', 'archivado')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null
);

create index if not exists idx_nutrition_modules_status on public.nutrition_modules(status);
create index if not exists idx_nutrition_modules_updated_at on public.nutrition_modules(updated_at desc);

create or replace function public.set_nutrition_modules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_nutrition_modules_updated_at on public.nutrition_modules;
create trigger trg_nutrition_modules_updated_at
before update on public.nutrition_modules
for each row
execute function public.set_nutrition_modules_updated_at();
