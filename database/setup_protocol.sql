-- 1. Criar a tabela 'protocols'
CREATE TABLE protocols (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  attachment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar o RLS na tabela
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

-- 3. Criar a política pública para testes (depois pode ser restrita aos usuários logados)
CREATE POLICY "Allow all on protocols" ON protocols FOR ALL USING (true) WITH CHECK (true);

-- 4. Criar o Bucket 'protocolos' (caso a inserção via SQL falhe, crie manualmente pelo painel do Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('protocolos', 'protocolos', true);

-- 5. Habilitar permissões públicas para o Bucket 'protocolos'
CREATE POLICY "Allow public read on protocolos" ON storage.objects FOR SELECT USING (bucket_id = 'protocolos');
CREATE POLICY "Allow public insert on protocolos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'protocolos');
CREATE POLICY "Allow public update on protocolos" ON storage.objects FOR UPDATE USING (bucket_id = 'protocolos');
CREATE POLICY "Allow public delete on protocolos" ON storage.objects FOR DELETE USING (bucket_id = 'protocolos');
