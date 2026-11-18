-- ====================================================================
-- MIGRAÇÃO INCREMENTAL: COLUNAS DE DUAS ETAPAS E ASSINATURA DO SECRETÁRIO
-- Versão: 20261118010000_declaration_two_stage_columns.sql
-- ====================================================================

ALTER TABLE public.education_certificate_templates
    ADD COLUMN IF NOT EXISTS document_kind TEXT NOT NULL DEFAULT 'certificado',
    ADD COLUMN IF NOT EXISTS secretary_signature_url TEXT;

ALTER TABLE public.education_declaration_campaigns
    ADD COLUMN IF NOT EXISTS require_morning_checkin BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS secretary_signature_url TEXT;

ALTER TABLE public.education_declaration_submissions
    ADD COLUMN IF NOT EXISTS morning_checkin_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS afternoon_checkin_at TIMESTAMPTZ;

ALTER TABLE public.education_declaration_submissions
    ALTER COLUMN rating DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_declaration_campaigns TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_declaration_submissions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.education_certificate_templates TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.education_issued_certificates TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
