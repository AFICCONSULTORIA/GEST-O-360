-- ====================================================================
-- MIGRAÇÃO: CONTROLE E AUDITORIA DE ABASTECIMENTO DE FROTAS (GESTÃO 360)
-- Versão: 20261020000000
-- Em conformidade com os Tribunais de Contas e Lei 4.320/64
-- ====================================================================

-- 1. CADASTRO TÉCNICO DE VEÍCULOS E MÁQUINAS (fleet_vehicles)
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  prefix_code TEXT,
  model TEXT NOT NULL,
  department TEXT NOT NULL,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('gasolina', 'etanol', 'diesel_s10', 'diesel_s500', 'arla32')),
  tank_capacity NUMERIC(6,2) NOT NULL,
  metric_type TEXT DEFAULT 'km' CHECK (metric_type IN ('km', 'horimetro')),
  expected_consumption NUMERIC(6,2) NOT NULL,
  current_odometer NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'manutencao', 'baixado', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_inst ON public.fleet_vehicles(institution_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_dept ON public.fleet_vehicles(department);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_plate ON public.fleet_vehicles(plate);

-- 2. ORDENS DE ABASTECIMENTO E LANÇAMENTOS COM ANEXOS (fuel_supply_orders)
CREATE TABLE IF NOT EXISTS public.fuel_supply_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  order_number TEXT NOT NULL UNIQUE, -- Ex: "ABAST-2026-0001"
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE RESTRICT,
  driver_name TEXT NOT NULL,
  driver_document TEXT, -- CPF ou Matrícula funcional
  station_name TEXT NOT NULL, -- Posto conveniado
  fuel_type TEXT NOT NULL,
  liters_authorized NUMERIC(6,2) NOT NULL,
  liters_supplied NUMERIC(6,2),
  current_odometer NUMERIC(10,2) NOT NULL,
  previous_odometer NUMERIC(10,2) NOT NULL,
  calculated_consumption NUMERIC(6,2), -- km/l ou l/h apurado
  unit_price NUMERIC(8,3),
  total_value NUMERIC(10,2),
  invoice_number TEXT,
  invoice_key TEXT, -- Chave de acesso de 44 dígitos da NF-e / NFC-e

  -- COMPROVAÇÃO DOCUMENTAL (ANEXOS / CANHOTOS)
  receipt_attachment_url TEXT, -- URL da foto/scan do canhoto assinado
  odometer_photo_url TEXT, -- URL da foto opcional do painel/bomba
  invoice_attachment_url TEXT, -- URL do cupom/PDF da nota fiscal

  -- AUDITORIA E STATUS ANTIFRAUDE
  is_anomaly BOOLEAN DEFAULT false,
  anomaly_reason TEXT,
  audit_justification TEXT,
  audited_by UUID,
  status TEXT DEFAULT 'autorizado' CHECK (status IN ('autorizado', 'abastecido', 'auditado', 'glosado', 'liquidado')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para consultas e conciliação
CREATE INDEX IF NOT EXISTS idx_fuel_orders_inst ON public.fuel_supply_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_vehicle ON public.fuel_supply_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_status ON public.fuel_supply_orders(status);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_anomaly ON public.fuel_supply_orders(is_anomaly);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_created ON public.fuel_supply_orders(created_at DESC);

-- 3. BUCKET DE STORAGE PARA CANHOTOS E COMPROVANTES (fleet-fuel-receipts)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-fuel-receipts', 'fleet-fuel-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "Acesso publico para canhotos de combustivel" ON storage.objects;
CREATE POLICY "Acesso publico para canhotos de combustivel"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fleet-fuel-receipts');

DROP POLICY IF EXISTS "Upload autenticado de canhotos de combustivel" ON storage.objects;
CREATE POLICY "Upload autenticado de canhotos de combustivel"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fleet-fuel-receipts');

DROP POLICY IF EXISTS "Edicao de canhotos de combustivel" ON storage.objects;
CREATE POLICY "Edicao de canhotos de combustivel"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'fleet-fuel-receipts');

DROP POLICY IF EXISTS "Exclusao de canhotos de combustivel" ON storage.objects;
CREATE POLICY "Exclusao de canhotos de combustivel"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'fleet-fuel-receipts');

-- 4. SEGURANÇA E POLÍTICAS MULTITENANT COM RLS
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_supply_orders ENABLE ROW LEVEL SECURITY;

-- Políticas para fleet_vehicles
DROP POLICY IF EXISTS "Veiculos isolados por instituicao" ON public.fleet_vehicles;
CREATE POLICY "Veiculos isolados por instituicao" ON public.fleet_vehicles
  FOR ALL
  USING (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  )
  WITH CHECK (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  );

-- Políticas para fuel_supply_orders
DROP POLICY IF EXISTS "Ordens de combustivel isoladas por instituicao" ON public.fuel_supply_orders;
CREATE POLICY "Ordens de combustivel isoladas por instituicao" ON public.fuel_supply_orders
  FOR ALL
  USING (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  )
  WITH CHECK (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  );

-- 5. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.handle_updated_at_fuel_orders()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fuel_orders_updated_at ON public.fuel_supply_orders;
CREATE TRIGGER trg_fuel_orders_updated_at
  BEFORE UPDATE ON public.fuel_supply_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_fuel_orders();
