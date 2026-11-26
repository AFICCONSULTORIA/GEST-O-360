/**
 * Saúde do código: catracas que impedem a piora e ajudam a LEVAR A DÍVIDA A ZERO.
 * Para regravar os baselines depois de pagar dívida: UPDATE_BASELINE=1 npm test
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { ROOT } from '../helpers/sqlAudit';
import { ratchetCounts, ratchetSet } from '../helpers/ratchet';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const SRC = walk(path.join(ROOT, 'src'));
const API = walk(path.join(ROOT, 'api'));
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');
const text = new Map([...SRC, ...API].map((f) => [f, fs.readFileSync(f, 'utf8')]));

const countBy = (re: RegExp, files = SRC) =>
  Object.fromEntries(files.map((f) => [rel(f), (text.get(f)!.match(re) || []).length]).filter(([, n]) => (n as number) > 0));

describe('Tratamento de erros', () => {
  it('[catraca] blocos catch VAZIOS por arquivo (erro engolido = bug invisível)', () => {
    // pega `catch {}`, `catch (e) {}` e `catch { /* comentário */ }`
    ratchetCounts('empty-catch', countBy(/catch\s*(?:\(\s*\w*\s*\))?\s*\{\s*(?:\/\*[\s\S]*?\*\/\s*)?\}/g));
  });

  it('[catraca] `.catch(() => {})` que ignora a falha de Promises', () => {
    ratchetCounts('swallowed-promise-catch', countBy(/\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)/g));
  });

  it('api/* nunca devolve error.message/stack cru ao cliente', () => {
    const leaks = API.filter((f) => /res\.status\(\d+\)\.json\(\{[^}]*(error\.message|e\.message|err\.message|\.stack)/.test(text.get(f)!)).map(rel);
    ratchetSet('api-leaks-error-details', leaks);
  });
});

describe('Tipagem', () => {
  it('[catraca] uso de `any` por arquivo', () => {
    ratchetCounts('explicit-any', countBy(/(?::\s*any\b|\bas\s+any\b|<any>|any\[\])/g));
  });

  it('[catraca] @ts-ignore / @ts-nocheck por arquivo', () => {
    ratchetCounts('ts-suppressions', countBy(/@ts-(?:ignore|nocheck|expect-error)/g));
  });
});

describe('Tamanho e duplicação', () => {
  it('[catraca] arquivos acima de 1.500 linhas (por tamanho atual: só pode ENCOLHER)', () => {
    const big: Record<string, number> = {};
    for (const f of SRC) {
      const lines = text.get(f)!.split('\n').length;
      if (lines > 1500) big[rel(f)] = lines;
    }
    ratchetCounts('large-files', big);
  });

  it('nenhum arquivo NOVO passa de 800 linhas (exceto os já listados em large-files)', () => {
    const baselineFile = path.resolve(__dirname, '../baselines/large-files.json');
    const known = fs.existsSync(baselineFile) ? Object.keys(JSON.parse(fs.readFileSync(baselineFile, 'utf8'))) : [];
    const offenders = SRC.filter((f) => text.get(f)!.split('\n').length > 800 && !known.includes(rel(f))).map(rel);
    ratchetSet('medium-files-over-800', offenders);
  });

  it('[catraca] cópias de componentes (sufixo -Carlos, -copy, -old, -backup, .bak)', () => {
    const copies = SRC.filter((f) => /(-carlos|-copy|-old|-backup|-bkp|\.bak|_old|_copy)\.tsx?$/i.test(f)).map(rel);
    ratchetSet('duplicate-copies', copies);
  });
});

describe('Higiene do repositório', () => {
  it('[catraca] console.log em código de produção', () => {
    ratchetCounts('console-log', countBy(/console\.log\(/g, [...SRC, ...API]));
  });

  it('dev-dist/ e scratch/ não deveriam estar versionados (estão no .gitignore?)', () => {
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gi).toMatch(/dev-dist/);
    expect(gi).toMatch(/scratch/);
  });

  it('nenhum segredo conhecido embutido no código-fonte', () => {
    const patterns = [/AIza[0-9A-Za-z_-]{35}/, /sk-[A-Za-z0-9]{32,}/, /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/];
    const hits = [...text.entries()].filter(([, t]) => patterns.some((p) => p.test(t))).map(([f]) => rel(f));
    expect(hits).toEqual([]);
  });

  it('service_role nunca é referenciada no frontend (src/)', () => {
    const hits = SRC.filter((f) => /service_role|SERVICE_ROLE/.test(text.get(f)!)).map(rel);
    expect(hits).toEqual([]);
  });

  it('variáveis VITE_* não carregam segredos (tudo com prefixo VITE_ vai para o navegador)', () => {
    const vars = new Set<string>();
    for (const t of text.values()) for (const m of t.matchAll(/import\.meta\.env\.(VITE_\w+)/g)) vars.add(m[1]);
    const forbidden = [...vars].filter((v) => /(SECRET|PRIVATE|SERVICE|PASSWORD|TOKEN|GEMINI)/i.test(v));
    expect(forbidden).toEqual([]);
  });

  it('dangerouslySetInnerHTML só com conteúdo passado por sanitizador', () => {
    const offenders: string[] = [];
    for (const f of SRC) {
      const t = text.get(f)!;
      for (const m of t.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\}\}/g)) {
        if (!/sanitize|DOMPurify|escapeHtml/i.test(m[1])) offenders.push(`${rel(f)} -> ${m[1].trim().slice(0, 60)}`);
      }
    }
    ratchetSet('unsanitized-inner-html', offenders);
  });
});
