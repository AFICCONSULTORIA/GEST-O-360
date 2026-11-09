-- ====================================================================
-- MIGRAÇÃO: SINCRONIZAÇÃO DE FICHAS ORÇAMENTÁRIAS ENTRE COMPUTADORES
-- Versão: 20261109150000
-- Sistema GESTÃO 360 - Módulo de Frotas / Controles Internos
-- ====================================================================

-- 1. Garante que a coluna budget_classification_id exista na tabela fuel_supply_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_supply_orders' AND column_name = 'budget_classification_id'
  ) THEN
    ALTER TABLE public.fuel_supply_orders 
      ADD COLUMN budget_classification_id UUID REFERENCES public.fleet_budget_classifications(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Habilita RLS aberta para fleet_budget_classifications (anon e authenticated)
-- permitindo sincronização perfeita entre todos os navegadores e prefeituras
ALTER TABLE public.fleet_budget_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet_budget_classifications_open_policy" ON public.fleet_budget_classifications;
CREATE POLICY "fleet_budget_classifications_open_policy" ON public.fleet_budget_classifications
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

