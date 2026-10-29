-- ====================================================================
-- MIGRAÇÃO FASES 1, 2 & 3: PATRIMÔNIO, CERTIDÕES, MÓDULOS ATIVOS & CONTRATOS
-- ====================================================================

-- 1. Garantir colunas de configuração multi-tenant na tabela 'institutions'
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS cert_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS state_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS active_modules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2. Adicionar colunas contábeis (PCASP) e rastreabilidade de guarda/transferência na tabela 'patrimonio'
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(15, 2);
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS responsible_person TEXT;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]'::jsonb;

-- 3. Criar/atualizar tabela de Contratos Administrativos (Lei 14.133/2021)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  institution_id TEXT,
  number TEXT NOT NULL,
  process_number TEXT,
  object TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_cnpj TEXT,
  category TEXT DEFAULT 'Pregão Eletrônico',
  department TEXT,
  fiscal_name TEXT,
  amount NUMERIC(15, 2) DEFAULT 0,
  start_date DATE,
  deadline DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS process_number TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_cnpj TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS fiscal_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Índices de performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_patrimonio_institution_code ON patrimonio (institution_id, code);
CREATE INDEX IF NOT EXISTS idx_company_certificates_institution_cnpj ON company_certificates (institution_id, cnpj);
CREATE INDEX IF NOT EXISTS idx_contracts_institution ON contracts (institution_id);
