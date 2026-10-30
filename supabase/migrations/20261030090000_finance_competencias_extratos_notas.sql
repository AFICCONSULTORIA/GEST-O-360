-- ====================================================================
-- SECRETARIA DE FINANÇAS: PERSISTÊNCIA DE COMPETÊNCIAS, EXTRATOS & NOTAS FISCAIS
-- Versão: 20261030090000
-- Objetivo:
-- 1. Garantir salvamento permanente por competência (YYYY-MM) dos Arquivos/Extratos
--    e das Notas Fiscais vinculadas por conta bancária.
-- 2. Permitir comparativo histórico permanente entre competências com isolamento
--    por prefeitura (institution_id TEXT).
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.fin_competencia_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'default',
  month_id TEXT NOT NULL,           -- Ex: '2026-10'
  month_label TEXT NOT NULL,        -- Ex: 'Outubro/2026'
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  updated_by TEXT,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT fin_competencia_registros_inst_month_unique UNIQUE (institution_id, month_id)
);

CREATE INDEX IF NOT EXISTS idx_fin_competencia_inst ON public.fin_competencia_registros(institution_id);
CREATE INDEX IF NOT EXISTS idx_fin_competencia_month ON public.fin_competencia_registros(month_id DESC);

ALTER TABLE public.fin_competencia_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financas competencias isoladas por instituicao" ON public.fin_competencia_registros;
CREATE POLICY "Financas competencias isoladas por instituicao" ON public.fin_competencia_registros
  FOR ALL
  USING (
    auth.role() = 'anon'
    OR institution_id = 'default'
    OR (
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_institution_id')
      AND institution_id = public.get_current_user_institution_id()
    )
    OR (
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
      AND public.is_super_admin()
    )
  )
  WITH CHECK (
    auth.role() = 'anon'
    OR institution_id = 'default'
    OR (
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_institution_id')
      AND institution_id = public.get_current_user_institution_id()
    )
    OR (
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin')
      AND public.is_super_admin()
    )
  );

-- Garantir coluna institution_id TEXT também nas tabelas de remanejamento de saldos
ALTER TABLE IF EXISTS public.fin_remanejamento_origens ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'default';
ALTER TABLE IF EXISTS public.fin_remanejamento_destinos ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'default';
ALTER TABLE IF EXISTS public.fin_remanejamento_alocacoes ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'default';

