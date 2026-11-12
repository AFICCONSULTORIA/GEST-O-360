-- ============================================================================
-- Correção & Padronização dos Portais Públicos (Notícias + Leis + Instituições)
-- Compatibiliza `institution_id` como TEXT (ex: 'inst_1' ou UUID) para publicar
-- diretamente na nuvem para toda a população.
-- ============================================================================

-- 1. Garante que a prefeitura padrão ativa exista em public.institutions
INSERT INTO public.institutions (id, name, subdomain, logo_url)
VALUES (
  'inst_1',
  'Prefeitura Municipal de Torixoréu',
  'torixoreu',
  'https://www.torixoreu.mt.gov.br/images/logoHeadernovo.png'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela oficial de Notícias Municipais (institution_id TEXT)
CREATE TABLE IF NOT EXISTS public.municipal_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  subtitle TEXT,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Nota Oficial',
  department TEXT,
  author_name TEXT,
  cover_image_url TEXT,
  gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  project_status TEXT,
  project_budget NUMERIC,
  status TEXT NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'municipal_news'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.municipal_news', pol.policyname);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'municipal_news' AND column_name = 'institution_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.municipal_news DROP CONSTRAINT IF EXISTS municipal_news_institution_id_fkey;
    ALTER TABLE public.municipal_news ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_municipal_news_inst_status_pub
  ON public.municipal_news (institution_id, status, published_at DESC);

ALTER TABLE public.municipal_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipal_news_open_policy" ON public.municipal_news
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Tabela oficial de Leis Municipais (converte institution_id de UUID para TEXT)
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'municipal_laws'
  ) THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'municipal_laws'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.municipal_laws', pol.policyname);
    END LOOP;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'municipal_laws' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.municipal_laws DROP CONSTRAINT IF EXISTS municipal_laws_institution_id_fkey;
      ALTER TABLE public.municipal_laws ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;
  END IF;
END $$;

ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS origin_power TEXT DEFAULT 'executivo';
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS compiled_text TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS is_compiled BOOLEAN DEFAULT false;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS materia_numero TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS materia_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS parent_law_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS parent_law_number TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS parent_law_title TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS revoked_by_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS revoked_by_number TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS publish_on_site BOOLEAN DEFAULT true;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS site_featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_municipal_laws_inst_pub
  ON public.municipal_laws (institution_id, publish_on_site, site_featured, publication_date DESC);

ALTER TABLE public.municipal_laws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "municipal_laws_open_policy" ON public.municipal_laws;
CREATE POLICY "municipal_laws_open_policy" ON public.municipal_laws
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Buckets públicos de armazenamento para capas de notícias ('certidoes') e PDFs de leis ('leis')
INSERT INTO storage.buckets (id, name, public)
VALUES ('certidoes', 'certidoes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "certidoes_public_all" ON storage.objects;
CREATE POLICY "certidoes_public_all" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'certidoes')
  WITH CHECK (bucket_id = 'certidoes');

INSERT INTO storage.buckets (id, name, public)
VALUES ('leis', 'leis', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "leis_public_all" ON storage.objects;
CREATE POLICY "leis_public_all" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'leis')
  WITH CHECK (bucket_id = 'leis');

