create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  module text,
  description text,
  expiration_date date not null,
  responsible_area text,
  responsible_person text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certifications_expiration_date_idx on public.certifications (expiration_date);
create index if not exists certifications_created_by_idx on public.certifications (created_by);

create or replace function public.set_certifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_certifications_updated_at on public.certifications;
create trigger trg_certifications_updated_at
before update on public.certifications
for each row execute function public.set_certifications_updated_at();

alter table public.certifications enable row level security;

drop policy if exists certifications_select_nutri_admin on public.certifications;
create policy certifications_select_nutri_admin
on public.certifications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role in ('admin', 'nutricionista')
  )
);

drop policy if exists certifications_insert_nutri_admin on public.certifications;
create policy certifications_insert_nutri_admin
on public.certifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role in ('admin', 'nutricionista')
  )
);

drop policy if exists certifications_update_nutri_admin on public.certifications;
create policy certifications_update_nutri_admin
on public.certifications
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role in ('admin', 'nutricionista')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role in ('admin', 'nutricionista')
  )
);

drop policy if exists certifications_delete_nutri_admin on public.certifications;
create policy certifications_delete_nutri_admin
on public.certifications
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role in ('admin', 'nutricionista')
  )
);
