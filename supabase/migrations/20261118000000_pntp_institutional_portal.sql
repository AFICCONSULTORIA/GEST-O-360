-- ============================================================================
-- MIGRATION: Portal Institucional Público & Portal da Transparência (PNTP Selo Diamante)
-- Conformidade: LAI (12.527/2011), LRF (LC 101/2000), LGPD (13.709/2018),
-- Lei Governo Digital (14.129/2021), Lei 13.460/2017, Lei 14.133/2021, eMAG 3.1
-- Isolamento Multitenant: institution_id = public.get_current_user_institution_id()
-- ============================================================================

-- Garante funções auxiliares de resolução segura de tenant
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS TEXT AS $$
DECLARE
  v_inst_id TEXT;
BEGIN
  v_inst_id := COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'institution_id', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'institution_id', '')
  );
  IF v_inst_id IS NOT NULL THEN
    RETURN v_inst_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    SELECT institution_id INTO v_inst_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    IF v_inst_id IS NOT NULL AND v_inst_id <> '' THEN
      RETURN v_inst_id;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
    SELECT institution_id INTO v_inst_id
    FROM public.admin_users
    WHERE id = auth.uid()::text OR email = (auth.jwt() ->> 'email')
    LIMIT 1;
    IF v_inst_id IS NOT NULL AND v_inst_id <> '' THEN
      RETURN v_inst_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função de mascaramento automático de CPF (LGPD) preservando CNPJ
CREATE OR REPLACE FUNCTION public.mask_cpf_cnpj(p_doc TEXT)
RETURNS TEXT AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_doc IS NULL OR btrim(p_doc) = '' THEN
    RETURN NULL;
  END IF;
  v_digits := regexp_replace(p_doc, '[^0-9]', '', 'g');
  IF length(v_digits) = 11 THEN
    RETURN '***.' || substr(v_digits, 4, 3) || '.' || substr(v_digits, 7, 3) || '-**';
  END IF;
  RETURN p_doc;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 1. TRILHA DE AUDITORIA GLOBAL IMUTÁVEL (public.system_audit_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT,
  user_id UUID,
  user_name TEXT,
  ip_address TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'PUBLISH')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_inst_created
  ON public.system_audit_logs (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_table_record
  ON public.system_audit_logs (table_name, record_id);

-- Bloqueio absoluto de UPDATE e DELETE na tabela de auditoria
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'system_audit_logs is immutable: % operations are forbidden', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_audit_logs_immutable ON public.system_audit_logs;
CREATE TRIGGER trg_system_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.system_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_audit_logs_tenant_select" ON public.system_audit_logs;
CREATE POLICY "system_audit_logs_tenant_select" ON public.system_audit_logs
  FOR SELECT TO authenticated
  USING (
    institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "system_audit_logs_insert_authenticated" ON public.system_audit_logs;
CREATE POLICY "system_audit_logs_insert_authenticated" ON public.system_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );

-- Trigger genérica de auditoria
CREATE OR REPLACE FUNCTION public.fn_record_system_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_action TEXT := TG_OP;
  v_inst_id TEXT := NULL;
  v_record_id TEXT := '';
  v_user_name TEXT := NULL;
  v_ip TEXT := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_inst_id := v_old ->> 'institution_id';
    v_record_id := COALESCE(v_old ->> 'id', '');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_inst_id := v_new ->> 'institution_id';
    v_record_id := COALESCE(v_new ->> 'id', '');
    IF COALESCE(v_new ->> 'status', '') = 'published' THEN
      v_action := 'PUBLISH';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_inst_id := COALESCE(v_new ->> 'institution_id', v_old ->> 'institution_id');
    v_record_id := COALESCE(v_new ->> 'id', v_old ->> 'id', '');
    IF COALESCE(v_old ->> 'status', '') <> 'published' AND COALESCE(v_new ->> 'status', '') = 'published' THEN
      v_action := 'PUBLISH';
    END IF;
  END IF;

  v_user_name := COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    NULLIF(auth.jwt() ->> 'email', ''),
    'Sistema / Anônimo'
  );

  BEGIN
    v_ip := NULLIF(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  INSERT INTO public.system_audit_logs (
    institution_id,
    user_id,
    user_name,
    ip_address,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_inst_id,
    auth.uid(),
    v_user_name,
    v_ip,
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CONFORMIDADE LGPD E DPO (public.institutional_lgpd_config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institutional_lgpd_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT UNIQUE NOT NULL,
  dpo_name TEXT NOT NULL,
  dpo_appointment_act TEXT NOT NULL,
  dpo_email TEXT NOT NULL,
  dpo_phone TEXT,
  dpo_address TEXT,
  privacy_policy_html TEXT,
  terms_of_use_html TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institutional_lgpd_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lgpd_config_public_select" ON public.institutional_lgpd_config;
CREATE POLICY "lgpd_config_public_select" ON public.institutional_lgpd_config
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "lgpd_config_tenant_write" ON public.institutional_lgpd_config;
CREATE POLICY "lgpd_config_tenant_write" ON public.institutional_lgpd_config
  FOR ALL TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

-- ============================================================================
-- 3. ESTRUTURA INSTITUCIONAL, CARTA DE SERVIÇOS E FAQ
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institutional_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  parent_id UUID REFERENCES public.institutional_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  acronym TEXT,
  legal_competencies TEXT,
  secretary_name TEXT,
  secretary_role TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  business_hours TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_departments_inst
  ON public.institutional_departments (institution_id, display_order);

ALTER TABLE public.institutional_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inst_departments_public_select" ON public.institutional_departments;
CREATE POLICY "inst_departments_public_select" ON public.institutional_departments
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "inst_departments_tenant_write" ON public.institutional_departments;
CREATE POLICY "inst_departments_tenant_write" ON public.institutional_departments
  FOR ALL TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.citizen_service_charter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  department_id UUID REFERENCES public.institutional_departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Atendimento Geral',
  target_audience TEXT,
  requirements TEXT,
  required_documents TEXT[] NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_deadline TEXT,
  fees TEXT DEFAULT 'Gratuito',
  service_channels TEXT,
  online_url TEXT,
  satisfaction_yes INTEGER NOT NULL DEFAULT 0,
  satisfaction_no INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_charter_inst
  ON public.citizen_service_charter (institution_id, category);

ALTER TABLE public.citizen_service_charter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_charter_public_select" ON public.citizen_service_charter;
CREATE POLICY "service_charter_public_select" ON public.citizen_service_charter
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "service_charter_tenant_write" ON public.citizen_service_charter;
CREATE POLICY "service_charter_tenant_write" ON public.citizen_service_charter
  FOR ALL TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

-- RPC segura para contabilizar avaliação de satisfação da Carta de Serviços
CREATE OR REPLACE FUNCTION public.vote_service_charter_satisfaction(
  p_service_id UUID,
  p_useful BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  IF p_useful THEN
    UPDATE public.citizen_service_charter
    SET satisfaction_yes = satisfaction_yes + 1
    WHERE id = p_service_id AND is_published = true;
  ELSE
    UPDATE public.citizen_service_charter
    SET satisfaction_no = satisfaction_no + 1
    WHERE id = p_service_id AND is_published = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.vote_service_charter_satisfaction(UUID, BOOLEAN) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.institutional_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  views_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_faqs_inst
  ON public.institutional_faqs (institution_id, category);

ALTER TABLE public.institutional_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inst_faqs_public_select" ON public.institutional_faqs;
CREATE POLICY "inst_faqs_public_select" ON public.institutional_faqs
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "inst_faqs_tenant_write" ON public.institutional_faqs;
CREATE POLICY "inst_faqs_tenant_write" ON public.institutional_faqs
  FOR ALL TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

-- ============================================================================
-- 4. TRANSPARÊNCIA ATIVA, SÉRIE HISTÓRICA E NÃO OCORRÊNCIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transparency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  module_key TEXT NOT NULL CHECK (
    module_key IN (
      'revenues', 'expenses', 'fiscal_reports',
      'biddings', 'contracts', 'public_works',
      'payroll', 'per_diems', 'interns', 'outsourced',
      'agreements', 'amendments', 'sectoral', 'councils'
    )
  ),
  fiscal_year INTEGER NOT NULL,
  record_date DATE,
  department_name TEXT,
  process_number TEXT,
  creditor_or_subject TEXT,
  document_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  amount_planned NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_executed NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  is_published BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transparency_records_lookup
  ON public.transparency_records (institution_id, module_key, fiscal_year, record_date DESC);

ALTER TABLE public.transparency_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transparency_records_public_select" ON public.transparency_records;
CREATE POLICY "transparency_records_public_select" ON public.transparency_records
  FOR SELECT TO anon, authenticated
  USING (
    (is_published = true AND status = 'published')
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "transparency_records_tenant_write" ON public.transparency_records;
CREATE POLICY "transparency_records_tenant_write" ON public.transparency_records
  FOR ALL TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

-- View pública com mascaramento automático de CPF (LGPD)
CREATE OR REPLACE VIEW public.v_public_transparency_records AS
SELECT
  id,
  institution_id,
  module_key,
  fiscal_year,
  record_date,
  department_name,
  process_number,
  creditor_or_subject,
  public.mask_cpf_cnpj(document_number) AS document_number,
  title,
  description,
  amount_planned,
  amount_executed,
  status,
  metadata,
  file_url,
  created_at
FROM public.transparency_records
WHERE is_published = true AND status = 'published';

GRANT SELECT ON public.v_public_transparency_records TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.transparency_non_occurrence_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  module_key TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  justification TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_role TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_non_occurrence_lookup
  ON public.transparency_non_occurrence_declarations (institution_id, module_key, fiscal_year);

ALTER TABLE public.transparency_non_occurrence_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "non_occurrence_public_select" ON public.transparency_non_occurrence_declarations;
CREATE POLICY "non_occurrence_public_select" ON public.transparency_non_occurrence_declarations
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "non_occurrence_tenant_write" ON public.transparency_non_occurrence_declarations;
CREATE POLICY "non_occurrence_tenant_write" ON public.transparency_non_occurrence_declarations
  FOR ALL TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

-- ============================================================================
-- 5. TRANSPARÊNCIA PASSIVA: e-SIC COM RECURSOS & OUVIDORIA ANÔNIMA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.esic_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  protocol_number TEXT UNIQUE NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  requester_document TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'prorrogado', 'respondido', 'indeferido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '20 days'),
  extended_due_date TIMESTAMPTZ,
  extension_justification TEXT,
  response_text TEXT,
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_esic_requests_inst_protocol
  ON public.esic_requests (institution_id, protocol_number, created_at DESC);

ALTER TABLE public.esic_requests ENABLE ROW LEVEL SECURITY;

-- Cidadão pode protocolar pedido sem login
DROP POLICY IF EXISTS "esic_requests_anon_insert" ON public.esic_requests;
CREATE POLICY "esic_requests_anon_insert" ON public.esic_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (institution_id IS NOT NULL AND length(btrim(protocol_number)) >= 6);

-- Servidores da instituição gerenciam pedidos
DROP POLICY IF EXISTS "esic_requests_tenant_select" ON public.esic_requests;
CREATE POLICY "esic_requests_tenant_select" ON public.esic_requests
  FOR SELECT TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "esic_requests_tenant_update" ON public.esic_requests;
CREATE POLICY "esic_requests_tenant_update" ON public.esic_requests
  FOR UPDATE TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.esic_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  request_id UUID NOT NULL REFERENCES public.esic_requests(id) ON DELETE CASCADE,
  instance_level INTEGER NOT NULL CHECK (instance_level IN (1, 2)),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'deferido', 'indeferido')),
  decision_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_esic_appeals_request
  ON public.esic_appeals (request_id, instance_level);

ALTER TABLE public.esic_appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esic_appeals_anon_insert" ON public.esic_appeals;
CREATE POLICY "esic_appeals_anon_insert" ON public.esic_appeals
  FOR INSERT TO anon, authenticated
  WITH CHECK (request_id IS NOT NULL AND length(btrim(reason)) >= 5);

DROP POLICY IF EXISTS "esic_appeals_tenant_select" ON public.esic_appeals;
CREATE POLICY "esic_appeals_tenant_select" ON public.esic_appeals
  FOR SELECT TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "esic_appeals_tenant_update" ON public.esic_appeals;
CREATE POLICY "esic_appeals_tenant_update" ON public.esic_appeals
  FOR UPDATE TO authenticated
  USING (institution_id = public.get_current_user_institution_id() OR public.is_super_admin())
  WITH CHECK (institution_id = public.get_current_user_institution_id() OR public.is_super_admin());

-- RPC segura para acompanhamento por protocolo (sem expor CPF/e-mail completo a terceiros)
CREATE OR REPLACE FUNCTION public.lookup_esic_protocol(
  p_institution_id TEXT,
  p_protocol_number TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_req RECORD;
  v_appeals JSONB;
BEGIN
  SELECT
    id, institution_id, protocol_number, subject, description, status,
    created_at, due_date, extended_due_date, extension_justification,
    response_text, responded_at,
    public.mask_cpf_cnpj(requester_document) AS masked_document
  INTO v_req
  FROM public.esic_requests
  WHERE institution_id = p_institution_id
    AND upper(protocol_number) = upper(btrim(p_protocol_number))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'instance_level', instance_level,
      'reason', reason,
      'status', status,
      'decision_text', decision_text,
      'created_at', created_at,
      'decided_at', decided_at
    ) ORDER BY instance_level ASC, created_at ASC
  ), '[]'::jsonb)
  INTO v_appeals
  FROM public.esic_appeals
  WHERE request_id = v_req.id;

  RETURN jsonb_build_object(
    'request', to_jsonb(v_req),
    'appeals', v_appeals
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.lookup_esic_protocol(TEXT, TEXT) TO anon, authenticated;

-- RPC estatística anual pública do e-SIC (LAI)
CREATE OR REPLACE FUNCTION public.get_esic_annual_stats(
  p_institution_id TEXT,
  p_year INTEGER
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'respondido', COUNT(*) FILTER (WHERE status = 'respondido'),
      'em_analise', COUNT(*) FILTER (WHERE status IN ('aberto', 'em_analise')),
      'prorrogado', COUNT(*) FILTER (WHERE status = 'prorrogado'),
      'indeferido', COUNT(*) FILTER (WHERE status = 'indeferido')
    )
    FROM public.esic_requests
    WHERE institution_id = p_institution_id
      AND EXTRACT(YEAR FROM created_at) = p_year
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_esic_annual_stats(TEXT, INTEGER) TO anon, authenticated;

-- Garante inserção anônima real na Ouvidoria (sem exigir login ou CPF)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ouvidoria_manifestacoes') THEN
    ALTER TABLE public.ouvidoria_manifestacoes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "ouvidoria_anon_insert" ON public.ouvidoria_manifestacoes;
    CREATE POLICY "ouvidoria_anon_insert" ON public.ouvidoria_manifestacoes
      FOR INSERT TO anon, authenticated
      WITH CHECK (institution_id IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- 6. APLICAÇÃO DA TRIGGER DE AUDITORIA IMUTÁVEL NAS TABELAS CRÍTICAS
-- ============================================================================
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'transparency_records',
    'transparency_non_occurrence_declarations',
    'esic_requests',
    'esic_appeals',
    'institutional_departments',
    'citizen_service_charter',
    'institutional_lgpd_config',
    'institutional_faqs',
    'municipal_laws',
    'municipal_news',
    'official_gazette_editions',
    'official_gazette_acts',
    'contracts'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', v_table, v_table);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_record_system_audit_log()',
        v_table, v_table
      );
    END IF;
  END LOOP;
END $$;
