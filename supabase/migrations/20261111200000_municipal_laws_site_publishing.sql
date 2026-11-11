-- Migração: Controle de publicação e destaque de Leis Municipais no Site Institucional
-- Data: 2026-11-11

ALTER TABLE public.municipal_laws
  ADD COLUMN IF NOT EXISTS publish_on_site BOOLEAN DEFAULT true;

ALTER TABLE public.municipal_laws
  ADD COLUMN IF NOT EXISTS site_featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_municipal_laws_institution_site_pub
  ON public.municipal_laws (institution_id, publish_on_site, site_featured, publication_date DESC);

-- Garantir bucket público 'leis' no Storage para PDFs oficiais
INSERT INTO storage.buckets (id, name, public)
VALUES ('leis', 'leis', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access Leis'
  ) THEN
    CREATE POLICY "Public Access Leis" ON storage.objects FOR SELECT USING (bucket_id = 'leis');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload Leis'
  ) THEN
    CREATE POLICY "Authenticated Upload Leis" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'leis' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Update Leis'
  ) THEN
    CREATE POLICY "Authenticated Update Leis" ON storage.objects FOR UPDATE USING (bucket_id = 'leis' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Delete Leis'
  ) THEN
    CREATE POLICY "Authenticated Delete Leis" ON storage.objects FOR DELETE USING (bucket_id = 'leis' AND auth.role() = 'authenticated');
  END IF;
END $$;

