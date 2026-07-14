CREATE TABLE IF NOT EXISTS public.servicos_publicos_demandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo TEXT NOT NULL UNIQUE,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    endereco TEXT NOT NULL,
    solicitante TEXT NOT NULL,
    telefone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aberto',
    data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.servicos_publicos_demandas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Políticas de acesso
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.servicos_publicos_demandas;
CREATE POLICY "Permitir leitura para todos" ON public.servicos_publicos_demandas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção anônima" ON public.servicos_publicos_demandas;
CREATE POLICY "Permitir inserção anônima" ON public.servicos_publicos_demandas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização para todos" ON public.servicos_publicos_demandas;
CREATE POLICY "Permitir atualização para todos" ON public.servicos_publicos_demandas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir deleção para todos" ON public.servicos_publicos_demandas;
CREATE POLICY "Permitir deleção para todos" ON public.servicos_publicos_demandas FOR DELETE USING (true);
