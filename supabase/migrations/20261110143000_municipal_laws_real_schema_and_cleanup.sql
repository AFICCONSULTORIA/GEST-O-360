-- Migração: Garantir colunas completas da interface MunicipalLaw e limpar registros de mock
-- Data: 2026-11-10

-- 1. Adicionar colunas necessárias para compatibilidade total com o modelo real
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS origin_power TEXT DEFAULT 'executivo';
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS compiled_text TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS is_compiled BOOLEAN DEFAULT false;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS materia_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS materia_numero TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS parent_law_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS parent_law_number TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS parent_law_title TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS revoked_by_id TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS revoked_by_number TEXT;
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS institution_id TEXT;

-- 2. Limpeza dos dados de mock da tabela (remover registros de demonstração)
DELETE FROM public.municipal_laws 
WHERE id::text IN ('law_1331_2026', 'law_1', 'law_2', 'law_3', 'law_4', 'law_5', 'law_6', 'law_7', 'law_8', 'law_9')
   OR id::text LIKE 'law_%';

-- 3. Assegurar políticas de RLS
ALTER TABLE public.municipal_laws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de leis municipais" ON public.municipal_laws;
CREATE POLICY "Leitura de leis municipais" ON public.municipal_laws
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Gestao de leis municipais por instituicao" ON public.municipal_laws;
CREATE POLICY "Gestao de leis municipais por instituicao" ON public.municipal_laws
  FOR ALL
  USING (
    institution_id::text = public.get_current_user_institution_id() 
    OR public.is_super_admin()
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (
    institution_id::text = public.get_current_user_institution_id() 
    OR public.is_super_admin()
    OR auth.role() = 'authenticated'
  );

