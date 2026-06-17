-- 1. Criar a tabela 'medications'
DROP TABLE IF EXISTS medications;

CREATE TABLE medications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  dosage TEXT NOT NULL,
  form TEXT NOT NULL,
  quantity INTEGER DEFAULT 0 NOT NULL,
  expiration_date DATE NOT NULL,
  batch_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- 3. Criar a política pública (para o ambiente de desenvolvimento/testes)
CREATE POLICY "Allow all on medications" ON medications FOR ALL USING (true) WITH CHECK (true);

-- 4. Inserir Dados Mock / Teste
INSERT INTO medications (id, name, active_ingredient, dosage, form, quantity, expiration_date, batch_number) VALUES
  ('mock_1', 'Amoxicilina', 'Amoxicilina Tri-hidratada', '500mg', 'Cápsula', 1500, '2026-12-01', 'LT-202305X'),
  ('mock_2', 'Dipirona', 'Dipirona Monoidratada', '500mg/ml', 'Gotas', 350, '2025-08-15', 'LT-8910AB'),
  ('mock_3', 'Losartana', 'Losartana Potássica', '50mg', 'Comprimido', 2000, '2027-02-10', 'LT-1234YZ'),
  ('mock_4', 'Paracetamol', 'Paracetamol', '750mg', 'Comprimido', 40, '2026-05-30', 'LT-9876QW'),
  ('mock_5', 'Ibuprofeno', 'Ibuprofeno', '600mg', 'Comprimido', 0, '2026-09-20', 'LT-5432PO'),
  ('mock_6', 'Azitromicina', 'Azitromicina Di-hidratada', '500mg', 'Comprimido', 120, '2023-10-10', 'LT-VENCIDO'),
  ('mock_7', 'Loratadina', 'Loratadina', '1mg/ml', 'Xarope', 80, '2026-07-05', 'LT-4455KK');
