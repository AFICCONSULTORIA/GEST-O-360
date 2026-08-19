-- =========================================================
-- Migration: Cadastro de Unidades e Profissionais da Saúde
-- =========================================================

-- 1. Tabela de Unidades de Atendimento (health_units)
CREATE TABLE IF NOT EXISTS public.health_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT, -- Relacionamento com a instituição (tenant)
    name TEXT NOT NULL, -- Ex: UBS Central, Policlínica Municipal
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_units_institution ON public.health_units(institution_id);

-- 2. Tabela de Profissionais de Saúde (health_professionals)
CREATE TABLE IF NOT EXISTS public.health_professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    unit_id UUID REFERENCES public.health_units(id) ON DELETE CASCADE, -- Vínculo com a unidade
    name TEXT NOT NULL, -- Ex: Dr. João Silva
    specialty TEXT NOT NULL, -- Ex: Cardiologia, Clínico Geral
    crm_coren TEXT, -- Ex: CRM 12345
    working_days TEXT, -- Ex: Segunda, Quarta e Sexta
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_professionals_institution ON public.health_professionals(institution_id);
CREATE INDEX IF NOT EXISTS idx_health_professionals_unit ON public.health_professionals(unit_id);

-- 3. Habilitar RLS e Políticas de Acesso
ALTER TABLE public.health_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_professionals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Políticas para health_units
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_units' AND policyname = 'Enable all access for health_units') THEN
        CREATE POLICY "Enable all access for health_units" ON public.health_units FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Políticas para health_professionals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_professionals' AND policyname = 'Enable all access for health_professionals') THEN
        CREATE POLICY "Enable all access for health_professionals" ON public.health_professionals FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
