-- Permitir el nuevo rol "nutricionista" en public.profiles
-- Ejecutar una sola vez en Supabase SQL Editor.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabla public.profiles no existe, no se aplica cambio';
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (lower(coalesce(role, '')) IN ('user', 'admin', 'nutricionista'));
  END IF;
END $$;
