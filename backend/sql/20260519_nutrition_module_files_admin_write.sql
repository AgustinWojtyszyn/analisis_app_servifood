-- Ajuste de políticas RLS para adjuntos de módulos nutricionales.
-- Objetivo: nutricionista/admin pueden leer; solo admin puede insertar/borrar.

ALTER TABLE public.nutrition_module_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_module_files FORCE ROW LEVEL SECURITY;

drop policy if exists "nmf_insert_nutri_admin" on public.nutrition_module_files;
drop policy if exists "nmf_delete_nutri_admin" on public.nutrition_module_files;

create policy "nmf_insert_admin_only"
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
      and lower(coalesce(p.role, '')) = 'admin'
  )
);

create policy "nmf_delete_admin_only"
on public.nutrition_module_files
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
