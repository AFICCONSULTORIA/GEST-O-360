-- ==============================================================================
-- MIGRAÇÃO FASE 2 EDUCAÇÃO: DIÁRIO DE CLASSE (BNCC), BUSCA ATIVA (LDB) E EDUCACENSO (INEP)
-- Versão: 20261123020000
-- ==============================================================================

-- 1. Colunas Educacenso / INEP nas tabelas base
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS inep_code TEXT;
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS nis TEXT;

ALTER TABLE public.education_enrollments ADD COLUMN IF NOT EXISTS school_inep_code TEXT;
ALTER TABLE public.education_enrollments ADD COLUMN IF NOT EXISTS class_inep_code TEXT;

-- 2. Tabela de Diário de Classe (Registro de Aulas & Conteúdo BNCC)
CREATE TABLE IF NOT EXISTS public.education_class_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  school_name TEXT NOT NULL DEFAULT 'Escola Municipal',
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Língua Portuguesa',
  lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bncc_code TEXT,
  lesson_topic TEXT NOT NULL,
  teacher_name TEXT NOT NULL DEFAULT 'Professor(a)',
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_class_diary_inst_date
  ON public.education_class_diary (institution_id, class_name, lesson_date DESC);

-- 3. Tabela de Busca Ativa Escolar & Encaminhamento ao Conselho Tutelar (LDB 9.394/96)
CREATE TABLE IF NOT EXISTS public.education_busca_ativa_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  school_name TEXT NOT NULL DEFAULT 'Escola Municipal',
  attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_absences INTEGER NOT NULL DEFAULT 0,
  min_legal_rate INTEGER NOT NULL DEFAULT 75,
  risk_level TEXT NOT NULL DEFAULT 'alerta' CHECK (risk_level IN ('alerta', 'critico')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'contato_familia', 'conselho_tutelar', 'resolvido')),
  contact_notes TEXT,
  council_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_busca_ativa_inst_status
  ON public.education_busca_ativa_cases (institution_id, status, created_at DESC);

-- 4. RLS Multi-Tenant Estrito
ALTER TABLE public.education_class_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_busca_ativa_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_rw_education_class_diary" ON public.education_class_diary;
CREATE POLICY "tenant_rw_education_class_diary"
  ON public.education_class_diary
  FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "tenant_rw_education_busca_ativa_cases" ON public.education_busca_ativa_cases;
CREATE POLICY "tenant_rw_education_busca_ativa_cases"
  ON public.education_busca_ativa_cases
  FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());
