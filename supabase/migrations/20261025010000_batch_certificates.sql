-- ====================================================================
-- MIGRAÇÃO: EMISSOR EM LOTE E BANCO DE CERTIFICADOS (MÓDULO EDUCAÇÃO)
-- Versão: 20261025010000_batch_certificates.sql
-- ====================================================================

-- 1. TABELA DE MODELOS DE CERTIFICADO (TEMPLATES)
CREATE TABLE IF NOT EXISTS public.education_certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'curso', -- 'curso', 'palestra', 'formacao', 'oficina'
    workload_hours INTEGER NOT NULL,
    event_date_start DATE NOT NULL,
    event_date_end DATE,
    issuer_name TEXT NOT NULL, -- Nome do Secretário / Coordenador
    issuer_role TEXT NOT NULL, -- Cargo / Função
    background_mode TEXT NOT NULL DEFAULT 'preset', -- 'preset' ou 'custom_upload'
    preset_theme TEXT DEFAULT 'classico_azul', -- 'classico_azul', 'verde_institucional', 'elegante_dourado'
    custom_background_url TEXT, -- Imagem enviada pelo usuário via upload
    program_content TEXT, -- Conteúdo programático (verso do documento)
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edu_cert_templates_inst ON public.education_certificate_templates(institution_id);

-- 2. TABELA DE CERTIFICADOS EMITIDOS
CREATE TABLE IF NOT EXISTS public.education_issued_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES public.education_certificate_templates(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_document TEXT NOT NULL, -- CPF ou Matrícula
    recipient_email TEXT,
    recipient_role TEXT DEFAULT 'participante', -- 'participante', 'palestrante', 'monitor'
    validation_hash TEXT NOT NULL UNIQUE, -- Ex: CERT-2026-X7Y9Z1
    qr_code_url TEXT NOT NULL, -- URL pública de verificação
    download_count INTEGER DEFAULT 1,
    last_download_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'valido', -- 'valido', 'revogado'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edu_issued_cert_inst ON public.education_issued_certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_edu_issued_cert_tmpl ON public.education_issued_certificates(template_id);
CREATE INDEX IF NOT EXISTS idx_edu_issued_cert_hash ON public.education_issued_certificates(validation_hash);
CREATE INDEX IF NOT EXISTS idx_edu_issued_cert_doc ON public.education_issued_certificates(recipient_document);

-- 3. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.education_certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_issued_certificates ENABLE ROW LEVEL SECURITY;

-- Políticas para Templates
DROP POLICY IF EXISTS "Acesso templates certificados" ON public.education_certificate_templates;
CREATE POLICY "Acesso templates certificados" ON public.education_certificate_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Políticas para Certificados Emitidos
-- Leitura pública para conferência de autenticidade (usado na página /validar-documento)
DROP POLICY IF EXISTS "Leitura publica de certificados para validacao" ON public.education_issued_certificates;
CREATE POLICY "Leitura publica de certificados para validacao" ON public.education_issued_certificates
    FOR SELECT
    USING (true);

-- Gerenciamento de certificados
DROP POLICY IF EXISTS "Gerenciamento de certificados emitidos" ON public.education_issued_certificates;
CREATE POLICY "Gerenciamento de certificados emitidos" ON public.education_issued_certificates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. BUCKET DE ARMAZENAMENTO NO SUPABASE STORAGE (education-certificates)
INSERT INTO storage.buckets (id, name, public)
VALUES ('education-certificates', 'education-certificates', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Acesso público arquivos education-certificates" ON storage.objects;
CREATE POLICY "Acesso público arquivos education-certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'education-certificates');

DROP POLICY IF EXISTS "Upload arquivos education-certificates" ON storage.objects;
CREATE POLICY "Upload arquivos education-certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'education-certificates');

DROP POLICY IF EXISTS "Atualizacao arquivos education-certificates" ON storage.objects;
CREATE POLICY "Atualizacao arquivos education-certificates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'education-certificates');

DROP POLICY IF EXISTS "Remocao arquivos education-certificates" ON storage.objects;
CREATE POLICY "Remocao arquivos education-certificates"
ON storage.objects FOR DELETE
USING (bucket_id = 'education-certificates');

