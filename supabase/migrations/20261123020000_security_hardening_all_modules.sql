-- ==============================================================================
-- MIGRAÇÃO DE BLINDAGEM DE CIBERSEGURANÇA INTEGRAL - GESTÃO 360
-- Versão: 20261123020000
-- Endereça:
--   1. Resolução segura de tenant (sem leitura de user_metadata editável pelo usuário)
--   2. Proteção contra escalamento de privilégio em public.profiles
--   3. Revogação de RPCs destrutivas públicas (anon) em Frotas + RLS estrito
--   4. RPCs SECURITY DEFINER seguras para o portal da bomba (/validar-abastecimento)
--   5. Restrição de upload no Storage fleet-fuel-receipts
--   6. Isolamento multi-tenant e RLS estrito para Saúde (LGPD Art. 11), WhatsApp,
--      Financeiro/Contabilidade, Logs de Auditoria (append-only) e Transporte Escolar
--   7. Fixação de SET search_path = public em funções SECURITY DEFINER legadas
-- ==============================================================================

-- ==============================================================================
-- 1. RESOLUÇÃO SEGURA DE TENANT & SUPER ADMIN (SEM user_metadata)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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

  -- 1. Fonte primária confiável: app_metadata no JWT (gerenciado apenas no servidor)
  v_inst_id := NULLIF(trim(COALESCE(auth.jwt() -> 'app_metadata' ->> 'institution_id', '')), '');
  IF v_inst_id IS NOT NULL THEN
    RETURN v_inst_id;
  END IF;

  v_email := LOWER(trim(COALESCE(auth.jwt() ->> 'email', '')));

  -- 2. Vínculo institucional na tabela admin_users
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    SELECT NULLIF(trim(institution_id::text), '') INTO v_inst_id
    FROM public.admin_users
    WHERE id::text = v_uid::text
       OR (v_email <> '' AND LOWER(email) = v_email)
    LIMIT 1;

    IF v_inst_id IS NOT NULL THEN
      RETURN v_inst_id;
    END IF;
  END IF;

  -- 3. Vínculo institucional na tabela profiles (protegida contra edição pelo usuário)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    SELECT NULLIF(trim(institution_id::text), '') INTO v_inst_id
    FROM public.profiles
    WHERE id = v_uid
    LIMIT 1;

    IF v_inst_id IS NOT NULL THEN
      RETURN v_inst_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_institution_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.get_current_user_institution_id();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_institution_uuid()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.get_current_user_institution_id()::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_app_role TEXT;
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
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    IF EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE (id::text = v_uid::text OR (v_email <> '' AND LOWER(email) = v_email))
        AND LOWER(trim(COALESCE(role, ''))) IN ('super_admin', 'super admin')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ==============================================================================
-- 2. PROTEÇÃO CONTRA ESCALAMENTO DE PRIVILÉGIO EM public.profiles
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_super_admin() THEN
    IF NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
      RAISE EXCEPTION 'Operação não permitida: alteração direta de institution_id em profiles bloqueada.';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Operação não permitida: alteração direta de role em profiles bloqueada.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;

    CREATE POLICY "profiles_tenant_strict" ON public.profiles
      FOR ALL TO authenticated
      USING (
        id = auth.uid()
        OR institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      )
      WITH CHECK (
        id = auth.uid()
        OR institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
    CREATE TRIGGER trg_prevent_profile_privilege_escalation
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
  END IF;
END $$;

-- ==============================================================================
-- 3. FROTAS: REVOGAR RPCs DESTRUTIVAS DE anon E BLINDAR TABELAS + BOMBA/QR CODE
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    REVOKE ALL ON FUNCTION public.rpc_delete_fuel_order(TEXT) FROM PUBLIC, anon;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    REVOKE ALL ON FUNCTION public.rpc_clear_all_fuel_orders() FROM PUBLIC, anon;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_delete_fuel_order(p_order_id_or_number TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para excluir ordens de abastecimento.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders') THEN
    RETURN false;
  END IF;

  v_inst := public.get_current_user_institution_id();
  IF NOT public.is_super_admin() AND v_inst IS NULL THEN
    RAISE EXCEPTION 'Usuário sem instituição vinculada.';
  END IF;

  DELETE FROM public.fuel_supply_orders
  WHERE (id::text = p_order_id_or_number OR order_number = p_order_id_or_number)
    AND (public.is_super_admin() OR institution_id = v_inst);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_clear_all_fuel_orders()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst TEXT;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas Super Admin pode limpar ordens.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders') THEN
    RETURN false;
  END IF;

  v_inst := public.get_current_user_institution_id();
  IF v_inst IS NULL THEN
    RAISE EXCEPTION 'Instituição ativa não identificada para limpeza segura.';
  END IF;

  DELETE FROM public.fuel_supply_orders
  WHERE institution_id = v_inst;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_delete_fuel_order(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_clear_all_fuel_orders() TO authenticated, service_role;

-- RPC pública segura para leitura da autorização na bomba (/validar-abastecimento)
CREATE OR REPLACE FUNCTION public.public_get_fuel_order_by_number(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := trim(COALESCE(p_identifier, ''));
  v_digits TEXT;
  v_padded TEXT := NULL;
  v_order RECORD;
  v_vehicle RECORD;
  v_vehicle_json JSONB := NULL;
  v_order_json JSONB;
BEGIN
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders') THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(v_clean, '\D', '', 'g');
  IF v_digits <> '' AND length(v_digits) <= 7 AND v_clean ~ '^\d+$' THEN
    v_padded := lpad(v_digits, 7, '0');
  END IF;

  SELECT *
  INTO v_order
  FROM public.fuel_supply_orders
  WHERE (
    id::text = v_clean
    OR UPPER(order_number) = UPPER(v_clean)
    OR (v_padded IS NOT NULL AND UPPER(order_number) = UPPER(v_padded))
  )
    AND COALESCE(status, '') <> 'cancelado'
    AND COALESCE(anomaly_reason, '') <> 'CANCELADO_EXCLUIDO'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.vehicle_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fleet_vehicles'
  ) THEN
    SELECT * INTO v_vehicle FROM public.fleet_vehicles WHERE id = v_order.vehicle_id LIMIT 1;
    IF FOUND THEN
      v_vehicle_json := to_jsonb(v_vehicle);
    END IF;
  END IF;

  -- Remove driver_document para não expor CPF do motorista para sessões anônimas
  v_order_json := to_jsonb(v_order) - 'driver_document';
  IF v_vehicle_json IS NOT NULL THEN
    v_order_json := v_order_json || jsonb_build_object('vehicle', v_vehicle_json);
  END IF;

  RETURN v_order_json;
END;
$$;

-- Garantir colunas usadas pela RPC da bomba em fuel_supply_orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders') THEN
    ALTER TABLE public.fuel_supply_orders
      ADD COLUMN IF NOT EXISTS pump_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS odometer_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS receipt_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS receipt_attachment_url TEXT,
      ADD COLUMN IF NOT EXISTS total_authorized_value NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS anomaly_level TEXT,
      ADD COLUMN IF NOT EXISTS anomaly_reason TEXT,
      ADD COLUMN IF NOT EXISTS supplied_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- RPC pública segura para baixa de abastecimento na bomba via QR Code
CREATE OR REPLACE FUNCTION public.public_complete_fuel_order(
  p_order_id UUID,
  p_order_number TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_updated RECORD;
  v_payload JSONB := COALESCE(p_payload, '{}'::jsonb);
  v_supplied_at TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_orders') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tabela de ordens indisponível.');
  END IF;

  SELECT *
  INTO v_order
  FROM public.fuel_supply_orders
  WHERE (p_order_id IS NOT NULL AND id = p_order_id)
     OR (p_order_number IS NOT NULL AND UPPER(order_number) = UPPER(trim(p_order_number)))
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ordem de abastecimento não encontrada.');
  END IF;

  IF COALESCE(v_order.status, '') IN ('auditado', 'glosado', 'liquidado', 'cancelado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta ordem já foi encerrada ou homologada e não aceita alterações pela bomba.');
  END IF;

  BEGIN
    v_supplied_at := COALESCE(NULLIF(v_payload ->> 'supplied_at', '')::timestamptz, now());
  EXCEPTION WHEN OTHERS THEN
    v_supplied_at := now();
  END;

  UPDATE public.fuel_supply_orders
  SET
    driver_name = COALESCE(NULLIF(trim(v_payload ->> 'driver_name'), ''), driver_name),
    liters_supplied = COALESCE((v_payload ->> 'liters_supplied')::numeric, liters_supplied),
    current_odometer = COALESCE((v_payload ->> 'current_odometer')::numeric, current_odometer),
    pump_photo_url = COALESCE(NULLIF(v_payload ->> 'pump_photo_url', ''), pump_photo_url),
    odometer_photo_url = COALESCE(NULLIF(v_payload ->> 'odometer_photo_url', ''), odometer_photo_url),
    receipt_photo_url = COALESCE(NULLIF(v_payload ->> 'receipt_photo_url', ''), receipt_photo_url),
    receipt_attachment_url = COALESCE(NULLIF(v_payload ->> 'receipt_attachment_url', ''), receipt_attachment_url),
    total_authorized_value = COALESCE((v_payload ->> 'total_authorized_value')::numeric, total_authorized_value),
    total_value = COALESCE((v_payload ->> 'total_value')::numeric, total_value),
    unit_price = COALESCE((v_payload ->> 'unit_price')::numeric, unit_price),
    anomaly_level = COALESCE(NULLIF(v_payload ->> 'anomaly_level', ''), anomaly_level),
    anomaly_reason = CASE
      WHEN v_payload ? 'anomaly_reason' THEN NULLIF(v_payload ->> 'anomaly_reason', '')
      ELSE anomaly_reason
    END,
    status = 'abastecido',
    supplied_at = v_supplied_at,
    updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'success', true,
    'order', to_jsonb(v_updated) - 'driver_document'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_fuel_order_by_number(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_complete_fuel_order(UUID, TEXT, JSONB) TO anon, authenticated;

-- Restringir Storage fleet-fuel-receipts apenas para imagens nas pastas da bomba
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Public upload for fleet fuel receipts" ON storage.objects;
    DROP POLICY IF EXISTS "Receipts public insert" ON storage.objects;
    CREATE POLICY "Public upload for fleet fuel receipts" ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        bucket_id = 'fleet-fuel-receipts'
        AND (name LIKE 'pumps/%' OR name LIKE 'odometers/%')
        AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
      );
  END IF;
END $$;

-- ==============================================================================
-- 4. BLINDAGEM RLS MULTI-TENANT PARA TODOS OS MÓDULOS SENSÍVEIS
-- ==============================================================================
DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    -- Frotas (sem acesso anon direto; bomba usa RPCs acima)
    'fleet_drivers',
    'fleet_fuel_stations',
    'fuel_supply_orders',
    'fleet_vehicles',
    'fleet_budget_classifications',
    -- Saúde (LGPD Art. 11 - Dados sensíveis)
    'patients',
    'health_units',
    'health_professionals',
    'exam_types',
    'exam_requests',
    'medication_dispensations',
    -- WhatsApp (tokens e logs)
    'whatsapp_instances',
    'whatsapp_templates',
    'whatsapp_logs',
    'whatsapp_settings',
    -- Financeiro & Contabilidade
    'fin_remanejamento_origens',
    'fin_remanejamento_destinos',
    'fin_remanejamento_alocacoes',
    'fin_contabilidade_fichas',
    'fin_contabilidade_lancamentos',
    -- Transporte Escolar (pais continuam usando RPC parent_lookup_school_transport)
    'school_transport_buses',
    'school_transport_routes',
    'school_transport_stops',
    'school_transport_students',
    'school_transport_trips',
    'school_transport_attendance'
  ];
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      -- Garantir coluna institution_id
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT ''inst_1''',
        t
      );

      -- Revogar acesso anônimo direto da tabela
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);

      -- Habilitar RLS e remover políticas permissivas antigas
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      -- Política estrita por tenant autenticado
      IF t = 'fleet_budget_classifications' THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated ' ||
          'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id() OR institution_id IN (''inst_1'', ''default'') OR institution_id IS NULL)',
          t || '_tenant_select',
          t
        );
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated ' ||
          'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
          t || '_tenant_insert',
          t
        );
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated ' ||
          'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id()) ' ||
          'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
          t || '_tenant_update',
          t
        );
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated ' ||
          'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
          t || '_tenant_delete',
          t
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL TO authenticated ' ||
          'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id()) ' ||
          'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
          t || '_tenant_strict',
          t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Logs de Auditoria de Frotas (TCE): append-only (apenas SELECT e INSERT autenticados por tenant)
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_supply_audit_logs') THEN
    ALTER TABLE public.fuel_supply_audit_logs
      ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

    REVOKE ALL ON TABLE public.fuel_supply_audit_logs FROM anon;
    REVOKE UPDATE, DELETE ON TABLE public.fuel_supply_audit_logs FROM authenticated;
    GRANT SELECT, INSERT ON TABLE public.fuel_supply_audit_logs TO authenticated;

    ALTER TABLE public.fuel_supply_audit_logs ENABLE ROW LEVEL SECURITY;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_supply_audit_logs'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.fuel_supply_audit_logs', pol.policyname);
    END LOOP;

    CREATE POLICY "fuel_supply_audit_logs_tenant_select" ON public.fuel_supply_audit_logs
      FOR SELECT TO authenticated
      USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

    CREATE POLICY "fuel_supply_audit_logs_tenant_insert" ON public.fuel_supply_audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());
  END IF;
END $$;

-- ==============================================================================
-- 5. FIXAR search_path = public EM FUNÇÕES SECURITY DEFINER LEGADAS
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER FUNCTION public.complete_education_lesson(UUID, UUID, UUID, INTEGER, INTEGER) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.submit_education_quiz(UUID, UUID, NUMERIC, INTEGER, INTEGER, INTEGER, INTEGER) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.get_teacher_dashboard_metrics(UUID) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.admin_register_teacher(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;

  BEGIN
    ALTER FUNCTION public.save_proficiencies_batch(JSONB) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;
