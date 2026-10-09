-- ==============================================================================
-- MIGRAÇÃO SUPABASE: FASE 3 (SECRETARIA E RELATÓRIOS) & FASE 4 (FAMÍLIA E COMUNICAÇÃO)
-- Módulo de Educação - GESTÃO 360
-- ==============================================================================

-- 1. Fila de Espera Unificada dos CMEIs (Creches)
CREATE TABLE IF NOT EXISTS public.education_creche_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_name TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    guardian_cpf TEXT,
    guardian_phone TEXT,
    birth_date DATE,
    requested_level TEXT NOT NULL, -- 'Berçário I', 'Berçário II', 'Maternal I', 'Maternal II'
    score_social NUMERIC(5,2) DEFAULT 0,
    queue_position INTEGER,
    status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convocado', 'matriculado', 'desistente')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Estrutura Acadêmica e Matrículas Unificadas
CREATE TABLE IF NOT EXISTS public.education_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    student_name TEXT NOT NULL,
    school_id UUID,
    school_name TEXT DEFAULT 'Escola Municipal Monteiro Lobato',
    class_name TEXT NOT NULL, -- ex: '1º Ano A', '4º Ano A', '5º Ano B', 'Berçário II'
    shift TEXT DEFAULT 'Matutino', -- 'Matutino', 'Vespertino', 'Integral'
    academic_year INTEGER NOT NULL DEFAULT 2026,
    status TEXT NOT NULL DEFAULT 'matriculado' CHECK (status IN ('fila_espera', 'matriculado', 'transferido', 'evadido')),
    origin_creche_queue_id UUID REFERENCES public.education_creche_queue(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Notas, Avaliações e Boletim Escolar
CREATE TABLE IF NOT EXISTS public.education_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.education_enrollments(id) ON DELETE CASCADE,
    subject TEXT NOT NULL, -- 'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 'Arte', 'Educação Física'
    bimester INTEGER NOT NULL CHECK (bimester IN (1, 2, 3, 4)),
    grade NUMERIC(4,2) NOT NULL,
    recovery_grade NUMERIC(4,2),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Frequência Diária e Diário Oficial
CREATE TABLE IF NOT EXISTS public.education_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.education_enrollments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'presente' CHECK (status IN ('presente', 'falta', 'justificada')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Comunicados Oficiais e Portal da Família
CREATE TABLE IF NOT EXISTS public.education_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'geral' CHECK (category IN ('geral', 'reuniao', 'urgente', 'falta')),
    target_class TEXT, -- NULL indica comunicado geral para toda a escola
    target_student_id UUID, -- Opcional: direcionado para um aluno específico (alerta aos pais)
    publish_date DATE DEFAULT CURRENT_DATE,
    author_name TEXT NOT NULL DEFAULT 'Secretaria Escolar',
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para Desempenho
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.education_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_year ON public.education_enrollments(class_name, academic_year);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment_bim ON public.education_grades(enrollment_id, bimester);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_date ON public.education_attendance(enrollment_id, date);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON public.education_announcements(target_class, publish_date);
CREATE INDEX IF NOT EXISTS idx_creche_queue_status ON public.education_creche_queue(status, queue_position);

-- RLS (Row Level Security)
ALTER TABLE public.education_creche_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_announcements ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura e Escrita
DROP POLICY IF EXISTS "Permitir leitura de fila de creche" ON public.education_creche_queue;
CREATE POLICY "Permitir leitura de fila de creche" ON public.education_creche_queue FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gerenciamento de fila de creche" ON public.education_creche_queue;
CREATE POLICY "Permitir gerenciamento de fila de creche" ON public.education_creche_queue FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de matriculas" ON public.education_enrollments;
CREATE POLICY "Permitir leitura de matriculas" ON public.education_enrollments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gerenciamento de matriculas" ON public.education_enrollments;
CREATE POLICY "Permitir gerenciamento de matriculas" ON public.education_enrollments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de notas" ON public.education_grades;
CREATE POLICY "Permitir leitura de notas" ON public.education_grades FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gerenciamento de notas" ON public.education_grades;
CREATE POLICY "Permitir gerenciamento de notas" ON public.education_grades FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de frequencia" ON public.education_attendance;
CREATE POLICY "Permitir leitura de frequencia" ON public.education_attendance FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gerenciamento de frequencia" ON public.education_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de comunicados" ON public.education_announcements;
CREATE POLICY "Permitir leitura de comunicados" ON public.education_announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gerenciamento de comunicados" ON public.education_announcements FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- DADOS INICIAIS (SEED) - ANO LETIVO 2026
-- ==============================================================================

-- 1. Fila de Creche Inicial
INSERT INTO public.education_creche_queue (id, child_name, guardian_name, guardian_cpf, guardian_phone, birth_date, requested_level, score_social, queue_position, status)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Alice Vitória Rocha', 'Camila Rocha', '842.109.432-15', '(66) 99611-3044', '2025-04-12', 'Berçário II', 95.50, 1, 'aguardando'),
    ('a0000000-0000-0000-0000-000000000002', 'Bernardo Henrique Lima', 'Fabiana Lima', '512.984.112-90', '(66) 99877-4421', '2024-10-05', 'Maternal I', 88.00, 2, 'aguardando'),
    ('a0000000-0000-0000-0000-000000000003', 'Clara Maria Ribeiro', 'Fernanda Ribeiro', '641.882.341-02', '(66) 99765-8812', '2024-02-18', 'Maternal II', 76.50, 3, 'aguardando')
ON CONFLICT (id) DO NOTHING;

-- 2. Matrículas Iniciais (Ano Letivo 2026)
INSERT INTO public.education_enrollments (id, student_id, student_name, school_name, class_name, shift, academic_year, status)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ana Silva', 'Escola Municipal Monteiro Lobato', '4º Ano A', 'Matutino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Bruno Souza', 'Escola Municipal Monteiro Lobato', '4º Ano A', 'Matutino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Carla Dias', 'Escola Municipal Monteiro Lobato', '4º Ano A', 'Matutino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Diego Ramos', 'Escola Municipal Monteiro Lobato', '5º Ano B', 'Vespertino', 2026, 'matriculado'),
    ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Enzo Costa', 'Escola Municipal Monteiro Lobato', '5º Ano B', 'Vespertino', 2026, 'matriculado')
ON CONFLICT (id) DO NOTHING;

-- 3. Notas Bimestrais para Estudante Ana Silva (4º Ano A)
INSERT INTO public.education_grades (enrollment_id, subject, bimester, grade, recovery_grade)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 1, 8.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 2, 9.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 3, 8.8, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Língua Portuguesa', 4, 9.2, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Matemática', 1, 9.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Matemática', 2, 8.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Matemática', 3, 9.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Matemática', 4, 9.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Ciências', 1, 8.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Ciências', 2, 8.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Ciências', 3, 8.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Ciências', 4, 8.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'História', 1, 9.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'História', 2, 9.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'História', 3, 8.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'História', 4, 9.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Geografia', 1, 8.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Geografia', 2, 8.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Geografia', 3, 7.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Geografia', 4, 8.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Arte', 1, 10.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Arte', 2, 9.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Arte', 3, 10.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Arte', 4, 10.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Educação Física', 1, 9.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Educação Física', 2, 9.0, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Educação Física', 3, 9.5, NULL),
    ('b0000000-0000-0000-0000-000000000001', 'Educação Física', 4, 9.5, NULL)
ON CONFLICT DO NOTHING;

-- 4. Frequência Inicial (Outubro 2026)
INSERT INTO public.education_attendance (enrollment_id, date, status, notes)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '2026-10-01', 'presente', NULL),
    ('b0000000-0000-0000-0000-000000000001', '2026-10-02', 'presente', NULL),
    ('b0000000-0000-0000-0000-000000000001', '2026-10-05', 'presente', NULL),
    ('b0000000-0000-0000-0000-000000000001', '2026-10-06', 'presente', NULL),
    ('b0000000-0000-0000-0000-000000000001', '2026-10-07', 'presente', NULL),
    ('b0000000-0000-0000-0000-000000000001', '2026-10-08', 'presente', NULL)
ON CONFLICT DO NOTHING;

-- 5. Comunicados Iniciais da Escola
INSERT INTO public.education_announcements (id, title, content, category, target_class, target_student_id, publish_date, author_name, views_count)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'Reunião Geral de Pais e Mestres do 4º Bimestre',
        'Prezados pais e responsáveis, convidamos a todos para a reunião de prestação de contas pedagógicas e entrega prévia das avaliações do 4º bimestre no dia 24/10 às 18h30.',
        'reuniao',
        NULL,
        NULL,
        CURRENT_DATE,
        'Coordenação Pedagógica',
        142
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'Alerta de Vacinação: Campanha Escolar no Posto de Saúde',
        'Atenção famílias: a Secretaria Municipal de Saúde realizará a atualização da caderneta de vacinação escolar nesta sexta-feira na unidade escolar.',
        'urgente',
        NULL,
        NULL,
        CURRENT_DATE,
        'Secretaria de Saúde e Educação',
        310
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'Feira Municipal de Ciências e Tecnologia - Turma 4º Ano A',
        'Lembramos aos estudantes do 4º Ano A que as maquetes do projeto de sustentabilidade hídrica devem ser entregues até a próxima terça-feira.',
        'geral',
        '4º Ano A',
        NULL,
        CURRENT_DATE,
        'Prof. Carlos Andrade',
        45
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'Aviso de Busca Ativa e Frequência Escolar',
        'Prezados responsáveis pelo aluno Enzo Costa: identificamos 3 ausências consecutivas nesta quinzena. Solicitamos comparecer à secretaria para justificar ou solicitar apoio.',
        'falta',
        '5º Ano B',
        '00000000-0000-0000-0000-000000000005',
        CURRENT_DATE,
        'Serviço Social Escolar',
        12
    )
ON CONFLICT (id) DO NOTHING;
