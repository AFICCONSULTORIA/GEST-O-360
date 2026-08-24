-- =========================================================
-- Migration: Controle de Exames (Anti-Duplicidade) & Farmácia Popular
-- =========================================================

-- 1. Tabela de Catálogo de Exames (exam_types)
CREATE TABLE IF NOT EXISTS public.exam_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Laboratorial',
    min_interval_days INTEGER NOT NULL DEFAULT 30, -- Padrão de 30 dias de carência
    preparation_instructions TEXT,
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_types_institution ON public.exam_types(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_types_name ON public.exam_types(name);

-- 2. Tabela de Solicitações e Histórico de Exames (exam_requests)
CREATE TABLE IF NOT EXISTS public.exam_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_sus TEXT NOT NULL,
    patient_phone TEXT,
    patient_birth_date DATE,
    exam_type_id UUID REFERENCES public.exam_types(id) ON DELETE SET NULL,
    exam_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Laboratorial',
    doctor_name TEXT NOT NULL,
    doctor_crm TEXT,
    requesting_unit TEXT,
    executing_unit TEXT,
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_date DATE,
    performed_date DATE,
    status TEXT NOT NULL DEFAULT 'Solicitado', -- 'Solicitado', 'Aprovado', 'Agendado', 'Realizado', 'Cancelado', 'Bloqueado por Duplicidade'
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

CREATE INDEX IF NOT EXISTS idx_exam_requests_institution ON public.exam_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_requests_patient_cpf ON public.exam_requests(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_exam_requests_exam_name ON public.exam_requests(exam_name);
CREATE INDEX IF NOT EXISTS idx_exam_requests_status ON public.exam_requests(status);
CREATE INDEX IF NOT EXISTS idx_exam_requests_requested_date ON public.exam_requests(requested_date);

-- 3. Tabela de Dispensação de Medicamentos da Farmácia Popular / Municipal (medication_dispensations)
CREATE TABLE IF NOT EXISTS public.medication_dispensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_sus TEXT NOT NULL,
    patient_phone TEXT,
    medication_id TEXT NOT NULL, -- Relacionado com a tabela medications (id TEXT)
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    form TEXT NOT NULL,
    batch_number TEXT,
    quantity_dispensed INTEGER NOT NULL DEFAULT 1,
    days_of_treatment INTEGER NOT NULL DEFAULT 30, -- Ex: 30 dias de cobertura
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

CREATE INDEX IF NOT EXISTS idx_med_disp_institution ON public.medication_dispensations(institution_id);
CREATE INDEX IF NOT EXISTS idx_med_disp_patient_cpf ON public.medication_dispensations(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_med_disp_medication_id ON public.medication_dispensations(medication_id);
CREATE INDEX IF NOT EXISTS idx_med_disp_created_at ON public.medication_dispensations(created_at);

-- 4. Habilitar RLS e Políticas
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_dispensations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exam_types' AND policyname = 'Enable all access for exam_types') THEN
        CREATE POLICY "Enable all access for exam_types" ON public.exam_types FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exam_requests' AND policyname = 'Enable all access for exam_requests') THEN
        CREATE POLICY "Enable all access for exam_requests" ON public.exam_requests FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication_dispensations' AND policyname = 'Enable all access for medication_dispensations') THEN
        CREATE POLICY "Enable all access for medication_dispensations" ON public.medication_dispensations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
