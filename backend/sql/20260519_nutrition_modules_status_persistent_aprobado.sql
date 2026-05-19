-- Estado único y persistente para módulos nutricionales: aprobado.
-- Corrige históricos y evita futuros valores distintos.

-- 1) Limpieza de datos históricos.
UPDATE public.nutrition_modules
SET
  status = 'aprobado',
  published_at = COALESCE(published_at, now())
WHERE status IS DISTINCT FROM 'aprobado'
   OR published_at IS NULL;

-- 2) Default y constraint único.
ALTER TABLE public.nutrition_modules
ALTER COLUMN status SET DEFAULT 'aprobado';

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

ALTER TABLE public.nutrition_modules
ADD CONSTRAINT nutrition_modules_status_check
CHECK (status IN ('aprobado'));

-- 3) Trigger de defensa: fuerza aprobado en INSERT/UPDATE.
CREATE OR REPLACE FUNCTION public.enforce_nutrition_module_status_aprobado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := 'aprobado';
  IF NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_nutrition_module_status_aprobado ON public.nutrition_modules;
CREATE TRIGGER trg_enforce_nutrition_module_status_aprobado
BEFORE INSERT OR UPDATE ON public.nutrition_modules
FOR EACH ROW
EXECUTE FUNCTION public.enforce_nutrition_module_status_aprobado();
