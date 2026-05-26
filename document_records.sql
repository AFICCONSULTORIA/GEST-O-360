-- Criar a tabela document_records
CREATE TABLE document_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    requester TEXT NOT NULL,
    subject TEXT NOT NULL,
    dateCreated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    attachment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ativar Row Level Security
ALTER TABLE document_records ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso público (temporário para desenvolvimento)
CREATE POLICY "Permitir leitura pública" ON document_records FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON document_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON document_records FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON document_records FOR DELETE USING (true);

-- Criar índices para busca mais rápida do último número e ano
CREATE INDEX document_records_type_year_idx ON document_records (type, year);

-- ==========================================
-- CONFIGURAÇÃO DO BUCKET DE ANEXOS (STORAGE)
-- ==========================================

-- 1. Criar o bucket público (se não existir)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document_attachments', 'document_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir Upload (Insert) de qualquer pessoa
CREATE POLICY "Permitir upload de anexos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'document_attachments');

-- 3. Permitir Leitura (Select) de qualquer pessoa
CREATE POLICY "Permitir leitura de anexos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'document_attachments');

-- 4. Permitir Exclusão (Delete) de arquivos
CREATE POLICY "Permitir exclusão de anexos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'document_attachments');
