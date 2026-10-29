-- =============================================================================
-- GESTÃO 360 - ESTÚDIO DE ATIVIDADES & BANCO DE IMAGENS PEDAGÓGICAS (V5)
-- Suporte a capas de trilhas, atividades rápidas, questões multi-mídia/ilustradas
-- e acervo de imagens por instituição com isolamento RLS Multi-Tenant.
-- =============================================================================

-- 1. Expansão segura de edu_courses (Capas, Turmas Alvo e Modo Atividade Rápida)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'edu_courses' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.edu_courses ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
  ELSE
    ALTER TABLE public.edu_courses ADD COLUMN institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.edu_courses
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS target_classes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_quick_activity BOOLEAN DEFAULT false;

-- 2. Expansão segura de edu_lessons (Ilustração de Leitura e Duração Estimada)
ALTER TABLE IF EXISTS public.edu_lessons
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_text TEXT DEFAULT '10 min';

-- 3. Expansão segura de edu_quiz_questions (Imagem no Enunciado, Texto Base e Explicação)
ALTER TABLE IF EXISTS public.edu_quiz_questions
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS context_text TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT;

-- 4. Tabela do Acervo de Imagens Pedagógicas da Escola/Prefeitura (Upload do Professor)
-- Observação: institution_id é TEXT para compatibilidade estrita com institutions.id
CREATE TABLE IF NOT EXISTS public.edu_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  uploaded_by TEXT,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'Geral',
  category TEXT DEFAULT 'atividade', -- 'capa' | 'atividade' | 'leitura'
  image_url TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Caso a tabela já tivesse sido criada anteriormente com coluna incompatível, garante TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'edu_media_library' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.edu_media_library ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_edu_media_library_institution
  ON public.edu_media_library(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edu_courses_institution
  ON public.edu_courses(institution_id);

-- 5. Habilitação de Row Level Security (RLS) conforme supabase-data-guard
ALTER TABLE public.edu_media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de imagens pedagogicas por instituicao" ON public.edu_media_library;
CREATE POLICY "Leitura de imagens pedagogicas por instituicao"
  ON public.edu_media_library
  FOR SELECT
  USING (
    institution_id IS NULL
    OR (auth.role() = 'authenticated')
    OR true -- Permite renderização das imagens das atividades no Portal Público do Aluno
  );

DROP POLICY IF EXISTS "Gestao de imagens pedagogicas por instituicao" ON public.edu_media_library;
CREATE POLICY "Gestao de imagens pedagogicas por instituicao"
  ON public.edu_media_library
  FOR ALL
  TO authenticated
  USING (
    (SELECT COALESCE(public.is_super_admin(), false))
    OR institution_id IS NULL
    OR institution_id = (SELECT public.current_user_institution_id())
    OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE LOWER(au.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        AND (au.role = 'Super Admin' OR au.institution_id = edu_media_library.institution_id)
    )
  )
  WITH CHECK (
    (SELECT COALESCE(public.is_super_admin(), false))
    OR institution_id IS NULL
    OR institution_id = (SELECT public.current_user_institution_id())
    OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE LOWER(au.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        AND (au.role = 'Super Admin' OR au.institution_id = edu_media_library.institution_id)
    )
  );
