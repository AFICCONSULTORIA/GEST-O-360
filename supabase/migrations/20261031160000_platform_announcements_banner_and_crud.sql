-- ====================================================================
-- MIGRAÇÃO: PLATFORM ANNOUNCEMENTS COM BANNER DE LOGIN E SUPORTE A CRUD
-- Versão: 20261031160000
-- ====================================================================

-- 1. ADICIONA NOVAS COLUNAS NA TABELA platform_announcements
ALTER TABLE public.platform_announcements
ADD COLUMN IF NOT EXISTS show_login_banner BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logo-gestao360.png',
ADD COLUMN IF NOT EXISTS action_label TEXT,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. ÍNDICES DE PERFORMANCE PARA BUSCA DE COMUNICADOS NO LOGIN
CREATE INDEX IF NOT EXISTS idx_platform_announcements_login_banner 
ON public.platform_announcements(is_active, show_login_banner, valid_until);

-- 3. POLÍTICAS DE RLS
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- Política de leitura geral para usuários autenticados (ou anônimos durante verificação)
DROP POLICY IF EXISTS "Leitura de comunicados para prefeituras" ON public.platform_announcements;
CREATE POLICY "Leitura de comunicados para prefeituras" ON public.platform_announcements
  FOR SELECT
  USING (
    is_active = true 
    AND (valid_until IS NULL OR valid_until > now())
  );

-- Super Admin tem acesso irrestrito para Criar, Atualizar, Deletar e Ler
DROP POLICY IF EXISTS "Super Admin gerencia comunicados" ON public.platform_announcements;
CREATE POLICY "Super Admin gerencia comunicados" ON public.platform_announcements
  FOR ALL
  USING (
    public.is_super_admin()
  )
  WITH CHECK (
    public.is_super_admin()
  );

