-- 1. DROPAR AS TABELAS ANTIGAS PARA LIMPAR O CAMINHO
DROP TABLE IF EXISTS public.edu_student_progress CASCADE;
DROP TABLE IF EXISTS public.edu_quiz_questions CASCADE;
DROP TABLE IF EXISTS public.edu_lessons CASCADE;
DROP TABLE IF EXISTS public.edu_modules CASCADE;
DROP TABLE IF EXISTS public.edu_courses CASCADE;

-- 2. RECRIAR AS TABELAS COM TODAS AS COLUNAS CORRETAS
CREATE TABLE public.edu_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT 'emerald',
    icon TEXT NOT NULL DEFAULT 'BookOpen',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.edu_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.edu_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.edu_modules(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    duration TEXT,
    xp INTEGER NOT NULL DEFAULT 10,
    coins INTEGER NOT NULL DEFAULT 5,
    content_url TEXT,
    content_body TEXT,
    position_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.edu_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer_index INTEGER NOT NULL,
    position_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.edu_student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
    score INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- 3. POLÍTICAS DE ACESSO LIVRE (PARA O MVP FLUIR SEM PROBLEMAS)
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Livre Courses" ON public.edu_courses FOR ALL USING (true);
CREATE POLICY "Acesso Livre Modules" ON public.edu_modules FOR ALL USING (true);
CREATE POLICY "Acesso Livre Lessons" ON public.edu_lessons FOR ALL USING (true);
CREATE POLICY "Acesso Livre Quiz" ON public.edu_quiz_questions FOR ALL USING (true);
CREATE POLICY "Acesso Livre Progress" ON public.edu_student_progress FOR ALL USING (true);

-- Notifica a API do Supabase para atualizar as colunas
NOTIFY pgrst, 'reload schema';
