-- Fix: allow backend service-role calls to persist SGC manual ordering.
-- Context:
-- The backend endpoint /nutrition-modules/reorder calls public.reorder_sgc_items
-- using the Supabase service role client. In that context auth.uid() can be null,
-- so the previous wrapper rejected the request as "No autenticado".
-- User/admin authorization is already enforced in the backend controller before
-- calling this RPC.

create or replace function public.reorder_sgc_items(
  p_item_type text,
  p_parent_folder_id uuid,
  p_ordered_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if auth.role() = 'service_role' then
    return public.reorder_sgc_items_internal(
      p_item_type,
      p_parent_folder_id,
      p_ordered_ids
    );
  end if;

  if auth.uid() is null then
    raise exception 'No autenticado'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and lower(p.role) in ('admin', 'nutricionista', 'nutri')
  ) then
    raise exception 'No autorizado para reordenar documentos SGC'
      using errcode = '42501';
  end if;

  return public.reorder_sgc_items_internal(
    p_item_type,
    p_parent_folder_id,
    p_ordered_ids
  );
end;
$function$;
