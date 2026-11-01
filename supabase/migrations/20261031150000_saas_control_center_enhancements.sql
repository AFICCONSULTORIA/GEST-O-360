-- ====================================================================
-- MIGRAÇÃO DE GOVERNANÇA E CONTROLE SAAS (GESTÃO 360 SUPERADMIN)
-- Versão: 20261031150000
-- ====================================================================

-- 1. EXTENSÃO DA TABELA DE INSTITUIÇÕES (PREFEITURAS / TENANTS)
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'implantacao', 'suspenso', 'cancelado')),
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'pro' CHECK (plan_tier IN ('starter', 'pro', 'enterprise', 'custom')),
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'MT',
ADD COLUMN IF NOT EXISTS ibge_code TEXT,
ADD COLUMN IF NOT EXISTS contract_start DATE,
ADD COLUMN IF NOT EXISTS contract_end DATE,
ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['home', 'settings', 'support', 'controls', 'patrimonio', 'education', 'saude', 'financas', 'pntp', 'laws'],
ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Índice para busca rápida de subdomínio e status
CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);
CREATE INDEX IF NOT EXISTS idx_institutions_subdomain ON public.institutions(subdomain);

-- 2. TABELA DE AUDITORIA GLOBAL DA PLATAFORMA (PLATFORM AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  actor_id TEXT,
  actor_email TEXT,
  actor_name TEXT,
  action TEXT NOT NULL, -- 'CREATE_TENANT', 'UPDATE_TENANT', 'SUSPEND_TENANT', 'CHANGE_MODULES', 'CREATE_USER', 'RESET_PASSWORD', 'DELETE_USER'
  target_type TEXT NOT NULL, -- 'institution', 'user', 'module', 'system'
  target_id TEXT,
  target_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON public.platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_target ON public.platform_audit_logs(target_type, target_id);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas Super Admin gerencia platform audit logs" ON public.platform_audit_logs;
CREATE POLICY "Apenas Super Admin gerencia platform audit logs" ON public.platform_audit_logs
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- 3. TABELA DE COMUNICADOS GLOBAIS AOS MUNICÍPIOS (PLATFORM ANNOUNCEMENTS)
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
  target_institutions TEXT[] DEFAULT ARRAY[]::TEXT[], -- Vazio = Todos os municípios
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_active ON public.platform_announcements(is_active, valid_until);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de comunicados para prefeituras" ON public.platform_announcements;
CREATE POLICY "Leitura de comunicados para prefeituras" ON public.platform_announcements
  FOR SELECT
  USING (
    is_active = true 
    AND (valid_until IS NULL OR valid_until > now())
  );

DROP POLICY IF EXISTS "Super Admin gerencia comunicados" ON public.platform_announcements;
CREATE POLICY "Super Admin gerencia comunicados" ON public.platform_announcements
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

-- 4. HABILITAÇÃO DE REALTIME PARA AUDITORIA E COMUNICADOS
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_announcements;

