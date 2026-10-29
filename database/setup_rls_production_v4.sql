-- ============================================================================
-- MIGRAÇÃO FASE 4: SEGURANÇA AVANÇADA RLS MULTI-TENANT (GESTÃO 360)
-- ============================================================================
-- Este script substitui as políticas genéricas USING (true) por isolamento
-- real entre prefeituras no banco de dados Supabase, vinculando o acesso
-- ao e-mail autenticado no JWT (auth.jwt() ->> 'email') e à tabela admin_users.
-- ============================================================================

-- 1. Funções auxiliares de segurança (SECURITY DEFINER) para leitura rápida do vínculo municipal
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin', false)
    OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'aficconsultoria@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.admin_users u
      WHERE LOWER(u.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
        AND u.role = 'Super Admin'
        AND u.status = 'Ativo'
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_institution_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT u.institution_id
  FROM public.admin_users u
  WHERE LOWER(u.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    AND u.status = 'Ativo'
  LIMIT 1;
$$;

-- ============================================================================
-- 2. POLÍTICAS PARA TABELAS INTERNAS DAS PREFEITURAS
--    (Leitura e escrita restritas aos servidores da própria prefeitura ou Super Admin)
-- ============================================================================

-- 2.1. Tabela: patrimonio
ALTER TABLE public.patrimonio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on patrimonio" ON public.patrimonio;
DROP POLICY IF EXISTS "Allow patrimonio based on institution" ON public.patrimonio;
DROP POLICY IF EXISTS "Tenant isolation on patrimonio" ON public.patrimonio;

CREATE POLICY "Tenant isolation on patrimonio" ON public.patrimonio
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  );

-- 2.2. Tabela: company_certificates (Banco de Certidões)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_certificates') THEN
    EXECUTE 'ALTER TABLE public.company_certificates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on company_certificates" ON public.company_certificates';
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation on company_certificates" ON public.company_certificates';
    EXECUTE $pol$
      CREATE POLICY "Tenant isolation on company_certificates" ON public.company_certificates
        FOR ALL
        TO authenticated
        USING (
          public.is_super_admin()
          OR institution_id = public.current_user_institution_id()
        )
        WITH CHECK (
          public.is_super_admin()
          OR institution_id = public.current_user_institution_id()
        )
    $pol$;
  END IF;
END $$;

-- 2.3. Tabela: contracts (Licitações & Contratos - Lei 14.133/2021)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    EXECUTE 'ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on contracts" ON public.contracts';
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation on contracts" ON public.contracts';
    EXECUTE $pol$
      CREATE POLICY "Tenant isolation on contracts" ON public.contracts
        FOR ALL
        TO authenticated
        USING (
          public.is_super_admin()
          OR institution_id = public.current_user_institution_id()
        )
        WITH CHECK (
          public.is_super_admin()
          OR institution_id = public.current_user_institution_id()
        )
    $pol$;
  END IF;
END $$;

-- 2.4. Tabela: controls (Controle Interno)
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on controls" ON public.controls;
DROP POLICY IF EXISTS "Allow controls based on institution" ON public.controls;
DROP POLICY IF EXISTS "Tenant isolation on controls" ON public.controls;

CREATE POLICY "Tenant isolation on controls" ON public.controls
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  );

-- 2.5. Tabela: orders (Pedidos e Compras)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow orders based on institution" ON public.orders;
DROP POLICY IF EXISTS "Tenant isolation on orders" ON public.orders;

CREATE POLICY "Tenant isolation on orders" ON public.orders
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  );

-- 2.6. Tabela: documents (Numeração Oficial de Documentos)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow documents based on institution" ON public.documents;
DROP POLICY IF EXISTS "Tenant isolation on documents" ON public.documents;

CREATE POLICY "Tenant isolation on documents" ON public.documents
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  );

-- 2.7. Tabela: admin_users (Servidores e Permissões)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Tenant isolation on admin_users" ON public.admin_users;

CREATE POLICY "Tenant isolation on admin_users" ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    OR institution_id = public.current_user_institution_id()
  );

CREATE POLICY "Tenant write on admin_users" ON public.admin_users
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR institution_id = public.current_user_institution_id()
  );

-- ============================================================================
-- 3. TABELAS COM LEITURA PÚBLICA (PORTAL DA PREFEITURA) E ESCRITA RESTRITA
-- ============================================================================

-- 3.1. Tabela: institutions (Leitura pública para carregar subdomínio/brasão; escrita restrita à prefeitura/Super Admin)
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read institutions" ON public.institutions;
DROP POLICY IF EXISTS "Tenant update institutions" ON public.institutions;

CREATE POLICY "Public read institutions" ON public.institutions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Tenant update institutions" ON public.institutions
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = public.current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR id = public.current_user_institution_id()
  );

