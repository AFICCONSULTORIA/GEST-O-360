-- Script de setup para o Gestão 360 Educação (Módulo de Educação)

-- Tabela: edu_students (Perfil global do aluno)
CREATE TABLE IF NOT EXISTS public.edu_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    title TEXT DEFAULT 'Explorador Aprendiz',
    xp INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: edu_courses (Trilhas de conhecimento)
CREATE TABLE IF NOT EXISTS public.edu_courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    bg_class TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: edu_lessons (Fases/Aulas de cada trilha)
CREATE TABLE IF NOT EXISTS public.edu_lessons (
    id SERIAL PRIMARY KEY,
    course_id TEXT REFERENCES public.edu_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- video, quiz, read
    order_index INTEGER NOT NULL,
    reward_xp INTEGER DEFAULT 100,
    reward_coins INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: edu_student_progress (Acompanhamento das aulas concluídas)
CREATE TABLE IF NOT EXISTS public.edu_student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.edu_students(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- Tabela: edu_achievements (Catálogo de insígnias)
CREATE TABLE IF NOT EXISTS public.edu_achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL, -- Nome do ícone no lucide-react (ex: Flame, Star)
    color_class TEXT NOT NULL,
    condition_type TEXT NOT NULL, -- Ex: 'xp_reached', 'streak_reached'
    condition_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: edu_student_achievements (Insígnias desbloqueadas pelo aluno)
CREATE TABLE IF NOT EXISTS public.edu_student_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.edu_students(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.edu_achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

-- Configuração RLS (Row Level Security)

-- Ativar RLS
ALTER TABLE public.edu_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_achievements ENABLE ROW LEVEL SECURITY;

-- Políticas para edu_students
CREATE POLICY "Usuários podem ver seu próprio perfil de aluno"
    ON public.edu_students FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil de aluno"
    ON public.edu_students FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil de aluno"
    ON public.edu_students FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Políticas para leitura pública (autenticada)
CREATE POLICY "Leitura pública autenticada para cursos"
    ON public.edu_courses FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Leitura pública autenticada para aulas"
    ON public.edu_lessons FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Leitura pública autenticada para achievements"
    ON public.edu_achievements FOR SELECT
    USING (auth.role() = 'authenticated');

-- Políticas para edu_student_progress
CREATE POLICY "Usuários veem próprio progresso"
    ON public.edu_student_progress FOR SELECT
    USING (student_id IN (SELECT id FROM public.edu_students WHERE user_id = auth.uid()));

CREATE POLICY "Usuários atualizam próprio progresso"
    ON public.edu_student_progress FOR ALL
    USING (student_id IN (SELECT id FROM public.edu_students WHERE user_id = auth.uid()));

-- Políticas para edu_student_achievements
CREATE POLICY "Usuários veem próprias conquistas"
    ON public.edu_student_achievements FOR SELECT
    USING (student_id IN (SELECT id FROM public.edu_students WHERE user_id = auth.uid()));

CREATE POLICY "Usuários inserem próprias conquistas"
    ON public.edu_student_achievements FOR INSERT
    WITH CHECK (student_id IN (SELECT id FROM public.edu_students WHERE user_id = auth.uid()));

-- Trigger para updated_at no perfil do aluno
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_edu_students_modtime
    BEFORE UPDATE ON public.edu_students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
