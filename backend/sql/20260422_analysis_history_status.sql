-- Agrega estado por lote para distinguir análisis activo vs historial exportado/archivado.
ALTER TABLE public.analysis_history
ADD COLUMN IF NOT EXISTS status text;

-- Setea estado por defecto para nuevos registros.
ALTER TABLE public.analysis_history
ALTER COLUMN status SET DEFAULT 'active';

-- Marca como active los registros sin estado previo.
UPDATE public.analysis_history
SET status = 'active'
WHERE status IS NULL;

-- Restricción de valores permitidos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analysis_history_status_check'
  ) THEN
    ALTER TABLE public.analysis_history
    ADD CONSTRAINT analysis_history_status_check
    CHECK (status IN ('active', 'exported', 'archived'));
  END IF;
END $$;

-- No nulo para garantizar consistencia.
ALTER TABLE public.analysis_history
ALTER COLUMN status SET NOT NULL;

-- Índice para lecturas rápidas del lote activo por usuario.
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_status_created_at
ON public.analysis_history (user_id, status, created_at DESC);
