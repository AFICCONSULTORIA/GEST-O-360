-- =============================================================================
-- MIGRATION: Corrige permissões e RLS para Suplementação de Fichas Orçamentárias
-- Permite que todos os usuários autenticados (e modo anon/híbrido do sistema)
-- possam importar PDFs/Planilhas, consultar e lançar suplementações sem bloqueio
-- de RLS ou divergência de institution_id.
-- =============================================================================

-- 1. Atualiza get_current_user_institution_id() para suportar busca por UID ou E-mail JWT
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (
      SELECT institution_id::text
      FROM public.admin_users
      WHERE id::text = auth.uid()::text
         OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
      LIMIT 1
    ),
    'default'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Garante permissões de tabela para anon e authenticated
GRANT ALL ON public.fin_contabilidade_fichas TO anon, authenticated, service_role;
GRANT ALL ON public.fin_contabilidade_lancamentos TO anon, authenticated, service_role;

-- 3. Atualiza Políticas RLS da tabela fin_contabilidade_fichas
ALTER TABLE public.fin_contabilidade_fichas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso fichas por instituicao" ON public.fin_contabilidade_fichas;
DROP POLICY IF EXISTS "Acesso irrestrito fichas autenticados e sistema" ON public.fin_contabilidade_fichas;

CREATE POLICY "Acesso irrestrito fichas autenticados e sistema"
  ON public.fin_contabilidade_fichas
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Atualiza Políticas RLS da tabela fin_contabilidade_lancamentos
ALTER TABLE public.fin_contabilidade_lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso lancamentos por instituicao" ON public.fin_contabilidade_lancamentos;
DROP POLICY IF EXISTS "Acesso irrestrito lancamentos autenticados e sistema" ON public.fin_contabilidade_lancamentos;

CREATE POLICY "Acesso irrestrito lancamentos autenticados e sistema"
  ON public.fin_contabilidade_lancamentos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
