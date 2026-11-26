/**
 * "Catraca" (ratchet): trava a dívida técnica atual e impede que ela AUMENTE.
 * - Item novo fora do baseline  -> teste FALHA.
 * - Item do baseline que sumiu  -> teste passa e avisa (dívida paga).
 * - Para regravar os baselines após pagar dívida:  UPDATE_BASELINE=1 npm test
 * Meta do projeto: levar cada baseline a ZERO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';

const DIR = path.resolve(__dirname, '../baselines');

export function ratchetSet(name: string, current: string[]) {
  const file = path.join(DIR, `${name}.json`);
  const sorted = [...new Set(current)].sort();

  if (process.env.UPDATE_BASELINE === '1' || !fs.existsSync(file)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
    return;
  }

  const baseline: string[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  const added = sorted.filter((x) => !baseline.includes(x));
  const paid = baseline.filter((x) => !sorted.includes(x));
  if (paid.length) {
    console.info(`[ratchet:${name}] ${paid.length} item(ns) corrigido(s). Rode UPDATE_BASELINE=1 npm test para travar o ganho.`);
  }
  expect(added, `[ratchet:${name}] NOVA dívida introduzida (${added.length}). Corrija em vez de adicionar ao baseline:\n${added.join('\n')}`).toEqual([]);
}

export function ratchetCounts(name: string, current: Record<string, number>) {
  const file = path.join(DIR, `${name}.json`);
  const sortedEntries = Object.entries(current).sort(([a], [b]) => a.localeCompare(b));
  const sorted = Object.fromEntries(sortedEntries);

  if (process.env.UPDATE_BASELINE === '1' || !fs.existsSync(file)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
    return;
  }

  const baseline: Record<string, number> = JSON.parse(fs.readFileSync(file, 'utf8'));
  const worse = Object.entries(sorted)
    .filter(([k, v]) => v > (baseline[k] ?? 0))
    .map(([k, v]) => `${k}: ${baseline[k] ?? 0} -> ${v}`);
  expect(worse, `[ratchet:${name}] Aumentou em:\n${worse.join('\n')}`).toEqual([]);
}
