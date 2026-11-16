-- ============================================================================
-- MIGRAÇÃO: MÓDULO DE E-MAIL INSTITUCIONAL & WEBMAIL INTEGRADO (.gov.br)
-- Data: 2026-11-16
-- Descrição: Cria as tabelas multi-tenant para gestão de domínios/DNS,
--            caixas postais por secretaria/servidor e mensagens do Webmail
--            integrado ao Site Institucional no Gestão 360.
-- ============================================================================

-- 1. Domínios e Configuração de Provedor / DNS por Prefeitura
CREATE TABLE IF NOT EXISTS public.institutional_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  mx_verified BOOLEAN NOT NULL DEFAULT false,
  spf_verified BOOLEAN NOT NULL DEFAULT false,
  dkim_verified BOOLEAN NOT NULL DEFAULT false,
  dmarc_verified BOOLEAN NOT NULL DEFAULT false,
  dkim_selector TEXT NOT NULL DEFAULT 'gestao360._domainkey',
  dkim_public_key TEXT DEFAULT 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
  provider_type TEXT NOT NULL DEFAULT 'simulated' CHECK (provider_type IN ('simulated', 'resend', 'supabase_edge', 'smtp_imap')),
  provider_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_inst_email_domains_inst
  ON public.institutional_email_domains (institution_id);

-- 2. Contas de E-mail, Aliases e Caixas de Secretarias
CREATE TABLE IF NOT EXISTS public.institutional_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  domain_id UUID REFERENCES public.institutional_email_domains(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'mailbox' CHECK (account_type IN ('mailbox', 'alias', 'secretariat')),
  department_name TEXT,
  assigned_user_id TEXT,
  assigned_user_name TEXT,
  forward_to TEXT,
  quota_mb INTEGER NOT NULL DEFAULT 5120,
  used_mb NUMERIC(10, 2) NOT NULL DEFAULT 0,
  signature_html TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, email_address)
);

CREATE INDEX IF NOT EXISTS idx_inst_email_accounts_inst
  ON public.institutional_email_accounts (institution_id, status);

-- 3. Mensagens do Webmail Integrado (Inbox, Enviados, Rascunhos, Arquivo, Lixeira)
CREATE TABLE IF NOT EXISTS public.institutional_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  account_id UUID REFERENCES public.institutional_email_accounts(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'archive', 'trash')),
  from_address TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT '',
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL DEFAULT '(Sem assunto)',
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  thread_id TEXT,
  external_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'simulated' CHECK (delivery_status IN ('delivered', 'sent', 'queued', 'simulated', 'failed')),
  delivery_provider TEXT DEFAULT 'simulated',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_email_messages_account_folder
  ON public.institutional_email_messages (institution_id, account_id, folder, sent_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Isolamento Multi-Tenant
-- ============================================================================

ALTER TABLE public.institutional_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_email_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Domains policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institutional_email_domains' AND policyname = 'inst_email_domains_tenant_all'
  ) THEN
    CREATE POLICY inst_email_domains_tenant_all
      ON public.institutional_email_domains
      FOR ALL
      USING (
        institution_id = COALESCE(auth.jwt() ->> 'institution_id', auth.jwt() ->> 'municipio_id', institution_id)
      )
      WITH CHECK (
        institution_id = COALESCE(auth.jwt() ->> 'institution_id', auth.jwt() ->> 'municipio_id', institution_id)
      );
  END IF;

  -- Accounts policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institutional_email_accounts' AND policyname = 'inst_email_accounts_tenant_all'
  ) THEN
    CREATE POLICY inst_email_accounts_tenant_all
      ON public.institutional_email_accounts
      FOR ALL
      USING (
        institution_id = COALESCE(auth.jwt() ->> 'institution_id', auth.jwt() ->> 'municipio_id', institution_id)
      )
      WITH CHECK (
        institution_id = COALESCE(auth.jwt() ->> 'institution_id', auth.jwt() ->> 'municipio_id', institution_id)
      );
  END IF;

  -- Messages policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'institutional_email_messages' AND policyname = 'inst_email_messages_tenant_all'
  ) THEN
    CREATE POLICY inst_email_messages_tenant_all
      ON public.institutional_email_messages
      FOR ALL
      USING (
        institution_id = COALESCE(auth.jwt() ->> 'institution_id', auth.jwt() ->> 'municipio_id', institution_id)
      )
      WITH CHECK (
        institution_id = COALESCE(auth.jwt() ->> 'institution_id', auth.jwt() ->> 'municipio_id', institution_id)
      );
  END IF;
END $$;
