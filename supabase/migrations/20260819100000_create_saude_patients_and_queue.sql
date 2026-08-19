-- =========================================================
-- Migration: Cadastro de Pacientes & Fila de Regulação da Saúde
-- =========================================================

-- 1. Tabela de Pacientes (patients)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT, -- Compatível com o id da tabela institutions (TEXT)
    name TEXT NOT NULL,
    cpf TEXT,
    sus_number TEXT,
    birth_date DATE,
    gender TEXT, -- 'M', 'F', 'Outro'
    mother_name TEXT,
    phone TEXT,
    address TEXT,
    neighborhood TEXT,
    ubs_reference TEXT, -- Unidade Básica de Saúde de referência
    blood_type TEXT, -- 'A+', 'O-', etc.
    allergies TEXT,
    conditions TEXT, -- Comorbidades (ex: "Hipertensão, Diabetes")
    is_pregnant BOOLEAN DEFAULT FALSE,
    is_pcd BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_patients_institution ON public.patients(institution_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_sus ON public.patients(sus_number);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);

-- 2. Atualização na tabela de Agendamentos (appointments) para suportar a Fila de Regulação
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS unit_name TEXT; -- Ex: 'UBS Central', 'Policlínica Municipal'
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_name TEXT; -- Ex: 'Dr. Lucas Silveira'
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS queue_priority TEXT DEFAULT 'normal'; -- 'urgente', '80+', 'prioridade', 'normal'
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS triage_notes TEXT; -- Parecer do regulador
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE; -- Check-in na recepção
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE; -- Finalização do atendimento
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT; -- Motivo do cancelamento/falta

-- 3. Habilitar RLS e Políticas de Acesso
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'Enable all access for patients'
    ) THEN
        CREATE POLICY "Enable all access for patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
