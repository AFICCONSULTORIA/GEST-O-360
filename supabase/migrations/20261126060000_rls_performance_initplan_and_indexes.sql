-- ==============================================================================
-- MIGRAÇÃO DE PERFORMANCE RLS: INITPLAN + ÍNDICES MULTI-TENANT
-- Versão: 20261126060000
-- Objetivo:
--   1. Eliminar scans de catálogo (`pg_tables`) dentro de `is_super_admin()` e
--      `get_current_user_institution_id()`, mantendo exatamente a mesma lógica
--      de segurança (`SECURITY DEFINER STABLE`, `SET search_path = public, pg_temp`,
--      sem leitura de `user_metadata`).
--   2. Criar índices em `admin_users(lower(email))` e `institution_id` nas
--      tabelas operacionais mais consultadas (Frotas, Patrimônio, Documentos,
--      Educação, Saúde, Contratos, Protocolos, etc.).
--   3. Converter policies RLS que chamam `is_super_admin()`,
--      `get_current_user_institution_id()` ou `current_user_institution_id()`
--      para o padrão `(SELECT ...)` (PostgreSQL InitPlan), fazendo cada função
--      executar 1 vez por query em vez de 1 vez por linha.
-- ==============================================================================

-- 1. OTIMIZAÇÃO DAS FUNÇÕES AUXILIARES DE SESSÃO/TENANT (SEM SCAN EM pg_tables)
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_inst_id TEXT;
  v_email TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Fonte primária confiável e instantânea: app_metadata no JWT (0 I/O de disco)
  v_inst_id := NULLIF(trim(COALESCE(auth.jwt() -> 'app_metadata' ->> 'institution_id', '')), '');
  IF v_inst_id IS NOT NULL THEN
    RETURN v_inst_id;
  END IF;

  v_email := LOWER(trim(COALESCE(auth.jwt() ->> 'email', '')));

  -- 2. Vínculo institucional na tabela admin_users (usa índice em lower(email) / PK)
  BEGIN
    SELECT NULLIF(trim(institution_id::text), '') INTO v_inst_id
    FROM public.admin_users
    WHERE (v_email <> '' AND LOWER(email) = v_email)
       OR id::text = v_uid::text
    LIMIT 1;

    IF v_inst_id IS NOT NULL THEN
      RETURN v_inst_id;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 3. Fallback: tabela profiles
  BEGIN
    SELECT NULLIF(trim(institution_id::text), '') INTO v_inst_id
    FROM public.profiles
    WHERE id = v_uid
    LIMIT 1;

    IF v_inst_id IS NOT NULL THEN
      RETURN v_inst_id;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_institution_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.get_current_user_institution_id();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_app_role TEXT;
  v_is_super BOOLEAN := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  v_app_role := LOWER(trim(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')));
  IF v_app_role IN ('super_admin', 'super admin') THEN
    RETURN true;
  END IF;

  v_email := LOWER(trim(COALESCE(auth.jwt() ->> 'email', '')));
  BEGIN
    SELECT EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE ((v_email <> '' AND LOWER(email) = v_email) OR id::text = v_uid::text)
        AND LOWER(trim(COALESCE(role, ''))) IN ('super_admin', 'super admin')
    ) INTO v_is_super;
  EXCEPTION WHEN undefined_table THEN
    v_is_super := false;
  END;

  RETURN COALESCE(v_is_super, false);
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_institution_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_institution_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_user_institution_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_institution_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- 2. ÍNDICES PARA LOOKUP DE PERFIL E ISOLAMENTO POR TENANT (institution_id)
DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'admin_users',
    'departments',
    'documents',
    'document_records',
    'orders',
    'controls',
    'contracts',
    'protocols',
    'patrimonio',
    'fleet_vehicles',
    'fleet_drivers',
    'fleet_fuel_stations',
    'fuel_supply_orders',
    'fuel_supply_audit_logs',
    'fleet_budget_classifications',
    'appointments',
    'medical_consultations',
    'medical_prescriptions',
    'medications',
    'education_students',
    'education_enrollments',
    'education_grades',
    'education_attendance',
    'education_announcements',
    'education_teachers',
    'education_proficiencies',
    'ouvidoria_manifestacoes',
    'public_forms',
    'public_form_responses',
    'support_tickets',
    'support_ticket_messages',
    'whatsapp_instances',
    'whatsapp_logs',
    'meio_ambiente_denuncias',
    'servicos_publicos_demandas'
  ];
  t TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'email'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_users_lower_email ON public.admin_users (lower(email))';
  END IF;

  FOREACH t IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'institution_id'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (institution_id)',
        'idx_' || t || '_institution_id',
        t
      );
    END IF;
  END LOOP;
END $$;

-- 3. CONVERTER POLICIES RLS PARA INITPLAN `(SELECT ...)` (1 EXECUÇÃO POR QUERY)
DO $$
DECLARE
  pol RECORD;
  v_qual TEXT;
  v_check TEXT;
  v_changed BOOLEAN;
  v_sql TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~ '(is_super_admin|get_current_user_institution_id|current_user_institution_id)\(\)'
        OR COALESCE(with_check, '') ~ '(is_super_admin|get_current_user_institution_id|current_user_institution_id)\(\)'
      )
  LOOP
    v_qual := pol.qual;
    v_check := pol.with_check;
    v_changed := false;

    IF v_qual IS NOT NULL THEN
      IF v_qual ~ 'is_super_admin\(\)' AND v_qual !~* 'SELECT\s+(public\.)?is_super_admin\(\)' THEN
        v_qual := regexp_replace(v_qual, '(public\.)?is_super_admin\(\)', '(SELECT public.is_super_admin())', 'g');
        v_changed := true;
      END IF;
      IF v_qual ~ 'get_current_user_institution_id\(\)' AND v_qual !~* 'SELECT\s+(public\.)?get_current_user_institution_id\(\)' THEN
        v_qual := regexp_replace(v_qual, '(public\.)?get_current_user_institution_id\(\)', '(SELECT public.get_current_user_institution_id())', 'g');
        v_changed := true;
      END IF;
      IF v_qual ~ '\mcurrent_user_institution_id\(\)' AND v_qual !~* 'SELECT\s+(public\.)?current_user_institution_id\(\)' THEN
        v_qual := regexp_replace(v_qual, '(public\.)?\mcurrent_user_institution_id\(\)', '(SELECT public.current_user_institution_id())', 'g');
        v_changed := true;
      END IF;
    END IF;

    IF v_check IS NOT NULL THEN
      IF v_check ~ 'is_super_admin\(\)' AND v_check !~* 'SELECT\s+(public\.)?is_super_admin\(\)' THEN
        v_check := regexp_replace(v_check, '(public\.)?is_super_admin\(\)', '(SELECT public.is_super_admin())', 'g');
        v_changed := true;
      END IF;
      IF v_check ~ 'get_current_user_institution_id\(\)' AND v_check !~* 'SELECT\s+(public\.)?get_current_user_institution_id\(\)' THEN
        v_check := regexp_replace(v_check, '(public\.)?get_current_user_institution_id\(\)', '(SELECT public.get_current_user_institution_id())', 'g');
        v_changed := true;
      END IF;
      IF v_check ~ '\mcurrent_user_institution_id\(\)' AND v_check !~* 'SELECT\s+(public\.)?current_user_institution_id\(\)' THEN
        v_check := regexp_replace(v_check, '(public\.)?\mcurrent_user_institution_id\(\)', '(SELECT public.current_user_institution_id())', 'g');
        v_changed := true;
      END IF;
    END IF;

    IF v_changed THEN
      v_sql := format('ALTER POLICY %I ON public.%I', pol.policyname, pol.tablename);
      IF v_qual IS NOT NULL THEN
        v_sql := v_sql || format(' USING (%s)', v_qual);
      END IF;
      IF v_check IS NOT NULL THEN
        v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
      END IF;

      BEGIN
        EXECUTE v_sql;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso ao otimizar policy %.%: %', pol.tablename, pol.policyname, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
