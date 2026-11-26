/**
 * Auditoria ESTÁTICA do SQL versionado (supabase/migrations + database/*.sql).
 *
 * Reconstrói o estado EFETIVO aplicando os eventos na ordem dos arquivos
 * (create/drop policy, enable/disable RLS, grant/revoke execute).
 *
 * LIMITAÇÃO: não enxerga o banco real. Blocos DO $$ com DROP dinâmico, alterações feitas
 * direto no painel do Supabase e scripts de `database/` rodados manualmente não aparecem.
 * Por isso existe também o teste de integração (rls-integration.test.ts), que fala com o banco.
 */
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '../../..');

export interface PolicyInfo {
  table: string;
  name: string;
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  roles: string[]; // vazio = PUBLIC (todos, inclusive anon)
  usingTrue: boolean;
  checkTrue: boolean;
  file: string;
}

export interface SqlState {
  policies: Map<string, PolicyInfo>; // chave: "tabela::nome"
  tables: Set<string>;
  rlsEnabled: Set<string>;
  anonExecutable: Map<string, string>; // função -> arquivo do GRANT
  securityDefiner: Map<string, string>; // função -> arquivo
  revokedFromPublic: Set<string>;
}

export function listSqlFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(abs, f));
}

export function readSql(file: string): string {
  // remove comentários de linha e de bloco para não gerar falso positivo
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

const ident = String.raw`(?:"([^"]+)"|(\w+))`;
const qualified = String.raw`(?:(?:public|"public")\.)?(?:"([^"]+)"|(\w+))`;

export function buildSqlState(files: string[]): SqlState {
  const state: SqlState = {
    policies: new Map(),
    tables: new Set(),
    rlsEnabled: new Set(),
    anonExecutable: new Map(),
    securityDefiner: new Map(),
    revokedFromPublic: new Set(),
  };

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const sql = readSql(file);

    type Ev = { pos: number; run: () => void };
    const events: Ev[] = [];

    for (const m of sql.matchAll(new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${qualified}`, 'gi'))) {
      events.push({ pos: m.index!, run: () => state.tables.add((m[1] || m[2]).toLowerCase()) });
    }
    for (const m of sql.matchAll(
      new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${qualified}\s+(enable|disable)\s+row\s+level\s+security`, 'gi'),
    )) {
      const t = (m[1] || m[2]).toLowerCase();
      events.push({ pos: m.index!, run: () => (m[3].toLowerCase() === 'enable' ? state.rlsEnabled.add(t) : state.rlsEnabled.delete(t)) });
    }
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+policy\s+${ident}\s+on\s+${qualified}([^;]*);`, 'gi'))) {
      const name = m[1] || m[2];
      const table = (m[3] || m[4]).toLowerCase();
      const rest = m[5];
      const cmd = (/\bfor\s+(all|select|insert|update|delete)\b/i.exec(rest)?.[1] || 'ALL').toUpperCase() as PolicyInfo['command'];
      const toMatch = /\bto\s+([\w",\s]+?)(?=\s+(?:using|with)\b|\s*$)/i.exec(rest);
      const roles = toMatch ? toMatch[1].split(',').map((r) => r.trim().replace(/"/g, '').toLowerCase()).filter(Boolean) : [];
      const info: PolicyInfo = {
        table,
        name,
        command: cmd,
        roles: roles.filter((r) => r !== 'public'),
        usingTrue: /\busing\s*\(\s*true\s*\)/i.test(rest),
        checkTrue: /with\s+check\s*\(\s*true\s*\)/i.test(rest),
        file: rel,
      };
      events.push({ pos: m.index!, run: () => state.policies.set(`${table}::${name}`, info) });
    }
    for (const m of sql.matchAll(new RegExp(String.raw`drop\s+policy\s+(?:if\s+exists\s+)?${ident}\s+on\s+${qualified}`, 'gi'))) {
      const name = m[1] || m[2];
      const table = (m[3] || m[4]).toLowerCase();
      events.push({ pos: m.index!, run: () => state.policies.delete(`${table}::${name}`) });
    }
    for (const m of sql.matchAll(/grant\s+(?:execute|all)(?:\s+privileges)?\s+on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s+to\s+([^;]+);/gi)) {
      const fn = m[1].toLowerCase();
      if (/\b(anon|public)\b/i.test(m[2])) events.push({ pos: m.index!, run: () => state.anonExecutable.set(fn, rel) });
    }
    for (const m of sql.matchAll(/revoke\s+(?:execute|all)(?:\s+privileges)?\s+on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s+from\s+([^;]+);/gi)) {
      const fn = m[1].toLowerCase();
      if (/\b(anon|public)\b/i.test(m[2])) {
        events.push({
          pos: m.index!,
          run: () => {
            state.anonExecutable.delete(fn);
            state.revokedFromPublic.add(fn);
          },
        });
      }
    }
    for (const m of sql.matchAll(
      /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\$\w*\$/gi,
    )) {
      const header = m[0];
      if (/security\s+definer/i.test(header)) {
        const fn = m[1].toLowerCase();
        events.push({ pos: m.index!, run: () => state.securityDefiner.set(fn, rel) });
      }
    }

    // Heurística: blocos DO $$ que fazem DROP dinâmico de TODAS as políticas (loop em pg_policies)
    // de tabelas listadas em ARRAY['t1','t2'] ou `tablename = 't'`. As políticas recriadas via
    // format() não são parseáveis, mas o estado anterior (aberto) deixa de valer.
    for (const m of sql.matchAll(/do\s+\$(\w*)\$([\s\S]*?)\$\1\$/gi)) {
      const block = m[2];
      if (!/pg_policies/i.test(block) || !/drop\s+policy/i.test(block)) continue;
      const tableNames = new Set<string>();
      for (const arr of block.matchAll(/array\s*\[([^\]]*)\]/gi)) {
        for (const lit of arr[1].matchAll(/'([\w]+)'/g)) tableNames.add(lit[1].toLowerCase());
      }
      for (const eq of block.matchAll(/tablename\s*=\s*'(\w+)'/gi)) tableNames.add(eq[1].toLowerCase());
      events.push({
        pos: m.index!,
        run: () => {
          for (const key of [...state.policies.keys()]) {
            if (tableNames.has(key.split('::')[0])) state.policies.delete(key);
          }
        },
      });
    }

    events.sort((a, b) => a.pos - b.pos).forEach((e) => e.run());
  }
  return state;
}

/** Políticas de ESCRITA abertas para anon/PUBLIC com condição literal `true`. */
export function permissiveWritePolicies(state: SqlState): PolicyInfo[] {
  return [...state.policies.values()].filter((p) => {
    const writes = p.command === 'ALL' || p.command === 'INSERT' || p.command === 'UPDATE' || p.command === 'DELETE';
    const open = p.usingTrue || p.checkTrue;
    const exposedToAnon = p.roles.length === 0 || p.roles.includes('anon');
    return writes && open && exposedToAnon;
  });
}

/** Políticas de LEITURA irrestrita (`using (true)`) para anon/PUBLIC. */
export function permissiveReadPolicies(state: SqlState): PolicyInfo[] {
  return [...state.policies.values()].filter((p) => {
    const reads = p.command === 'ALL' || p.command === 'SELECT';
    const exposedToAnon = p.roles.length === 0 || p.roles.includes('anon');
    return reads && p.usingTrue && exposedToAnon;
  });
}

export function tablesWithoutRls(state: SqlState): string[] {
  return [...state.tables].filter((t) => !state.rlsEnabled.has(t)).sort();
}
