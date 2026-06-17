-- Tabela de Suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- Bug, Dúvida, Sugestão
  status TEXT NOT NULL DEFAULT 'Aberto', -- Aberto, Em Análise, Fechado
  user_id TEXT NOT NULL,
  user_name TEXT,
  institution_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Política de RLS: o usuário ou prefeitura pode ver seus próprios chamados
CREATE POLICY "Allow support_tickets based on institution" ON support_tickets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Chave Estrangeira
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_institution_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- Tabela de Mensagens do Suporte (Chat)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (Opcional) Script caso já exista a tabela:
-- ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- IMPORTANTE: Vá no Supabase Dashboard -> Storage -> New Bucket
-- Crie um bucket chamado: support_attachments
-- Marque a opção "Public Bucket" (para que as imagens possam ser exibidas na interface)
-- E configure as Policies do Bucket para permitir INSERT e SELECT para public/authenticated.

ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on support_ticket_messages" ON support_ticket_messages
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE support_ticket_messages DROP CONSTRAINT IF EXISTS support_ticket_messages_ticket_id_fkey;
ALTER TABLE support_ticket_messages ADD CONSTRAINT support_ticket_messages_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
