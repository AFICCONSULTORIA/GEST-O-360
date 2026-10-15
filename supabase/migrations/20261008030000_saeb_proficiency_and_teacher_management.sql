-- ==============================================================================
-- MIGRAÇÃO SUPABASE: ESCALA DE PROFICIÊNCIA SAEB E GOVERNANÇA DE PROFESSORES
-- Módulo de Educação - GESTÃO 360
-- Arquivo: supabase/migrations/20261008030000_saeb_proficiency_and_teacher_management.sql
-- ==============================================================================

-- 0. PRÉ-REQUISITO GARANTIDO: ESTRUTURA DE MATRÍCULAS (education_enrollments)
-- Garante que a tabela de matrículas exista antes da criação das chaves estrangeiras,
-- permitindo a execução independente ou encadeada desta migração sem erro 42P01.
CREATE TABLE IF NOT EXISTS public.education_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    student_name TEXT NOT NULL,
    school_id UUID,
    school_name TEXT DEFAULT 'Escola Municipal Monteiro Lobato',
    class_name TEXT NOT NULL, -- ex: '1º Ano A', '4º Ano A', '5º Ano B'
    shift TEXT DEFAULT 'Matutino', -- 'Matutino', 'Vespertino', 'Integral'
    academic_year INTEGER NOT NULL DEFAULT 2026,
    status TEXT NOT NULL DEFAULT 'matriculado',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.education_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_year ON public.education_enrollments(class_name, academic_year);

ALTER TABLE public.education_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de matriculas" ON public.education_enrollments;
CREATE POLICY "Permitir leitura de matriculas" ON public.education_enrollments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de matriculas" ON public.education_enrollments;
CREATE POLICY "Permitir gerenciamento de matriculas" ON public.education_enrollments
    FOR ALL USING (true) WITH CHECK (true);

-- Seed de Matrículas Iniciais (Ano Letivo 2026) garantindo integridade de FK
INSERT INTO public.education_enrollments (id, student_id, student_name, school_name, class_name, shift, academic_year, status)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ana Silva', 'Escola Municipal Monteiro Lobato', '4º Ano A', 'Matutino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Bruno Souza', 'Escola Municipal Monteiro Lobato', '4º Ano A', 'Matutino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Carla Dias', 'Escola Municipal Monteiro Lobato', '4º Ano A', 'Matutino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Diego Ramos', 'Escola Municipal Monteiro Lobato', '5º Ano B', 'Vespertino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Enzo Costa', 'Escola Municipal Monteiro Lobato', '5º Ano B', 'Vespertino', 2026, 'matriculado')
ON CONFLICT (id) DO NOTHING;


-- 1. Reestruturação da Tabela de Avaliação por Proficiência SAEB
CREATE TABLE IF NOT EXISTS public.education_proficiencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.education_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    subject TEXT NOT NULL, -- ex: 'Língua Portuguesa', 'Matemática', 'Ciências da Natureza'
    bimester INTEGER NOT NULL CHECK (bimester IN (1, 2, 3, 4)),
    proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('abaixo_do_basico', 'basico', 'adequado', 'avancado')),
    descriptive_opinion TEXT, -- Parecer descritivo e observação pedagógica
    teacher_id UUID NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_student_subject_bimester UNIQUE (enrollment_id, subject, bimester)
);

-- Índices de Performance para Consultas de Turma e Boletim
CREATE INDEX IF NOT EXISTS idx_edu_prof_enrollment ON public.education_proficiencies(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_edu_prof_student ON public.education_proficiencies(student_id);
CREATE INDEX IF NOT EXISTS idx_edu_prof_subj_bim ON public.education_proficiencies(subject, bimester);
CREATE INDEX IF NOT EXISTS idx_edu_prof_teacher ON public.education_proficiencies(teacher_id);
CREATE INDEX IF NOT EXISTS idx_edu_prof_level ON public.education_proficiencies(proficiency_level);


-- 2. Tabela de Gestão de Professores e Vínculos de Turma
CREATE TABLE IF NOT EXISTS public.education_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cpf TEXT,
    registration_number TEXT, -- Matrícula funcional (ex: PROF001)
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente')),
    assigned_classes TEXT[] DEFAULT '{}', -- ex: ARRAY['4º Ano A', '5º Ano B']
    assigned_subjects TEXT[] DEFAULT '{}', -- ex: ARRAY['Matemática', 'Ciências da Natureza']
    created_by UUID, -- ID do Coordenador/Gestor que cadastrou
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edu_teachers_email ON public.education_teachers(email);
CREATE INDEX IF NOT EXISTS idx_edu_teachers_reg ON public.education_teachers(registration_number);
CREATE INDEX IF NOT EXISTS idx_edu_teachers_status ON public.education_teachers(status);


-- 3. RPC para Criação Segura de Professor pela Coordenação
CREATE OR REPLACE FUNCTION public.admin_register_teacher(
    p_name TEXT,
    p_email TEXT,
    p_cpf TEXT DEFAULT NULL,
    p_registration_number TEXT DEFAULT NULL,
    p_assigned_classes TEXT[] DEFAULT '{}',
    p_assigned_subjects TEXT[] DEFAULT '{}',
    p_created_by UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'ativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_email TEXT;
    v_teacher_record public.education_teachers;
    v_result JSONB;
BEGIN
    v_clean_email := lower(trim(p_email));
    
    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RAISE EXCEPTION 'O e-mail do professor é obrigatório.';
    END IF;

    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'O nome do professor é obrigatório.';
    END IF;

    -- Upsert na tabela education_teachers
    INSERT INTO public.education_teachers (
        name,
        email,
        cpf,
        registration_number,
        assigned_classes,
        assigned_subjects,
        created_by,
        status
    )
    VALUES (
        trim(p_name),
        v_clean_email,
        trim(p_cpf),
        trim(p_registration_number),
        COALESCE(p_assigned_classes, '{}'),
        COALESCE(p_assigned_subjects, '{}'),
        p_created_by,
        COALESCE(p_status, 'ativo')
    )
    ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        cpf = COALESCE(EXCLUDED.cpf, education_teachers.cpf),
        registration_number = COALESCE(EXCLUDED.registration_number, education_teachers.registration_number),
        assigned_classes = EXCLUDED.assigned_classes,
        assigned_subjects = EXCLUDED.assigned_subjects,
        status = EXCLUDED.status
    RETURNING * INTO v_teacher_record;

    -- Sincronização retrocompatível com edu_staff caso a tabela exista
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_staff') THEN
        INSERT INTO public.edu_staff (
            id,
            name,
            role,
            email,
            registration,
            cpf,
            classes,
            subject,
            status
        )
        VALUES (
            v_teacher_record.id::text,
            v_teacher_record.name,
            'teacher',
            v_teacher_record.email,
            COALESCE(v_teacher_record.registration_number, 'PROF' || substring(v_teacher_record.id::text, 1, 4)),
            COALESCE(v_teacher_record.cpf, ''),
            v_teacher_record.assigned_classes,
            array_to_string(v_teacher_record.assigned_subjects, ', '),
            v_teacher_record.status
        )
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            classes = EXCLUDED.classes,
            subject = EXCLUDED.subject,
            status = EXCLUDED.status;
    END IF;

    v_result := to_jsonb(v_teacher_record);
    RETURN v_result;
END;
$$;


-- 4. RPC para Lançamento em Lote de Proficiências SAEB
CREATE OR REPLACE FUNCTION public.save_proficiencies_batch(p_records JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_inserted_count INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO public.education_proficiencies (
            enrollment_id,
            student_id,
            subject,
            bimester,
            proficiency_level,
            descriptive_opinion,
            teacher_id,
            updated_at
        )
        VALUES (
            (v_item->>'enrollment_id')::UUID,
            (v_item->>'student_id')::UUID,
            v_item->>'subject',
            (v_item->>'bimester')::INTEGER,
            v_item->>'proficiency_level',
            v_item->>'descriptive_opinion',
            (v_item->>'teacher_id')::UUID,
            now()
        )
        ON CONFLICT (enrollment_id, subject, bimester) DO UPDATE SET
            proficiency_level = EXCLUDED.proficiency_level,
            descriptive_opinion = EXCLUDED.descriptive_opinion,
            teacher_id = EXCLUDED.teacher_id,
            updated_at = now();

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'records_count', v_inserted_count
    );
END;
$$;


-- 5. RLS e Políticas de Segurança
ALTER TABLE public.education_proficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de proficiencias" ON public.education_proficiencies;
CREATE POLICY "Permitir leitura de proficiencias" ON public.education_proficiencies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de proficiencias" ON public.education_proficiencies;
CREATE POLICY "Permitir gerenciamento de proficiencias" ON public.education_proficiencies
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de professores" ON public.education_teachers;
CREATE POLICY "Permitir leitura de professores" ON public.education_teachers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de professores" ON public.education_teachers;
CREATE POLICY "Permitir gerenciamento de professores" ON public.education_teachers
    FOR ALL USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.admin_register_teacher(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_proficiencies_batch(JSONB) TO anon, authenticated, service_role;


-- 6. Migração retroativa de dados legados de education_grades (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'education_grades') THEN
        INSERT INTO public.education_proficiencies (enrollment_id, student_id, subject, bimester, proficiency_level, descriptive_opinion, teacher_id)
        SELECT 
            eg.enrollment_id,
            COALESCE(ee.student_id, gen_random_uuid()),
            eg.subject,
            eg.bimester,
            CASE 
                WHEN eg.grade >= 9.0 THEN 'avancado'
                WHEN eg.grade >= 6.0 THEN 'adequado'
                WHEN eg.grade >= 4.0 THEN 'basico'
                ELSE 'abaixo_do_basico'
            END AS proficiency_level,
            'Migrado da avaliação numérica legada (' || eg.grade || ' pts).' AS descriptive_opinion,
            'c1000000-0000-0000-0000-000000000001'::UUID AS teacher_id
        FROM public.education_grades eg
        LEFT JOIN public.education_enrollments ee ON ee.id = eg.enrollment_id
        ON CONFLICT (enrollment_id, subject, bimester) DO NOTHING;
    END IF;
END $$;


-- 7. SEED: Professores Iniciais e Proficiências Iniciais (Ano Letivo 2026)
INSERT INTO public.education_teachers (id, name, email, cpf, registration_number, status, assigned_classes, assigned_subjects)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'Prof. Carlos Eduardo Silva', 'carlos.eduardo@escola.gov.br', '321.654.987-12', 'PROF001', 'ativo', ARRAY['4º Ano A', '5º Ano B'], ARRAY['Matemática', 'Ciências da Natureza']),
    ('c1000000-0000-0000-0000-000000000002', 'Profa. Sofia Lima Mendes', 'sofia.lima@escola.gov.br', '456.789.123-45', 'PROF002', 'ativo', ARRAY['4º Ano A', '1º Ano A'], ARRAY['Língua Portuguesa', 'História']),
    ('c1000000-0000-0000-0000-000000000003', 'Prof. Roberto Albuquerque', 'roberto.albuquerque@escola.gov.br', '789.123.456-78', 'PROF003', 'ativo', ARRAY['5º Ano B'], ARRAY['Geografia', 'Arte', 'Educação Física'])
ON CONFLICT (email) DO NOTHING;

-- Proficiências Iniciais (SAEB) para a Estudante Ana Silva (4º Ano A - Matrícula b0000000-0000-0000-0000-000000000001)
INSERT INTO public.education_proficiencies (enrollment_id, student_id, subject, bimester, proficiency_level, descriptive_opinion, teacher_id)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 1, 'adequado', 'Excelente capacidade de compreensão leitora e interpretação de textos narrativos.', 'c1000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 2, 'avancado', 'Demonstra domínio da norma culta, coesão textual e escrita autônoma criativa.', 'c1000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 3, 'avancado', 'Participação ativa nos círculos de leitura e produção textual crítica.', 'c1000000-0000-0000-0000-000000000002'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Matemática', 1, 'adequado', 'Resolve operações fundamentais e problemas do cotidiano com raciocínio lógico.', 'c1000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Matemática', 2, 'avancado', 'Destaca-se em geometria espacial básica e raciocínio proporcional.', 'c1000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Matemática', 3, 'adequado', 'Bom desempenho na análise de gráficos e tabelas de dupla entrada.', 'c1000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ciências da Natureza', 1, 'adequado', 'Compreensão sólida dos ciclos naturais e ecossistemas locais.', 'c1000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ciências da Natureza', 2, 'avancado', 'Apresentação destacada no projeto de sustentabilidade hídrica.', 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (enrollment_id, subject, bimester) DO NOTHING;
