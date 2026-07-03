CREATE TABLE IF NOT EXISTS public.annual_deviation_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  filename text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  year integer,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  sheet_names jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.annual_deviation_rows (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.annual_deviation_uploads(id) ON DELETE CASCADE,
  sheet_type text NOT NULL CHECK (sheet_type IN ('annual', 'quality', 'logistics')),
  row_index integer,
  date_month text,
  month text,
  month_number integer,
  year integer,
  area_sector text,
  area_sector_key text,
  deviation text,
  deviation_key text,
  classification text,
  classification_key text,
  source_type text,
  source_type_key text,
  immediate_action text,
  corrective_action text,
  status text,
  observations text,
  row_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  original_row jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.annual_quality_summary (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.annual_deviation_uploads(id) ON DELETE CASCADE,
  deviation_key text NOT NULL,
  deviation_label text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  percentage numeric(8,2) NOT NULL DEFAULT 0,
  UNIQUE (upload_id, deviation_key)
);

CREATE TABLE IF NOT EXISTS public.annual_logistics_summary (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.annual_deviation_uploads(id) ON DELETE CASCADE,
  deviation_key text NOT NULL,
  deviation_label text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  percentage numeric(8,2) NOT NULL DEFAULT 0,
  UNIQUE (upload_id, deviation_key)
);

CREATE INDEX IF NOT EXISTS idx_annual_deviation_uploads_uploaded_at
ON public.annual_deviation_uploads (uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_annual_deviation_uploads_year
ON public.annual_deviation_uploads (year);

CREATE INDEX IF NOT EXISTS idx_annual_deviation_rows_upload_sheet
ON public.annual_deviation_rows (upload_id, sheet_type, row_index);

CREATE INDEX IF NOT EXISTS idx_annual_deviation_rows_filters
ON public.annual_deviation_rows (year, month_number, area_sector_key, classification_key, source_type_key);

CREATE INDEX IF NOT EXISTS idx_annual_deviation_rows_deviation_key
ON public.annual_deviation_rows (deviation_key);

ALTER TABLE public.annual_deviation_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_deviation_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_quality_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_logistics_summary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'annual_deviation_uploads' AND policyname = 'annual_deviation_uploads_service_role'
  ) THEN
    CREATE POLICY annual_deviation_uploads_service_role
    ON public.annual_deviation_uploads
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'annual_deviation_rows' AND policyname = 'annual_deviation_rows_service_role'
  ) THEN
    CREATE POLICY annual_deviation_rows_service_role
    ON public.annual_deviation_rows
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'annual_quality_summary' AND policyname = 'annual_quality_summary_service_role'
  ) THEN
    CREATE POLICY annual_quality_summary_service_role
    ON public.annual_quality_summary
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'annual_logistics_summary' AND policyname = 'annual_logistics_summary_service_role'
  ) THEN
    CREATE POLICY annual_logistics_summary_service_role
    ON public.annual_logistics_summary
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
