-- ==============================================================================
-- LIVRO DE REGISTRO DE ALTERAÇÕES CONTÁBEIS (RESGUARDO DA CONTADORA)
-- Ferramenta interna e monousuário para registro rápido de solicitações de
-- alteração em empenhos, liquidações, pagamentos e dotações com comprovantes
-- (prints de WhatsApp, e-mails, ofícios) para auditorias do TCE e Controle Interno.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.registros_alteracao_contabil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_pedido DATE NOT NULL,
    solicitante_nome VARCHAR(150) NOT NULL,
    solicitante_setor_cargo VARCHAR(150) NOT NULL,
    canal_solicitacao VARCHAR(50) NOT NULL DEFAULT 'WhatsApp', -- 'WhatsApp', 'E-mail', 'Ofício', 'Memorando Interno', 'Verbal'
    documento_afetado VARCHAR(150) NOT NULL,                    -- Ex: 'Empenho 432/2026', 'Liquidação 102/2026'
    valor_envolvido NUMERIC(15,2) DEFAULT 0,
    o_que_foi_pedido TEXT NOT NULL,
    justificativa_alegada TEXT,
    acao_da_contadora VARCHAR(50) NOT NULL DEFAULT 'Feito',     -- 'Aprovado e Feito', 'Recusado', 'Feito com Ressalva'
    data_hora_execucao TIMESTAMPTZ,                            -- Timestamp da execução no sistema da prefeitura
    observacao_tecnica_contadora TEXT,                          -- Anotação técnica da contadora para resguardo
    comprovante_nome VARCHAR(255),
    comprovante_url TEXT,                                       -- Base64 ou URL do arquivo (print/PDF)
    comprovante_tipo VARCHAR(50),                               -- 'image/png', 'image/jpeg', 'application/pdf'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_reg_alt_data_pedido ON public.registros_alteracao_contabil(data_pedido);
CREATE INDEX IF NOT EXISTS idx_reg_alt_solicitante ON public.registros_alteracao_contabil(solicitante_nome);
CREATE INDEX IF NOT EXISTS idx_reg_alt_documento ON public.registros_alteracao_contabil(documento_afetado);
CREATE INDEX IF NOT EXISTS idx_reg_alt_canal ON public.registros_alteracao_contabil(canal_solicitacao);
CREATE INDEX IF NOT EXISTS idx_reg_alt_acao ON public.registros_alteracao_contabil(acao_da_contadora);

-- RLS (Row Level Security) permissivo para a ferramenta interna
ALTER TABLE public.registros_alteracao_contabil ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'registros_alteracao_contabil' AND policyname = 'permitir_tudo_registros_alteracao_contabil'
    ) THEN
        CREATE POLICY permitir_tudo_registros_alteracao_contabil ON public.registros_alteracao_contabil
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
