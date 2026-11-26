-- ==============================================================================
-- MIGRAÇÃO FASE 2A: BLINDAGEM DE RLS, GRANTS A ANON E FUNÇÕES SECURITY DEFINER
-- Versão: 20261126020000
-- Objetivo:
--   1. Eliminar escrita aberta (USING/WITH CHECK true para anon/PUBLIC) em todas
--      as tabelas operacionais e sensíveis (`whatsapp_*`, `education_*`,
--      `municipal_salary_*`, `agent_workstation_events`, `creche_settings`).
--   2. Manter em `ouvidoria_manifestacoes`, `education_declaration_submissions` e
--      `edu_voting_votes` apenas INSERT público estritamente validado por coluna/
--      tamanho/elegibilidade (sem `WITH CHECK (true)` solto e SEM leitura pública
--      de votos ou dados pessoais de terceiros).
--   3. Habilitar RLS e criar políticas nas tabelas de Eleição Escolar (`edu_voting_*`).
--   4. Restringir leitura pública (`USING (true)`) exclusivamente ao que é público
--      por transparência legal confirmada (Planos de Cargos e Vencimentos — LAI
--      Lei 12.527/2011 e PNTP/ATRICON — e configurações públicas da Fila CMEI).
--   5. Fixar `SET search_path = public, pg_temp`, `REVOKE ALL ... FROM PUBLIC` em
--      todas as funções `SECURITY DEFINER`, revogar `anon` de funções administrativas
--      e aplicar rate limit contra enumeração nas RPCs de portais públicos.
-- ==============================================================================

-- ==============================================================================
-- 1. INFRAESTRUTURA DE RATE LIMITING PARA RPCS PÚBLICAS (ANTI-ENUMERAÇÃO CPF)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.security_rpc_rate_limits (
  bucket TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, subject_hash)
);

ALTER TABLE public.security_rpc_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_rpc_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_public_rpc_rate_limit(
  p_bucket TEXT,
  p_subject TEXT,
  p_max_attempts INTEGER DEFAULT 15,
  p_window_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_client_ip TEXT := COALESCE(
    NULLIF(trim((COALESCE(current_setting('request.headers', true), '{}')::jsonb ->> 'x-forwarded-for')), ''),
    'local'
  );
  v_subject_key TEXT := md5(COALESCE(p_bucket, '') || ':' || v_client_ip || ':' || COALESCE(p_subject, ''));
  v_row public.security_rpc_rate_limits;
BEGIN
  SELECT * INTO v_row
  FROM public.security_rpc_rate_limits
  WHERE bucket = p_bucket AND subject_hash = v_subject_key
  FOR UPDATE;

  IF NOT FOUND OR v_row.window_start + make_interval(secs => p_window_seconds) <= v_now THEN
    INSERT INTO public.security_rpc_rate_limits (bucket, subject_hash, window_start, attempt_count)
    VALUES (p_bucket, v_subject_key, v_now, 1)
    ON CONFLICT (bucket, subject_hash)
    DO UPDATE SET window_start = v_now, attempt_count = 1;
    RETURN true;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  UPDATE public.security_rpc_rate_limits
  SET attempt_count = attempt_count + 1
  WHERE bucket = p_bucket AND subject_hash = v_subject_key;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_public_rpc_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 2. GARANTIR COLUNA institution_id EM TABELAS QUE AINDA NÃO A POSSUÍAM
-- ==============================================================================
ALTER TABLE IF EXISTS public.whatsapp_instances ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.whatsapp_templates ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.whatsapp_logs ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.whatsapp_settings ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE IF EXISTS public.education_intervention_plans ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.education_teacher_trainings ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.education_proficiencies ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.education_teachers ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE IF EXISTS public.creche_settings ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

ALTER TABLE IF EXISTS public.edu_voting_schools ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_voting_elections ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_voting_candidates ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_voting_votes ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_voting_voters ADD COLUMN IF NOT EXISTS institution_id TEXT NOT NULL DEFAULT 'inst_1';

-- ==============================================================================
-- 3. FECHAMENTO DE POLÍTICAS DE ESCRITA E LEITURA ABERTAS POR DOMÍNIO
-- ==============================================================================

-- 3.1 WhatsApp (credenciais, instâncias, templates e logs — estritamente por tenant)
REVOKE ALL ON TABLE public.whatsapp_instances FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.whatsapp_templates FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.whatsapp_logs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.whatsapp_settings FROM PUBLIC, anon;

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_tenant_strict" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_tenant_strict"
  ON public.whatsapp_instances FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Enable all access for templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "whatsapp_templates_tenant_strict" ON public.whatsapp_templates;
CREATE POLICY "whatsapp_templates_tenant_strict"
  ON public.whatsapp_templates FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Enable all access for logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_tenant_strict" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_tenant_strict"
  ON public.whatsapp_logs FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Enable all access for settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "whatsapp_settings_tenant_strict" ON public.whatsapp_settings;
CREATE POLICY "whatsapp_settings_tenant_strict"
  ON public.whatsapp_settings FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- 3.2 Escritório Vivo de Agentes (`agent_workstation_events` — telemetria interna por tenant)
REVOKE ALL ON TABLE public.agent_workstation_events FROM PUBLIC, anon;
ALTER TABLE public.agent_workstation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura irrestrita de eventos do escritório para usuários autenticados" ON public.agent_workstation_events;
DROP POLICY IF EXISTS "Inserção de eventos do escritório por serviços e clientes" ON public.agent_workstation_events;
DROP POLICY IF EXISTS "Atualização e resolução de eventos por administradores" ON public.agent_workstation_events;
DROP POLICY IF EXISTS "agent_workstation_events_tenant_strict" ON public.agent_workstation_events;

CREATE POLICY "agent_workstation_events_tenant_strict"
  ON public.agent_workstation_events FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- 3.3 Educação Pedagógica e Docente (`education_intervention_plans`, `education_teacher_trainings`, `education_proficiencies`, `education_teachers`)
REVOKE ALL ON TABLE public.education_intervention_plans FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.education_teacher_trainings FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.education_proficiencies FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.education_teachers FROM PUBLIC, anon;

ALTER TABLE public.education_intervention_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_teacher_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_proficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de planos de intervencao" ON public.education_intervention_plans;
DROP POLICY IF EXISTS "Permitir gerenciamento de planos de intervencao" ON public.education_intervention_plans;
DROP POLICY IF EXISTS "education_intervention_plans_tenant_strict" ON public.education_intervention_plans;
CREATE POLICY "education_intervention_plans_tenant_strict"
  ON public.education_intervention_plans FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Permitir leitura de treinamentos docentes" ON public.education_teacher_trainings;
DROP POLICY IF EXISTS "Permitir gerenciamento de treinamentos docentes" ON public.education_teacher_trainings;
DROP POLICY IF EXISTS "education_teacher_trainings_tenant_strict" ON public.education_teacher_trainings;
CREATE POLICY "education_teacher_trainings_tenant_strict"
  ON public.education_teacher_trainings FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Permitir leitura de proficiencias" ON public.education_proficiencies;
DROP POLICY IF EXISTS "Permitir gerenciamento de proficiencias" ON public.education_proficiencies;
DROP POLICY IF EXISTS "education_proficiencies_tenant_strict" ON public.education_proficiencies;
CREATE POLICY "education_proficiencies_tenant_strict"
  ON public.education_proficiencies FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Permitir leitura de professores" ON public.education_teachers;
DROP POLICY IF EXISTS "Permitir gerenciamento de professores" ON public.education_teachers;
DROP POLICY IF EXISTS "education_teachers_tenant_strict" ON public.education_teachers;
CREATE POLICY "education_teachers_tenant_strict"
  ON public.education_teachers FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- 3.4 Certificados e Campanhas de Declaração (`education_certificate_templates`, `education_issued_certificates`, `education_declaration_campaigns`, `education_declaration_submissions`)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.education_certificate_templates FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.education_issued_certificates FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.education_declaration_campaigns FROM PUBLIC, anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.education_declaration_submissions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.education_certificate_templates TO anon, authenticated;
GRANT SELECT ON TABLE public.education_issued_certificates TO anon, authenticated;
GRANT SELECT ON TABLE public.education_declaration_campaigns TO anon, authenticated;
GRANT INSERT ON TABLE public.education_declaration_submissions TO anon, authenticated;

ALTER TABLE public.education_certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_declaration_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_declaration_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso templates certificados" ON public.education_certificate_templates;
DROP POLICY IF EXISTS "education_certificate_templates_public_verify_select" ON public.education_certificate_templates;
DROP POLICY IF EXISTS "education_certificate_templates_tenant_write" ON public.education_certificate_templates;

-- Templates só são lidos por anon quando vinculados a campanha ativa ou certificado válido em conferência pública
CREATE POLICY "education_certificate_templates_public_verify_select"
  ON public.education_certificate_templates FOR SELECT TO anon, authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
    OR EXISTS (
      SELECT 1 FROM public.education_declaration_campaigns c
      WHERE c.template_id = education_certificate_templates.id AND c.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.education_issued_certificates ic
      WHERE ic.template_id = education_certificate_templates.id AND COALESCE(ic.status, 'valido') = 'valido'
    )
  );

CREATE POLICY "education_certificate_templates_tenant_write"
  ON public.education_certificate_templates FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Leitura publica de certificados para validacao" ON public.education_issued_certificates;
DROP POLICY IF EXISTS "Gerenciamento de certificados emitidos" ON public.education_issued_certificates;
DROP POLICY IF EXISTS "education_issued_certificates_public_valid_select" ON public.education_issued_certificates;
DROP POLICY IF EXISTS "education_issued_certificates_tenant_write" ON public.education_issued_certificates;

-- Justificativa legal: conferência pública de autenticidade de certificados oficiais por QR Code (Lei 14.063/2020)
CREATE POLICY "education_issued_certificates_public_valid_select"
  ON public.education_issued_certificates FOR SELECT TO anon, authenticated
  USING (
    COALESCE(status, 'valido') = 'valido'
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "education_issued_certificates_tenant_write"
  ON public.education_issued_certificates FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Leitura publica campanhas declaracao" ON public.education_declaration_campaigns;
DROP POLICY IF EXISTS "Gerenciamento campanhas declaracao" ON public.education_declaration_campaigns;
DROP POLICY IF EXISTS "education_declaration_campaigns_active_select" ON public.education_declaration_campaigns;
DROP POLICY IF EXISTS "education_declaration_campaigns_tenant_write" ON public.education_declaration_campaigns;

CREATE POLICY "education_declaration_campaigns_active_select"
  ON public.education_declaration_campaigns FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "education_declaration_campaigns_tenant_write"
  ON public.education_declaration_campaigns FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Acesso coletas declaracao" ON public.education_declaration_submissions;
DROP POLICY IF EXISTS "education_declaration_submissions_tenant_all" ON public.education_declaration_submissions;
DROP POLICY IF EXISTS "education_declaration_submissions_citizen_checkin" ON public.education_declaration_submissions;

CREATE POLICY "education_declaration_submissions_tenant_all"
  ON public.education_declaration_submissions FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- Participante externo via QR Code só pode INSERIR (nunca ler lista de CPFs/e-mails) em campanha ativa com dados válidos
CREATE POLICY "education_declaration_submissions_citizen_checkin"
  ON public.education_declaration_submissions FOR INSERT TO anon
  WITH CHECK (
    length(trim(COALESCE(participant_name, ''))) BETWEEN 2 AND 160
    AND length(regexp_replace(COALESCE(participant_cpf, ''), '\D', '', 'g')) = 11
    AND length(trim(COALESCE(participant_email, ''))) BETWEEN 5 AND 180
    AND COALESCE(emission_status, 'pendente') = 'pendente'
    AND EXISTS (
      SELECT 1 FROM public.education_declaration_campaigns c
      WHERE c.id = education_declaration_submissions.campaign_id
        AND c.is_active = true
        AND c.institution_id = education_declaration_submissions.institution_id
    )
  );

-- 3.5 Tabelas Salariais Municipais (`municipal_salary_*`)
-- JUSTIFICATIVA DE LEITURA PÚBLICA: Transparência Ativa obrigatória de Planos de Cargos,
-- Carreiras e Vencimentos (Lei de Acesso à Informação nº 12.527/2011 e Resolução ATRICON/PNTP).
-- Escrita (INSERT/UPDATE/DELETE) bloqueada para `anon` e restrita ao tenant autenticado.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.municipal_salary_laws FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.municipal_salary_tables FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.municipal_salary_entries FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.municipal_salary_laws TO anon, authenticated;
GRANT SELECT ON TABLE public.municipal_salary_tables TO anon, authenticated;
GRANT SELECT ON TABLE public.municipal_salary_entries TO anon, authenticated;

DROP POLICY IF EXISTS "Acesso tabelas vencimentos leis" ON public.municipal_salary_laws;
DROP POLICY IF EXISTS "municipal_salary_laws_public_transparency_select" ON public.municipal_salary_laws;
DROP POLICY IF EXISTS "municipal_salary_laws_tenant_write" ON public.municipal_salary_laws;

CREATE POLICY "municipal_salary_laws_public_transparency_select"
  ON public.municipal_salary_laws FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "municipal_salary_laws_tenant_write"
  ON public.municipal_salary_laws FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Acesso tabelas vencimentos cargos" ON public.municipal_salary_tables;
DROP POLICY IF EXISTS "municipal_salary_tables_public_transparency_select" ON public.municipal_salary_tables;
DROP POLICY IF EXISTS "municipal_salary_tables_tenant_write" ON public.municipal_salary_tables;

CREATE POLICY "municipal_salary_tables_public_transparency_select"
  ON public.municipal_salary_tables FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.municipal_salary_laws l
      WHERE l.id = municipal_salary_tables.law_id AND l.is_active = true
    )
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "municipal_salary_tables_tenant_write"
  ON public.municipal_salary_tables FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

DROP POLICY IF EXISTS "Acesso tabelas vencimentos valores" ON public.municipal_salary_entries;
DROP POLICY IF EXISTS "municipal_salary_entries_public_transparency_select" ON public.municipal_salary_entries;
DROP POLICY IF EXISTS "municipal_salary_entries_tenant_write" ON public.municipal_salary_entries;

CREATE POLICY "municipal_salary_entries_public_transparency_select"
  ON public.municipal_salary_entries FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.municipal_salary_tables t
      JOIN public.municipal_salary_laws l ON l.id = t.law_id
      WHERE t.id = municipal_salary_entries.salary_table_id AND l.is_active = true
    )
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "municipal_salary_entries_tenant_write"
  ON public.municipal_salary_entries FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- 3.6 Configurações Públicas da Fila CMEI (`creche_settings`)
-- JUSTIFICATIVA DE LEITURA PÚBLICA: Portal Público de Transparência de Vagas em Creche (TAC-MP / ECA).
DROP POLICY IF EXISTS "Allow public read access to creche_settings" ON public.creche_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update creche_settings" ON public.creche_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert creche_settings" ON public.creche_settings;
DROP POLICY IF EXISTS "creche_settings_public_transparency_select" ON public.creche_settings;
DROP POLICY IF EXISTS "creche_settings_tenant_write" ON public.creche_settings;

CREATE POLICY "creche_settings_public_transparency_select"
  ON public.creche_settings FOR SELECT TO anon, authenticated
  USING (is_open IN (true, false));

CREATE POLICY "creche_settings_tenant_write"
  ON public.creche_settings FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- 3.7 Ouvidoria Municipal (`ouvidoria_manifestacoes` — Lei nº 13.460/2017)
-- Mantém exclusivamente INSERT para o cidadão, validando colunas e tamanhos máximos (sem `true` solto).
DROP POLICY IF EXISTS "Inserir manifestacao cidadao" ON public.ouvidoria_manifestacoes;
CREATE POLICY "Inserir manifestacao cidadao"
  ON public.ouvidoria_manifestacoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    protocolo IS NOT NULL
    AND length(trim(protocolo)) BETWEEN 4 AND 40
    AND assunto IS NOT NULL
    AND length(trim(assunto)) BETWEEN 2 AND 200
    AND descricao IS NOT NULL
    AND length(trim(descricao)) BETWEEN 5 AND 5000
    AND length(COALESCE(cidadao_nome, '')) <= 160
    AND length(COALESCE(cidadao_email, '')) <= 180
    AND COALESCE(status, 'registrada') IN ('registrada', 'aberta', 'pendente', 'em_analise')
  );

-- ==============================================================================
-- 4. ELEIÇÃO ESCOLAR (`edu_voting_*`) — HABILITAÇÃO DE RLS E SIGILO DO VOTO
-- ==============================================================================
ALTER TABLE public.edu_voting_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_voters ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.edu_voting_schools FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.edu_voting_elections FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.edu_voting_candidates FROM PUBLIC, anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.edu_voting_votes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.edu_voting_voters FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.edu_voting_schools TO anon, authenticated;
GRANT SELECT ON TABLE public.edu_voting_elections TO anon, authenticated;
GRANT SELECT ON TABLE public.edu_voting_candidates TO anon, authenticated;
GRANT INSERT ON TABLE public.edu_voting_votes TO anon, authenticated;

-- Escolas: leitura pública apenas de unidades com votação aberta; gestão por tenant
DROP POLICY IF EXISTS "edu_voting_schools_public_open_select" ON public.edu_voting_schools;
DROP POLICY IF EXISTS "edu_voting_schools_tenant_write" ON public.edu_voting_schools;

CREATE POLICY "edu_voting_schools_public_open_select"
  ON public.edu_voting_schools FOR SELECT TO anon, authenticated
  USING (
    COALESCE(voting_status, 'open') = 'open'
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "edu_voting_schools_tenant_write"
  ON public.edu_voting_schools FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- Eleições: leitura pública do pleito ativo; gestão por tenant
DROP POLICY IF EXISTS "edu_voting_elections_public_open_select" ON public.edu_voting_elections;
DROP POLICY IF EXISTS "edu_voting_elections_tenant_write" ON public.edu_voting_elections;

CREATE POLICY "edu_voting_elections_public_open_select"
  ON public.edu_voting_elections FOR SELECT TO anon, authenticated
  USING (
    COALESCE(status, 'open') = 'open'
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "edu_voting_elections_tenant_write"
  ON public.edu_voting_elections FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- Candidatos: leitura pública apenas de chapas ativas; gestão por tenant
DROP POLICY IF EXISTS "edu_voting_candidates_public_active_select" ON public.edu_voting_candidates;
DROP POLICY IF EXISTS "edu_voting_candidates_tenant_write" ON public.edu_voting_candidates;

CREATE POLICY "edu_voting_candidates_public_active_select"
  ON public.edu_voting_candidates FOR SELECT TO anon, authenticated
  USING (
    COALESCE(active, true) = true
    OR public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

CREATE POLICY "edu_voting_candidates_tenant_write"
  ON public.edu_voting_candidates FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- Votos: NENHUMA leitura pública (garante sigilo absoluto de quem votou em quem).
-- Eleitor anônimo só pode INSERIR voto elegível em eleição e escola abertas (unicidade por CPF via uq_edu_vote_election_cpf).
DROP POLICY IF EXISTS "edu_voting_votes_tenant_admin" ON public.edu_voting_votes;
DROP POLICY IF EXISTS "edu_voting_votes_eligible_ballot_insert" ON public.edu_voting_votes;

CREATE POLICY "edu_voting_votes_tenant_admin"
  ON public.edu_voting_votes FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

CREATE POLICY "edu_voting_votes_eligible_ballot_insert"
  ON public.edu_voting_votes FOR INSERT TO anon
  WITH CHECK (
    length(regexp_replace(COALESCE(voter_cpf_clean, ''), '\D', '', 'g')) = 11
    AND regexp_replace(COALESCE(voter_cpf_clean, ''), '\D', '', 'g') !~ '^0+$'
    AND length(trim(COALESCE(candidate_id, ''))) BETWEEN 1 AND 120
    AND length(trim(COALESCE(receipt_code, ''))) BETWEEN 4 AND 80
    AND EXISTS (
      SELECT 1 FROM public.edu_voting_elections e
      WHERE e.id = edu_voting_votes.election_id AND COALESCE(e.status, 'open') = 'open'
    )
    AND EXISTS (
      SELECT 1 FROM public.edu_voting_schools s
      WHERE s.id = edu_voting_votes.school_id AND COALESCE(s.voting_status, 'open') = 'open'
    )
  );

-- Base de Eleitores (`edu_voting_voters`): fechada por tenant (urna usa exclusivamente lookup_voting_voter_by_cpf)
DROP POLICY IF EXISTS "Permitir leitura de eleitores autenticados" ON public.edu_voting_voters;
DROP POLICY IF EXISTS "Permitir gerenciamento de eleitores autenticados" ON public.edu_voting_voters;
DROP POLICY IF EXISTS "edu_voting_voters_tenant_strict" ON public.edu_voting_voters;

CREATE POLICY "edu_voting_voters_tenant_strict"
  ON public.edu_voting_voters FOR ALL TO authenticated
  USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
  WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

-- ==============================================================================
-- 5. HARDENING DE FUNÇÕES SECURITY DEFINER (search_path, REVOKE PUBLIC/anon, AUTH)
-- ==============================================================================

-- 5.1 Funções auxiliares de sessão/tenant e triggers: REVOKE PUBLIC/anon explícito
REVOKE ALL ON FUNCTION public.get_current_user_institution_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_institution_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_user_institution_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_institution_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_current_user_institution_uuid() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_institution_uuid() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.rpc_delete_fuel_order(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_delete_fuel_order(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rpc_clear_all_fuel_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_clear_all_fuel_orders() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ingest_bus_tracker_telemetry(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_bus_tracker_telemetry(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated, service_role;

-- 5.2 Funções administrativas/autenticadas da Educação: saem de `anon`, fixam `search_path` e validam `auth.uid()` + `institution_id`
CREATE OR REPLACE FUNCTION public.admin_register_teacher(
  p_name TEXT,
  p_email TEXT,
  p_cpf TEXT DEFAULT NULL,
  p_registration_number TEXT DEFAULT NULL,
  p_assigned_classes TEXT[] DEFAULT '{}',
  p_assigned_subjects TEXT[] DEFAULT '{}',
  p_created_by UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'ativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_inst TEXT := public.get_current_user_institution_id();
  v_clean_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_teacher_record public.education_teachers;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para cadastrar professores.';
  END IF;

  IF NOT public.is_super_admin() AND v_inst IS NULL THEN
    RAISE EXCEPTION 'Usuário sem instituição vinculada.';
  END IF;

  IF v_clean_email = '' OR trim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Nome e e-mail do professor são obrigatórios.';
  END IF;

  INSERT INTO public.education_teachers (
    institution_id, name, email, cpf, registration_number,
    assigned_classes, assigned_subjects, created_by, status
  )
  VALUES (
    COALESCE(v_inst, 'inst_1'),
    trim(p_name),
    v_clean_email,
    NULLIF(trim(COALESCE(p_cpf, '')), ''),
    NULLIF(trim(COALESCE(p_registration_number, '')), ''),
    COALESCE(p_assigned_classes, '{}'),
    COALESCE(p_assigned_subjects, '{}'),
    v_caller_uid,
    COALESCE(p_status, 'ativo')
  )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    cpf = COALESCE(EXCLUDED.cpf, public.education_teachers.cpf),
    registration_number = COALESCE(EXCLUDED.registration_number, public.education_teachers.registration_number),
    assigned_classes = EXCLUDED.assigned_classes,
    assigned_subjects = EXCLUDED.assigned_subjects,
    status = EXCLUDED.status
  WHERE public.is_super_admin() OR public.education_teachers.institution_id = v_inst
  RETURNING * INTO v_teacher_record;

  IF v_teacher_record.id IS NULL THEN
    RAISE EXCEPTION 'Conflito de e-mail docente com outra instituição.';
  END IF;

  RETURN to_jsonb(v_teacher_record) - 'cpf';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_register_teacher(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_register_teacher(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_proficiencies_batch(p_records JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_inst TEXT := public.get_current_user_institution_id();
  v_item JSONB;
  v_inserted_count INTEGER := 0;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para lançar proficiências.';
  END IF;

  IF NOT public.is_super_admin() AND v_inst IS NULL THEN
    RAISE EXCEPTION 'Usuário sem instituição vinculada.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_records, '[]'::jsonb))
  LOOP
    INSERT INTO public.education_proficiencies (
      institution_id, enrollment_id, student_id, subject, bimester,
      proficiency_level, descriptive_opinion, teacher_id, updated_at
    )
    VALUES (
      COALESCE(v_inst, 'inst_1'),
      (v_item->>'enrollment_id')::UUID,
      (v_item->>'student_id')::UUID,
      v_item->>'subject',
      (v_item->>'bimester')::INTEGER,
      v_item->>'proficiency_level',
      v_item->>'descriptive_opinion',
      COALESCE((v_item->>'teacher_id')::UUID, v_caller_uid),
      now()
    )
    ON CONFLICT (enrollment_id, subject, bimester) DO UPDATE SET
      proficiency_level = EXCLUDED.proficiency_level,
      descriptive_opinion = EXCLUDED.descriptive_opinion,
      teacher_id = EXCLUDED.teacher_id,
      updated_at = now()
    WHERE public.is_super_admin() OR public.education_proficiencies.institution_id = v_inst;

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'records_count', v_inserted_count);
END;
$$;

REVOKE ALL ON FUNCTION public.save_proficiencies_batch(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_proficiencies_batch(JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_metrics(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_inst TEXT := public.get_current_user_institution_id();
  v_total_students INTEGER := 0;
  v_active_interventions INTEGER := 0;
  v_completed_lessons INTEGER := 0;
  v_pending_quizzes INTEGER := 0;
  v_average_completion_rate NUMERIC := 0;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.';
  END IF;

  IF NOT public.is_super_admin() AND v_inst IS NULL THEN
    RAISE EXCEPTION 'Usuário sem instituição vinculada.';
  END IF;

  SELECT COUNT(*) INTO v_total_students
  FROM public.education_students
  WHERE public.is_super_admin() OR institution_id = v_inst;

  SELECT COUNT(*) INTO v_active_interventions
  FROM public.education_intervention_plans
  WHERE status IN ('em_andamento', 'revisao')
    AND (p_teacher_id IS NULL OR teacher_id = p_teacher_id)
    AND (public.is_super_admin() OR institution_id = v_inst);

  SELECT COUNT(*) INTO v_completed_lessons
  FROM public.education_lesson_progress
  WHERE completed = true
    AND (public.is_super_admin() OR institution_id = v_inst);

  SELECT COUNT(*) INTO v_pending_quizzes
  FROM public.education_quiz_attempts
  WHERE created_at >= (now() - INTERVAL '7 days')
    AND (public.is_super_admin() OR institution_id = v_inst);

  v_average_completion_rate := LEAST(ROUND(GREATEST(v_completed_lessons * 5.5, 0), 1), 100.0);

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'active_interventions', v_active_interventions,
    'average_completion_rate', v_average_completion_rate,
    'pending_quizzes', v_pending_quizzes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_dashboard_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_dashboard_metrics(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_education_lesson(
  p_student_id UUID,
  p_course_id UUID,
  p_lesson_id UUID,
  p_xp_reward INTEGER DEFAULT 15,
  p_coins_reward INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_inst TEXT := public.get_current_user_institution_id();
  v_safe_xp INTEGER := LEAST(GREATEST(COALESCE(p_xp_reward, 15), 0), 100);
  v_safe_coins INTEGER := LEAST(GREATEST(COALESCE(p_coins_reward, 5), 0), 50);
  v_already_completed BOOLEAN;
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para concluir aulas.';
  END IF;

  IF NOT public.is_super_admin() AND v_inst IS NULL THEN
    RAISE EXCEPTION 'Usuário sem instituição vinculada.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.education_lesson_progress
    WHERE student_id = p_student_id AND lesson_id = p_lesson_id AND completed = true
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'earned_xp', 0, 'earned_coins', 0);
  END IF;

  INSERT INTO public.education_lesson_progress (institution_id, student_id, course_id, lesson_id, completed, completed_at)
  VALUES (COALESCE(v_inst, 'inst_1'), p_student_id, p_course_id, p_lesson_id, true, now())
  ON CONFLICT (student_id, lesson_id) DO UPDATE SET completed = true, completed_at = now();

  SELECT last_activity_date, streak_count INTO v_last_activity, v_current_streak
  FROM public.education_students
  WHERE id = p_student_id AND (public.is_super_admin() OR institution_id = v_inst)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aluno não localizado na instituição.');
  END IF;

  IF v_last_activity = CURRENT_DATE THEN
    v_new_streak := GREATEST(COALESCE(v_current_streak, 1), 1);
  ELSIF v_last_activity = CURRENT_DATE - 1 THEN
    v_new_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE public.education_students
  SET xp = COALESCE(xp, 0) + v_safe_xp,
      coins = COALESCE(coins, 0) + v_safe_coins,
      streak_count = v_new_streak,
      last_activity_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_student_id AND (public.is_super_admin() OR institution_id = v_inst);

  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'earned_xp', v_safe_xp,
    'earned_coins', v_safe_coins,
    'streak_count', v_new_streak
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_education_lesson(UUID, UUID, UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_education_lesson(UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_education_quiz(
  p_student_id UUID,
  p_quiz_id UUID,
  p_score NUMERIC,
  p_total_questions INTEGER,
  p_correct_answers INTEGER,
  p_earned_xp INTEGER,
  p_earned_coins INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_inst TEXT := public.get_current_user_institution_id();
  v_passed BOOLEAN := (COALESCE(p_total_questions, 0) > 0 AND (p_correct_answers::numeric / p_total_questions::numeric) >= 0.6);
  v_safe_xp INTEGER := LEAST(GREATEST(COALESCE(p_earned_xp, 0), 0), 150);
  v_safe_coins INTEGER := LEAST(GREATEST(COALESCE(p_earned_coins, 0), 0), 75);
  v_attempt_id UUID;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para enviar avaliações.';
  END IF;

  IF NOT public.is_super_admin() AND v_inst IS NULL THEN
    RAISE EXCEPTION 'Usuário sem instituição vinculada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.education_students
    WHERE id = p_student_id AND (public.is_super_admin() OR institution_id = v_inst)
  ) THEN
    RAISE EXCEPTION 'Aluno não pertence à instituição autenticada.';
  END IF;

  INSERT INTO public.education_quiz_attempts (
    institution_id, student_id, quiz_id, score, total_questions,
    correct_answers, passed, earned_xp, earned_coins, created_at
  )
  VALUES (
    COALESCE(v_inst, 'inst_1'), p_student_id, p_quiz_id, p_score, p_total_questions,
    p_correct_answers, v_passed, v_safe_xp, v_safe_coins, now()
  )
  RETURNING id INTO v_attempt_id;

  IF v_safe_xp > 0 OR v_safe_coins > 0 THEN
    UPDATE public.education_students
    SET xp = COALESCE(xp, 0) + v_safe_xp,
        coins = COALESCE(coins, 0) + v_safe_coins,
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = p_student_id AND (public.is_super_admin() OR institution_id = v_inst);
  END IF;

  RETURN jsonb_build_object('success', true, 'attempt_id', v_attempt_id, 'passed', v_passed);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_education_quiz(UUID, UUID, NUMERIC, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_education_quiz(UUID, UUID, NUMERIC, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated, service_role;

-- 5.3 RPCs de Portais Públicos Justificados: REVOKE PUBLIC + rate limit + campos mínimos LGPD + search_path seguro

CREATE OR REPLACE FUNCTION public.get_family_student_by_cpf_birth(
  p_institution_id TEXT,
  p_cpf TEXT,
  p_birth_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inst TEXT := NULLIF(trim(COALESCE(p_institution_id, '')), '');
  v_clean_cpf TEXT := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_student RECORD;
BEGIN
  IF v_inst IS NULL OR length(v_clean_cpf) <> 11 OR v_clean_cpf ~ '^0+$' OR p_birth_date IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'Informe instituição, CPF válido e data de nascimento.');
  END IF;

  IF NOT public.check_public_rpc_rate_limit('family_cpf_lookup', v_inst || ':' || v_clean_cpf, 8, 300) THEN
    RETURN jsonb_build_object('found', false, 'error', 'Muitas tentativas em sequência. Aguarde 5 minutos.');
  END IF;

  SELECT id, name, class_name, avatar_url, institution_id
  INTO v_student
  FROM public.education_students
  WHERE institution_id = v_inst
    AND regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_clean_cpf
    AND birth_date = p_birth_date
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'found', true,
      'student', jsonb_build_object(
        'id', v_student.id,
        'name', v_student.name,
        'className', v_student.class_name,
        'avatar', v_student.avatar_url,
        'institutionId', v_student.institution_id
      )
    );
  END IF;

  RETURN jsonb_build_object('found', false, 'error', 'Aluno não encontrado com os dados informados.');
END;
$$;

REVOKE ALL ON FUNCTION public.get_family_student_by_cpf_birth(TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_student_by_cpf_birth(TEXT, TEXT, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_family_student_portal_data(
  p_institution_id TEXT,
  p_student_id UUID,
  p_academic_year INTEGER DEFAULT 2026
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inst TEXT := NULLIF(trim(COALESCE(p_institution_id, '')), '');
  v_enrollment RECORD;
  v_grades JSONB;
  v_attendance JSONB;
  v_announcements JSONB;
  v_acks JSONB;
BEGIN
  IF v_inst IS NULL OR p_student_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF NOT public.check_public_rpc_rate_limit('family_portal_data', v_inst || ':' || p_student_id::text, 30, 60) THEN
    RETURN jsonb_build_object('found', false, 'error', 'Limite de consultas excedido.');
  END IF;

  SELECT id, student_id, student_name, school_name, class_name, shift, academic_year, status
  INTO v_enrollment
  FROM public.education_enrollments
  WHERE institution_id = v_inst
    AND (student_id = p_student_id OR id = p_student_id)
    AND academic_year = COALESCE(p_academic_year, 2026)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('subject', g.subject, 'bimester', g.bimester, 'grade', g.grade, 'recovery_grade', g.recovery_grade) ORDER BY g.subject, g.bimester), '[]'::jsonb)
  INTO v_grades
  FROM public.education_grades g
  WHERE g.institution_id = v_inst AND g.enrollment_id = v_enrollment.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', a.date, 'status', a.status) ORDER BY a.date DESC), '[]'::jsonb)
  INTO v_attendance
  FROM public.education_attendance a
  WHERE a.institution_id = v_inst AND a.enrollment_id = v_enrollment.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', ann.id, 'title', ann.title, 'content', ann.content, 'category', ann.category, 'publish_date', ann.publish_date, 'author_name', ann.author_name) ORDER BY ann.publish_date DESC), '[]'::jsonb)
  INTO v_announcements
  FROM public.education_announcements ann
  WHERE ann.institution_id = v_inst
    AND ((ann.target_class IS NULL AND ann.target_student_id IS NULL) OR ann.target_class = v_enrollment.class_name OR ann.target_student_id = v_enrollment.student_id);

  SELECT COALESCE(jsonb_agg(ack.announcement_id), '[]'::jsonb)
  INTO v_acks
  FROM public.education_announcement_acks ack
  WHERE ack.institution_id = v_inst AND ack.student_id = v_enrollment.student_id;

  RETURN jsonb_build_object(
    'found', true,
    'enrollment', to_jsonb(v_enrollment),
    'grades', v_grades,
    'attendance', v_attendance,
    'announcements', v_announcements,
    'acknowledged_ids', v_acks
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_family_student_portal_data(TEXT, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_student_portal_data(TEXT, UUID, INTEGER) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.acknowledge_family_announcement(TEXT, UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_family_announcement(TEXT, UUID, UUID, BOOLEAN) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_family_announcement_acks(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_announcement_acks(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_voting_voter_by_cpf(p_cpf TEXT)
RETURNS TABLE (
  full_name TEXT,
  role_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean TEXT := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
BEGIN
  IF length(v_clean) <> 11 OR v_clean ~ '^0+$' THEN
    RETURN;
  END IF;

  IF NOT public.check_public_rpc_rate_limit('voting_voter_lookup', v_clean, 10, 300) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.full_name, v.role_label
  FROM public.edu_voting_voters v
  WHERE v.cpf_clean = v_clean
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_voting_voter_by_cpf(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_voting_voter_by_cpf(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.parent_lookup_school_transport(
  p_institution_id TEXT,
  p_cpf TEXT,
  p_birth_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_cpf TEXT := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_student RECORD;
  v_route RECORD;
  v_stop RECORD;
  v_trip RECORD;
  v_bus RECORD;
  v_att RECORD;
  v_has_stop BOOLEAN := false;
  v_has_trip BOOLEAN := false;
  v_has_bus BOOLEAN := false;
  v_has_att BOOLEAN := false;
BEGIN
  IF length(v_clean_cpf) <> 11 OR v_clean_cpf ~ '^0+$' OR p_birth_date IS NULL OR NULLIF(trim(COALESCE(p_institution_id, '')), '') IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'Informe um CPF válido e a data de nascimento do aluno.');
  END IF;

  IF NOT public.check_public_rpc_rate_limit('transport_parent_lookup', p_institution_id || ':' || v_clean_cpf, 8, 300) THEN
    RETURN jsonb_build_object('found', false, 'error', 'Muitas tentativas em sequência. Aguarde 5 minutos.');
  END IF;

  SELECT * INTO v_student
  FROM public.school_transport_students
  WHERE institution_id = p_institution_id
    AND active = true
    AND birth_date = p_birth_date
    AND (
      regexp_replace(COALESCE(student_cpf, ''), '\D', '', 'g') = v_clean_cpf
      OR regexp_replace(COALESCE(guardian_cpf, ''), '\D', '', 'g') = v_clean_cpf
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'Nenhum aluno encontrado com os dados informados.');
  END IF;

  SELECT * INTO v_route FROM public.school_transport_routes WHERE id = v_student.route_id;

  IF v_student.stop_id IS NOT NULL THEN
    SELECT * INTO v_stop FROM public.school_transport_stops WHERE id = v_student.stop_id;
    v_has_stop := FOUND;
  END IF;

  SELECT * INTO v_trip
  FROM public.school_transport_trips
  WHERE route_id = v_student.route_id
    AND trip_date = CURRENT_DATE
    AND status IN ('em_andamento', 'finalizada', 'aguardando')
  ORDER BY CASE status WHEN 'em_andamento' THEN 1 WHEN 'aguardando' THEN 2 ELSE 3 END, created_at DESC
  LIMIT 1;
  v_has_trip := FOUND;

  IF v_has_trip THEN
    IF v_trip.bus_id IS NOT NULL THEN
      SELECT * INTO v_bus FROM public.school_transport_buses WHERE id = v_trip.bus_id;
      v_has_bus := FOUND;
    END IF;
    SELECT * INTO v_att FROM public.school_transport_attendance WHERE trip_id = v_trip.id AND student_id = v_student.id LIMIT 1;
    v_has_att := FOUND;
  ELSIF v_route.bus_id IS NOT NULL THEN
    SELECT * INTO v_bus FROM public.school_transport_buses WHERE id = v_route.bus_id;
    v_has_bus := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.student_name,
      'school_name', v_student.school_name,
      'shift', v_student.shift,
      'stop_name', CASE WHEN v_has_stop THEN v_stop.name ELSE 'Ponto não definido' END
    ),
    'route', jsonb_build_object(
      'id', v_route.id,
      'name', v_route.name,
      'code', v_route.code,
      'departure_time', v_route.departure_time,
      'arrival_time', v_route.arrival_time
    ),
    'trip', CASE WHEN v_has_trip THEN jsonb_build_object(
      'id', v_trip.id,
      'direction', v_trip.direction,
      'status', v_trip.status,
      'started_at', v_trip.started_at,
      'ended_at', v_trip.ended_at,
      'delay_minutes', v_trip.delay_minutes,
      'incident_note', v_trip.incident_note
    ) ELSE NULL END,
    'attendance', CASE WHEN v_has_att THEN jsonb_build_object(
      'status', v_att.status,
      'boarded_at', v_att.boarded_at,
      'disembarked_at', v_att.disembarked_at
    ) ELSE NULL END,
    'bus_location', CASE WHEN v_has_trip AND v_trip.status = 'em_andamento' AND v_has_bus THEN jsonb_build_object(
      'prefix', v_bus.prefix,
      'plate', v_bus.plate,
      'lat', COALESCE(v_trip.current_lat, v_bus.last_lat),
      'lng', COALESCE(v_trip.current_lng, v_bus.last_lng),
      'speed_kmh', v_bus.last_speed_kmh,
      'last_signal_at', v_bus.last_signal_at,
      'stop_lat', CASE WHEN v_has_stop THEN v_stop.lat ELSE NULL END,
      'stop_lng', CASE WHEN v_has_stop THEN v_stop.lng ELSE NULL END
    ) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.parent_lookup_school_transport(TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_lookup_school_transport(TEXT, TEXT, DATE) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_get_fuel_order_by_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_get_fuel_order_by_number(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_complete_fuel_order(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_complete_fuel_order(UUID, TEXT, JSONB) TO anon, authenticated;
