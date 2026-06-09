create extension if not exists pgcrypto;

create table if not exists public.sgc_document_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid null references public.sgc_document_folders(id) on delete restrict,
  description text null,
  status text not null default 'activo' check (status in ('activo', 'archivado')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sgc_document_folders_name_not_blank check (length(btrim(name)) > 0),
  constraint sgc_document_folders_not_self_parent check (parent_id is null or parent_id <> id)
);

alter table public.nutrition_modules
add column if not exists folder_id uuid null references public.sgc_document_folders(id) on delete restrict;

create index if not exists idx_sgc_document_folders_parent_id
  on public.sgc_document_folders(parent_id);

create index if not exists idx_sgc_document_folders_name_lower
  on public.sgc_document_folders(lower(name));

create index if not exists idx_sgc_document_folders_status
  on public.sgc_document_folders(status);

create unique index if not exists uq_sgc_document_folders_parent_name_active
  on public.sgc_document_folders(coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  where status <> 'archivado';

create index if not exists idx_nutrition_modules_folder_id
  on public.nutrition_modules(folder_id);

create or replace function public.set_sgc_document_folders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sgc_document_folders_updated_at on public.sgc_document_folders;
create trigger trg_sgc_document_folders_updated_at
before update on public.sgc_document_folders
for each row
execute function public.set_sgc_document_folders_updated_at();

create or replace function public.prevent_sgc_folder_cycles()
returns trigger
language plpgsql
as $$
declare
  current_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'No se puede mover una carpeta dentro de sí misma';
  end if;

  current_parent := new.parent_id;
  while current_parent is not null loop
    if current_parent = new.id then
      raise exception 'No se puede mover una carpeta dentro de una subcarpeta propia';
    end if;

    select parent_id
      into current_parent
      from public.sgc_document_folders
      where id = current_parent;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_prevent_sgc_folder_cycles on public.sgc_document_folders;
create trigger trg_prevent_sgc_folder_cycles
before insert or update of parent_id on public.sgc_document_folders
for each row
execute function public.prevent_sgc_folder_cycles();

create or replace function public.prevent_archiving_non_empty_sgc_folder()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'archivado' and new.status = 'archivado' then
    if exists (
      select 1
      from public.sgc_document_folders child
      where child.parent_id = new.id
        and child.status <> 'archivado'
    ) then
      raise exception 'La carpeta contiene subcarpetas activas';
    end if;

    if exists (
      select 1
      from public.nutrition_modules document
      where document.folder_id = new.id
    ) then
      raise exception 'La carpeta contiene documentos';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_archiving_non_empty_sgc_folder on public.sgc_document_folders;
create trigger trg_prevent_archiving_non_empty_sgc_folder
before update of status on public.sgc_document_folders
for each row
execute function public.prevent_archiving_non_empty_sgc_folder();

alter table public.sgc_document_folders enable row level security;
alter table public.sgc_document_folders force row level security;

drop policy if exists sgc_document_folders_select_nutri_admin on public.sgc_document_folders;
drop policy if exists sgc_document_folders_insert_admin on public.sgc_document_folders;
drop policy if exists sgc_document_folders_update_admin on public.sgc_document_folders;
drop policy if exists sgc_document_folders_delete_admin on public.sgc_document_folders;

create policy sgc_document_folders_select_nutri_admin
on public.sgc_document_folders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) in ('admin', 'nutricionista')
  )
);

create policy sgc_document_folders_insert_admin
on public.sgc_document_folders
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

create policy sgc_document_folders_update_admin
on public.sgc_document_folders
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

create policy sgc_document_folders_delete_admin
on public.sgc_document_folders
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

alter table public.nutrition_modules enable row level security;
alter table public.nutrition_modules force row level security;

drop policy if exists nutrition_modules_select_nutri_admin on public.nutrition_modules;
drop policy if exists nutrition_modules_insert_admin on public.nutrition_modules;
drop policy if exists nutrition_modules_update_admin on public.nutrition_modules;
drop policy if exists nutrition_modules_delete_admin on public.nutrition_modules;

create policy nutrition_modules_select_nutri_admin
on public.nutrition_modules
for select
to authenticated
using (
  status = 'aprobado'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) in ('admin', 'nutricionista')
  )
);

create policy nutrition_modules_insert_admin
on public.nutrition_modules
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

create policy nutrition_modules_update_admin
on public.nutrition_modules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

create policy nutrition_modules_delete_admin
on public.nutrition_modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_active, true) = true
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

revoke all on table public.sgc_document_folders from anon;
grant select, insert, update, delete on table public.sgc_document_folders to authenticated;
grant select, insert, update, delete on table public.nutrition_modules to authenticated;

do $$
declare
  seed_user uuid;
  folder_paths jsonb := '[
    ["01-Política_Objetivos_Listo"],
    ["02-EIA-LISTO"],
    ["02-EIA-LISTO", "Capacitacion HACCP"],
    ["03-Alcance-Listo"],
    ["04-Organigrama-Listo"],
    ["05-Perfiles de puesto_Listo"],
    ["06-Procedimientos"],
    ["06-Procedimientos", "P1_Información Documentada-ok"],
    ["06-Procedimientos", "PGC 36-25-Auditorias Internas-ok"],
    ["06-Procedimientos", "PGC 38-25-Correccciones y Acc Correctivas_OK"],
    ["06-Procedimientos", "PGC-32-25-RRHH-Capacitaciones_SF"],
    ["06-Procedimientos", "PGC-33-25_Calibraciones"],
    ["06-Procedimientos", "PSG-59-25-Planificación_Cambios"],
    ["06-Procedimientos", "px-Retiro_Productos"],
    ["06-Procedimientos", "Px-RxD"],
    ["06-Procedimientos", "Pxx_Comunicaciones_Servifood"],
    ["06-Procedimientos", "Pxx_Información Documentada-"],
    ["06-Procedimientos", "Px_PPNI"],
    ["06-Procedimientos", "Px_Preparación y Rta ante Emergencias_"],
    ["06-Procedimientos", "Px_Preparación y Rta ante Emergencias_", "DOCS LG"],
    ["06-Procedimientos", "Px_Reclamos"],
    ["06-Procedimientos", "Px_Trazabilidad"],
    ["07-Capacitaciones_LISTO"],
    ["07-Capacitaciones_LISTO", "Año 2026"],
    ["08-Inducciones"],
    ["09-Reuniones EIA_Listo"],
    ["09-Reuniones EIA_Listo", "Año 2026"],
    ["09-Reuniones EIA_Listo", "Año 2026", "Reuniones PDF"],
    ["10-Calibraciones_LISTO"],
    ["10-Calibraciones_LISTO", "Año 2025-2026"],
    ["11-Cultura_Listo"],
    ["11-Cultura_Listo", "1-Documentos_Referencia"],
    ["12-AUI"],
    ["12-AUI", "AUE-IRAM-10-11-5-2026"],
    ["12-AUI", "AUE-IRAM-10-11-5-2026", "Evidencias_NC1_SF"],
    ["12-AUI", "AUE-IRAM-10-11-5-2026", "Evidencias_NC2_SF"],
    ["13-NC"],
    ["14-Comunicaciones"],
    ["15-Ejercicio_Trazabilidad_Listo"],
    ["16-Simulacro Recall"],
    ["17-RxD"],
    ["18-Contexto_Partes interesadas"],
    ["19-PPR"],
    ["19-PPR", "1-PPR-Construcción y la distribución de los edificios"],
    ["19-PPR", "10-PPR-LIMPIEZA y DESINFECCIÓN"],
    ["19-PPR", "11-PPR-HIGIENE DEL PERSONAL"],
    ["19-PPR", "12-PPR-INFORMACIÓN DEL PRODUCTO"],
    ["19-PPR", "13-PPR-ALMACENAMIENTO"],
    ["19-PPR", "14-PPR-DEFENSA ALIMENTOS"],
    ["19-PPR", "15-VERIFICACIÓN"],
    ["19-PPR", "2-PPR_DISTRIBUCIÓN INSTALACIONES_ ÁREASdeTRABAJO_ok"],
    ["19-PPR", "3-PPR-Ss_AIRE_AGUA _ENERG_"],
    ["19-PPR", "4-PPR-Control de PLAGAS"],
    ["19-PPR", "5-PPR-RESIDUOS"],
    ["19-PPR", "6-PPR-IDONEIDAD EQUIPOS-MTTO"],
    ["19-PPR", "7-PPR-APROBACIÓN -SEGUIMIENTO PROVEEDORES"],
    ["19-PPR", "8-PPR-CONTROL DE RECEPCIÓN MATERIALES"],
    ["19-PPR", "9-PPR-MEDIDAS-PREVENCION-CONTAMIANCION CRUZADA"],
    ["19-PPR", "LAURA"],
    ["19-PPR", "LAURA", "Programa de Control de Agua"],
    ["19-PPR", "LAURA", "Programa de Control de Agua", "Informes Lab"],
    ["19-PPR", "LAURA", "Programa de Control de Agua", "Informes Lab", "Octubre 2011"],
    ["19-PPR", "LAURA", "Programa de Higiene Personal"],
    ["19-PPR", "LAURA", "Programa de Higiene Personal", "ANEXOS"],
    ["19-PPR", "LAURA", "Programa de Sanitización"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "1-SUTTER"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "1-SUTTER", "ficha de seguridad Sutter"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "1-SUTTER", "Fichas Técnicas Sutter"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "2-VALOT"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "2-VALOT", "Aprobaciones VALOT"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "2-VALOT", "Fichas Técnicas - VALOT"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "3-KEEPER"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "3-KEEPER", "Fichas de Seguridad Keeper"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "3-KEEPER", "Fichas Técnicas Keeper"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111", "2-POES Todos"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111", "3-Productos empleados-SUTTER"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111", "3-Productos empleados-SUTTER", "1-Aprobaciones Sutter"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111", "3-Productos empleados-SUTTER", "2-Fichas seguridad Sutter"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111", "3-Productos empleados-SUTTER", "3-Fichas técnicas Sutter"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Doc FINALES 181111", "Análisis hisopos Dic 2011"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "LAURA_2026"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Presupuestos"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Presupuestos", "Presupuesto Estufas"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Presupuestos", "Presupuesto Hisopos-Placas"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Presupuestos", "Presupuesto Valot"],
    ["19-PPR", "LAURA", "Programa de Sanitización", "Presupuestos", "Presupuestos Hisopos Lab"],
    ["19-PPR", "LAURA", "Programa Gestion de Residuos"],
    ["19-PPR", "LAURA", "Programa MIP"],
    ["21-Simulacro_Emergencia_Listo"]
  ]'::jsonb;
  path_item jsonb;
  folder_name text;
  parent_folder_id uuid;
  current_folder_id uuid;
begin
  select id into seed_user
  from public.profiles
  where coalesce(is_active, true) = true
    and lower(coalesce(role, '')) = 'admin'
  order by id
  limit 1;

  if seed_user is null then
    select id into seed_user
    from public.profiles
    where coalesce(is_active, true) = true
    order by id
    limit 1;
  end if;

  if seed_user is null then
    raise notice 'Seed de carpetas SGC omitido: no hay perfiles disponibles para created_by.';
    return;
  end if;

  for path_item in select value from jsonb_array_elements(folder_paths) loop
    parent_folder_id := null;

    for folder_name in select value from jsonb_array_elements_text(path_item) loop
      select id into current_folder_id
      from public.sgc_document_folders f
      where (
          (parent_folder_id is null and f.parent_id is null)
          or f.parent_id = parent_folder_id
        )
        and lower(f.name) = lower(folder_name)
        and f.status <> 'archivado'
      order by f.created_at asc
      limit 1;

      if current_folder_id is null then
        insert into public.sgc_document_folders(name, parent_id, description, created_by, status)
        values (folder_name, parent_folder_id, null, seed_user, 'activo')
        returning id into current_folder_id;
      end if;

      parent_folder_id := current_folder_id;
      current_folder_id := null;
    end loop;
  end loop;
end;
$$;
