-- ====================================================================
-- CONTROLE DE VERBAS INDENIZATÓRIAS (GESTÃO 360)
-- Tabela para acompanhamento mês a mês de entregas de relatório
-- e requerimento de verbas indenizatórias por servidor/cargo.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.ctrl_verbas_indenizatorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'default',
  month_id TEXT NOT NULL,                  -- Ex: '2026-10'
  servidor_nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  matricula TEXT,
  secretaria_setor TEXT,
  valor NUMERIC(15,2) DEFAULT 0,
  entregou_requerimento BOOLEAN NOT NULL DEFAULT false,
  data_requerimento DATE,
  entregou_relatorio BOOLEAN NOT NULL DEFAULT false,
  data_relatorio DATE,
  status_aprovacao TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_analise', 'regular', 'irregular'
  observacoes TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ctrl_verbas_inst ON public.ctrl_verbas_indenizatorias(institution_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_verbas_month ON public.ctrl_verbas_indenizatorias(month_id DESC);
CREATE INDEX IF NOT EXISTS idx_ctrl_verbas_servidor ON public.ctrl_verbas_indenizatorias(servidor_nome);

ALTER TABLE public.ctrl_verbas_indenizatorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verbas indenizatorias isoladas por instituicao" ON public.ctrl_verbas_indenizatorias;
CREATE POLICY "Verbas indenizatorias isoladas por instituicao" ON public.ctrl_verbas_indenizatorias
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

