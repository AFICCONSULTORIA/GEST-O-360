-- Tabela de Formulários Públicos (Gestão Forms 360)
CREATE TABLE IF NOT EXISTS public.public_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Geral',
    slug TEXT,
    cover_theme TEXT DEFAULT 'blue_ocean',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'published', -- 'published', 'draft', 'closed'
    is_anonymous BOOLEAN DEFAULT false,
    require_cpf BOOLEAN DEFAULT false,
    max_responses INTEGER,
    start_date DATE,
    end_date DATE,
    thank_you_title TEXT DEFAULT 'Obrigado por participar!',
    thank_you_message TEXT DEFAULT 'Sua resposta foi registrada com sucesso e ajudará a melhorar os serviços públicos do nosso município.',
    redirect_url TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Respostas da População
CREATE TABLE IF NOT EXISTS public.public_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.public_forms(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    respondent_name TEXT,
    respondent_cpf TEXT,
    respondent_phone TEXT,
    respondent_neighborhood TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    protocol TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_public_forms_institution ON public.public_forms(institution_id);
CREATE INDEX IF NOT EXISTS idx_public_forms_status ON public.public_forms(status);
CREATE INDEX IF NOT EXISTS idx_public_form_responses_form_id ON public.public_form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_public_form_responses_protocol ON public.public_form_responses(protocol);

-- Habilitar RLS
ALTER TABLE public.public_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_form_responses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para public_forms
DROP POLICY IF EXISTS "Permitir leitura de formulários para todos" ON public.public_forms;
CREATE POLICY "Permitir leitura de formulários para todos" ON public.public_forms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de formulários para todos" ON public.public_forms;
CREATE POLICY "Permitir inserção de formulários para todos" ON public.public_forms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de formulários para todos" ON public.public_forms;
CREATE POLICY "Permitir atualização de formulários para todos" ON public.public_forms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir deleção de formulários para todos" ON public.public_forms;
CREATE POLICY "Permitir deleção de formulários para todos" ON public.public_forms FOR DELETE USING (true);

-- Políticas de acesso para public_form_responses
DROP POLICY IF EXISTS "Permitir leitura de respostas para todos" ON public.public_form_responses;
CREATE POLICY "Permitir leitura de respostas para todos" ON public.public_form_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir envio público de respostas" ON public.public_form_responses;
CREATE POLICY "Permitir envio público de respostas" ON public.public_form_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de respostas para todos" ON public.public_form_responses;
CREATE POLICY "Permitir atualização de respostas para todos" ON public.public_form_responses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir deleção de respostas para todos" ON public.public_form_responses;
CREATE POLICY "Permitir deleção de respostas para todos" ON public.public_form_responses FOR DELETE USING (true);
