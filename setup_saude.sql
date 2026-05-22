-- 1. Criar a tabela 'appointments'
DROP TABLE IF EXISTS appointments;

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_cpf TEXT NOT NULL,
  patient_sus TEXT NOT NULL,
  patient_birth_date DATE NOT NULL,
  is_pregnant BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  specialty TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  status TEXT NOT NULL, -- 'Agendado', 'Atendido', 'Cancelado', 'Faltou'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 3. Criar a política pública (para o ambiente de desenvolvimento/testes)
CREATE POLICY "Allow all on appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
