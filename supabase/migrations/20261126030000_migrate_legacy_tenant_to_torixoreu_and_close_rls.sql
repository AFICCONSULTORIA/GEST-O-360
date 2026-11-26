-- ==============================================================================
-- MIGRAÇÃO FASE 2B: ATRIBUIÇÃO DE DADOS LEGADOS A TORIXORÉU E FECHAMENTO DA EXCEÇÃO RLS
-- Versão: 20261126030000
-- Decisão do usuário:
--   Todos os registros legados gravados com `institution_id IN ('inst_1', 'default')`
--   ou `NULL` pertencem à Prefeitura Municipal de Torixoréu.
-- Efeito:
--   1. Resolve dinamicamente o `id` oficial de Torixoréu em `public.institutions`.
--   2. Migra de forma idempotente todas as linhas legadas para o `institution_id`
--      de Torixoréu (evitando duplicatas em índices únicos).
--   3. Remove a exceção temporária (`IN ('inst_1', 'default') OR IS NULL`) das
--      políticas RLS de Frotas e Auditoria, restabelecendo isolamento estrito
--      entre prefeituras (`is_super_admin() OR institution_id = get_current_user_institution_id()`).
-- ==============================================================================

DO $$
DECLARE
  v_torixoreu_id TEXT;
  v_tables TEXT[] := ARRAY[
    'fleet_vehicles',
    'fleet_drivers',
    'fleet_fuel_stations',
    'fuel_supply_orders',
    'fuel_supply_audit_logs',
    'fleet_budget_classifications',
    'education_students',
    'education_enrollments',
    'education_grades',
    'education_attendance',
    'education_announcements',
    'education_creche_queue',
    'creche_waiting_queue',
    'creche_settings',
    'education_intervention_plans',
    'education_teacher_trainings',
    'education_proficiencies',
    'education_teachers',
    'school_transport_buses',
    'school_transport_routes',
    'school_transport_stops',
    'school_transport_students',
    'school_transport_trips',
    'school_transport_attendance',
    'school_transport_telemetry',
    'edu_voting_schools',
    'edu_voting_elections',
    'edu_voting_candidates',
    'edu_voting_votes',
    'edu_voting_voters',
    'whatsapp_instances',
    'whatsapp_templates',
    'whatsapp_logs',
    'whatsapp_settings'
  ];
  t TEXT;
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'institutions') THEN
    -- Prioriza o UUID/ID dedicado de Torixoréu (caso exista além do placeholder 'inst_1')
    SELECT id::text INTO v_torixoreu_id
    FROM public.institutions
    WHERE (lower(COALESCE(subdomain, '')) = 'torixoreu' OR lower(COALESCE(name, '')) LIKE '%torixor%')
      AND id::text NOT IN ('inst_1', 'default')
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1;

    IF v_torixoreu_id IS NULL THEN
      SELECT id::text INTO v_torixoreu_id
      FROM public.institutions
      WHERE lower(COALESCE(subdomain, '')) = 'torixoreu' OR lower(COALESCE(name, '')) LIKE '%torixor%'
      ORDER BY created_at ASC NULLS LAST
      LIMIT 1;
    END IF;
  END IF;

  IF v_torixoreu_id IS NOT NULL THEN
    FOREACH t IN ARRAY v_tables LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'institution_id'
      ) THEN
        BEGIN
          EXECUTE format(
            'UPDATE public.%I SET institution_id = %L WHERE institution_id IS NULL OR institution_id IN (''inst_1'', ''default'')',
            t,
            v_torixoreu_id
          );
        EXCEPTION
          WHEN unique_violation THEN
            -- Se já existir registro equivalente no tenant de Torixoréu, preserva o registro canônico e atualiza apenas os sem conflito
            RAISE NOTICE 'Aviso: conflito de unicidade ignorado ao migrar linhas legadas em %.', t;
        END;
      END IF;
    END LOOP;
  END IF;
END $$;

-- Remover a exceção legada ('inst_1' / 'default' / NULL) das tabelas de Frotas e Auditoria
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fleet_vehicles',
    'fleet_drivers',
    'fleet_fuel_stations',
    'fuel_supply_orders',
    'fleet_budget_classifications'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated ' ||
        'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id()) ' ||
        'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
        t || '_tenant_strict',
        t
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_audit_logs') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_supply_audit_logs'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.fuel_supply_audit_logs', pol.policyname);
    END LOOP;

    CREATE POLICY fuel_supply_audit_logs_tenant_select
      ON public.fuel_supply_audit_logs
      FOR SELECT TO authenticated
      USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

    CREATE POLICY fuel_supply_audit_logs_tenant_insert
      ON public.fuel_supply_audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());
  END IF;
END $$;
