-- ====================================================================
-- MIGRAÇÃO: CADASTRO DE MOTORISTAS E POSTOS CREDENCIADOS (GESTÃO 360)
-- Versão: 20261021000000
-- Tabelas complementares para o módulo de Frotas e Abastecimento
-- ====================================================================

-- 1. TABELA DE MOTORISTAS / CONDUTORES OFICIAIS (fleet_drivers)
CREATE TABLE IF NOT EXISTS public.fleet_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  birth_date DATE,
  department TEXT NOT NULL,
  cnh_number TEXT,
  cnh_category TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'afastado')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para busca ágil por Nome, CPF e Secretaria
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_inst ON public.fleet_drivers(institution_id);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_cpf ON public.fleet_drivers(cpf);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_name ON public.fleet_drivers(full_name);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_dept ON public.fleet_drivers(department);

-- 2. TABELA DE POSTOS DE COMBUSTÍVEL CREDENCIADOS (fleet_fuel_stations)
CREATE TABLE IF NOT EXISTS public.fleet_fuel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fleet_stations_inst ON public.fleet_fuel_stations(institution_id);
CREATE INDEX IF NOT EXISTS idx_fleet_stations_name ON public.fleet_fuel_stations(name);

-- 3. POLÍTICAS RLS (Row Level Security)
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_fuel_stations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_drivers' AND policyname = 'fleet_drivers_tenant_policy') THEN
    CREATE POLICY fleet_drivers_tenant_policy ON public.fleet_drivers
      FOR ALL
      USING (
        auth.role() = 'anon'
        OR institution_id = (SELECT public.get_current_user_institution_id())
        OR institution_id = current_setting('request.jwt.claims', true)::json->>'institution_id'
      )
      WITH CHECK (
        auth.role() = 'anon'
        OR institution_id = (SELECT public.get_current_user_institution_id())
        OR institution_id = current_setting('request.jwt.claims', true)::json->>'institution_id'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fleet_fuel_stations' AND policyname = 'fleet_fuel_stations_tenant_policy') THEN
    CREATE POLICY fleet_fuel_stations_tenant_policy ON public.fleet_fuel_stations
      FOR ALL
      USING (
        auth.role() = 'anon'
        OR institution_id = (SELECT public.get_current_user_institution_id())
        OR institution_id = current_setting('request.jwt.claims', true)::json->>'institution_id'
      )
      WITH CHECK (
        auth.role() = 'anon'
        OR institution_id = (SELECT public.get_current_user_institution_id())
        OR institution_id = current_setting('request.jwt.claims', true)::json->>'institution_id'
      );
  END IF;
END $$;
