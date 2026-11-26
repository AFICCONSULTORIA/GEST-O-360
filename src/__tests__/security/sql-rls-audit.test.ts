/**
 * Auditoria estática de RLS / GRANTs / funções SECURITY DEFINER.
 *
 * Dois tipos de teste:
 *  - ESTRITOS (sem baseline): falham até a correção existir. Descrevem o estado desejado.
 *  - CATRACA (ratchet): congelam a dívida atual e impedem que cresça. Meta: baseline -> [].
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  ROOT,
  buildSqlState,
  listSqlFiles,
  permissiveReadPolicies,
  permissiveWritePolicies,
  readSql,
  tablesWithoutRls,
} from '../helpers/sqlAudit';
import { ratchetSet } from '../helpers/ratchet';

const relPath = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');

const migrationFiles = listSqlFiles('supabase/migrations');
const manualFiles = listSqlFiles('database');
const state = buildSqlState(migrationFiles);

describe('reset_user_password (escalada de privilégio por anon)', () => {
  const allFiles = [...migrationFiles, ...manualFiles];
  const definitions = allFiles
    .map((f) => ({ f, sql: readSql(f) }))
    .filter(({ sql }) => /create\s+(or\s+replace\s+)?function\s+(public\.)?reset_user_password/i.test(sql));

  it('existe ao menos uma definição versionada (senão o teste não protege nada)', () => {
    expect(definitions.length).toBeGreaterThan(0);
  });

  it('nenhum arquivo concede EXECUTE a anon/PUBLIC', () => {
    const offenders = allFiles
      .map((f) => ({ f, sql: readSql(f) }))
      .filter(({ sql }) => /grant\s+execute\s+on\s+function\s+(public\.)?reset_user_password[^;]*\bto\b[^;]*\b(anon|public)\b/i.test(sql))
      .map(({ f }) => relPath(f));
    expect(offenders).toEqual([]);
  });

  it('valida quem chama (auth.uid / papel admin / mesmo institution_id) dentro da função', () => {
    for (const { f, sql } of definitions) {
      const body = /create\s+(or\s+replace\s+)?function\s+(public\.)?reset_user_password[\s\S]*?\$\$([\s\S]*?)\$\$/i.exec(sql)?.[3] ?? '';
      expect(/auth\.uid\(\)/i.test(body), `${f}: função não consulta auth.uid()`).toBe(true);
      expect(/institution_id/i.test(body), `${f}: função não restringe por institution_id`).toBe(true);
    }
  });

  it('não usa senha padrão fixa conhecida', () => {
    for (const { f, sql } of definitions) {
      expect(/crypt\(\s*'[^']+'/i.test(sql), `${f}: senha literal em crypt()`).toBe(false);
    }
  });

  it('o frontend não reseta senha via RPC direta com a chave anon/usuário', () => {
    const settings = fs.readFileSync(`${ROOT}/src/modules/Settings/index.tsx`, 'utf8');
    expect(/supabase\.rpc\(\s*['"]reset_user_password['"]/.test(settings)).toBe(false);
  });
});

describe('RLS: estado efetivo reconstruído a partir de supabase/migrations', () => {
  it('[catraca] políticas de ESCRITA abertas a anon/PUBLIC com condição `true`', () => {
    const items = permissiveWritePolicies(state).map((p) => `${p.table}::${p.name} (${p.command})`);
    ratchetSet('rls-open-write-policies', items);
  });

  it('[catraca] políticas de LEITURA irrestrita a anon/PUBLIC', () => {
    const items = permissiveReadPolicies(state).map((p) => `${p.table}::${p.name}`);
    ratchetSet('rls-open-read-policies', items);
  });

  it('[catraca] tabelas criadas sem RLS habilitado', () => {
    ratchetSet('rls-tables-without-rls', tablesWithoutRls(state));
  });

  it('tabelas de domínio sensível NUNCA têm escrita aberta (estrito)', () => {
    const sensitive = /(patient|paciente|prontuario|saude|health|student|aluno|matricula|fuel|fleet|vehicle|driver|admin_users|fin_|account|contabil|payroll|folha|whatsapp|education_|salary|salario)/i;
    const offenders = permissiveWritePolicies(state)
      .filter((p) => sensitive.test(p.table))
      .map((p) => `${p.table}::${p.name} (${p.command})`);
    expect(offenders).toEqual([]);
  });
});

describe('Funções SECURITY DEFINER e GRANT a anon', () => {
  it('[catraca] funções executáveis por anon via GRANT explícito', () => {
    ratchetSet('grants-anon-execute', [...state.anonExecutable.keys()]);
  });

  it('[catraca] SECURITY DEFINER sem REVOKE ... FROM PUBLIC/anon (Postgres concede EXECUTE a PUBLIC por padrão)', () => {
    const items = [...state.securityDefiner.keys()].filter((fn) => !state.revokedFromPublic.has(fn));
    ratchetSet('security-definer-without-revoke', items);
  });

  it('toda função SECURITY DEFINER fixa search_path (evita sequestro de schema)', () => {
    const offenders: string[] = [];
    for (const f of [...migrationFiles, ...manualFiles]) {
      const sql = readSql(f);
      for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)(?:\$\w*\$)/gi)) {
        if (/security\s+definer/i.test(m[0]) && !/set\s+search_path/i.test(m[0])) {
          offenders.push(`${m[1]} (${relPath(f)})`);
        }
      }
    }
    ratchetSet('security-definer-without-search-path', offenders);
  });
});

describe('Higiene do repositório de banco', () => {
  it('[catraca] scripts soltos em database/ (fonte da verdade deve ser supabase/migrations)', () => {
    ratchetSet('database-dir-manual-scripts', manualFiles.map((f) => relPath(f)));
  });

  it('nenhuma migration contém a service_role key nem JWT embutido', () => {
    const leaks = [...migrationFiles, ...manualFiles].filter((f) => /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./.test(fs.readFileSync(f, 'utf8')));
    expect(leaks).toEqual([]);
  });
});
