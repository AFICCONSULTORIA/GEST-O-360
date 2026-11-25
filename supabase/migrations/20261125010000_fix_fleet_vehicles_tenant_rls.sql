-- ==============================================================================
-- MIGRAÇÃO: CORREÇÃO DE RLS PARA VEÍCULOS, MOTORISTAS E POSTOS LEGADOS/INST_1
-- Resolve o problema onde usuários não-SuperAdmin viam "SEM PLACA / Veículo Municipal"
-- porque fleet_vehicles possuía institution_id = 'inst_1', 'default' ou NULL
-- enquanto fuel_supply_orders possuía o ID da instituição do usuário.
-- ==============================================================================

DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'fleet_vehicles',
    'fleet_drivers',
    'fleet_fuel_stations'
  ];
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated ' ||
        'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id() OR institution_id IN (''inst_1'', ''default'') OR institution_id IS NULL)',
        t || '_tenant_select',
        t
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated ' ||
        'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id() OR institution_id = ''inst_1'')',
        t || '_tenant_insert',
        t
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated ' ||
        'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id() OR institution_id IN (''inst_1'', ''default'') OR institution_id IS NULL) ' ||
        'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id() OR institution_id = ''inst_1'')',
        t || '_tenant_update',
        t
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated ' ||
        'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id() OR institution_id IN (''inst_1'', ''default''))',
        t || '_tenant_delete',
        t
      );
    END IF;
  END LOOP;
END $$;
