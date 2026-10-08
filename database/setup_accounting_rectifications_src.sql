-- ==============================================================================
-- SISTEMA DE RETIFICAÇÃO CONTÁBIL MUNICIPAL (SRC) - GESTÃO 360
-- Compliance com a Lei Federal nº 4.320/1964, LRF (LC 101/2000), NBC TSP,
-- Manual de Contabilidade Aplicada ao Setor Público (MCASP) e Tribunais de Contas
-- ==============================================================================

-- 1. TIPOS ENUMERADOS OFICIAIS
DO $$ BEGIN
    CREATE TYPE tipo_documento_contabil_enum AS ENUM (
        'EMPENHO', 
        'LIQUIDACAO', 
        'PAGAMENTO', 
        'LANCAMENTO_PATRIMONIAL', 
        'RESTOS_A_PAGAR'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_ajuste_contabil_enum AS ENUM (
        'ESTORNO_TOTAL', 
        'ESTORNO_PARCIAL', 
        'COMPLEMENTACAO', 
        'TRANSFERENCIA_DESPESA', 
        'RECLASSIFICACAO_FONTE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE status_src_enum AS ENUM (
        'RASCUNHO', 
        'AGUARDANDO_PARECER', 
        'AGUARDANDO_HOMOLOGACAO', 
        'APROVADO_EXECUTADO', 
        'INDEFERIDO'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE etapa_tramitacao_enum AS ENUM (
        'ABERTURA', 
        'PARECER_CONTABIL', 
        'HOMOLOGACAO_CONTADOR_GERAL', 
        'EXECUCAO_LANCAMENTO', 
        'RECUSA'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ==============================================================================
-- 2. TABELA PRINCIPAL: solicitacoes_retificacao_contabil
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes_retificacao_contabil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo_anual VARCHAR(30) NOT NULL UNIQUE,       -- Formato: SRC-YYYY-00001
    exercicio_financeiro INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    mes_competencia INTEGER NOT NULL CHECK (mes_competencia BETWEEN 1 AND 12),
    unidade_gestora VARCHAR(150) NOT NULL DEFAULT 'Prefeitura Municipal',
    secretaria_solicitante VARCHAR(150) NOT NULL,
    
    -- Documento de Origem
    tipo_documento VARCHAR(40) NOT NULL,               -- EMPENHO, LIQUIDACAO, PAGAMENTO, LANCAMENTO_PATRIMONIAL, RESTOS_A_PAGAR
    numero_documento_origem VARCHAR(100) NOT NULL,     -- Ex: Empenho nº 1245/2026
    data_fato_gerador DATE NOT NULL,                   -- Data exata em que ocorreu o fato econômico original
    data_documento_origem DATE NOT NULL,               -- Data de emissão original do documento
    
    -- Ajuste e Fundamentação
    tipo_ajuste VARCHAR(40) NOT NULL,                  -- ESTORNO_TOTAL, ESTORNO_PARCIAL, COMPLEMENTACAO, etc.
    valor_original NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (valor_original >= 0),
    valor_ajuste NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    justificativa_fato TEXT NOT NULL,                  -- Descrição circunstanciada do fato
    base_legal_mcasp VARCHAR(255) NOT NULL,            -- Artigo da Lei 4.320/64, LRF ou item MCASP
    
    -- Partidas Contábeis em JSONB para detalhamento patrimonial e orçamentário
    dados_contabeis_originais JSONB NOT NULL DEFAULT '{}'::jsonb,
    dados_contabeis_propostos JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Histórico Padrão Gerado para o Razão e Diário
    historico_padrao_razao TEXT,
    
    -- Status e Tramitação
    status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_PARECER',
    
    -- Rigor Temporal dos Atores (Datas e Horários Exatos)
    solicitante_id VARCHAR(100),
    solicitante_nome VARCHAR(150) NOT NULL,
    solicitante_cargo VARCHAR(100) NOT NULL,
    solicitante_email VARCHAR(120),
    solicitante_telefone VARCHAR(40),
    data_hora_solicitacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Parecer Técnico
    analista_contabil_id VARCHAR(100),
    analista_contabil_nome VARCHAR(150),
    parecer_tecnico_texto TEXT,
    data_hora_parecer_tecnico TIMESTAMPTZ,
    
    -- Homologação
    contador_geral_id VARCHAR(100),
    contador_geral_nome VARCHAR(150),
    contador_geral_crc VARCHAR(50),
    despacho_homologacao TEXT,
    data_hora_homologacao TIMESTAMPTZ,
    
    -- Execução Contábil
    data_lancamento_contabil_efetivo DATE,              -- Data contábil efetiva no Razão/Balancete
    data_hora_execucao_sistema TIMESTAMPTZ,            -- Timestamp exato da gravação do lançamento corretivo
    numero_lancamento_contabil VARCHAR(50),            -- Número gerado no Razão Contábil
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance e Auditoria
CREATE INDEX IF NOT EXISTS idx_src_protocolo ON public.solicitacoes_retificacao_contabil(protocolo_anual);
CREATE INDEX IF NOT EXISTS idx_src_exercicio_mes ON public.solicitacoes_retificacao_contabil(exercicio_financeiro, mes_competencia);
CREATE INDEX IF NOT EXISTS idx_src_status ON public.solicitacoes_retificacao_contabil(status);
CREATE INDEX IF NOT EXISTS idx_src_tipo_doc ON public.solicitacoes_retificacao_contabil(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_src_data_lancamento ON public.solicitacoes_retificacao_contabil(data_lancamento_contabil_efetivo);


-- ==============================================================================
-- 3. TABELA: documentos_comprobatorios_src (Com Hash SHA-256)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documentos_comprobatorios_src (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_retificacao_contabil(id) ON DELETE CASCADE,
    tipo_comprovante VARCHAR(80) NOT NULL,            -- Nota Fiscal, Medição, Parecer Jurídico, etc.
    fase_documento VARCHAR(20) NOT NULL DEFAULT 'ORIGINAL', -- 'ORIGINAL' (Antes), 'RETIFICADO' (Depois), 'COMPROBANTE'
    nome_arquivo VARCHAR(255) NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,                 -- Hash SHA-256 de integridade imutável
    tamanho_bytes BIGINT NOT NULL DEFAULT 0,
    url_arquivo TEXT,
    arquivo_base64 TEXT,
    usuario_upload_nome VARCHAR(150),
    data_hora_upload TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_src_solicitacao ON public.documentos_comprobatorios_src(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_doc_src_hash ON public.documentos_comprobatorios_src(hash_sha256);


-- ==============================================================================
-- 4. TABELA: trilha_auditoria_tramitacao (IMUTÁVEL - PROIBIDO DELETE/UPDATE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.trilha_auditoria_tramitacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_retificacao_contabil(id) ON DELETE RESTRICT,
    etapa VARCHAR(50) NOT NULL,                        -- ABERTURA, PARECER_CONTABIL, HOMOLOGACAO, etc.
    usuario_responsavel_id VARCHAR(100),
    usuario_responsavel_nome VARCHAR(150) NOT NULL,
    matricula_cargo_usuario VARCHAR(100) NOT NULL,
    crc_usuario VARCHAR(50),
    parecer_despacho TEXT NOT NULL,
    status_resultante VARCHAR(30) NOT NULL,
    ip_origem VARCHAR(45),
    user_agent TEXT,
    data_hora_exata TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assinatura_eletronica_hash VARCHAR(128) NOT NULL   -- Hash SHA-256 gerado a partir do protocolo + despacho + timestamp + usuário
);

CREATE INDEX IF NOT EXISTS idx_trilha_src_solicitacao ON public.trilha_auditoria_tramitacao(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_trilha_src_data_hora ON public.trilha_auditoria_tramitacao(data_hora_exata);


-- ==============================================================================
-- 5. REGRAS DE IMUTABILIDADE DA TRILHA DE AUDITORIA (TRIBUNAL DE CONTAS)
-- Bloqueia expressamente qualquer tentativa de UPDATE ou DELETE na trilha
-- ==============================================================================
CREATE OR REPLACE FUNCTION trg_bloquear_modificacao_trilha_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO DE AUDITORIA: Registros da trilha de auditoria contábil são imutáveis e não podem ser alterados ou excluídos (Lei 4.320/64 e Normas do TCE).';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bloqueio_auditoria_src ON public.trilha_auditoria_tramitacao;
CREATE TRIGGER trigger_bloqueio_auditoria_src
    BEFORE UPDATE OR DELETE ON public.trilha_auditoria_tramitacao
    FOR EACH ROW
    EXECUTE FUNCTION trg_bloquear_modificacao_trilha_auditoria();


-- ==============================================================================
-- 6. GERADOR AUTOMÁTICO DE NÚMERO DE PROTOCOLO ANUAL (SRC-YYYY-XXXXX)
-- ==============================================================================
CREATE OR REPLACE FUNCTION gerar_protocolo_src_anual()
RETURNS TRIGGER AS $$
DECLARE
    ano_atual INTEGER;
    prox_seq INTEGER;
BEGIN
    IF NEW.protocolo_anual IS NULL OR NEW.protocolo_anual = '' THEN
        ano_atual := COALESCE(NEW.exercicio_financeiro, EXTRACT(YEAR FROM CURRENT_DATE));
        
        SELECT COALESCE(MAX(
            CASE 
                WHEN protocolo_anual ~ '^SRC-[0-9]{4}-[0-9]{5}$' 
                THEN SUBSTRING(protocolo_anual FROM 10 FOR 5)::INTEGER 
                ELSE 0 
            END
        ), 0) + 1
        INTO prox_seq
        FROM public.solicitacoes_retificacao_contabil
        WHERE exercicio_financeiro = ano_atual;

        NEW.protocolo_anual := 'SRC-' || ano_atual || '-' || LPAD(prox_seq::TEXT, 5, '0');
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gerar_protocolo_src ON public.solicitacoes_retificacao_contabil;
CREATE TRIGGER trigger_gerar_protocolo_src
    BEFORE INSERT ON public.solicitacoes_retificacao_contabil
    FOR EACH ROW
    EXECUTE FUNCTION gerar_protocolo_src_anual();


-- ==============================================================================
-- 7. SINCRONIZAÇÃO / VIEW DE COMPATIBILIDADE COM A TABELA ANTERIOR
-- Mantém compatibilidade total com o módulo legado caso necessário
-- ==============================================================================
CREATE OR REPLACE VIEW public.vw_control_accounting_changes_compat AS
SELECT 
    id::TEXT as id,
    NULL as institution_id,
    protocolo_anual as protocol_number,
    solicitante_nome as requester_name,
    solicitante_cargo as requester_role,
    secretaria_solicitante as requester_department,
    solicitante_email as requester_email,
    solicitante_telefone as requester_phone,
    LOWER(tipo_ajuste) as change_type,
    numero_documento_origem as reference_doc,
    data_fato_gerador as change_date,
    exercicio_financeiro as fiscal_year,
    mes_competencia::TEXT as month_ref,
    valor_ajuste as amount,
    justificativa_fato as reason,
    COALESCE(dados_contabeis_originais->>'descricao', '') as current_state,
    COALESCE(dados_contabeis_propostos->>'descricao', '') as proposed_state,
    CASE 
        WHEN status = 'APROVADO_EXECUTADO' THEN 'completed'
        WHEN status = 'AGUARDANDO_HOMOLOGACAO' THEN 'in_review'
        WHEN status = 'INDEFERIDO' THEN 'rejected'
        ELSE 'pending'
    END as status,
    contador_geral_nome as accountant_name,
    contador_geral_crc as accountant_crc,
    despacho_homologacao as accountant_notes,
    data_hora_homologacao as reviewed_at,
    data_hora_execucao_sistema as completed_at,
    NULL as attachment_name,
    NULL as attachment_url,
    NULL as attachment_before_name,
    NULL as attachment_before_url,
    NULL as attachment_after_name,
    NULL as attachment_after_url,
    data_hora_solicitacao as created_at,
    updated_at as updated_at
FROM public.solicitacoes_retificacao_contabil;


-- ==============================================================================
-- 8. SEGURANÇA E POLÍTICAS RLS
-- ==============================================================================
ALTER TABLE public.solicitacoes_retificacao_contabil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_comprobatorios_src ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_auditoria_tramitacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso Total SRC" ON public.solicitacoes_retificacao_contabil;
CREATE POLICY "Acesso Total SRC" ON public.solicitacoes_retificacao_contabil FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso Total Documentos SRC" ON public.documentos_comprobatorios_src;
CREATE POLICY "Acesso Total Documentos SRC" ON public.documentos_comprobatorios_src FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso Total Trilha SRC" ON public.trilha_auditoria_tramitacao;
CREATE POLICY "Acesso Total Trilha SRC" ON public.trilha_auditoria_tramitacao FOR SELECT USING (true);
CREATE POLICY "Insercao Permitida Trilha SRC" ON public.trilha_auditoria_tramitacao FOR INSERT WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
