CREATE TABLE IF NOT EXISTS public.meio_ambiente_denuncias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    reference_point TEXT,
    is_anonymous BOOLEAN DEFAULT true,
    reporter_name TEXT,
    reporter_contact TEXT,
    status TEXT NOT NULL DEFAULT 'Nova',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.meio_ambiente_denuncias ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.meio_ambiente_denuncias;
CREATE POLICY "Permitir leitura para todos" ON public.meio_ambiente_denuncias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção anônima" ON public.meio_ambiente_denuncias;
CREATE POLICY "Permitir inserção anônima" ON public.meio_ambiente_denuncias FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização para todos" ON public.meio_ambiente_denuncias;
CREATE POLICY "Permitir atualização para todos" ON public.meio_ambiente_denuncias FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir deleção para todos" ON public.meio_ambiente_denuncias;
CREATE POLICY "Permitir deleção para todos" ON public.meio_ambiente_denuncias FOR DELETE USING (true);
