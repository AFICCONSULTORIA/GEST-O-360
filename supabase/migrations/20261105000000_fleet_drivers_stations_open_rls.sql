-- ====================================================================
-- MIGRAÇÃO DEFINITIVA: LIBERAÇÃO DE ACESSO RLS MULTI-TENANT E MOBILE
-- Sistema GESTÃO 360 - Frotas, Abastecimento e Validação via Bomba/QR Code
-- Arquivo: supabase/migrations/20261105000000_fleet_drivers_stations_open_rls.sql
-- ====================================================================

-- 1. Flexibilizar restrições NOT NULL da tabela fleet_drivers para evitar erros de validação
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_drivers' AND column_name = 'cpf') THEN
    ALTER TABLE public.fleet_drivers ALTER COLUMN cpf DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_drivers' AND column_name = 'department') THEN
    ALTER TABLE public.fleet_drivers ALTER COLUMN department DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_drivers' AND column_name = 'birth_date') THEN
    ALTER TABLE public.fleet_drivers ALTER COLUMN birth_date DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_drivers' AND column_name = 'cnh_number') THEN
    ALTER TABLE public.fleet_drivers ALTER COLUMN cnh_number DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_drivers' AND column_name = 'cnh_category') THEN
    ALTER TABLE public.fleet_drivers ALTER COLUMN cnh_category DROP NOT NULL;
  END IF;
END $$;

-- 2. Habilitar RLS em todas as tabelas operacionais da frota
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_fuel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_supply_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas restritivas que bloqueavam usuários autenticados (sem institution_id no JWT)
DROP POLICY IF EXISTS "fleet_drivers_tenant_policy" ON public.fleet_drivers;
DROP POLICY IF EXISTS "fleet_drivers_anon_select" ON public.fleet_drivers;
DROP POLICY IF EXISTS "fleet_drivers_anon_insert" ON public.fleet_drivers;
DROP POLICY IF EXISTS "fleet_drivers_anon_update" ON public.fleet_drivers;
DROP POLICY IF EXISTS "fleet_drivers_anon_delete" ON public.fleet_drivers;
DROP POLICY IF EXISTS "fleet_drivers_open_policy" ON public.fleet_drivers;

DROP POLICY IF EXISTS "fleet_fuel_stations_tenant_policy" ON public.fleet_fuel_stations;
DROP POLICY IF EXISTS "fleet_fuel_stations_anon_select" ON public.fleet_fuel_stations;
DROP POLICY IF EXISTS "fleet_fuel_stations_anon_insert" ON public.fleet_fuel_stations;
DROP POLICY IF EXISTS "fleet_fuel_stations_anon_update" ON public.fleet_fuel_stations;
DROP POLICY IF EXISTS "fleet_fuel_stations_anon_delete" ON public.fleet_fuel_stations;
DROP POLICY IF EXISTS "fleet_fuel_stations_open_policy" ON public.fleet_fuel_stations;

DROP POLICY IF EXISTS "fuel_supply_orders_tenant_policy" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "Ordens de combustivel isoladas por instituicao" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "fuel_supply_orders_anon_select" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "fuel_supply_orders_anon_insert" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "fuel_supply_orders_anon_update" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "fuel_supply_orders_anon_delete" ON public.fuel_supply_orders;
DROP POLICY IF EXISTS "fuel_supply_orders_open_policy" ON public.fuel_supply_orders;

DROP POLICY IF EXISTS "fleet_vehicles_tenant_policy" ON public.fleet_vehicles;
DROP POLICY IF EXISTS "fleet_vehicles_open_policy" ON public.fleet_vehicles;

-- 4. Criar políticas completas (ALL: SELECT, INSERT, UPDATE, DELETE) para anon e authenticated
CREATE POLICY "fleet_drivers_open_policy" ON public.fleet_drivers
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fleet_fuel_stations_open_policy" ON public.fleet_fuel_stations
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fuel_supply_orders_open_policy" ON public.fuel_supply_orders
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fleet_vehicles_open_policy" ON public.fleet_vehicles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Garantir permissões de Storage para comprovantes de abastecimento
INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-fuel-receipts', 'fleet-fuel-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Receipts public select" ON storage.objects;
DROP POLICY IF EXISTS "Receipts public insert" ON storage.objects;
DROP POLICY IF EXISTS "Receipts public update" ON storage.objects;
DROP POLICY IF EXISTS "Receipts public all" ON storage.objects;

CREATE POLICY "Receipts public all" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'fleet-fuel-receipts')
  WITH CHECK (bucket_id = 'fleet-fuel-receipts');

-- 6. Garantir Realtime ativo para a tabela fuel_supply_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fuel_supply_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_supply_orders;
  END IF;
END $$;

