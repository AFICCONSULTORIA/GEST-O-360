-- ============================================================================
-- AUDITORIA DE SEGURANÇA (SOMENTE LEITURA): rode no SQL Editor do Supabase.
-- Nenhum comando altera dados. Cole o resultado de cada bloco para o assistente.
-- ============================================================================

-- 1) Políticas RLS realmente ativas que liberam escrita a anon/PUBLIC
select schemaname, tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('ALL','INSERT','UPDATE','DELETE')
  and (roles @> '{anon}' or roles @> '{public}')
order by tablename, policyname;

-- 2) Políticas de LEITURA irrestrita (qual = 'true') para anon/PUBLIC
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and cmd in ('ALL','SELECT')
  and qual = 'true'
  and (roles @> '{anon}' or roles @> '{public}')
order by tablename;

-- 3) Tabelas do schema public SEM RLS habilitado
select c.relname as tabela
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 4) Funções SECURITY DEFINER executáveis por anon (inclui o EXECUTE padrão de PUBLIC)
select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executa,
       p.proconfig as config  -- deve conter search_path=...
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by anon_executa desc, funcao;

-- 5) Usuários que AINDA estão com a senha padrão 'gestao123@' (reset via RPC)
--    Resultado = lista de contas que precisam trocar a senha imediatamente.
select id, email, last_sign_in_at
from auth.users
where encrypted_password = crypt('gestao123@', encrypted_password);

-- 6) Linhas com institution_id legado (visíveis a todas as prefeituras pela exceção atual)
select 'fleet_vehicles' t, count(*) from public.fleet_vehicles where institution_id is null or institution_id in ('inst_1','default')
union all select 'fleet_drivers', count(*) from public.fleet_drivers where institution_id is null or institution_id in ('inst_1','default')
union all select 'fleet_fuel_stations', count(*) from public.fleet_fuel_stations where institution_id is null or institution_id in ('inst_1','default')
union all select 'fuel_supply_orders', count(*) from public.fuel_supply_orders where institution_id is null or institution_id in ('inst_1','default');
