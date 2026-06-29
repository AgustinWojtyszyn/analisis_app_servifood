create table if not exists public.customer_nonconformities (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  year int null,
  claim text null,
  hazard_type text not null,
  severity text null,
  probable_cause text null,
  area text not null,
  client text null,
  status text null,
  source_file_name text null,
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists customer_nonconformities_imported_at_idx
on public.customer_nonconformities (imported_at desc);

create index if not exists customer_nonconformities_month_idx
on public.customer_nonconformities (month);

create index if not exists customer_nonconformities_hazard_type_idx
on public.customer_nonconformities (hazard_type);

create index if not exists customer_nonconformities_area_idx
on public.customer_nonconformities (area);

alter table public.customer_nonconformities enable row level security;

drop policy if exists customer_nonconformities_select_admin on public.customer_nonconformities;
create policy customer_nonconformities_select_admin
on public.customer_nonconformities
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role = 'admin'
  )
);

drop policy if exists customer_nonconformities_insert_admin on public.customer_nonconformities;
create policy customer_nonconformities_insert_admin
on public.customer_nonconformities
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role = 'admin'
  )
);

drop policy if exists customer_nonconformities_update_admin on public.customer_nonconformities;
create policy customer_nonconformities_update_admin
on public.customer_nonconformities
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role = 'admin'
  )
);

drop policy if exists customer_nonconformities_delete_admin on public.customer_nonconformities;
create policy customer_nonconformities_delete_admin
on public.customer_nonconformities
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active is true
      and p.role = 'admin'
  )
);
