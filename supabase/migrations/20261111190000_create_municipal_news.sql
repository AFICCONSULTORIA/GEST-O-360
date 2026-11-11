-- ============================================================================
-- Tabela Oficial de Notícias & Obras do Município (Portal Institucional + Imprensa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.municipal_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_municipal_news_inst_status_pub
  ON public.municipal_news (institution_id, status, published_at DESC);

ALTER TABLE public.municipal_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "municipal_news_public_read" ON public.municipal_news;
DROP POLICY IF EXISTS "municipal_news_open_policy" ON public.municipal_news;

CREATE POLICY "municipal_news_open_policy" ON public.municipal_news
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Bucket público para capas e galerias de notícias
INSERT INTO storage.buckets (id, name, public)
VALUES ('certidoes', 'certidoes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "certidoes_public_all" ON storage.objects;
CREATE POLICY "certidoes_public_all" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'certidoes')
  WITH CHECK (bucket_id = 'certidoes');

