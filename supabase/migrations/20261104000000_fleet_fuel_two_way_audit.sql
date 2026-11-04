-- ====================================================================
-- MIGRAÇÃO: AUTORIZAÇÃO EM DUAS VIAS E AUDITORIA MATEMÁTICA DE FROTAS
-- Versão: 20261104000000
-- Sistema GESTÃO 360 - Módulo de Frotas / Controles Internos
-- Em conformidade com o Tribunal de Contas (TCE) e Lei 14.133 / Lei 4.320/64
-- ====================================================================

-- 1. TABELA DE ORDENS DE ABASTECIMENTO (fuel_supply_orders)
CREATE TABLE IF NOT EXISTS public.fuel_supply_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  order_number TEXT NOT NULL UNIQUE, -- Formato "AUT-2026-XXXX"
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE RESTRICT,
  driver_name TEXT NOT NULL,
  driver_document TEXT, -- CPF ou Matrícula
  station_name TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  bidded_unit_price NUMERIC(8,3) NOT NULL DEFAULT 0, -- Preço unitário fixo da licitação
  liters_authorized NUMERIC(6,2) NOT NULL,
  total_authorized_value NUMERIC(10,2) NOT NULL DEFAULT 0, -- liters_authorized * bidded_unit_price
  liters_supplied NUMERIC(6,2),
  previous_odometer NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_odometer NUMERIC(10,2),
  calculated_km_per_liter NUMERIC(6,2),
  deviation_percent NUMERIC(5,2),
  receipt_photo_url TEXT, -- Foto do canhoto físico assinado
  odometer_photo_url TEXT, -- Foto do painel do veículo
  invoice_coupon_number TEXT,
  anomaly_level TEXT DEFAULT 'none', -- 'none', 'alerta_amarelo', 'bloqueio_critico'
  anomaly_reason TEXT,
  audit_justification TEXT,
  status TEXT DEFAULT 'autorizado_pendente', -- 'autorizado_pendente', 'abastecido', 'auditado', 'glosado'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  supplied_at TIMESTAMPTZ
);

-- Garantir adição de colunas caso a tabela já exista de versão anterior
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'bidded_unit_price') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN bidded_unit_price NUMERIC(8,3) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'total_authorized_value') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN total_authorized_value NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'calculated_km_per_liter') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN calculated_km_per_liter NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'deviation_percent') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN deviation_percent NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'receipt_photo_url') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN receipt_photo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'invoice_coupon_number') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN invoice_coupon_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'anomaly_level') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN anomaly_level TEXT DEFAULT 'none';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_supply_orders' AND column_name = 'supplied_at') THEN
    ALTER TABLE public.fuel_supply_orders ADD COLUMN supplied_at TIMESTAMPTZ;
  END IF;
END $$;

-- Atualizar restrição de status para incluir 'autorizado_pendente'
ALTER TABLE public.fuel_supply_orders DROP CONSTRAINT IF EXISTS fuel_supply_orders_status_check;
ALTER TABLE public.fuel_supply_orders ADD CONSTRAINT fuel_supply_orders_status_check 
  CHECK (status IN ('autorizado_pendente', 'autorizado', 'abastecido', 'auditado', 'glosado', 'liquidado'));

-- Definir default para 'autorizado_pendente'
ALTER TABLE public.fuel_supply_orders ALTER COLUMN status SET DEFAULT 'autorizado_pendente';

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_fuel_orders_order_number ON public.fuel_supply_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_inst_id ON public.fuel_supply_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_vehicle_id ON public.fuel_supply_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_status_two_way ON public.fuel_supply_orders(status);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_anomaly_level ON public.fuel_supply_orders(anomaly_level);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_created_at_desc ON public.fuel_supply_orders(created_at DESC);

-- 2. BUCKET DE STORAGE PARA FOTOS DO PAINEL E CANHOTOS ASSINADOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-fuel-receipts', 'fleet-fuel-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Garantir políticas de storage
DROP POLICY IF EXISTS "Public select for fuel receipts" ON storage.objects;
CREATE POLICY "Public select for fuel receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'fleet-fuel-receipts');

DROP POLICY IF EXISTS "Public insert for fuel receipts" ON storage.objects;
CREATE POLICY "Public insert for fuel receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fleet-fuel-receipts');

DROP POLICY IF EXISTS "Public update for fuel receipts" ON storage.objects;
CREATE POLICY "Public update for fuel receipts" ON storage.objects
  FOR UPDATE USING (bucket_id = 'fleet-fuel-receipts');

-- 3. HABILITAR E ATUALIZAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.fuel_supply_orders ENABLE ROW LEVEL SECURITY;

-- Política multitenant com permissão para consulta pública e confirmação via QR Code
DROP POLICY IF EXISTS "Ordens de combustivel isoladas por instituicao" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "fuel_supply_orders_tenant_policy" ON public.fuel_supply_orders;

CREATE POLICY "fuel_supply_orders_tenant_policy" ON public.fuel_supply_orders
  FOR ALL
  USING (
    auth.role() = 'anon'
    OR institution_id = (SELECT public.get_current_user_institution_id())::text
    OR institution_id = current_setting('request.jwt.claims', true)::json->>'institution_id'
    OR public.is_super_admin()
  )
  WITH CHECK (
    auth.role() = 'anon'
    OR institution_id = (SELECT public.get_current_user_institution_id())::text
    OR institution_id = current_setting('request.jwt.claims', true)::json->>'institution_id'
    OR public.is_super_admin()
  );

