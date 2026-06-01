-- ====================================================================
-- SCRIPT DE CRIAÇÃO E CONFIGURAÇÃO DE SECRETARIAS (DEPARTAMENTOS)
-- ====================================================================

-- 1. Criar a tabela 'departments' (Secretarias)
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Segurança de Nível de Linha (RLS) na tabela departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 3. Criar política RLS permitindo tudo para facilidade de uso do MVP
DROP POLICY IF EXISTS "Allow all on departments" ON departments;
CREATE POLICY "Allow all on departments" ON departments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Adicionar coluna 'department_id' na tabela 'admin_users' se não existir
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;

-- 5. Inserir secretarias padrão para as prefeituras de demonstração
INSERT INTO departments (id, name, institution_id)
VALUES
  -- Prefeitura de Torixoréu (inst_1)
  ('dept_tor_saude', 'Secretaria Municipal de Saúde', 'inst_1'),
  ('dept_tor_educacao', 'Secretaria Municipal de Educação e Cultura', 'inst_1'),
  ('dept_tor_obras', 'Secretaria Municipal de Obras e Serviços Públicos', 'inst_1'),
  ('dept_tor_financas', 'Secretaria Municipal de Administração e Finanças', 'inst_1'),
  ('dept_tor_assistencia', 'Secretaria Municipal de Assistência Social', 'inst_1'),
  
  -- Prefeitura de Barra do Garças (inst_2)
  ('dept_bg_saude', 'Secretaria Municipal de Saúde', 'inst_2'),
  ('dept_bg_educacao', 'Secretaria Municipal de Educação', 'inst_2'),
  ('dept_bg_turismo', 'Secretaria Municipal de Turismo', 'inst_2'),
  ('dept_bg_obras', 'Secretaria Municipal de Obras e Urbanismo', 'inst_2'),
  ('dept_bg_financas', 'Secretaria Municipal de Planejamento e Finanças', 'inst_2'),

  -- Prefeitura de Pontal do Araguaia (inst_3)
  ('dept_pa_saude', 'Secretaria Municipal de Saúde', 'inst_3'),
  ('dept_pa_educacao', 'Secretaria Municipal de Educação', 'inst_3'),
  ('dept_pa_administracao', 'Secretaria Municipal de Administração', 'inst_3'),
  ('dept_pa_obras', 'Secretaria Municipal de Obras', 'inst_3')
ON CONFLICT (id) 
DO UPDATE SET 
  name = EXCLUDED.name, 
  institution_id = EXCLUDED.institution_id;

-- 6. Opcional: Lotar os usuários administrativos existentes em alguma secretaria padrão se estiverem sem lotação
-- ex: lotar o super admin em Administração e Finanças de Torixoréu por padrão
UPDATE admin_users 
SET department_id = 'dept_tor_financas' 
WHERE institution_id = 'inst_1' AND department_id IS NULL;
