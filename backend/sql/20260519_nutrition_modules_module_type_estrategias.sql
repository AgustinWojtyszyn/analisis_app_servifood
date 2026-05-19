-- Extiende apartados permitidos para documentos SGC.
-- Valores permitidos: procedimiento, registro, estrategias.

ALTER TABLE public.nutrition_modules
DROP CONSTRAINT IF EXISTS nutrition_modules_module_type_check;

ALTER TABLE public.nutrition_modules
ADD CONSTRAINT nutrition_modules_module_type_check
CHECK (module_type IN ('procedimiento', 'registro', 'estrategias'));
