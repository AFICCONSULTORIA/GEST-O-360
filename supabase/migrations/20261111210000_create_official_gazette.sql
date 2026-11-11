-- ============================================================================
-- Diário Oficial Eletrônico do Município (Edições, Atos Oficiais & Auditoria)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.official_gazette_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  edition_number TEXT NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  edition_type TEXT NOT NULL DEFAULT 'Ordinária',
  publication_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  verification_code TEXT NOT NULL,
  signed_by TEXT DEFAULT '',
  signed_role TEXT DEFAULT '',
  published_at TIMESTAMPTZ,
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gazette_editions_inst_status_date
  ON public.official_gazette_editions (institution_id, status, publication_date DESC, sequence_number DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gazette_editions_verification_code
  ON public.official_gazette_editions (verification_code);

CREATE TABLE IF NOT EXISTS public.official_gazette_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES public.official_gazette_editions(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Decreto',
  department TEXT DEFAULT '',
  act_number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gazette_acts_inst_edition
  ON public.official_gazette_acts (institution_id, edition_id, order_index ASC, created_at DESC);

ALTER TABLE public.official_gazette_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_gazette_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "official_gazette_editions_policy" ON public.official_gazette_editions;
CREATE POLICY "official_gazette_editions_policy" ON public.official_gazette_editions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "official_gazette_acts_policy" ON public.official_gazette_acts;
CREATE POLICY "official_gazette_acts_policy" ON public.official_gazette_acts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Bucket público para PDFs assinados das edições e atos do Diário Oficial
INSERT INTO storage.buckets (id, name, public)
VALUES ('diario_oficial', 'diario_oficial', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "diario_oficial_public_all" ON storage.objects;
CREATE POLICY "diario_oficial_public_all" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'diario_oficial')
  WITH CHECK (bucket_id = 'diario_oficial');

