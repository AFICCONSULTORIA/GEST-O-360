-- ==============================================================================
-- MIGRAÇÃO: CORREÇÃO DE RLS PARA REQUISIÇÕES (fuel_supply_orders) E AUDITORIA
-- Resolve o problema onde algumas requisições (ex: 0022494 ou emitidas com
-- institution_id = 'inst_1', 'default' ou NULL) apareciam apenas para SuperAdmin
-- e ficavam ocultas para outros usuários da mesma prefeitura.
-- ==============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.fuel_supply_orders', pol.policyname);
    END LOOP;

    CREATE POLICY fuel_supply_orders_tenant_select
      ON public.fuel_supply_orders
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
        OR institution_id IS NULL
      );

    CREATE POLICY fuel_supply_orders_tenant_insert
      ON public.fuel_supply_orders
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
        OR institution_id IS NULL
      );

    CREATE POLICY fuel_supply_orders_tenant_update
      ON public.fuel_supply_orders
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
        OR institution_id IS NULL
      )
      WITH CHECK (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
        OR institution_id IS NULL
      );

    CREATE POLICY fuel_supply_orders_tenant_delete
      ON public.fuel_supply_orders
      FOR DELETE TO authenticated
      USING (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
      );
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_audit_logs') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_supply_audit_logs'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.fuel_supply_audit_logs', pol.policyname);
    END LOOP;

    CREATE POLICY fuel_supply_audit_logs_tenant_select
      ON public.fuel_supply_audit_logs
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
        OR institution_id IS NULL
      );

    CREATE POLICY fuel_supply_audit_logs_tenant_insert
      ON public.fuel_supply_audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin()
        OR institution_id = public.get_current_user_institution_id()
        OR institution_id IN ('inst_1', 'default')
        OR institution_id IS NULL
      );
  END IF;
END $$;
