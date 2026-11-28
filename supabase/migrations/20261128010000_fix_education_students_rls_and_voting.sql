-- ==============================================================================
-- CORREÇÃO RLS: PERMITIR SUPER ADMIN E USUÁRIOS DA INSTITUIÇÃO EM ALUNOS E FUNCIONÁRIOS
-- + CONSULTA NA URNA DE VOTAÇÃO
-- Versão: 20261128010000
-- Problema resolvido:
--   A policy anterior em `education_students` e `education_employees` não
--   incluía `is_super_admin()`, impedindo Super Admins de gravarem/lerem alunos
--   no Supabase ao gerenciar uma prefeitura (ficando apenas no cache local).
-- ==============================================================================

-- 1. Garantir colunas e permissões em `education_students`
ALTER TABLE IF EXISTS public.education_students ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.education_students TO authenticated;

DROP POLICY IF EXISTS "Tenant isolation education_students" ON public.education_students;
CREATE POLICY "Tenant isolation education_students"
  ON public.education_students
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.is_super_admin())
    OR institution_id = (SELECT public.get_current_user_institution_id())
  )
  WITH CHECK (
    (SELECT public.is_super_admin())
    OR institution_id = (SELECT public.get_current_user_institution_id())
  );

-- 2. Garantir o mesmo acesso para `education_employees`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'education_employees') THEN
    ALTER TABLE public.education_employees ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.education_employees TO authenticated;

    DROP POLICY IF EXISTS "tenant_rw_education_employees" ON public.education_employees;
    CREATE POLICY "tenant_rw_education_employees"
      ON public.education_employees
      FOR ALL
      TO authenticated
      USING (
        (SELECT public.is_super_admin())
        OR institution_id = (SELECT public.get_current_user_institution_id())
      )
      WITH CHECK (
        (SELECT public.is_super_admin())
        OR institution_id = (SELECT public.get_current_user_institution_id())
      );
  END IF;
END $$;

-- 3. Garantir índice de CPF e RPC pública da urna buscando em eleitores, alunos e funcionários
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

  -- 1. Lista oficial importada da eleição
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

  -- 2. Cadastro institucional de Alunos (`education_students`)
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
