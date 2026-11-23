-- ==============================================================================
-- MIGRAÇÃO: BASE DE ELEITORES / FUNCIONÁRIOS PARA AUTO-PREENCHIMENTO POR CPF
-- Versão: 20261123040000
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.edu_voting_voters (
  id TEXT PRIMARY KEY,
  cpf_clean TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role_label TEXT DEFAULT 'Funcionário / Eleitor',
  school_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edu_voting_voters_cpf
  ON public.edu_voting_voters (cpf_clean);

ALTER TABLE public.edu_voting_voters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de eleitores autenticados" ON public.edu_voting_voters;
CREATE POLICY "Permitir leitura de eleitores autenticados"
  ON public.edu_voting_voters FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de eleitores autenticados" ON public.edu_voting_voters;
CREATE POLICY "Permitir gerenciamento de eleitores autenticados"
  ON public.edu_voting_voters FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- RPC pública segura para a urna buscar apenas 1 eleitor pelo CPF exato (LGPD)
CREATE OR REPLACE FUNCTION public.lookup_voting_voter_by_cpf(p_cpf TEXT)
RETURNS TABLE (
  full_name TEXT,
  role_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  IF length(v_clean) <> 11 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.full_name, v.role_label
  FROM public.edu_voting_voters v
  WHERE v.cpf_clean = v_clean
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_voting_voter_by_cpf(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_voting_voter_by_cpf(TEXT) TO anon, authenticated;
