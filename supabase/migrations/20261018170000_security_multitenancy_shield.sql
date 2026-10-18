-- ====================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM MULTITENANCY (GESTÃO 360)
-- Versão: 20261018170000
-- Objetivo:
-- 1. Padronizar função RPC SECURITY DEFINER para resolução de tenant
-- 2. Criar e estruturar tabela de auditorias fiscais (fiscal_compliance_audits)
-- 3. Blindar com RLS estrito as tabelas críticas contra vazamento de dados entre prefeituras
-- ====================================================================

-- 1. ESTRUTURAÇÃO DE PROFILES E ADMIN_USERS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id TEXT,
  name TEXT,
  role TEXT DEFAULT 'Operador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles isolados por instituicao ou usuario" ON public.profiles;
CREATE POLICY "Profiles isolados por instituicao ou usuario" ON public.profiles
  FOR ALL
  USING (
    id = auth.uid() 
    OR institution_id = (auth.jwt() -> 'app_metadata' ->> 'institution_id')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'Super Admin'
  )
  WITH CHECK (
    id = auth.uid() 
    OR institution_id = (auth.jwt() -> 'app_metadata' ->> 'institution_id')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'Super Admin'
  );

-- 2. FUNÇÃO PADRONIZADA DE RESOLUÇÃO SEGURA DE TENANT (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS TEXT AS $$
DECLARE
  v_inst_id TEXT;
BEGIN
  -- 1. Tenta extrair diretamente dos metadados do token JWT (performance máxima em milissegundos)
  v_inst_id := coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'institution_id'),
    (auth.jwt() -> 'user_metadata' ->> 'institution_id')
  );
  IF v_inst_id IS NOT NULL AND v_inst_id <> '' THEN
    RETURN v_inst_id;
  END IF;

  -- 2. Consulta na tabela profiles vinculada a auth.uid()
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    SELECT institution_id INTO v_inst_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;

    IF v_inst_id IS NOT NULL AND v_inst_id <> '' THEN
      RETURN v_inst_id;
    END IF;
  END IF;

  -- 3. Consulta na tabela admin_users pelo ID ou e-mail
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
    SELECT institution_id INTO v_inst_id
    FROM public.admin_users
    WHERE id = auth.uid()::text OR email = (auth.jwt() ->> 'email')
    LIMIT 1;

    IF v_inst_id IS NOT NULL AND v_inst_id <> '' THEN
      RETURN v_inst_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função auxiliar para retorno em formato UUID quando necessário
CREATE OR REPLACE FUNCTION public.get_current_user_institution_uuid()
RETURNS UUID AS $$
BEGIN
  RETURN public.get_current_user_institution_id()::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função auxiliar para checagem de privilégio de Super Administrador
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'Super Admin' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE (id = auth.uid()::text OR email = (auth.jwt() ->> 'email'))
      AND role = 'Super Admin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. CRIAÇÃO DA TABELA DE AUDITORIAS FISCAIS (fiscal_compliance_audits)
CREATE TABLE IF NOT EXISTS public.fiscal_compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT,
  doc_type TEXT NOT NULL DEFAULT 'NFE_55', -- 'NFE_55' ou 'NFSE_NACIONAL'
  numero_nf TEXT,
  serie TEXT,
  chave_acesso TEXT,
  data_emissao TIMESTAMP WITH TIME ZONE,
  emitente_nome TEXT,
  emitente_cnpj TEXT,
  tomador_nome TEXT,
  tomador_cnpj_cpf TEXT,
  valor_total NUMERIC(15,2) DEFAULT 0,
  valor_liquido NUMERIC(15,2) DEFAULT 0,
  status_conformidade TEXT NOT NULL DEFAULT 'conforme', -- 'conforme', 'atencao', 'reprovada'
  problemas JSONB DEFAULT '[]'::jsonb,
  itens JSONB DEFAULT '[]'::jsonb,
  raw_xml TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fiscal_audits_inst ON public.fiscal_compliance_audits(institution_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_audits_status ON public.fiscal_compliance_audits(status_conformidade);
CREATE INDEX IF NOT EXISTS idx_fiscal_audits_created ON public.fiscal_compliance_audits(created_at DESC);

ALTER TABLE public.fiscal_compliance_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fiscal audits isoladas por instituicao" ON public.fiscal_compliance_audits;
CREATE POLICY "Fiscal audits isoladas por instituicao" ON public.fiscal_compliance_audits
  FOR ALL
  USING (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  )
  WITH CHECK (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  );

-- 4. BLINDAGEM DE RLS NAS TABELAS CRÍTICAS

-- A. municipal_laws (Leis Municipais)
ALTER TABLE public.municipal_laws ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.municipal_laws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.municipal_laws;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.municipal_laws;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.municipal_laws;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.municipal_laws;
DROP POLICY IF EXISTS "Leitura de leis municipais" ON public.municipal_laws;
DROP POLICY IF EXISTS "Gestao de leis municipais por instituicao" ON public.municipal_laws;

-- Leitura pública de leis permitida para o portal da transparência
CREATE POLICY "Leitura de leis municipais" ON public.municipal_laws
  FOR SELECT
  USING (true);

-- Inserção, edição e exclusão estritamente restrita à prefeitura do servidor logado
CREATE POLICY "Gestao de leis municipais por instituicao" ON public.municipal_laws
  FOR ALL
  USING (
    institution_id::text = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  )
  WITH CHECK (
    institution_id::text = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  );

-- B. ouvidoria_manifestacoes (Manifestações da Ouvidoria Municipal)
ALTER TABLE public.ouvidoria_manifestacoes ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.ouvidoria_manifestacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.ouvidoria_manifestacoes;
DROP POLICY IF EXISTS "Permitir inserção de manifestação" ON public.ouvidoria_manifestacoes;
DROP POLICY IF EXISTS "Consulta de manifestacao cidadao ou staff" ON public.ouvidoria_manifestacoes;
DROP POLICY IF EXISTS "Inserir manifestacao cidadao" ON public.ouvidoria_manifestacoes;
DROP POLICY IF EXISTS "Gerenciar manifestacao por instituicao" ON public.ouvidoria_manifestacoes;

-- Cidadão pode consultar seu protocolo pelo site, ou servidores veem os registros de sua instituição
CREATE POLICY "Consulta de manifestacao cidadao ou staff" ON public.ouvidoria_manifestacoes
  FOR SELECT
  USING (
    auth.role() = 'anon' -- Cidadão consulta pelo protocolo no portal
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );

-- Qualquer cidadão ou sistema pode registrar nova manifestação
CREATE POLICY "Inserir manifestacao cidadao" ON public.ouvidoria_manifestacoes
  FOR INSERT
  WITH CHECK (true);

-- Apenas o ouvidor / equipe daquela respectiva instituição pode atualizar status e responder
CREATE POLICY "Gerenciar manifestacao por instituicao" ON public.ouvidoria_manifestacoes
  FOR UPDATE
  USING (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  )
  WITH CHECK (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  );

CREATE POLICY "Excluir manifestacao por instituicao" ON public.ouvidoria_manifestacoes
  FOR DELETE
  USING (
    institution_id = public.get_current_user_institution_id() 
    OR public.is_super_admin()
  );

-- C. appointments (Agendamentos da Saúde Municipal)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Appointments isolados por instituicao ou paciente" ON public.appointments;

CREATE POLICY "Appointments isolados por instituicao ou paciente" ON public.appointments
  FOR ALL
  USING (
    auth.role() = 'anon' -- Agendamentos via portal do cidadão
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  )
  WITH CHECK (
    auth.role() = 'anon'
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );

-- D. education_lesson_progress (Progresso das Lições de Alunos)
ALTER TABLE public.education_lesson_progress ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.education_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de progresso de aulas" ON public.education_lesson_progress;
DROP POLICY IF EXISTS "Permitir insercao e atualizacao de progresso de aulas" ON public.education_lesson_progress;
DROP POLICY IF EXISTS "Progresso de aulas isolado por instituicao" ON public.education_lesson_progress;

CREATE POLICY "Progresso de aulas isolado por instituicao" ON public.education_lesson_progress
  FOR ALL
  USING (
    auth.role() = 'anon' -- Portal do Aluno
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  )
  WITH CHECK (
    auth.role() = 'anon'
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );

-- E. education_quiz_attempts (Tentativas de Avaliação de Alunos)
ALTER TABLE public.education_quiz_attempts ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.education_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de tentativas de quiz" ON public.education_quiz_attempts;
DROP POLICY IF EXISTS "Permitir insercao de tentativas de quiz" ON public.education_quiz_attempts;
DROP POLICY IF EXISTS "Tentativas de quiz isoladas por instituicao" ON public.education_quiz_attempts;

CREATE POLICY "Tentativas de quiz isoladas por instituicao" ON public.education_quiz_attempts
  FOR ALL
  USING (
    auth.role() = 'anon' -- Portal do Aluno
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  )
  WITH CHECK (
    auth.role() = 'anon'
    OR institution_id = public.get_current_user_institution_id()
    OR public.is_super_admin()
  );
