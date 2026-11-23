-- ==============================================================================
-- MIGRAÇÃO: ISOLAMENTO MULTI-TENANT, RLS ESTRITO E LGPD (EDUCAÇÃO)
-- Versão: 20261123010000
-- Endereça:
--   1. Segregação estrita por institution_id nas tabelas centrais da Educação
--   2. Remoção de políticas RLS permissivas (USING (true)) em tabelas de alunos
--   3. RPCs SECURITY DEFINER para Portal da Família (LGPD Art. 14)
--   4. Persistência no Supabase de confirmações "Ciente" em comunicados
-- ==============================================================================

-- 0. Função auxiliar para resolver o institution_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.current_user_institution_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'institution_id', ''),
    NULLIF(auth.jwt() ->> 'municipio_id', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'institution_id', ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'institution_id', ''),
    'inst_1'
  );
$$;

-- 1. Garantir existência das tabelas base da Educação (caso migrações anteriores não tenham rodado neste projeto)
CREATE TABLE IF NOT EXISTS public.education_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  name TEXT NOT NULL DEFAULT 'Aluno',
  enrollment_code TEXT,
  cpf TEXT,
  birth_date DATE,
  class_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  title TEXT DEFAULT 'Explorador Aprendiz',
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_creche_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  child_name TEXT NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_cpf TEXT,
  guardian_phone TEXT,
  birth_date DATE,
  requested_level TEXT NOT NULL,
  score_social NUMERIC(5,2) DEFAULT 0,
  queue_position INTEGER,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convocado', 'matriculado', 'desistente')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  school_id UUID,
  school_name TEXT DEFAULT 'Escola Municipal Monteiro Lobato',
  class_name TEXT NOT NULL,
  shift TEXT DEFAULT 'Matutino',
  academic_year INTEGER NOT NULL DEFAULT 2026,
  status TEXT NOT NULL DEFAULT 'matriculado' CHECK (status IN ('fila_espera', 'matriculado', 'transferido', 'evadido')),
  origin_creche_queue_id UUID REFERENCES public.education_creche_queue(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  enrollment_id UUID NOT NULL REFERENCES public.education_enrollments(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  bimester INTEGER NOT NULL CHECK (bimester IN (1, 2, 3, 4)),
  grade NUMERIC(4,2) NOT NULL,
  recovery_grade NUMERIC(4,2),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  enrollment_id UUID NOT NULL REFERENCES public.education_enrollments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'presente' CHECK (status IN ('presente', 'falta', 'justificada')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral' CHECK (category IN ('geral', 'reuniao', 'urgente', 'falta')),
  target_class TEXT,
  target_student_id UUID,
  publish_date DATE DEFAULT CURRENT_DATE,
  author_name TEXT NOT NULL DEFAULT 'Secretaria Escolar',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creche_waiting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  position INTEGER NOT NULL DEFAULT 1,
  child_name TEXT NOT NULL,
  guardian_name TEXT,
  stage TEXT NOT NULL DEFAULT 'Berçário' CHECK (stage IN ('Berçário', 'Maternal I', 'Maternal II')),
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convocado', 'matriculado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  student_id UUID NOT NULL,
  course_id UUID,
  lesson_id UUID NOT NULL,
  completed BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT education_lesson_progress_student_lesson_key UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.education_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  student_id UUID NOT NULL,
  quiz_id UUID NOT NULL,
  score NUMERIC NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  passed BOOLEAN DEFAULT false,
  earned_xp INTEGER DEFAULT 0,
  earned_coins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1b. Garantir institution_id (e colunas de identificação LGPD) caso as tabelas já existissem anteriormente
ALTER TABLE public.education_students
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1',
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS class_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.education_enrollments
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.education_grades
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.education_attendance
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.education_announcements
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.education_creche_queue
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.creche_waiting_queue
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.education_lesson_progress
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE public.education_quiz_attempts
  ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_students') THEN
    ALTER TABLE public.edu_students
      ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
  END IF;
END $$;

-- Índices multi-tenant
CREATE INDEX IF NOT EXISTS idx_edu_students_inst
  ON public.education_students (institution_id);
CREATE INDEX IF NOT EXISTS idx_edu_students_inst_birth
  ON public.education_students (institution_id, birth_date);
CREATE INDEX IF NOT EXISTS idx_edu_enrollments_inst_student
  ON public.education_enrollments (institution_id, student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_edu_grades_inst_enrollment
  ON public.education_grades (institution_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_edu_attendance_inst_enrollment
  ON public.education_attendance (institution_id, enrollment_id, date);
CREATE INDEX IF NOT EXISTS idx_edu_announcements_inst_publish
  ON public.education_announcements (institution_id, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_edu_creche_queue_inst
  ON public.education_creche_queue (institution_id, status, queue_position);
CREATE INDEX IF NOT EXISTS idx_creche_waiting_queue_inst
  ON public.creche_waiting_queue (institution_id, position ASC);

-- 2. Tabela de confirmação de leitura ("Ciente") de comunicados pela família
CREATE TABLE IF NOT EXISTS public.education_announcement_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  announcement_id UUID NOT NULL REFERENCES public.education_announcements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  acknowledged_by TEXT DEFAULT 'Responsável',
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_edu_announcement_ack UNIQUE (institution_id, announcement_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_edu_announcement_acks_student
  ON public.education_announcement_acks (institution_id, student_id);

-- 3. Habilitar RLS e substituir políticas permissivas (USING (true)) por isolamento estrito
ALTER TABLE public.education_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_creche_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creche_waiting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_announcement_acks ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas permissivas
DROP POLICY IF EXISTS "Permitir leitura de estudantes education" ON public.education_students;
DROP POLICY IF EXISTS "Permitir atualizacao de estudantes education" ON public.education_students;
DROP POLICY IF EXISTS "Permitir leitura de matriculas" ON public.education_enrollments;
DROP POLICY IF EXISTS "Permitir gerenciamento de matriculas" ON public.education_enrollments;
DROP POLICY IF EXISTS "Permitir leitura de notas" ON public.education_grades;
DROP POLICY IF EXISTS "Permitir gerenciamento de notas" ON public.education_grades;
DROP POLICY IF EXISTS "Permitir leitura de frequencia" ON public.education_attendance;
DROP POLICY IF EXISTS "Permitir gerenciamento de frequencia" ON public.education_attendance;
DROP POLICY IF EXISTS "Permitir leitura de comunicados" ON public.education_announcements;
DROP POLICY IF EXISTS "Permitir gerenciamento de comunicados" ON public.education_announcements;
DROP POLICY IF EXISTS "Permitir leitura de fila de creche" ON public.education_creche_queue;
DROP POLICY IF EXISTS "Permitir gerenciamento de fila de creche" ON public.education_creche_queue;
DROP POLICY IF EXISTS "Leitura publica fila creche" ON public.creche_waiting_queue;
DROP POLICY IF EXISTS "Gestao fila creche" ON public.creche_waiting_queue;
DROP POLICY IF EXISTS "Permitir leitura de progresso de aulas" ON public.education_lesson_progress;
DROP POLICY IF EXISTS "Permitir insercao e atualizacao de progresso de aulas" ON public.education_lesson_progress;
DROP POLICY IF EXISTS "Permitir leitura de tentativas de quiz" ON public.education_quiz_attempts;
DROP POLICY IF EXISTS "Permitir insercao de tentativas de quiz" ON public.education_quiz_attempts;

-- Políticas multi-tenant estritas para usuários autenticados da instituição
DROP POLICY IF EXISTS "Tenant isolation education_students" ON public.education_students;
CREATE POLICY "Tenant isolation education_students"
  ON public.education_students FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_enrollments" ON public.education_enrollments;
CREATE POLICY "Tenant isolation education_enrollments"
  ON public.education_enrollments FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_grades" ON public.education_grades;
CREATE POLICY "Tenant isolation education_grades"
  ON public.education_grades FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_attendance" ON public.education_attendance;
CREATE POLICY "Tenant isolation education_attendance"
  ON public.education_attendance FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_announcements" ON public.education_announcements;
CREATE POLICY "Tenant isolation education_announcements"
  ON public.education_announcements FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_creche_queue" ON public.education_creche_queue;
CREATE POLICY "Tenant isolation education_creche_queue"
  ON public.education_creche_queue FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation creche_waiting_queue" ON public.creche_waiting_queue;
CREATE POLICY "Tenant isolation creche_waiting_queue"
  ON public.creche_waiting_queue FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_lesson_progress" ON public.education_lesson_progress;
CREATE POLICY "Tenant isolation education_lesson_progress"
  ON public.education_lesson_progress FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_quiz_attempts" ON public.education_quiz_attempts;
CREATE POLICY "Tenant isolation education_quiz_attempts"
  ON public.education_quiz_attempts FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "Tenant isolation education_announcement_acks" ON public.education_announcement_acks;
CREATE POLICY "Tenant isolation education_announcement_acks"
  ON public.education_announcement_acks FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

-- 4. RPC LGPD (SECURITY DEFINER): Autenticação do Portal da Família por CPF + Data de Nascimento
CREATE OR REPLACE FUNCTION public.get_family_student_by_cpf_birth(
  p_institution_id TEXT,
  p_cpf TEXT,
  p_birth_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst TEXT := COALESCE(NULLIF(trim(p_institution_id), ''), 'inst_1');
  v_clean_cpf TEXT := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_student RECORD;
BEGIN
  IF length(v_clean_cpf) <> 11 OR p_birth_date IS NULL THEN
    RETURN jsonb_build_object(
      'found', false,
      'error', 'Informe um CPF válido (11 dígitos) e a data de nascimento do aluno.'
    );
  END IF;

  SELECT id, name, class_name, avatar_url, institution_id
  INTO v_student
  FROM public.education_students
  WHERE institution_id = v_inst
    AND regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_clean_cpf
    AND (birth_date IS NULL OR birth_date = p_birth_date)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'found', true,
      'student', jsonb_build_object(
        'id', v_student.id,
        'name', v_student.name,
        'className', v_student.class_name,
        'avatar', v_student.avatar_url,
        'institutionId', v_student.institution_id
      )
    );
  END IF;

  -- Compatibilidade com tabela legada edu_students, caso exista
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_students') THEN
    EXECUTE $sql$
      SELECT id, name, class_name, avatar_url, institution_id
      FROM public.edu_students
      WHERE institution_id = $1
        AND regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = $2
        AND (birth_date IS NULL OR birth_date = $3)
      LIMIT 1
    $sql$
    INTO v_student
    USING v_inst, v_clean_cpf, p_birth_date;

    IF v_student.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'found', true,
        'student', jsonb_build_object(
          'id', v_student.id,
          'name', v_student.name,
          'className', v_student.class_name,
          'avatar', v_student.avatar_url,
          'institutionId', v_student.institution_id
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'found', false,
    'error', 'Aluno não encontrado. Confira o CPF e a data de nascimento ou procure a secretaria da escola.'
  );
END;
$$;

-- 5. RPC LGPD (SECURITY DEFINER): Carrega matrícula, notas, frequência, comunicados e cientes apenas do aluno
CREATE OR REPLACE FUNCTION public.get_family_student_portal_data(
  p_institution_id TEXT,
  p_student_id UUID,
  p_academic_year INTEGER DEFAULT 2026
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst TEXT := COALESCE(NULLIF(trim(p_institution_id), ''), 'inst_1');
  v_enrollment RECORD;
  v_grades JSONB;
  v_attendance JSONB;
  v_announcements JSONB;
  v_acks JSONB;
BEGIN
  IF p_student_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT *
  INTO v_enrollment
  FROM public.education_enrollments
  WHERE institution_id = v_inst
    AND (student_id = p_student_id OR id = p_student_id)
    AND academic_year = COALESCE(p_academic_year, 2026)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(g ORDER BY g.subject, g.bimester), '[]'::jsonb)
  INTO v_grades
  FROM public.education_grades g
  WHERE g.institution_id = v_inst
    AND g.enrollment_id = v_enrollment.id;

  SELECT COALESCE(jsonb_agg(a ORDER BY a.date DESC), '[]'::jsonb)
  INTO v_attendance
  FROM public.education_attendance a
  WHERE a.institution_id = v_inst
    AND a.enrollment_id = v_enrollment.id;

  SELECT COALESCE(jsonb_agg(ann ORDER BY ann.publish_date DESC), '[]'::jsonb)
  INTO v_announcements
  FROM public.education_announcements ann
  WHERE ann.institution_id = v_inst
    AND (
      (ann.target_class IS NULL AND ann.target_student_id IS NULL)
      OR ann.target_class = v_enrollment.class_name
      OR ann.target_student_id = v_enrollment.student_id
    );

  SELECT COALESCE(jsonb_agg(ack.announcement_id), '[]'::jsonb)
  INTO v_acks
  FROM public.education_announcement_acks ack
  WHERE ack.institution_id = v_inst
    AND ack.student_id = v_enrollment.student_id;

  RETURN jsonb_build_object(
    'found', true,
    'enrollment', to_jsonb(v_enrollment),
    'grades', v_grades,
    'attendance', v_attendance,
    'announcements', v_announcements,
    'acknowledged_ids', v_acks
  );
END;
$$;

-- 6. RPCs para confirmação "Ciente" em comunicados (persistência real no Supabase)
CREATE OR REPLACE FUNCTION public.acknowledge_family_announcement(
  p_institution_id TEXT,
  p_announcement_id UUID,
  p_student_id UUID,
  p_acknowledged BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst TEXT := COALESCE(NULLIF(trim(p_institution_id), ''), 'inst_1');
BEGIN
  IF p_announcement_id IS NULL OR p_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parâmetros inválidos');
  END IF;

  IF COALESCE(p_acknowledged, true) THEN
    INSERT INTO public.education_announcement_acks (institution_id, announcement_id, student_id)
    VALUES (v_inst, p_announcement_id, p_student_id)
    ON CONFLICT (institution_id, announcement_id, student_id)
    DO UPDATE SET acknowledged_at = now();
  ELSE
    DELETE FROM public.education_announcement_acks
    WHERE institution_id = v_inst
      AND announcement_id = p_announcement_id
      AND student_id = p_student_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'acknowledged', COALESCE(p_acknowledged, true));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_family_announcement_acks(
  p_institution_id TEXT,
  p_student_id UUID
)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(announcement_id), ARRAY[]::UUID[])
  FROM public.education_announcement_acks
  WHERE institution_id = COALESCE(NULLIF(trim(p_institution_id), ''), 'inst_1')
    AND student_id = p_student_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_student_by_cpf_birth(TEXT, TEXT, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_student_portal_data(TEXT, UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_family_announcement(TEXT, UUID, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_announcement_acks(TEXT, UUID) TO anon, authenticated;
