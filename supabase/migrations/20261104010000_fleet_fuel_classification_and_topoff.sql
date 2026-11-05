-- ====================================================================
-- MIGRAÇÃO: CLASSIFICAÇÃO ORÇAMENTÁRIA, MODO TOP-OFF E COMPROVAÇÃO DE BOMBA
-- Versão: 20261104010000
-- Sistema GESTÃO 360 - Módulo de Frotas / Controles Internos
-- ====================================================================

-- 1. TABELA DE CLASSIFICAÇÃO ORÇAMENTÁRIA (fleet_budget_classifications)
CREATE TABLE IF NOT EXISTS public.fleet_budget_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  department_local TEXT NOT NULL, -- Ex: 'Gabinete', 'Transporte Escolar', 'PSF', 'TFD'
  invoice_sheet TEXT NOT NULL,     -- Ficha orçamentária (ex: '11', '57', '152')
  funding_source TEXT NOT NULL,    -- Fonte de recursos (ex: '1.1.500.0', '2.1.500.1001000')
  budget_code TEXT,                -- Código da dotação (ex: '18', '20', '28')
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fleet_budget_inst ON public.fleet_budget_classifications(institution_id);
CREATE INDEX IF NOT EXISTS idx_fleet_budget_local ON public.fleet_budget_classifications(department_local);
CREATE INDEX IF NOT EXISTS idx_fleet_budget_sheet ON public.fleet_budget_classifications(invoice_sheet);

-- 2. ATUALIZAÇÃO NA TABELA fleet_vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fleet_vehicles' AND column_name = 'budget_classification_id'
  ) THEN
    ALTER TABLE public.fleet_vehicles ADD COLUMN budget_classification_id UUID REFERENCES public.fleet_budget_classifications(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fleet_vehicles' AND column_name = 'always_full_tank'
  ) THEN
    ALTER TABLE public.fleet_vehicles ADD COLUMN always_full_tank BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. ATUALIZAÇÃO NA TABELA fuel_supply_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_supply_orders' AND column_name = 'supply_mode'
  ) THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN supply_mode TEXT NOT NULL DEFAULT 'litragem_fixa';
    ALTER TABLE public.fuel_supply_orders ADD CONSTRAINT fuel_supply_orders_supply_mode_check 
      CHECK (supply_mode IN ('litragem_fixa', 'encher_tanque'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_supply_orders' AND column_name = 'budget_classification_id'
  ) THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN budget_classification_id UUID REFERENCES public.fleet_budget_classifications(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_supply_orders' AND column_name = 'pump_photo_url'
  ) THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN pump_photo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_supply_orders' AND column_name = 'authorized_by_name'
  ) THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN authorized_by_name TEXT NOT NULL DEFAULT 'Gestor de Frotas';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_supply_orders' AND column_name = 'authorized_by_role'
  ) THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN authorized_by_role TEXT NOT NULL DEFAULT 'Gestor de Frotas';
  END IF;
END $$;

-- 4. POLÍTICAS DE SEGURANÇA RLS
ALTER TABLE public.fleet_budget_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fleet_budget_classifications_tenant_policy" ON public.fleet_budget_classifications;
CREATE POLICY "fleet_budget_classifications_tenant_policy" ON public.fleet_budget_classifications
  FOR ALL TO authenticated, anon
  USING (
    institution_id = public.get_current_user_institution_id()
    OR institution_id = 'default'
    OR public.is_super_admin()
  )
  WITH CHECK (
    institution_id = public.get_current_user_institution_id()
    OR institution_id = 'default'
    OR public.is_super_admin()
  );

-- 5. SEED DAS CLASSIFICAÇÕES ORÇAMENTÁRIAS PADRÃO
INSERT INTO public.fleet_budget_classifications (institution_id, department_local, invoice_sheet, funding_source, budget_code)
VALUES
  ('default', 'Gabinete', '11', '1.1.500.0', '18'),
  ('default', 'Administração', '24', '1.1.500.0', '34'),
  ('default', 'Secretaria de Educação', '47', '2.1.500.1001000', '19'),
  ('default', 'Ens. Fundamental', '56', '2.1.500.1001000', '30'),
  ('default', 'Transporte Escolar', '57', '2.1.500.1001000', '20'),
  ('default', 'Transporte Escolar', '58', '2.1.571.0', '20'),
  ('default', 'QSE', '61', '2.1.550.0', '20'),
  ('default', 'PNATE', '64', '2.1.553.0', NULL),
  ('default', 'Educação Infantil', '72', '2.1.500.1001000', '20'),
  ('default', 'Secretaria de Viação', '106', '1.1.500.0', '22'),
  ('default', 'Secretaria de Viação - CIDE', '107', '1.1.750.0', '22'),
  ('default', 'FMT', '112', '1.1.759.700', '21'),
  ('default', 'PSF', '152', '3.1.500.1002000', '28'),
  ('default', 'PSF', '153', '3.1.600.0', '28'),
  ('default', 'PSF', '154', '3.1.621.0', '28'),
  ('default', 'TFD', '198', '3.1.500.1002000', '23'),
  ('default', 'TFD', '199', '3.1.600.0', '23'),
  ('default', 'TFD', '203', '3.1.621.0', '23'),
  ('default', 'MAC', '211', '3.1.500.1002000', '24'),
  ('default', 'MAC', '212', '3.1.600.0', '24'),
  ('default', 'MAC', '213', '3.1.621.0', '24'),
  ('default', 'Vigilância Sanitária', '223', '3.1.600.0', '29'),
  ('default', 'Secretaria de Saúde', '231', '3.1.500.1002000', '25'),
  ('default', 'Secret. de Agricultura', '241', '1.1.500.0', '30'),
  ('default', 'Secret. de Assistência', '276', '4.1.500.0', '26'),
  ('default', 'Conselho Tutelar', '281', '4.1.500.0', '42'),
  ('default', 'Meio Ambiente', '234', '1.1.500.0', NULL),
  ('default', 'Secret. Serv Públicos', '335', '1.1.500.0', '41'),
  ('default', 'Serviços de Limpeza', '339', '1.1.500.0', '27'),
  ('default', 'Manut. Serv. Publicos', '345', '1.1.500.0', '35'),
  ('default', 'Saet', '350', '1.1.500.0', '40')
ON CONFLICT DO NOTHING;
