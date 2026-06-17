-- Executar este comando no SQL Editor do Supabase para adicionar a coluna history na tabela de protocolos.
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
