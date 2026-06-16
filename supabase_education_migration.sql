-- 1. Create specific Role Type 'professor' if needed in your roles, or just rely on the existing auth/admin logic.
-- Here we'll ensure 'professor' is part of the system or just use the text 'professor' in admin_users role.

-- 2. Create the Tables
CREATE TABLE public.edu_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT 'emerald',
    icon TEXT NOT NULL DEFAULT 'BookOpen',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
    type TEXT NOT NULL CHECK (type IN ('video', 'text', 'quiz')),
    title TEXT NOT NULL,
    duration TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    content_url TEXT,
    content_body TEXT,
    position_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.edu_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- expects ["A", "B", "C"]
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

-- 3. Row Level Security (RLS)

ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'gestor_ti')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is professor
CREATE OR REPLACE FUNCTION public.is_professor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role = 'professor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EDU COURSES POLICIES
CREATE POLICY "Public Read Access for Courses" ON public.edu_courses
FOR SELECT USING (true);

CREATE POLICY "Professor can create Courses" ON public.edu_courses
FOR INSERT WITH CHECK (is_admin() OR is_professor());

CREATE POLICY "Professor can update their own Courses" ON public.edu_courses
FOR UPDATE USING (is_admin() OR (is_professor() AND created_by = auth.uid()));

CREATE POLICY "Professor can delete their own Courses" ON public.edu_courses
FOR DELETE USING (is_admin() OR (is_professor() AND created_by = auth.uid()));

-- EDU MODULES POLICIES
CREATE POLICY "Public Read Access for Modules" ON public.edu_modules
FOR SELECT USING (true);

CREATE POLICY "Professor can manage modules of their courses" ON public.edu_modules
FOR ALL USING (
  is_admin() OR (is_professor() AND EXISTS (
    SELECT 1 FROM public.edu_courses c WHERE c.id = course_id AND c.created_by = auth.uid()
  ))
);

-- EDU LESSONS POLICIES
CREATE POLICY "Public Read Access for Lessons" ON public.edu_lessons
FOR SELECT USING (true);

CREATE POLICY "Professor can manage lessons of their courses" ON public.edu_lessons
FOR ALL USING (
  is_admin() OR (is_professor() AND EXISTS (
    SELECT 1 FROM public.edu_courses c
    JOIN public.edu_modules m ON m.course_id = c.id
    WHERE m.id = module_id AND c.created_by = auth.uid()
  ))
);

-- EDU QUIZ QUESTIONS POLICIES
CREATE POLICY "Public Read Access for Quiz Questions" ON public.edu_quiz_questions
FOR SELECT USING (true);

CREATE POLICY "Professor can manage quiz questions of their courses" ON public.edu_quiz_questions
FOR ALL USING (
  is_admin() OR (is_professor() AND EXISTS (
    SELECT 1 FROM public.edu_courses c
    JOIN public.edu_modules m ON m.course_id = c.id
    JOIN public.edu_lessons l ON l.module_id = m.id
    WHERE l.id = lesson_id AND c.created_by = auth.uid()
  ))
);

-- EDU STUDENT PROGRESS POLICIES
CREATE POLICY "Students can read their own progress" ON public.edu_student_progress
FOR SELECT USING (auth.uid() = student_id OR is_admin() OR is_professor());

CREATE POLICY "Students can insert their own progress" ON public.edu_student_progress
FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own progress" ON public.edu_student_progress
FOR UPDATE USING (auth.uid() = student_id);
