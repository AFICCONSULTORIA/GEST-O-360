-- Migration: Adiciona cpf e birth_date em education_students / edu_students para acesso ao Portal da Família
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_education_students_cpf
  ON public.education_students (cpf);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_students') THEN
    ALTER TABLE public.edu_students ADD COLUMN IF NOT EXISTS cpf TEXT;
    ALTER TABLE public.edu_students ADD COLUMN IF NOT EXISTS birth_date DATE;
    CREATE INDEX IF NOT EXISTS idx_edu_students_cpf ON public.edu_students (cpf);
  END IF;
END $$;
