import { SalaryEntryRecord, SalaryTableRecord } from '../../../services/salaryTablesService';

export const CLASS_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type ClassKey = (typeof CLASS_KEYS)[number];

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getEntryClassValue(entry: SalaryEntryRecord, code: ClassKey): number | null {
  const key = `class_${code.toLowerCase()}` as keyof SalaryEntryRecord;
  const val = entry[key];
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val !== null && val !== undefined && val !== '') {
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export function setEntryClassValue(entry: SalaryEntryRecord, code: ClassKey, value: number | null): SalaryEntryRecord {
  const key = `class_${code.toLowerCase()}` as keyof SalaryEntryRecord;
  return { ...entry, [key]: value };
}

export function parseBrazilianNumber(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s*]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const num = Number(normalized);
  return Number.isFinite(num) ? roundCurrency(num) : null;
}

export function parsePercentString(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

/**
 * Avaliador seguro de expressões aritméticas (+, -, *, /, parênteses) sem uso de eval.
 */
function evaluateArithmeticExpression(expr: string): number | null {
  const tokens = expr.match(/(\d+(?:\.\d+)?|[+\-*/()])/g);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;

  const parseExpression = (): number => {
    let left = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++];
      const right = parseFactor();
      if (op === '/') {
        if (right === 0) throw new Error('Divisão por zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  };

  const parseFactor = (): number => {
    const token = tokens[pos];
    if (token === '(') {
      pos++;
      const val = parseExpression();
      if (tokens[pos] === ')') pos++;
      return val;
    }
    if (token === '-') {
      pos++;
      return -parseFactor();
    }
    if (token === '+') {
      pos++;
      return parseFactor();
    }
    pos++;
    const num = Number(token);
    if (!Number.isFinite(num)) throw new Error(`Token inválido: ${token}`);
    return num;
  };

  try {
    const result = parseExpression();
    return Number.isFinite(result) ? roundCurrency(result) : null;
  } catch {
    return null;
  }
}

export interface FormulaContext {
  baseValue: number | null;
  entry: SalaryEntryRecord;
  colCode: ClassKey;
}

/**
 * Avalia entrada de célula estilo planilha:
 * - Número simples: "1980,00" ou "1980.00"
 * - Fórmula com "=": "=A*1.05", "=ANT*1.05", "=BASE*1.10", "=SOMA(A:H)", "=MEDIA(A:H)"
 */
export function evaluateCellInput(rawInput: string, ctx: FormulaContext): number | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('=')) {
    return parseBrazilianNumber(trimmed);
  }

  let expr = trimmed.slice(1).trim().toUpperCase().replace(/,/g, '.');

  // Funções de agregação: SOMA(A:H) e MEDIA(A:H)
  const colIdx = CLASS_KEYS.indexOf(ctx.colCode);
  const prevCode = colIdx > 0 ? CLASS_KEYS[colIdx - 1] : null;
  const prevVal = prevCode ? getEntryClassValue(ctx.entry, prevCode) : null;

  expr = expr.replace(/SOMA\(A:H\)/g, () => {
    const sum = CLASS_KEYS.reduce((acc, c) => acc + (getEntryClassValue(ctx.entry, c) || 0), 0);
    return String(sum);
  });

  expr = expr.replace(/MEDIA\(A:H\)/g, () => {
    const vals = CLASS_KEYS.map(c => getEntryClassValue(ctx.entry, c)).filter((v): v is number => v !== null);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return String(avg);
  });

  // Substitui variáveis BASE, ANTERIOR / ANT e colunas A..H
  expr = expr
    .replace(/\bBASE\b/g, String(ctx.baseValue ?? 0))
    .replace(/\b(ANTERIOR|ANT)\b/g, String(prevVal ?? 0))
    .replace(/\b([A-H])\b/g, (_, col: ClassKey) => String(getEntryClassValue(ctx.entry, col) ?? 0));

  return evaluateArithmeticExpression(expr);
}

/**
 * Aplica reajuste percentual linear em toda a tabela (ex: +5% ou -2%).
 */
export function applyPercentageAdjustment(table: SalaryTableRecord, percent: number): SalaryTableRecord {
  const factor = 1 + percent / 100;
  const entries = table.entries.map(entry => {
    let updated = { ...entry };
    CLASS_KEYS.forEach(code => {
      const val = getEntryClassValue(entry, code);
      if (val !== null) {
        updated = setEntryClassValue(updated, code, roundCurrency(val * factor));
      }
    });
    return updated;
  });
  const refRow = entries.find(e => e.level_code.toUpperCase().startsWith('REF')) || entries[0];
  return {
    ...table,
    base_salary: refRow?.class_a ?? table.base_salary,
    entries
  };
}

/**
 * Recalcula progressão horizontal (Classes A -> H) a partir da Classe A de cada nível.
 */
export function applyHorizontalProgression(
  table: SalaryTableRecord,
  stepPercent: number,
  mode: 'compound' | 'simple_over_a' = 'compound'
): SalaryTableRecord {
  const entries = table.entries.map(entry => {
    const classA = getEntryClassValue(entry, 'A');
    if (classA === null) return entry;

    let updated = { ...entry };
    let prev = classA;
    CLASS_KEYS.forEach((code, idx) => {
      if (idx === 0) return;
      const nextVal =
        mode === 'compound'
          ? roundCurrency(prev * (1 + stepPercent / 100))
          : roundCurrency(classA * (1 + (stepPercent * idx) / 100));
      updated = setEntryClassValue(updated, code, nextVal);
      prev = nextVal;
    });
    return updated;
  });
  return { ...table, entries };
}

/**
 * Recalcula progressão vertical (Níveis I, II, III...) aplicando o Por% da linha sobre a linha REF.
 */
export function applyVerticalProgression(table: SalaryTableRecord): SalaryTableRecord {
  if (table.entries.length === 0) return table;
  const refRow = table.entries.find(e => e.level_code.toUpperCase().startsWith('REF')) || table.entries[0];

  const entries = table.entries.map((entry, idx) => {
    if (entry.id === refRow.id || idx === 0) return entry;
    const pct = parsePercentString(entry.level_percent);
    if (pct === null) return entry;

    let updated = { ...entry };
    CLASS_KEYS.forEach(code => {
      const baseColVal = getEntryClassValue(refRow, code);
      if (baseColVal !== null) {
        updated = setEntryClassValue(updated, code, roundCurrency(baseColVal * (1 + pct / 100)));
      }
    });
    return updated;
  });

  return { ...table, entries };
}

/**
 * Define novo Salário Base (REF. / A) e recalcula toda a matriz horizontal e verticalmente.
 */
export function applyNewBaseSalaryAndRecalculate(
  table: SalaryTableRecord,
  newBaseSalary: number,
  horizontalStepPercent: number
): SalaryTableRecord {
  if (table.entries.length === 0) return table;
  const updatedEntries = table.entries.map((entry, idx) => {
    if (idx === 0 || entry.level_code.toUpperCase().startsWith('REF')) {
      return setEntryClassValue(entry, 'A', roundCurrency(newBaseSalary));
    }
    return entry;
  });

  const withHorizontal = applyHorizontalProgression(
    { ...table, base_salary: roundCurrency(newBaseSalary), entries: updatedEntries },
    horizontalStepPercent,
    'compound'
  );
  return applyVerticalProgression(withHorizontal);
}
