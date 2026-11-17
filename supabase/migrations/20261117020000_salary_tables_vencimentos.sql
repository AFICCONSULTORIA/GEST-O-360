-- ====================================================================
-- MIGRAÇÃO: TABELAS DE VENCIMENTOS MUNICIPAIS (PLANO DE CARGOS E SALÁRIOS)
-- Versão: 20261117020000_salary_tables_vencimentos.sql
-- ====================================================================

-- 1. LEIS / ANEXOS QUE INSTITUEM TABELAS DE VENCIMENTOS
CREATE TABLE IF NOT EXISTS public.municipal_salary_laws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    law_number TEXT NOT NULL,
    annex_name TEXT,
    title TEXT NOT NULL,
    effective_date DATE,
    source_file_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_laws_inst
    ON public.municipal_salary_laws(institution_id);

CREATE INDEX IF NOT EXISTS idx_salary_laws_number
    ON public.municipal_salary_laws(institution_id, law_number);

-- 2. TABELAS DE VENCIMENTOS POR CARGO (EX: TABELA I: ALMOXARIFE)
CREATE TABLE IF NOT EXISTS public.municipal_salary_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    law_id UUID NOT NULL REFERENCES public.municipal_salary_laws(id) ON DELETE CASCADE,
    table_roman TEXT NOT NULL,
    table_order INTEGER NOT NULL DEFAULT 0,
    role_name TEXT NOT NULL,
    base_salary NUMERIC(12, 2),
    classes_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_tables_inst
    ON public.municipal_salary_tables(institution_id);

CREATE INDEX IF NOT EXISTS idx_salary_tables_law
    ON public.municipal_salary_tables(law_id);

CREATE INDEX IF NOT EXISTS idx_salary_tables_role
    ON public.municipal_salary_tables(institution_id, role_name);

-- 3. MATRIZ DE VENCIMENTOS (NÍVEL x CLASSE)
CREATE TABLE IF NOT EXISTS public.municipal_salary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    salary_table_id UUID NOT NULL REFERENCES public.municipal_salary_tables(id) ON DELETE CASCADE,
    level_code TEXT NOT NULL,
    level_order INTEGER NOT NULL DEFAULT 0,
    level_percent TEXT,
    class_a NUMERIC(12, 2),
    class_b NUMERIC(12, 2),
    class_c NUMERIC(12, 2),
    class_d NUMERIC(12, 2),
    class_e NUMERIC(12, 2),
    class_f NUMERIC(12, 2),
    class_g NUMERIC(12, 2),
    class_h NUMERIC(12, 2),
    extra_classes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_entries_inst
    ON public.municipal_salary_entries(institution_id);

CREATE INDEX IF NOT EXISTS idx_salary_entries_table
    ON public.municipal_salary_entries(salary_table_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.municipal_salary_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_salary_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_salary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso tabelas vencimentos leis" ON public.municipal_salary_laws;
CREATE POLICY "Acesso tabelas vencimentos leis"
    ON public.municipal_salary_laws
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso tabelas vencimentos cargos" ON public.municipal_salary_tables;
CREATE POLICY "Acesso tabelas vencimentos cargos"
    ON public.municipal_salary_tables
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso tabelas vencimentos valores" ON public.municipal_salary_entries;
CREATE POLICY "Acesso tabelas vencimentos valores"
    ON public.municipal_salary_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);
