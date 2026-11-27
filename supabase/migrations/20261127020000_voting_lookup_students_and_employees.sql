-- ==============================================================================
-- URNA DE ELEIÇÃO ESCOLAR: CONSULTA DE CPF NA BASE DE ALUNOS E FUNCIONÁRIOS
-- Versão: 20261127020000
-- Objetivo:
--   Atualizar `public.lookup_voting_voter_by_cpf(p_cpf TEXT)` (RPC pública usada
--   pela urna ao digitar o CPF) para buscar em ordem:
--     1. Lista oficial importada da eleição (`edu_voting_voters`)
--     2. Cadastro institucional de Alunos (`education_students`)
--     3. Cadastro de Funcionários da Educação (`education_employees`)
--   Retorna apenas `full_name` e `role_label` (sem expor CPF, data de
--   nascimento ou lista completa de eleitores para `anon`).
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_education_students_cpf_digits
  ON public.education_students ((regexp_replace(COALESCE(cpf, ''), '\D', '', 'g')));

CREATE OR REPLACE FUNCTION public.lookup_voting_voter_by_cpf(p_cpf TEXT)
RETURNS TABLE (
  full_name TEXT,
  role_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean TEXT := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_name TEXT;
  v_role TEXT;
BEGIN
  IF length(v_clean) <> 11 OR v_clean ~ '^0+$' THEN
    RETURN;
  END IF;

  IF NOT public.check_public_rpc_rate_limit('voting_voter_lookup', v_clean, 20, 300) THEN
    RETURN;
  END IF;

  -- 1. Lista oficial importada da eleição (`edu_voting_voters`)
  BEGIN
    SELECT v.full_name, COALESCE(NULLIF(trim(v.role_label), ''), 'Lista Oficial da Escola')
      INTO v_name, v_role
    FROM public.edu_voting_voters v
    WHERE v.cpf_clean = v_clean
    LIMIT 1;

    IF v_name IS NOT NULL AND length(trim(v_name)) > 0 THEN
      RETURN QUERY SELECT v_name, v_role;
      RETURN;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 2. Cadastro de Alunos da Educação (`education_students`)
  BEGIN
    SELECT
      s.name,
      CASE
        WHEN NULLIF(trim(COALESCE(s.class_name, '')), '') IS NOT NULL
          THEN 'Aluno(a) • ' || trim(s.class_name)
        ELSE 'Aluno(a)'
      END
      INTO v_name, v_role
    FROM public.education_students s
    WHERE regexp_replace(COALESCE(s.cpf, ''), '\D', '', 'g') = v_clean
    ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_name IS NOT NULL AND length(trim(v_name)) > 0 THEN
      RETURN QUERY SELECT v_name, v_role;
      RETURN;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 3. Cadastro de Funcionários da Educação (`education_employees`)
  BEGIN
    SELECT
      e.full_name,
      COALESCE(NULLIF(trim(e.role_title), ''), 'Funcionário(a) da Educação')
      INTO v_name, v_role
    FROM public.education_employees e
    WHERE regexp_replace(COALESCE(e.cpf, ''), '\D', '', 'g') = v_clean
    ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_name IS NOT NULL AND length(trim(v_name)) > 0 THEN
      RETURN QUERY SELECT v_name, v_role;
      RETURN;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_voting_voter_by_cpf(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_voting_voter_by_cpf(TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
