-- ============================================================================
-- Blindagem de Segurança (RLS) para Portais Públicos, Diário Oficial e Storage
-- Remove permissões de escrita anônima e restringe gravações/edições a usuários
-- autenticados da respectiva prefeitura (institution_id) ou Super Admin.
-- ============================================================================

-- 1. Funções auxiliares de resolução segura de tenant e privilégio Super Admin
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

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'Super Admin' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE (id = auth.uid()::text OR email = (auth.jwt() ->> 'email'))
        AND role = 'Super Admin'
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Notícias Municipais (public.municipal_news)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_news') THEN
    ALTER TABLE public.municipal_news ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "municipal_news_open_policy" ON public.municipal_news;
    DROP POLICY IF EXISTS "municipal_news_public_select" ON public.municipal_news;
    DROP POLICY IF EXISTS "municipal_news_tenant_write" ON public.municipal_news;
    DROP POLICY IF EXISTS "municipal_news_tenant_insert" ON public.municipal_news;
    DROP POLICY IF EXISTS "municipal_news_tenant_update" ON public.municipal_news;
    DROP POLICY IF EXISTS "municipal_news_tenant_delete" ON public.municipal_news;

    CREATE POLICY "municipal_news_public_select" ON public.municipal_news
      FOR SELECT
      TO anon, authenticated
      USING (
        status = 'published'
        OR institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "municipal_news_tenant_insert" ON public.municipal_news
      FOR INSERT
      TO authenticated
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "municipal_news_tenant_update" ON public.municipal_news
      FOR UPDATE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      )
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "municipal_news_tenant_delete" ON public.municipal_news
      FOR DELETE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );
  END IF;
END $$;

-- 3. Leis Municipais (public.municipal_laws)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_laws') THEN
    ALTER TABLE public.municipal_laws ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "municipal_laws_open_policy" ON public.municipal_laws;
    DROP POLICY IF EXISTS "Leitura de leis municipais" ON public.municipal_laws;
    DROP POLICY IF EXISTS "Gestao de leis municipais por instituicao" ON public.municipal_laws;
    DROP POLICY IF EXISTS "municipal_laws_public_select" ON public.municipal_laws;
    DROP POLICY IF EXISTS "municipal_laws_tenant_insert" ON public.municipal_laws;
    DROP POLICY IF EXISTS "municipal_laws_tenant_update" ON public.municipal_laws;
    DROP POLICY IF EXISTS "municipal_laws_tenant_delete" ON public.municipal_laws;

    CREATE POLICY "municipal_laws_public_select" ON public.municipal_laws
      FOR SELECT
      TO anon, authenticated
      USING (
        COALESCE(publish_on_site, true) = true
        OR institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "municipal_laws_tenant_insert" ON public.municipal_laws
      FOR INSERT
      TO authenticated
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "municipal_laws_tenant_update" ON public.municipal_laws
      FOR UPDATE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      )
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "municipal_laws_tenant_delete" ON public.municipal_laws
      FOR DELETE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );
  END IF;
END $$;

-- 4. Diário Oficial Eletrônico (Edições e Atos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'official_gazette_editions') THEN
    ALTER TABLE public.official_gazette_editions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "official_gazette_editions_policy" ON public.official_gazette_editions;
    DROP POLICY IF EXISTS "gazette_editions_public_select" ON public.official_gazette_editions;
    DROP POLICY IF EXISTS "gazette_editions_tenant_insert" ON public.official_gazette_editions;
    DROP POLICY IF EXISTS "gazette_editions_tenant_update" ON public.official_gazette_editions;
    DROP POLICY IF EXISTS "gazette_editions_tenant_delete" ON public.official_gazette_editions;

    CREATE POLICY "gazette_editions_public_select" ON public.official_gazette_editions
      FOR SELECT
      TO anon, authenticated
      USING (
        status = 'published'
        OR institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "gazette_editions_tenant_insert" ON public.official_gazette_editions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "gazette_editions_tenant_update" ON public.official_gazette_editions
      FOR UPDATE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      )
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "gazette_editions_tenant_delete" ON public.official_gazette_editions
      FOR DELETE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'official_gazette_acts') THEN
    ALTER TABLE public.official_gazette_acts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "official_gazette_acts_policy" ON public.official_gazette_acts;
    DROP POLICY IF EXISTS "gazette_acts_public_select" ON public.official_gazette_acts;
    DROP POLICY IF EXISTS "gazette_acts_tenant_insert" ON public.official_gazette_acts;
    DROP POLICY IF EXISTS "gazette_acts_tenant_update" ON public.official_gazette_acts;
    DROP POLICY IF EXISTS "gazette_acts_tenant_delete" ON public.official_gazette_acts;

    CREATE POLICY "gazette_acts_public_select" ON public.official_gazette_acts
      FOR SELECT
      TO anon, authenticated
      USING (
        status = 'published'
        OR institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "gazette_acts_tenant_insert" ON public.official_gazette_acts
      FOR INSERT
      TO authenticated
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "gazette_acts_tenant_update" ON public.official_gazette_acts
      FOR UPDATE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      )
      WITH CHECK (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );

    CREATE POLICY "gazette_acts_tenant_delete" ON public.official_gazette_acts
      FOR DELETE
      TO authenticated
      USING (
        institution_id = public.get_current_user_institution_id()
        OR public.is_super_admin()
      );
  END IF;
END $$;

-- 5. Storage Buckets: leitura pública para cidadãos, escrita exclusiva de servidores autenticados
DROP POLICY IF EXISTS "certidoes_public_all" ON storage.objects;
DROP POLICY IF EXISTS "leis_public_all" ON storage.objects;
DROP POLICY IF EXISTS "diario_oficial_public_all" ON storage.objects;
DROP POLICY IF EXISTS "portal_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "portal_assets_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "portal_assets_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "portal_assets_authenticated_delete" ON storage.objects;

CREATE POLICY "portal_assets_public_read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('certidoes', 'leis', 'diario_oficial'));

CREATE POLICY "portal_assets_authenticated_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('certidoes', 'leis', 'diario_oficial')
    AND (public.get_current_user_institution_id() IS NOT NULL OR public.is_super_admin())
  );

CREATE POLICY "portal_assets_authenticated_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('certidoes', 'leis', 'diario_oficial')
    AND (public.get_current_user_institution_id() IS NOT NULL OR public.is_super_admin())
  )
  WITH CHECK (
    bucket_id IN ('certidoes', 'leis', 'diario_oficial')
    AND (public.get_current_user_institution_id() IS NOT NULL OR public.is_super_admin())
  );

CREATE POLICY "portal_assets_authenticated_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('certidoes', 'leis', 'diario_oficial')
    AND (public.get_current_user_institution_id() IS NOT NULL OR public.is_super_admin())
  );

