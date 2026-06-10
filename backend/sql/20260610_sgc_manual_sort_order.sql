alter table public.sgc_document_folders
add column if not exists sort_order integer;

alter table public.nutrition_modules
add column if not exists sort_order integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by parent_id
      order by lower(name) asc, created_at asc, id asc
    ) - 1 as next_sort_order
  from public.sgc_document_folders
  where status <> 'archivado'
)
update public.sgc_document_folders f
set sort_order = ranked.next_sort_order
from ranked
where f.id = ranked.id
  and f.sort_order is null;

with ranked as (
  select
    id,
    row_number() over (
      partition by folder_id
      order by updated_at desc, lower(title) asc, id asc
    ) - 1 as next_sort_order
  from public.nutrition_modules
)
update public.nutrition_modules m
set sort_order = ranked.next_sort_order
from ranked
where m.id = ranked.id
  and m.sort_order is null;

update public.sgc_document_folders
set sort_order = 0
where sort_order is null;

update public.nutrition_modules
set sort_order = 0
where sort_order is null;

alter table public.sgc_document_folders
alter column sort_order set default 0,
alter column sort_order set not null;

alter table public.nutrition_modules
alter column sort_order set default 0,
alter column sort_order set not null;

create index if not exists idx_sgc_document_folders_parent_sort_order
  on public.sgc_document_folders(parent_id, sort_order, lower(name), id);

create index if not exists idx_nutrition_modules_folder_sort_order
  on public.nutrition_modules(folder_id, sort_order, lower(title), id);

create or replace function public.reorder_sgc_items(
  p_item_type text,
  p_parent_folder_id uuid,
  p_ordered_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_type text := lower(btrim(coalesce(p_item_type, '')));
  ordered_count integer := coalesce(array_length(p_ordered_ids, 1), 0);
  distinct_count integer;
  level_count integer;
  matched_count integer;
begin
  if normalized_type not in ('folder', 'document') then
    raise exception 'Tipo de elemento inválido';
  end if;

  if p_ordered_ids is null then
    raise exception 'La lista ordenada es obligatoria';
  end if;

  select count(distinct item_id)
  into distinct_count
  from unnest(p_ordered_ids) as ordered(item_id);

  if distinct_count <> ordered_count then
    raise exception 'La lista contiene IDs duplicados';
  end if;

  if normalized_type = 'folder' then
    select count(*)
    into level_count
    from public.sgc_document_folders
    where status <> 'archivado'
      and (
        (p_parent_folder_id is null and parent_id is null)
        or parent_id = p_parent_folder_id
      );

    if level_count <> ordered_count then
      raise exception 'La lista debe incluir todas las carpetas activas del nivel actual';
    end if;

    perform 1
    from public.sgc_document_folders
    where id = any(p_ordered_ids)
    for update;

    select count(*)
    into matched_count
    from public.sgc_document_folders
    where id = any(p_ordered_ids)
      and status <> 'archivado'
      and (
        (p_parent_folder_id is null and parent_id is null)
        or parent_id = p_parent_folder_id
      );

    if matched_count <> ordered_count then
      raise exception 'Todas las carpetas deben existir y pertenecer al mismo nivel';
    end if;

    update public.sgc_document_folders as folder
    set sort_order = ordered.position - 1,
        updated_at = now()
    from unnest(p_ordered_ids) with ordinality as ordered(id, position)
    where folder.id = ordered.id;
  else
    select count(*)
    into level_count
    from public.nutrition_modules
    where (
      (p_parent_folder_id is null and folder_id is null)
      or folder_id = p_parent_folder_id
    );

    if level_count <> ordered_count then
      raise exception 'La lista debe incluir todos los documentos del nivel actual';
    end if;

    perform 1
    from public.nutrition_modules
    where id = any(p_ordered_ids)
    for update;

    select count(*)
    into matched_count
    from public.nutrition_modules
    where id = any(p_ordered_ids)
      and (
        (p_parent_folder_id is null and folder_id is null)
        or folder_id = p_parent_folder_id
      );

    if matched_count <> ordered_count then
      raise exception 'Todos los documentos deben existir y pertenecer al mismo nivel';
    end if;

    update public.nutrition_modules as document
    set sort_order = ordered.position - 1,
        updated_at = now()
    from unnest(p_ordered_ids) with ordinality as ordered(id, position)
    where document.id = ordered.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'type', normalized_type,
    'parentFolderId', p_parent_folder_id,
    'count', ordered_count
  );
end;
$$;
