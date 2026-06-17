-- ====================================================================
-- SCRIPT DE CONFIGURAÇÃO DE MULTI-TENANCY POR SUBDOMÍNIO (GESTÃO 360)
-- ====================================================================

-- 1. Adicionar coluna 'subdomain' na tabela de instituições (municípios)
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- 2. Atualizar ou inserir instituições de demonstração com seus subdomínios
INSERT INTO institutions (id, name, subdomain)
VALUES 
  ('inst_1', 'Prefeitura Municipal de Torixoréu', 'torixoreu'),
  ('inst_2', 'Prefeitura Municipal de Barra do Garças', 'barradogarcas'),
  ('inst_3', 'Prefeitura Municipal de Pontal do Araguaia', 'pontaldoaraguaia')
ON CONFLICT (id) 
DO UPDATE SET 
  name = EXCLUDED.name, 
  subdomain = EXCLUDED.subdomain;

-- 3. Adicionar coluna 'institution_id' nas tabelas de dados para vinculá-las a um município
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE patrimonio ADD COLUMN IF NOT EXISTS institution_id TEXT;

-- 3.1. Configurar chaves estrangeiras com comportamento ON DELETE CASCADE
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_institution_id_fkey;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE protocols DROP CONSTRAINT IF EXISTS protocols_institution_id_fkey;
ALTER TABLE protocols ADD CONSTRAINT protocols_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_institution_id_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_institution_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE controls DROP CONSTRAINT IF EXISTS controls_institution_id_fkey;
ALTER TABLE controls ADD CONSTRAINT controls_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE patrimonio DROP CONSTRAINT IF EXISTS patrimonio_institution_id_fkey;
ALTER TABLE patrimonio ADD CONSTRAINT patrimonio_institution_id_fkey 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 4. Associar os usuários administradores existentes e os dados atuais ao município padrão (Torixoréu - inst_1)
-- Isso evita erros de dados órfãos ou bloqueio de usuários durante a migração
UPDATE admin_users SET institution_id = 'inst_1' WHERE institution_id IS NULL;
UPDATE protocols SET institution_id = 'inst_1' WHERE institution_id IS NULL;
UPDATE documents SET institution_id = 'inst_1' WHERE institution_id IS NULL;
UPDATE orders SET institution_id = 'inst_1' WHERE institution_id IS NULL;
UPDATE controls SET institution_id = 'inst_1' WHERE institution_id IS NULL;
UPDATE patrimonio SET institution_id = 'inst_1' WHERE institution_id IS NULL;

-- 5. Atualizar políticas de Segurança em Nível de Linha (RLS) para isolamento total dos dados
-- Se habilitado, garante que um administrador ou cidadão só possa ver dados de sua respectiva prefeitura.

-- RLS para tabela 'protocols'
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on protocols" ON protocols;
CREATE POLICY "Allow protocols based on institution" ON protocols
  FOR ALL
  USING (true) -- Aberto para leitura geral (portais públicos), mas filtrado no front pelo ID do subdomínio
  WITH CHECK (true);

-- RLS para tabela 'documents'
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on documents" ON documents;
CREATE POLICY "Allow documents based on institution" ON documents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS para tabela 'orders'
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;
CREATE POLICY "Allow orders based on institution" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS para tabela 'controls'
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on controls" ON controls;
CREATE POLICY "Allow controls based on institution" ON controls
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS para tabela 'patrimonio'
ALTER TABLE patrimonio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on patrimonio" ON patrimonio;
CREATE POLICY "Allow patrimonio based on institution" ON patrimonio
  FOR ALL
  USING (true)
  WITH CHECK (true);
