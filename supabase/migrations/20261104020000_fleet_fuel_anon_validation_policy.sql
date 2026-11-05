-- ====================================================================
-- MIGRAÇÃO: POLÍTICAS PÚBLICAS PARA VALIDAÇÃO DE COMBUSTÍVEL VIA QR CODE
-- Versão: 20261104020000
-- Permite que condutores e frentistas anônimos (via QR Code) consultem 
-- e deem baixa na ordem de fornecimento com fotos comprobatórias.
-- ====================================================================

-- 1. Permitir leitura pública dos veículos vinculados a ordens (necessário no SELECT com JOIN)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fleet_vehicles' AND policyname = 'fleet_vehicles_anon_select'
  ) THEN
    CREATE POLICY "fleet_vehicles_anon_select" ON public.fleet_vehicles
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 2. Permitir consulta e baixa de ordens de fornecimento para anon (QR Code do canhoto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fuel_supply_orders' AND policyname = 'fuel_supply_orders_anon_select'
  ) THEN
    CREATE POLICY "fuel_supply_orders_anon_select" ON public.fuel_supply_orders
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fuel_supply_orders' AND policyname = 'fuel_supply_orders_anon_update'
  ) THEN
    CREATE POLICY "fuel_supply_orders_anon_update" ON public.fuel_supply_orders
      FOR UPDATE TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Atualizar bucket de fotos de combustivel para permitir uploads anônimos (fotos tiradas no celular na bomba)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-fuel-receipts', 'fleet-fuel-receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public upload for fleet fuel receipts" ON storage.objects;
CREATE POLICY "Public upload for fleet fuel receipts" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'fleet-fuel-receipts');

DROP POLICY IF EXISTS "Public select for fleet fuel receipts" ON storage.objects;
CREATE POLICY "Public select for fleet fuel receipts" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'fleet-fuel-receipts');

-- 4. Habilitar Realtime para a tabela fuel_supply_orders (notificações push no painel do gestor)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_supply_orders;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

