create extension if not exists pgcrypto;

create table if not exists public.nutrition_module_files (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.nutrition_modules(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text null,
  file_size bigint null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_nutrition_module_files_module_id
  on public.nutrition_module_files(module_id);

create index if not exists idx_nutrition_module_files_created_at_desc
  on public.nutrition_module_files(created_at desc);

alter table public.nutrition_module_files enable row level security;
alter table public.nutrition_module_files force row level security;

drop policy if exists "nmf_select_published_authenticated" on public.nutrition_module_files;
drop policy if exists "nmf_select_all_nutri_admin" on public.nutrition_module_files;
drop policy if exists "nmf_insert_nutri_admin" on public.nutrition_module_files;
drop policy if exists "nmf_delete_nutri_admin" on public.nutrition_module_files;

create policy "nmf_select_published_authenticated"
on public.nutrition_module_files
for select
to authenticated
using (
  exists (
    select 1
    from public.nutrition_modules m
    where m.id = nutrition_module_files.module_id
      and m.status = 'publicado'
  )
);

create policy "nmf_select_all_nutri_admin"
on public.nutrition_module_files
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) in ('nutricionista', 'admin')
  )
);

create policy "nmf_insert_nutri_admin"
on public.nutrition_module_files
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) in ('nutricionista', 'admin')
  )
);

create policy "nmf_delete_nutri_admin"
on public.nutrition_module_files
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) in ('nutricionista', 'admin')
  )
);

revoke all on table public.nutrition_module_files from anon;
grant select, insert, delete on table public.nutrition_module_files to authenticated;
