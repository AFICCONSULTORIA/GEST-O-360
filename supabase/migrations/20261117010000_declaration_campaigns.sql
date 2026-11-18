-- ====================================================================
-- MIGRAÇÃO: EMISSOR DE DECLARAÇÕES DE PARTICIPAÇÃO VIA QR CODE
-- Versão: 20261117010000_declaration_campaigns.sql
-- ====================================================================

-- 1. DIFERENCIAÇÃO DE TIPO DE DOCUMENTO NOS TEMPLATES E CERTIFICADOS
ALTER TABLE public.education_certificate_templates
    ADD COLUMN IF NOT EXISTS document_kind TEXT NOT NULL DEFAULT 'certificado',
    ADD COLUMN IF NOT EXISTS secretary_signature_url TEXT;

ALTER TABLE public.education_issued_certificates
    ADD COLUMN IF NOT EXISTS document_kind TEXT NOT NULL DEFAULT 'certificado';

-- 2. TABELA DE CAMPANHAS / EVENTOS DE DECLARAÇÃO VIA QR CODE
CREATE TABLE IF NOT EXISTS public.education_declaration_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    template_id UUID REFERENCES public.education_certificate_templates(id) ON DELETE SET NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'evento',
    workload_hours INTEGER NOT NULL DEFAULT 4,
    event_date_start DATE NOT NULL,
    event_date_end DATE,
    location TEXT,
    issuer_name TEXT NOT NULL,
    issuer_role TEXT NOT NULL DEFAULT 'Secretário(a) Municipal',
    secretariat_name TEXT,
    secretary_signature_url TEXT,
    preset_theme TEXT NOT NULL DEFAULT 'classico_azul',
    sender_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    require_morning_checkin BOOLEAN NOT NULL DEFAULT true,
    submissions_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edu_decl_campaigns_inst
    ON public.education_declaration_campaigns(institution_id);

CREATE INDEX IF NOT EXISTS idx_edu_decl_campaigns_slug
    ON public.education_declaration_campaigns(slug);

-- Referência opcional da campanha no certificado/declaração emitido
ALTER TABLE public.education_issued_certificates
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.education_declaration_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_edu_issued_cert_campaign
    ON public.education_issued_certificates(campaign_id);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.education_declaration_campaigns ENABLE ROW LEVEL SECURITY;

-- Leitura pública para que participantes escaneando o QR Code possam abrir o formulário sem login
DROP POLICY IF EXISTS "Leitura publica campanhas declaracao" ON public.education_declaration_campaigns;
CREATE POLICY "Leitura publica campanhas declaracao"
    ON public.education_declaration_campaigns
    FOR SELECT
    USING (true);

-- Gerenciamento pelos usuários do sistema
DROP POLICY IF EXISTS "Gerenciamento campanhas declaracao" ON public.education_declaration_campaigns;
CREATE POLICY "Gerenciamento campanhas declaracao"
    ON public.education_declaration_campaigns
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. TABELA DE COLETAS DE PARTICIPAÇÃO & AVALIAÇÃO DO EVENTO (PARA EMISSÃO POSTERIOR)
CREATE TABLE IF NOT EXISTS public.education_declaration_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    campaign_id UUID NOT NULL REFERENCES public.education_declaration_campaigns(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    participant_cpf TEXT NOT NULL,
    participant_email TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    morning_checkin_at TIMESTAMPTZ,
    afternoon_checkin_at TIMESTAMPTZ,
    emission_status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'emitido'
    issued_certificate_id UUID REFERENCES public.education_issued_certificates(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_decl_sub_unique_cpf
    ON public.education_declaration_submissions(campaign_id, participant_cpf);

CREATE INDEX IF NOT EXISTS idx_edu_decl_sub_campaign
    ON public.education_declaration_submissions(campaign_id);

CREATE INDEX IF NOT EXISTS idx_edu_decl_sub_inst
    ON public.education_declaration_submissions(institution_id);

ALTER TABLE public.education_declaration_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso coletas declaracao" ON public.education_declaration_submissions;
CREATE POLICY "Acesso coletas declaracao"
    ON public.education_declaration_submissions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Permissões explícitas para acesso público via QR Code (anon) e usuários logados (authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_declaration_campaigns TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_declaration_submissions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.education_certificate_templates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.education_issued_certificates TO anon, authenticated, service_role;

-- Garante adição das colunas caso as tabelas já tenham sido criadas em versão anterior
ALTER TABLE public.education_declaration_campaigns
    ADD COLUMN IF NOT EXISTS require_morning_checkin BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS secretary_signature_url TEXT;

ALTER TABLE public.education_declaration_submissions
    ADD COLUMN IF NOT EXISTS morning_checkin_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS afternoon_checkin_at TIMESTAMPTZ;

ALTER TABLE public.education_declaration_submissions
    ALTER COLUMN rating DROP NOT NULL;

-- Atualiza o schema cache do PostgREST/Supabase imediatamente
NOTIFY pgrst, 'reload schema';
