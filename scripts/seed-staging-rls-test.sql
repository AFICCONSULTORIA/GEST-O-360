-- ==============================================================================
-- SCRIPT SOMENTE PARA STAGING: Seed de 2 Prefeituras de Teste (Fase 9 — RLS Live)
-- ATENÇÃO: NÃO EXECUTAR EM PRODUÇÃO!
--
-- Pré-requisito no painel Supabase de Staging (Authentication -> Users):
--   1. Crie dois usuários comuns com e-mail/senha confirmados:
--      - rls-user-a@staging.gestao360.test
--      - rls-user-b@staging.gestao360.test
--   2. Execute este script no SQL Editor do projeto de Staging.
--   3. Rode localmente:
--        npm run test:rls-live
-- ==============================================================================

-- 1. Criar duas instituições distintas de staging (idempotente)
INSERT INTO public.institutions (id, name, subdomain, plan, status)
VALUES
  ('staging_pref_a', 'Prefeitura Staging A (RLS Test)', 'staging-pref-a', 'Enterprise', 'Ativo'),
  ('staging_pref_b', 'Prefeitura Staging B (RLS Test)', 'staging-pref-b', 'Enterprise', 'Ativo')
ON CONFLICT (id) DO NOTHING;

-- 2. Vincular os 2 usuários do auth.users como usuários comuns ('Editor') em instituições distintas
INSERT INTO public.admin_users (id, email, name, role, status, institution_id)
SELECT
  u.id,
  u.email,
  CASE WHEN u.email = 'rls-user-a@staging.gestao360.test' THEN 'Servidor Staging A' ELSE 'Servidor Staging B' END,
  'Editor',
  'Ativo',
  CASE WHEN u.email = 'rls-user-a@staging.gestao360.test' THEN 'staging_pref_a' ELSE 'staging_pref_b' END
FROM auth.users u
WHERE u.email IN ('rls-user-a@staging.gestao360.test', 'rls-user-b@staging.gestao360.test')
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  institution_id = EXCLUDED.institution_id;

-- 3. Criar 1 veículo de teste em cada prefeitura para validar isolamento de leitura/UPDATE/DELETE
INSERT INTO public.fleet_vehicles (id, institution_id, plate, model, department, fuel_type, tank_capacity, metric_type, expected_consumption, current_odometer, status)
VALUES
  ('11111111-1111-4111-8111-11111111111a', 'staging_pref_a', 'RLS-1A01', 'Veículo Teste Prefeitura A', 'Administração', 'gasolina', 50, 'km', 10, 1000, 'ativo'),
  ('22222222-2222-4222-8222-22222222222b', 'staging_pref_b', 'RLS-2B02', 'Veículo Teste Prefeitura B', 'Administração', 'gasolina', 50, 'km', 10, 2000, 'ativo')
ON CONFLICT (id) DO NOTHING;
