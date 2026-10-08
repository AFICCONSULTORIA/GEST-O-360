-- Script de Setup Direto: Persistência de Progresso e Gamificação do Portal do Aluno
-- Arquivo: database/setup_education_gamification.sql
-- Espelho da migração supabase/migrations/20261008000000_student_progress_gamification.sql

-- 1. Garantir existência da tabela de perfil de estudantes de educação
CREATE TABLE IF NOT EXISTS public.education_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Aluno',
    enrollment_code TEXT,
    level INTEGER DEFAULT 1,
    title TEXT DEFAULT 'Explorador Aprendiz',
    xp INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Garantir colunas de gamificação na tabela de perfil do aluno (education_students)
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.education_students ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Caso a tabela legada edu_students exista, garantir compatibilidade também
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_students') THEN
        ALTER TABLE public.edu_students ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
        ALTER TABLE public.edu_students ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
        ALTER TABLE public.edu_students ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
        ALTER TABLE public.edu_students ADD COLUMN IF NOT EXISTS last_activity_date DATE;
    END IF;
END $$;

-- 3. Tabela de persistência do progresso das lições
CREATE TABLE IF NOT EXISTS public.education_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    course_id UUID,
    lesson_id UUID NOT NULL,
    completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT education_lesson_progress_student_lesson_key UNIQUE(student_id, lesson_id)
);

-- Índices para buscas rápidas de progresso do aluno
CREATE INDEX IF NOT EXISTS idx_edu_lesson_prog_student ON public.education_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_edu_lesson_prog_course ON public.education_lesson_progress(student_id, course_id);

-- 4. Tabela de tentativas de Quiz
CREATE TABLE IF NOT EXISTS public.education_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Índice para histórico de tentativas de quiz do aluno
CREATE INDEX IF NOT EXISTS idx_edu_quiz_attempts_student ON public.education_quiz_attempts(student_id, quiz_id);

-- 5. RPC Atômica: complete_education_lesson
CREATE OR REPLACE FUNCTION public.complete_education_lesson(
    p_student_id UUID,
    p_course_id UUID,
    p_lesson_id UUID,
    p_xp_reward INTEGER DEFAULT 15,
    p_coins_reward INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_already_completed BOOLEAN;
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_new_streak INTEGER;
    v_xp INTEGER;
    v_coins INTEGER;
BEGIN
    -- 1. Verifica se a lição já foi concluída anteriormente pelo aluno
    SELECT EXISTS (
        SELECT 1 
        FROM public.education_lesson_progress
        WHERE student_id = p_student_id 
          AND lesson_id = p_lesson_id 
          AND completed = true
    ) INTO v_already_completed;

    -- Se já foi concluída, não credita XP/Moedas novamente
    IF v_already_completed THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'earned_xp', 0,
            'earned_coins', 0,
            'message', 'Aula já concluída anteriormente'
        );
    END IF;

    -- 2. Insere ou atualiza o progresso da aula
    INSERT INTO public.education_lesson_progress (
        student_id,
        course_id,
        lesson_id,
        completed,
        completed_at
    ) VALUES (
        p_student_id,
        p_course_id,
        p_lesson_id,
        true,
        now()
    )
    ON CONFLICT (student_id, lesson_id) 
    DO UPDATE SET 
        completed = true,
        completed_at = now();

    -- 3. Obter ou inicializar o registro do estudante em education_students
    SELECT last_activity_date, streak_count, xp, coins
    INTO v_last_activity, v_current_streak, v_xp, v_coins
    FROM public.education_students
    WHERE id = p_student_id
    FOR UPDATE;

    -- Se não existir em education_students, cria o registro inicial
    IF NOT FOUND THEN
        v_current_streak := 0;
        v_xp := 0;
        v_coins := 0;
        v_last_activity := NULL;
        
        INSERT INTO public.education_students (
            id, name, xp, coins, streak_count, last_activity_date
        ) VALUES (
            p_student_id, 'Aluno', 0, 0, 0, NULL
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 4. Cálculo da ofensiva (Streak Diária)
    IF v_last_activity IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_activity = CURRENT_DATE THEN
        -- Já praticou hoje: mantém a sequência atual
        v_new_streak := GREATEST(COALESCE(v_current_streak, 1), 1);
    ELSIF v_last_activity = CURRENT_DATE - 1 THEN
        -- Praticou ontem: incrementa sequência
        v_new_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
        -- Quebrou a sequência (anterior a ontem): reinicia para 1
        v_new_streak := 1;
    END IF;

    -- 5. Atualiza o perfil do aluno com os pontos creditados
    UPDATE public.education_students
    SET 
        xp = COALESCE(xp, 0) + COALESCE(p_xp_reward, 0),
        coins = COALESCE(coins, 0) + COALESCE(p_coins_reward, 0),
        streak_count = v_new_streak,
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = p_student_id;

    -- Sincroniza edu_students caso exista
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_students') THEN
        UPDATE public.edu_students
        SET 
            xp = COALESCE(xp, 0) + COALESCE(p_xp_reward, 0),
            coins = COALESCE(coins, 0) + COALESCE(p_coins_reward, 0),
            streak_count = v_new_streak,
            last_activity_date = CURRENT_DATE
        WHERE id = p_student_id;
    END IF;

    -- 6. Retorna resposta JSONB com status e valores creditados
    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'earned_xp', COALESCE(p_xp_reward, 0),
        'earned_coins', COALESCE(p_coins_reward, 0),
        'streak_count', v_new_streak,
        'message', 'Aula concluída com sucesso!'
    );
END;
$$;

-- 6. RPC Atômica: submit_education_quiz
CREATE OR REPLACE FUNCTION public.submit_education_quiz(
    p_student_id UUID,
    p_quiz_id UUID,
    p_score NUMERIC,
    p_total_questions INTEGER,
    p_correct_answers INTEGER,
    p_earned_xp INTEGER,
    p_earned_coins INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt_id UUID;
    v_passed BOOLEAN;
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_new_streak INTEGER;
BEGIN
    -- Determina aprovação (mínimo de 60%)
    IF p_total_questions > 0 THEN
        v_passed := (p_correct_answers::numeric / p_total_questions::numeric) >= 0.6;
    ELSE
        v_passed := false;
    END IF;

    -- 1. Insere o registro da tentativa
    INSERT INTO public.education_quiz_attempts (
        student_id,
        quiz_id,
        score,
        total_questions,
        correct_answers,
        passed,
        earned_xp,
        earned_coins,
        created_at
    ) VALUES (
        p_student_id,
        p_quiz_id,
        p_score,
        p_total_questions,
        p_correct_answers,
        v_passed,
        p_earned_xp,
        p_earned_coins,
        now()
    ) RETURNING id INTO v_attempt_id;

    -- 2. Se houver ganho de XP ou Moedas, credita na tabela do aluno e atualiza a atividade
    IF p_earned_xp > 0 OR p_earned_coins > 0 THEN
        SELECT last_activity_date, streak_count
        INTO v_last_activity, v_current_streak
        FROM public.education_students
        WHERE id = p_student_id
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_streak := 0;
            v_last_activity := NULL;
            INSERT INTO public.education_students (id, name, xp, coins, streak_count, last_activity_date)
            VALUES (p_student_id, 'Aluno', 0, 0, 0, NULL)
            ON CONFLICT (id) DO NOTHING;
        END IF;

        IF v_last_activity IS NULL THEN
            v_new_streak := 1;
        ELSIF v_last_activity = CURRENT_DATE THEN
            v_new_streak := GREATEST(COALESCE(v_current_streak, 1), 1);
        ELSIF v_last_activity = CURRENT_DATE - 1 THEN
            v_new_streak := COALESCE(v_current_streak, 0) + 1;
        ELSE
            v_new_streak := 1;
        END IF;

        UPDATE public.education_students
        SET 
            xp = COALESCE(xp, 0) + p_earned_xp,
            coins = COALESCE(coins, 0) + p_earned_coins,
            streak_count = v_new_streak,
            last_activity_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = p_student_id;

        -- Sincroniza edu_students caso exista
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'edu_students') THEN
            UPDATE public.edu_students
            SET 
                xp = COALESCE(xp, 0) + p_earned_xp,
                coins = COALESCE(coins, 0) + p_earned_coins,
                streak_count = v_new_streak,
                last_activity_date = CURRENT_DATE
            WHERE id = p_student_id;
        END IF;
    ELSE
        SELECT streak_count INTO v_new_streak FROM public.education_students WHERE id = p_student_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', v_attempt_id,
        'passed', v_passed,
        'score', p_score,
        'earned_xp', p_earned_xp,
        'earned_coins', p_earned_coins,
        'streak_count', COALESCE(v_new_streak, 1),
        'message', 'Tentativa de quiz registrada com sucesso!'
    );
END;
$$;

-- 7. Configuração de RLS (Row Level Security) e Permissões
ALTER TABLE public.education_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para leitura e escrita por chave de API
DROP POLICY IF EXISTS "Permitir leitura de estudantes education" ON public.education_students;
CREATE POLICY "Permitir leitura de estudantes education" ON public.education_students
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao de estudantes education" ON public.education_students;
CREATE POLICY "Permitir atualizacao de estudantes education" ON public.education_students
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de progresso de aulas" ON public.education_lesson_progress;
CREATE POLICY "Permitir leitura de progresso de aulas" ON public.education_lesson_progress
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao e atualizacao de progresso de aulas" ON public.education_lesson_progress;
CREATE POLICY "Permitir insercao e atualizacao de progresso de aulas" ON public.education_lesson_progress
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de tentativas de quiz" ON public.education_quiz_attempts;
CREATE POLICY "Permitir leitura de tentativas de quiz" ON public.education_quiz_attempts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao de tentativas de quiz" ON public.education_quiz_attempts;
CREATE POLICY "Permitir insercao de tentativas de quiz" ON public.education_quiz_attempts
    FOR INSERT WITH CHECK (true);

-- Permissões de execução das RPCs
GRANT EXECUTE ON FUNCTION public.complete_education_lesson(UUID, UUID, UUID, INTEGER, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_education_quiz(UUID, UUID, NUMERIC, INTEGER, INTEGER, INTEGER, INTEGER) TO anon, authenticated, service_role;
