-- ==============================================================
-- GESTÃO 360 · MÓDULO DE OUVIDORIA MUNICIPAL
-- Lei Federal nº 13.460/2017 (Código de Defesa dos Usuários de Serviços Públicos)
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.ouvidoria_manifestacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo TEXT UNIQUE NOT NULL,
    codigo_acesso TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Sugestao', 'Elogio', 'Solicitacao', 'Reclamacao', 'Denuncia')),
    assunto TEXT NOT NULL,
    descricao TEXT NOT NULL,
    
    -- Localização
    bairro TEXT,
    logradouro TEXT,
    ponto_referencia TEXT,
    
    -- Privacidade e Identificação
    privacidade TEXT NOT NULL DEFAULT 'identificada' CHECK (privacidade IN ('identificada', 'sigilosa', 'anonima')),
    cidadao_nome TEXT,
    cidadao_cpf TEXT,
    cidadao_email TEXT,
    cidadao_telefone TEXT,
    
    -- Gestão e Tramitação
    status TEXT NOT NULL DEFAULT 'Nova' CHECK (status IN ('Nova', 'Em Analise', 'Encaminhada', 'Prorrogada', 'Respondida', 'Arquivada')),
    prioridade TEXT NOT NULL DEFAULT 'Normal' CHECK (prioridade IN ('Baixa', 'Normal', 'Alta', 'Urgente')),
    secretaria_sugerida TEXT,
    secretaria_destino TEXT,
    
    -- Prazos (Lei 13.460: 20 dias prorrogáveis por mais 10)
    data_manifestacao DATE NOT NULL DEFAULT CURRENT_DATE,
    prazo_limite TIMESTAMP WITH TIME ZONE NOT NULL,
    prorrogado BOOLEAN DEFAULT false,
    justificativa_prorrogacao TEXT,
    
    -- Resposta Oficial
    resposta_oficial TEXT,
    respondido_por TEXT,
    respondido_em TIMESTAMP WITH TIME ZONE,
    
    -- Anexos e Metadados
    anexos JSONB DEFAULT '[]'::jsonb,
    anexos_resposta JSONB DEFAULT '[]'::jsonb,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garante colunas de anexos caso a tabela já exista
ALTER TABLE public.ouvidoria_manifestacoes ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ouvidoria_manifestacoes ADD COLUMN IF NOT EXISTS anexos_resposta JSONB DEFAULT '[]'::jsonb;

-- Compatibilidade e migração automática caso a tabela tenha sido criada com tipo divergente
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ouvidoria_manifestacoes' 
    AND column_name = 'institution_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.ouvidoria_manifestacoes DROP CONSTRAINT IF EXISTS ouvidoria_manifestacoes_institution_id_fkey;
    ALTER TABLE public.ouvidoria_manifestacoes ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    ALTER TABLE public.ouvidoria_manifestacoes ADD CONSTRAINT ouvidoria_manifestacoes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Tabela de Histórico e Tramitações
CREATE TABLE IF NOT EXISTS public.ouvidoria_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifestacao_id UUID REFERENCES public.ouvidoria_manifestacoes(id) ON DELETE CASCADE,
    autor_nome TEXT NOT NULL,
    autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('Sistema', 'Ouvidor', 'Secretaria', 'Cidadao')),
    acao TEXT NOT NULL,
    descricao TEXT,
    visivel_ao_cidadao BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_ouvidoria_protocolo ON public.ouvidoria_manifestacoes(protocolo);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_institution ON public.ouvidoria_manifestacoes(institution_id);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_status ON public.ouvidoria_manifestacoes(status);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_tipo ON public.ouvidoria_manifestacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_prazo ON public.ouvidoria_manifestacoes(prazo_limite);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_hist_manifestacao ON public.ouvidoria_historico(manifestacao_id);

-- Habilitar RLS
ALTER TABLE public.ouvidoria_manifestacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ouvidoria_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Manifestações
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.ouvidoria_manifestacoes;
CREATE POLICY "Permitir leitura para todos" ON public.ouvidoria_manifestacoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de manifestação" ON public.ouvidoria_manifestacoes;
CREATE POLICY "Permitir inserção de manifestação" ON public.ouvidoria_manifestacoes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de manifestação" ON public.ouvidoria_manifestacoes;
CREATE POLICY "Permitir atualização de manifestação" ON public.ouvidoria_manifestacoes FOR UPDATE USING (true);

-- Exclusão de Manifestações (Na aplicação GESTÃO 360, a exclusão é restrita e auditada exclusivamente para 'Super Admin')
DROP POLICY IF EXISTS "Permitir exclusão de manifestação" ON public.ouvidoria_manifestacoes;
CREATE POLICY "Permitir exclusão de manifestação" ON public.ouvidoria_manifestacoes FOR DELETE USING (true);

-- Políticas de RLS para Histórico
DROP POLICY IF EXISTS "Permitir leitura de histórico" ON public.ouvidoria_historico;
CREATE POLICY "Permitir leitura de histórico" ON public.ouvidoria_historico FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de histórico" ON public.ouvidoria_historico;
CREATE POLICY "Permitir inserção de histórico" ON public.ouvidoria_historico FOR INSERT WITH CHECK (true);

-- ==============================================================
-- BUCKET DE ARMAZENAMENTO PARA ANEXOS (Supabase Storage)
-- ==============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('protocolos', 'protocolos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para o bucket 'protocolos'
DROP POLICY IF EXISTS "Acesso público aos anexos de protocolos" ON storage.objects;
CREATE POLICY "Acesso público aos anexos de protocolos" ON storage.objects 
FOR SELECT USING (bucket_id = 'protocolos');

DROP POLICY IF EXISTS "Upload público aos anexos de protocolos" ON storage.objects;
CREATE POLICY "Upload público aos anexos de protocolos" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'protocolos');

