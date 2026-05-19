-- Agrega apartado/tipo de módulo nutricional.
-- Valores permitidos: procedimiento, registro.

ALTER TABLE public.nutrition_modules
ADD COLUMN IF NOT EXISTS module_type text;

UPDATE public.nutrition_modules
SET module_type = 'procedimiento'
WHERE module_type IS NULL;

ALTER TABLE public.nutrition_modules
DROP CONSTRAINT IF EXISTS nutrition_modules_module_type_check;

ALTER TABLE public.nutrition_modules
ADD CONSTRAINT nutrition_modules_module_type_check
CHECK (module_type IN ('procedimiento', 'registro'));

ALTER TABLE public.nutrition_modules
ALTER COLUMN module_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nutrition_modules_module_type
  ON public.nutrition_modules(module_type);
