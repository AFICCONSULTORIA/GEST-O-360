-- =========================================================
-- Script Completo para Configuração do Módulo de Saúde
-- Inclui Pacientes, Agendamentos, Farmácia, Catálogo de Exames, Solicitações e Dispensações
-- =========================================================

-- 1. Catálogo de Exames
CREATE TABLE IF NOT EXISTS public.exam_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Laboratorial',
    min_interval_days INTEGER NOT NULL DEFAULT 30,
    preparation_instructions TEXT,
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Solicitações de Exames (Prescritos vs Realizados + Anti-Duplicidade)
CREATE TABLE IF NOT EXISTS public.exam_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    patient_id UUID,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_sus TEXT NOT NULL,
    patient_phone TEXT,
    patient_birth_date DATE,
    exam_type_id UUID,
    exam_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Laboratorial',
    doctor_name TEXT NOT NULL,
    doctor_crm TEXT,
    requesting_unit TEXT,
    executing_unit TEXT,
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_date DATE,
    performed_date DATE,
    status TEXT NOT NULL DEFAULT 'Solicitado',
    clinical_indication TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    is_duplicate_warning BOOLEAN DEFAULT FALSE,
    is_duplicate_override BOOLEAN DEFAULT FALSE,
    duplicate_override_reason TEXT,
    last_exam_date DATE,
    days_since_last_exam INTEGER,
    result_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Dispensações da Farmácia Popular / Municipal
CREATE TABLE IF NOT EXISTS public.medication_dispensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    patient_id UUID,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_sus TEXT NOT NULL,
    patient_phone TEXT,
    medication_id TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    form TEXT NOT NULL,
    batch_number TEXT,
    quantity_dispensed INTEGER NOT NULL DEFAULT 1,
    days_of_treatment INTEGER NOT NULL DEFAULT 30,
    next_allowed_dispensation_date DATE NOT NULL,
    doctor_name TEXT,
    doctor_crm TEXT,
    prescription_number TEXT,
    prescription_date DATE DEFAULT CURRENT_DATE,
    dispensing_unit TEXT,
    pharmacist_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_dispensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on exam_types" ON public.exam_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exam_requests" ON public.exam_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on medication_dispensations" ON public.medication_dispensations FOR ALL USING (true) WITH CHECK (true);
