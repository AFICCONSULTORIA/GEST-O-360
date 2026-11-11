-- ============================================================================
-- MVP Site Institucional Oficial do Município (Domínio Próprio + Configuração)
-- ============================================================================

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS site_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_institutions_custom_domain
  ON public.institutions (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;

