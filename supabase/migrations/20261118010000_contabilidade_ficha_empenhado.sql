-- ====================================================================
-- CONTABILIDADE: ADICIONA COLUNA EMPENHADO NAS FICHAS ORÇAMENTÁRIAS
-- Versão: 20261118010000
-- ====================================================================

ALTER TABLE public.fin_contabilidade_fichas
  ADD COLUMN IF NOT EXISTS empenhado NUMERIC(15, 2) NOT NULL DEFAULT 0;
