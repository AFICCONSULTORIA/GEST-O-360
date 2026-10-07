-- ==============================================================================
-- Tabela: control_accounting_changes (Controle de Alterações na Contabilidade)
-- Módulo de Controles Internos & Compliance Contábil (Gestão 360)
-- Registra e audita quem solicitou a alteração, justificativa e parecer do contador
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.control_accounting_changes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    institution_id TEXT,
    protocol_number TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_role TEXT NOT NULL,
    requester_department TEXT NOT NULL,
    requester_email TEXT,
    requester_phone TEXT,
    change_type TEXT NOT NULL,
    reference_doc TEXT NOT NULL,
    change_date DATE DEFAULT CURRENT_DATE, -- Data específica da alteração (dia, mês e ano completos)
    fiscal_year INTEGER DEFAULT 2026,
    month_ref TEXT DEFAULT '',
    amount NUMERIC(15, 2) DEFAULT 0,
    reason TEXT NOT NULL,
    current_state TEXT DEFAULT '',
    proposed_state TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected', 'completed'
    accountant_name TEXT,
    accountant_crc TEXT,
    accountant_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    attachment_name TEXT,
    attachment_url TEXT,
    attachment_before_name TEXT,
    attachment_before_url TEXT,
    attachment_after_name TEXT,
    attachment_after_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas adicionadas em tabelas existentes
ALTER TABLE public.control_accounting_changes ADD COLUMN IF NOT EXISTS change_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.control_accounting_changes ADD COLUMN IF NOT EXISTS attachment_before_name TEXT;
ALTER TABLE public.control_accounting_changes ADD COLUMN IF NOT EXISTS attachment_before_url TEXT;
ALTER TABLE public.control_accounting_changes ADD COLUMN IF NOT EXISTS attachment_after_name TEXT;
ALTER TABLE public.control_accounting_changes ADD COLUMN IF NOT EXISTS attachment_after_url TEXT;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_acc_changes_protocol ON public.control_accounting_changes(protocol_number);
CREATE INDEX IF NOT EXISTS idx_acc_changes_status ON public.control_accounting_changes(status);
CREATE INDEX IF NOT EXISTS idx_acc_changes_dept ON public.control_accounting_changes(requester_department);
CREATE INDEX IF NOT EXISTS idx_acc_changes_created_at ON public.control_accounting_changes(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.control_accounting_changes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso Livre control_accounting_changes" ON public.control_accounting_changes;
CREATE POLICY "Acesso Livre control_accounting_changes" ON public.control_accounting_changes FOR ALL USING (true);

-- Trigger de atualização de data
CREATE OR REPLACE FUNCTION update_control_accounting_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_control_accounting_changes_updated_at ON public.control_accounting_changes;
CREATE TRIGGER trigger_control_accounting_changes_updated_at
    BEFORE UPDATE ON public.control_accounting_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_control_accounting_changes_updated_at();

-- Notifica o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
