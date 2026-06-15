-- Script de setup para o Admin de Educação (Gestão 360)

-- Tabela: edu_schools (Unidades Escolares)
CREATE TABLE IF NOT EXISTS public.edu_schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    principal_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: edu_teachers (Professores)
CREATE TABLE IF NOT EXISTS public.edu_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.edu_schools(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    subjects TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atualização da Tabela edu_students para suportar vínculo escolar e institucional
ALTER TABLE public.edu_students
ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.edu_schools(id) ON DELETE SET NULL;

-- Configuração RLS para Admin e Público

ALTER TABLE public.edu_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_teachers ENABLE ROW LEVEL SECURITY;

-- Escolas: leitura pública autenticada (alunos e professores precisam ver escolas), escrita apenas por admin
CREATE POLICY "Leitura pública autenticada para escolas"
    ON public.edu_schools FOR SELECT
    USING (auth.role() = 'authenticated');

-- Professores: professores podem ver a si mesmos
CREATE POLICY "Professores veem próprio perfil"
    ON public.edu_teachers FOR SELECT
    USING (auth.uid() = user_id);

-- Para simplificar o MVP do Admin: permitir leitura e escrita se for um admin da institution (A lógica exata de Admin depende do auth).
-- Para este SaaS Control Center Super Admin, o acesso completo pode vir do Service Role ou policies customizadas.

-- Triggers de Modtime

CREATE TRIGGER update_edu_schools_modtime
    BEFORE UPDATE ON public.edu_schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edu_teachers_modtime
    BEFORE UPDATE ON public.edu_teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
