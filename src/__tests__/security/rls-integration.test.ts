/**
 * Teste de INTEGRAÇÃO de RLS contra um Supabase REAL (use um projeto de STAGING/cópia).
 * É o único teste que enxerga o que realmente vale no banco (o teste estático não vê o painel
 * do Supabase nem scripts rodados à mão). Sem as variáveis abaixo, a suíte é PULADA.
 *
 *   RLS_TEST_URL=https://xxxx.supabase.co
 *   RLS_TEST_ANON_KEY=...                       (chave anon do projeto de teste)
 *   RLS_TEST_USER_A_EMAIL / RLS_TEST_USER_A_PASSWORD   usuário comum da prefeitura A
 *   RLS_TEST_USER_B_EMAIL / RLS_TEST_USER_B_PASSWORD   usuário comum da prefeitura B (OUTRA instituição)
 *   RLS_TEST_ALLOW_WRITES=1                     (opcional) habilita os testes que tentam INSERT como anon
 *
 * Rodar:  RLS_TEST_URL=... RLS_TEST_ANON_KEY=... npx vitest run src/__tests__/security/rls-integration.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const env = process.env;
const enabled = !!(env.RLS_TEST_URL && env.RLS_TEST_ANON_KEY);
const hasUsers = !!(env.RLS_TEST_USER_A_EMAIL && env.RLS_TEST_USER_A_PASSWORD && env.RLS_TEST_USER_B_EMAIL && env.RLS_TEST_USER_B_PASSWORD);
const writesAllowed = env.RLS_TEST_ALLOW_WRITES === '1';

const d = enabled ? describe : describe.skip;
const dUsers = enabled && hasUsers ? describe : describe.skip;

/** Tabelas de domínio sensível; o teste ignora as que não existirem no projeto. */
const SENSITIVE_TABLES = [
  'patients',
  'health_units',
  'health_professionals',
  'fleet_vehicles',
  'fleet_drivers',
  'fleet_fuel_stations',
  'fuel_supply_orders',
  'fuel_supply_audit_logs',
  'admin_users',
  'fin_contabilidade_fichas',
  'fin_contabilidade_lancamentos',
  'fin_remanejamento_origens',
  'education_teachers',
  'whatsapp_instances',
  'whatsapp_settings',
];
/** Valores legados de institution_id tolerados hoje (ver migration 20261125010000). */
const LEGACY_INSTITUTIONS = ['inst_1', 'default', null];

const isMissingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''));

const newClient = () =>
  createClient(env.RLS_TEST_URL!, env.RLS_TEST_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

async function login(email: string, password: string): Promise<SupabaseClient> {
  const c = newClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login falhou (${email}): ${error.message}`);
  return c;
}

d('anon (sem login) com a chave pública', () => {
  let anon: SupabaseClient;
  beforeAll(() => {
    anon = newClient();
  });

  it('NÃO consegue executar reset_user_password (usa UUID inexistente: inofensivo)', async () => {
    const { error } = await anon.rpc('reset_user_password', { target_user_id: randomUUID() });
    expect(error, 'a função aceitou a chamada anônima: qualquer pessoa pode resetar senhas').not.toBeNull();
  });

  for (const table of SENSITIVE_TABLES) {
    it(`NÃO lê linhas de ${table}`, async () => {
      const { data, error } = await anon.from(table).select('*').limit(5);
      if (isMissingTable(error)) return;
      // aceitável: erro de permissão OU lista vazia
      expect(data ?? [], `anon leu dados de ${table}`).toEqual([]);
    });
  }

  (writesAllowed ? it : it.skip).each(SENSITIVE_TABLES)('NÃO insere em %s', async (table) => {
    const { data, error } = await anon.from(table).insert({ id: randomUUID(), institution_id: `rls-test-${Date.now()}` }).select();
    if (isMissingTable(error)) return;
    expect(data ?? [], `anon conseguiu INSERIR em ${table} (remova esta linha de teste do banco)`).toEqual([]);
  });
});

dUsers('isolamento entre prefeituras (multi-tenant)', () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let instA: string | null = null;
  let instB: string | null = null;

  beforeAll(async () => {
    a = await login(env.RLS_TEST_USER_A_EMAIL!, env.RLS_TEST_USER_A_PASSWORD!);
    b = await login(env.RLS_TEST_USER_B_EMAIL!, env.RLS_TEST_USER_B_PASSWORD!);
    instA = (await a.rpc('get_current_user_institution_id')).data ?? null;
    instB = (await b.rpc('get_current_user_institution_id')).data ?? null;
  });

  it('os dois usuários de teste pertencem a instituições DIFERENTES', () => {
    expect(instA).toBeTruthy();
    expect(instB).toBeTruthy();
    expect(instA).not.toBe(instB);
  });

  for (const table of SENSITIVE_TABLES.filter((t) => !t.startsWith('whatsapp') && t !== 'admin_users')) {
    it(`${table}: A só vê linhas da própria instituição (ou legado)`, async () => {
      const { data, error } = await a.from(table).select('id, institution_id').limit(1000);
      if (isMissingTable(error) || error) return;
      const foreign = (data ?? []).filter((r: any) => 'institution_id' in r && r.institution_id !== instA && !LEGACY_INSTITUTIONS.includes(r.institution_id));
      expect(foreign.map((r: any) => `${r.id}@${r.institution_id}`), `vazamento A <- outra prefeitura em ${table}`).toEqual([]);
    });

    it(`${table}: B não enxerga linhas de A (interseção vazia, excluindo legado)`, async () => {
      const [ra, rb] = await Promise.all([a.from(table).select('id, institution_id').limit(1000), b.from(table).select('id, institution_id').limit(1000)]);
      if (isMissingTable(ra.error) || ra.error || rb.error) return;
      const idsA = new Set((ra.data ?? []).filter((r: any) => r.institution_id === instA).map((r: any) => r.id));
      const leakToB = (rb.data ?? []).filter((r: any) => idsA.has(r.id));
      expect(leakToB.length, `B enxerga linhas da instituição de A em ${table}`).toBe(0);
    });
  }

  it('A não consegue ATUALIZAR nem APAGAR linhas de B', async () => {
    const { data: rowsB } = await b.from('fleet_vehicles').select('id').eq('institution_id', instB!).limit(1);
    if (!rowsB?.length) return; // sem dado para testar
    const id = (rowsB[0] as any).id;
    const upd = await a.from('fleet_vehicles').update({ updated_at: new Date().toISOString() } as never).eq('id', id).select();
    expect(upd.data ?? []).toEqual([]);
    const del = await a.from('fleet_vehicles').delete().eq('id', id).select();
    expect(del.data ?? []).toEqual([]);
    const still = await b.from('fleet_vehicles').select('id').eq('id', id);
    expect(still.data?.length).toBe(1);
  });

  it('A não consegue gravar linha com institution_id de B (WITH CHECK)', async () => {
    if (!writesAllowed) return;
    const { data } = await a.from('fleet_fuel_stations').insert({ id: randomUUID(), name: 'rls-test', institution_id: instB } as never).select();
    expect(data ?? [], 'A inseriu dado na instituição de B').toEqual([]);
  });

  it('usuário comum NÃO consegue resetar a senha de outro usuário', async () => {
    const { data: me } = await b.auth.getUser();
    const { error } = await a.rpc('reset_user_password', { target_user_id: me.user!.id });
    expect(error, 'usuário comum da prefeitura A conseguiu resetar a senha de um usuário da prefeitura B').not.toBeNull();
  });

  it('linhas com institution_id legado (inst_1 / default / NULL) NÃO vazam para outra prefeitura', async () => {
    const targetClient = instB && !LEGACY_INSTITUTIONS.includes(instB) ? b : instA && !LEGACY_INSTITUTIONS.includes(instA) ? a : null;
    if (!targetClient) return;
    for (const table of ['fleet_vehicles', 'fleet_drivers', 'fleet_fuel_stations', 'fuel_supply_orders']) {
      const { data, error } = await targetClient.from(table).select('id, institution_id').limit(1000);
      if (isMissingTable(error) || error) continue;
      const legacyLeaks = (data ?? []).filter((r: { institution_id?: string | null }) =>
        LEGACY_INSTITUTIONS.includes(r.institution_id ?? null),
      );
      expect(legacyLeaks, `vazamento de linhas legadas em ${table}`).toEqual([]);
    }
  });
});
