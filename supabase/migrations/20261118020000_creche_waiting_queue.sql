-- ====================================================================
-- EDUCAÇÃO / CMEI: FILA DE ESPERA E PRÓXIMOS DA FILA (CRECHE)
-- Versão: 20261118020000
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.creche_waiting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL DEFAULT 1,
  child_name TEXT NOT NULL,
  guardian_name TEXT,
  stage TEXT NOT NULL DEFAULT 'Berçário' CHECK (stage IN ('Berçário', 'Maternal I', 'Maternal II')),
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convocado', 'matriculado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creche_waiting_queue_pos
  ON public.creche_waiting_queue (position ASC, created_at ASC);

ALTER TABLE public.creche_waiting_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica fila creche" ON public.creche_waiting_queue;
CREATE POLICY "Leitura publica fila creche" ON public.creche_waiting_queue
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestao fila creche" ON public.creche_waiting_queue;
CREATE POLICY "Gestao fila creche" ON public.creche_waiting_queue
  FOR ALL USING (true) WITH CHECK (true);
