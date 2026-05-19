-- Unifica estados de módulos nutricionales a un único valor: aprobado.

-- 1) Remueve constraints de estado previos para permitir la migración de datos.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.nutrition_modules'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.nutrition_modules DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

-- 2) Normaliza datos existentes.
UPDATE public.nutrition_modules
SET
  status = 'aprobado',
  published_at = COALESCE(published_at, now())
WHERE status IS DISTINCT FROM 'aprobado'
   OR published_at IS NULL;

-- 3) Ajusta default y constraint final.
ALTER TABLE public.nutrition_modules
ALTER COLUMN status SET DEFAULT 'aprobado';

ALTER TABLE public.nutrition_modules
ADD CONSTRAINT nutrition_modules_status_check
CHECK (status IN ('aprobado'));

-- 4) Ajusta policy de adjuntos que dependía de status = 'publicado'.
DROP POLICY IF EXISTS "nmf_select_published_authenticated" ON public.nutrition_module_files;

CREATE POLICY "nmf_select_published_authenticated"
ON public.nutrition_module_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.nutrition_modules m
    WHERE m.id = nutrition_module_files.module_id
      AND m.status = 'aprobado'
  )
);
