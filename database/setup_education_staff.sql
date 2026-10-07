-- ==============================================================================
-- Tabela: edu_staff (Professores e Coordenadores da Rede Municipal de Ensino)
-- Gestão Integrada de Educadores e Gestão Pedagógica (Gestão 360)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.edu_staff (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    institution_id TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher', -- 'teacher' ou 'coordinator'
    email TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '123',
    registration TEXT,                    -- Matrícula funcional (ex: PROF001, COORD001)
    cpf TEXT,
    phone TEXT,
    subject TEXT NOT NULL DEFAULT 'Geral', -- Disciplina ou Área de Atuação
    school TEXT NOT NULL DEFAULT 'Rede Municipal', -- Escola de Lotação
    classes TEXT[] DEFAULT '{}',          -- Turmas atendidas
    workload_hours INTEGER DEFAULT 40,    -- Carga horária semanal
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'leave', 'inactive'
    avatar TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que a coluna ID seja do tipo TEXT caso tenha sido criada anteriormente como UUID
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE public.edu_staff ALTER COLUMN id TYPE TEXT;
    EXCEPTION 
        WHEN others THEN NULL;
    END;
END $$;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_edu_staff_email ON public.edu_staff(email);
CREATE INDEX IF NOT EXISTS idx_edu_staff_role ON public.edu_staff(role);
CREATE INDEX IF NOT EXISTS idx_edu_staff_school ON public.edu_staff(school);

-- Habilitar RLS
ALTER TABLE public.edu_staff ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Livre (MVP Educacional Multitenant)
DROP POLICY IF EXISTS "Acesso Livre edu_staff" ON public.edu_staff;
CREATE POLICY "Acesso Livre edu_staff" ON public.edu_staff FOR ALL USING (true);

-- Trigger de atualização de data
CREATE OR REPLACE FUNCTION update_edu_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_edu_staff_updated_at ON public.edu_staff;
CREATE TRIGGER trigger_edu_staff_updated_at
    BEFORE UPDATE ON public.edu_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_edu_staff_updated_at();

-- Notifica o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
