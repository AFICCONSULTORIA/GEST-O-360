-- ====================================================================
-- MIGRAÇÃO FASE 1: BLINDAGEM DE PATRIMÔNIO & BANCO DE CERTIDÕES (GESTÃO 360)
-- ====================================================================

-- 1. Garantir colunas de links de certidões compartilhados por prefeitura na tabela 'institutions'
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS cert_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS state_links JSONB DEFAULT '{}'::jsonb;

-- 2. Adicionar colunas contábeis (PCASP) e rastreabilidade de guarda/transferência na tabela 'patrimonio'
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(15, 2);
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS responsible_person TEXT;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]'::jsonb;

-- 3. Criar índice para acelerar validação de tombamento e CNPJ por prefeitura
CREATE INDEX IF NOT EXISTS idx_patrimonio_institution_code ON patrimonio (institution_id, code);
CREATE INDEX IF NOT EXISTS idx_company_certificates_institution_cnpj ON company_certificates (institution_id, cnpj);

