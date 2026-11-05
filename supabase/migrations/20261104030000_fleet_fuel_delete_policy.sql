-- ====================================================================
-- MIGRAÇÃO: HABILITAÇÃO DE EXCLUSÃO DE ORDENS E LIMPEZA DE BASE (GESTÃO 360)
-- Versão: 20261104030000
-- Permite que o gestor de frotas exclua ordens de fornecimento no Supabase
-- e limpe o histórico de testes sem bloqueio de RLS.
-- ====================================================================

-- 1. Política de DELETE para fuel_supply_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fuel_supply_orders' AND policyname = 'fuel_supply_orders_anon_delete'
  ) THEN
    CREATE POLICY "fuel_supply_orders_anon_delete" ON public.fuel_supply_orders
      FOR DELETE TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 2. RPC com SECURITY DEFINER para exclusão definitiva e irrestrita de uma ordem específica
CREATE OR REPLACE FUNCTION public.rpc_delete_fuel_order(p_order_id_or_number TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.fuel_supply_orders
  WHERE id::text = p_order_id_or_number 
     OR order_number = p_order_id_or_number;
  RETURN true;
END;
$$;

-- 3. RPC com SECURITY DEFINER para limpeza total de todas as ordens de teste
CREATE OR REPLACE FUNCTION public.rpc_clear_all_fuel_orders()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.fuel_supply_orders;
  RETURN true;
END;
$$;

-- 4. Conceder permissão de execução das RPCs para as roles de API
GRANT EXECUTE ON FUNCTION public.rpc_delete_fuel_order(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_clear_all_fuel_orders() TO anon, authenticated, service_role;

