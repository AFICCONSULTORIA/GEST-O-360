-- =========================================================
-- Script SQL: Consultas Médicas e Prescrições Digitais (PEP)
-- Módulo Saúde - GESTÃO 360
-- =========================================================

-- 1. Tabela de Consultas Médicas Realizadas (PEP / SOAP)
CREATE TABLE IF NOT EXISTS public.medical_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    appointment_id UUID,
    patient_id UUID,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_sus TEXT NOT NULL,
    patient_birth_date DATE,
    doctor_name TEXT NOT NULL,
    doctor_crm TEXT,
    specialty TEXT NOT NULL DEFAULT 'Clínica Geral',
    unit_name TEXT NOT NULL DEFAULT 'Unidade Básica de Saúde',
    consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    consultation_time TEXT,
    chief_complaint TEXT NOT NULL,
    history_of_present_illness TEXT,
    vital_signs JSONB, -- { blood_pressure, heart_rate, temperature, weight, height, bmi, blood_glucose }
    diagnosis_hypothesis TEXT,
    cid10 TEXT,
    clinical_evolution TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Finalizado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Receitas Médicas Digitais Conectadas à Farmácia Municipal
CREATE TABLE IF NOT EXISTS public.medical_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT,
    consultation_id UUID,
    patient_id UUID,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_sus TEXT NOT NULL,
    patient_birth_date DATE,
    doctor_name TEXT NOT NULL,
    doctor_crm TEXT,
    unit_name TEXT,
    prescription_number TEXT NOT NULL UNIQUE,
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL, -- Array de itens [{ medication_id, medication_name, dosage, form, quantity, instructions, duration_days }]
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa' | 'dispensada' | 'cancelada'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de Performance e Busca Rápida
CREATE INDEX IF NOT EXISTS idx_consultations_patient_cpf ON public.medical_consultations(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.medical_consultations(consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_institution ON public.medical_consultations(institution_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_cpf ON public.medical_prescriptions(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON public.medical_prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_institution ON public.medical_prescriptions(institution_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_prescriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso a medical_consultations" ON public.medical_consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso a medical_prescriptions" ON public.medical_prescriptions FOR ALL USING (true) WITH CHECK (true);
