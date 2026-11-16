-- ============================================================================
-- MIGRAÇÃO: TRILHA DE AUDITORIA (LOGS) DE ALTERAÇÕES DE ABASTECIMENTO
-- Data: 2026-11-16
-- Descrição: Cria a tabela fuel_supply_audit_logs para rastreabilidade
--            completa de edições de abastecimento, alterações de data,
--            reclassificações de ficha orçamentária, homologações e glosas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fuel_supply_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  order_id TEXT,
  order_number TEXT NOT NULL,
  vehicle_plate TEXT,
  vehicle_model TEXT,
  action_type TEXT NOT NULL,
  action_label TEXT NOT NULL,
  actor_name TEXT NOT NULL DEFAULT 'Gestor da Frota',
  actor_role TEXT DEFAULT 'Responsável pela Frota',
  fueling_date TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_supply_audit_logs_inst
  ON public.fuel_supply_audit_logs (institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_supply_audit_logs_order
  ON public.fuel_supply_audit_logs (order_number);

ALTER TABLE public.fuel_supply_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fuel_supply_audit_logs'
      AND policyname = 'fuel_supply_audit_logs_select_all'
  ) THEN
    CREATE POLICY fuel_supply_audit_logs_select_all
      ON public.fuel_supply_audit_logs
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fuel_supply_audit_logs'
      AND policyname = 'fuel_supply_audit_logs_insert_all'
  ) THEN
    CREATE POLICY fuel_supply_audit_logs_insert_all
      ON public.fuel_supply_audit_logs
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
