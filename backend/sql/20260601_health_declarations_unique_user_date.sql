-- Garantía de integridad para declaraciones de salud:
-- un usuario solo puede tener una declaración por día.
--
-- Diagnóstico previo (ejecutar antes de aplicar esta migración):
-- select
--   user_id,
--   declaration_date,
--   count(*) as total
-- from public.health_declarations
-- group by user_id, declaration_date
-- having count(*) > 1;
--
-- Si la consulta devuelve filas, resolver duplicados manualmente
-- antes de crear este índice único.

create unique index if not exists health_declarations_user_date_unique
on public.health_declarations (user_id, declaration_date);
