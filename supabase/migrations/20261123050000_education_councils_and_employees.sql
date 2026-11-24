-- ==============================================================================
-- MIGRAÇÃO: CONSELHOS DA EDUCAÇÃO (CME / FUNDEB / CAE) & CONTROLE DE FUNCIONÁRIOS
-- Versão: 20261123050000
-- ==============================================================================

-- 1. Conselhos da Educação
CREATE TABLE IF NOT EXISTS public.education_councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  code TEXT NOT NULL DEFAULT 'CME',
  name TEXT NOT NULL,
  decree_number TEXT,
  mandate_start DATE,
  mandate_end DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'em_renovacao')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_councils_inst
  ON public.education_councils (institution_id, status);

-- 2. Membros dos Conselhos
CREATE TABLE IF NOT EXISTS public.education_council_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  council_id UUID NOT NULL REFERENCES public.education_councils(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  segment TEXT NOT NULL DEFAULT 'Sociedade Civil / Pais',
  council_role TEXT NOT NULL DEFAULT 'Conselheiro(a) Titular',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_council_members_council
  ON public.education_council_members (institution_id, council_id);

-- 3. Reuniões e Atas dos Conselhos
CREATE TABLE IF NOT EXISTS public.education_council_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  council_id UUID NOT NULL REFERENCES public.education_councils(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ata_number TEXT,
  agenda TEXT NOT NULL,
  decisions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Quadro Geral de Funcionários da Educação
CREATE TABLE IF NOT EXISTS public.education_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  role_title TEXT NOT NULL,
  contract_modality TEXT NOT NULL DEFAULT 'Efetivo'
    CHECK (contract_modality IN ('Efetivo', 'Contrato Temporário', 'Comissionado', 'Terceirizado', 'Estagiário', 'Cedido')),
  phone TEXT,
  email TEXT,
  workplace TEXT DEFAULT 'Secretaria / Rede Municipal',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'afastado', 'desligado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_employees_inst
  ON public.education_employees (institution_id, contract_modality, status);

-- 5. RLS Multi-Tenant Estrito
ALTER TABLE public.education_councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_council_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_council_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_rw_education_councils" ON public.education_councils;
CREATE POLICY "tenant_rw_education_councils"
  ON public.education_councils FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "tenant_rw_education_council_members" ON public.education_council_members;
CREATE POLICY "tenant_rw_education_council_members"
  ON public.education_council_members FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "tenant_rw_education_council_meetings" ON public.education_council_meetings;
CREATE POLICY "tenant_rw_education_council_meetings"
  ON public.education_council_meetings FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());

DROP POLICY IF EXISTS "tenant_rw_education_employees" ON public.education_employees;
CREATE POLICY "tenant_rw_education_employees"
  ON public.education_employees FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution_id())
  WITH CHECK (institution_id = public.current_user_institution_id());
