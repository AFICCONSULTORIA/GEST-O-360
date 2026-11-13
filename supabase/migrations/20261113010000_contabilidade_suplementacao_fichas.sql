-- ====================================================================
-- CONTABILIDADE: SUPLEMENTAÇÃO DE FICHAS ORÇAMENTÁRIAS
-- Versão: 20261113010000
-- Objetivo:
-- 1. Armazenar as fichas orçamentárias importadas (PDF Fiorilli / Planilha)
--    por instituição e exercício.
-- 2. Registrar lançamentos manuais de desconto (anulação) e suplementação
--    com cálculo em tempo real de saldo e sinalização de saldo negativo.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.fin_contabilidade_fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'default',
  exercicio INTEGER NOT NULL DEFAULT 2026,
  ficha TEXT NOT NULL,
  cloc TEXT,
  orgao TEXT,
  unidade TEXT,
  func_prog TEXT,
  acao_descricao TEXT,
  categoria TEXT,
  especificacao TEXT,
  fonte_recurso TEXT,
  dotacao_inicial NUMERIC(15, 2) NOT NULL DEFAULT 0,
  alteracao_pdf NUMERIC(15, 2) NOT NULL DEFAULT 0,
  dotacao_atual NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_descontado NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_suplementado NUMERIC(15, 2) NOT NULL DEFAULT 0,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT fin_contab_fichas_inst_ex_ficha_unique UNIQUE (institution_id, exercicio, ficha)
);

CREATE INDEX IF NOT EXISTS idx_fin_contab_fichas_inst_ex
  ON public.fin_contabilidade_fichas(institution_id, exercicio);

ALTER TABLE public.fin_contabilidade_fichas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contabilidade fichas isoladas por instituicao" ON public.fin_contabilidade_fichas;
CREATE POLICY "Contabilidade fichas isoladas por instituicao" ON public.fin_contabilidade_fichas
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

CREATE TABLE IF NOT EXISTS public.fin_contabilidade_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'default',
  exercicio INTEGER NOT NULL DEFAULT 2026,
  ficha TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('desconto', 'suplementacao')),
  valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
  documento TEXT,
  observacao TEXT,
  ficha_contrapartida TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_contab_lanc_inst_ex
  ON public.fin_contabilidade_lancamentos(institution_id, exercicio, created_at DESC);

ALTER TABLE public.fin_contabilidade_lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contabilidade lancamentos isolados por instituicao" ON public.fin_contabilidade_lancamentos;
CREATE POLICY "Contabilidade lancamentos isolados por instituicao" ON public.fin_contabilidade_lancamentos
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

