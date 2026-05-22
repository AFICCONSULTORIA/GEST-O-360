-- Criação da tabela de instituições
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Política pública para permitir leitura e escrita (para MVP)
CREATE POLICY ""Allow all on institutions"" ON institutions FOR ALL USING (true) WITH CHECK (true);

-- Adicionar coluna institution_id na tabela admin_users, caso não exista
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS institution_id TEXT;
