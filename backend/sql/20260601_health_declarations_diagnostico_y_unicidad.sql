-- 1) Diagnóstico previo (ejecutar primero)
select
  user_id,
  declaration_date,
  count(*) as total
from public.health_declarations
group by user_id, declaration_date
having count(*) > 1;

-- 2) Garantía de unicidad por usuario y día
create unique index if not exists health_declarations_user_date_unique
on public.health_declarations (user_id, declaration_date);
