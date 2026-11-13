import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite resolves ?url imports to local static asset path
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorkerUrl ||
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
  }
}

export interface ParsedFichaOrcamentaria {
  ficha: string;
  cloc: string;
  orgao: string;
  unidade: string;
  funcProg: string;
  acaoDescricao: string;
  categoria: string;
  especificacao: string;
  fonteRecurso: string;
  dotacaoInicial: number;
  alteracaoPdf: number;
  dotacaoAtual: number;
}

export interface ParsedFichasDocument {
  municipio: string;
  exercicio: number;
  pageCount: number;
  fichas: ParsedFichaOrcamentaria[];
  pdfTotalInicial?: number;
  pdfTotalAlteracao?: number;
  pdfTotalAtual?: number;
}

/**
 * Converte número no padrão brasileiro (ex: "1.381.602,75" ou "-49.999,99") para number.
 */
export function parsePtBrCurrency(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (!raw) return 0;
  const cleaned = String(raw).trim().replace(/\s+/g, '');
  if (!cleaned) return 0;
  // Se possui vírgula, assume formato pt-BR (pontos de milhar, vírgula decimal)
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface TextToken {
  str: string;
  x: number;
  y: number;
}

/**
 * Reconstrói linhas visuais de uma página PDF agrupando tokens por coordenada Y
 * e ordenando por coordenada X.
 */
function groupTokensIntoLines(items: any[]): string[] {
  const tokens: TextToken[] = [];
  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    const text = item.str;
    if (!text.trim()) continue;
    const transform = item.transform;
    const x = Array.isArray(transform) ? Number(transform[4]) || 0 : 0;
    const y = Array.isArray(transform) ? Number(transform[5]) || 0 : 0;
    tokens.push({ str: text, x, y });
  }

  // Ordena de cima para baixo (y decrescente) e esquerda para direita (x crescente)
  tokens.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 2.5) return b.y - a.y;
    return a.x - b.x;
  });

  const rows: TextToken[][] = [];
  for (const token of tokens) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - token.y) <= 2.5) {
      // Relatórios Fiorilli simulam negrito imprimindo o mesmo texto 2-4x nas mesmas coordenadas
      const isShadowDuplicate = lastRow.some(
        (existing) =>
          existing.str === token.str &&
          Math.abs(existing.x - token.x) <= 2.5 &&
          Math.abs(existing.y - token.y) <= 2.5
      );
      if (!isShadowDuplicate) {
        lastRow.push(token);
      }
    } else {
      rows.push([token]);
    }
  }

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = '';
    let prevEnd = -1;
    for (const t of row) {
      if (prevEnd >= 0 && t.x - prevEnd > 3) {
        line += ' ';
      }
      line += t.str;
      prevEnd = t.x + t.str.length * 4;
    }
    return line.replace(/\s+/g, ' ').trim();
  });
}

const BR_NUM_PATTERN = '-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}';
const TRAILING_NUMS_RE = new RegExp(`((?:\\s+${BR_NUM_PATTERN})+)\\s*$`);
const FLEX_TRAILING_NUMS_RE = new RegExp(
  `(?:^|\\s|(?<=[A-Za-zÀ-ÿ]))(${BR_NUM_PATTERN}(?:\\s+${BR_NUM_PATTERN})*)\\s*$`
);
const THREE_NUMS_END_RE = new RegExp(
  `(${BR_NUM_PATTERN})\\s+(${BR_NUM_PATTERN})\\s+(${BR_NUM_PATTERN})\\s*$`
);
const TWO_NUMS_END_RE = new RegExp(`(${BR_NUM_PATTERN})\\s+(${BR_NUM_PATTERN})\\s*$`);
const ONE_NUM_END_RE = new RegExp(`(${BR_NUM_PATTERN})\\s*$`);

/**
 * Detecta, pela linha de cabeçalho do PDF, qual coluna numérica (contada de trás para frente)
 * representa o Saldo Atual (ou Dotação Atual caso não haja coluna de Saldo), evitando Empenhado.
 */
function detectSaldoOffsetFromEnd(headerLine: string): number {
  const norm = headerLine
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const tokens: { label: string; pos: number }[] = [];
  const patterns: [string, RegExp][] = [
    ['inicial', /dotac(?:ao)?\s*inicial/g],
    ['alteracao', /alterac(?:ao|oes)/g],
    ['dotacao_atual', /dotac(?:ao)?\s*atual/g],
    ['suplementado', /suplementad/g],
    ['anulado', /anulad/g],
    ['empenhado', /empenhad/g],
    ['liquidado', /liquidad/g],
    ['pago', /\bpago\b/g],
    ['saldo', /saldo\s*(?:atual|disponivel|a\s*empenhar|orcamentario)?/g],
  ];

  for (const [label, re] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm)) !== null) {
      tokens.push({ label, pos: m.index });
    }
  }

  if (tokens.length === 0) return 0; // último número
  tokens.sort((a, b) => a.pos - b.pos);

  const saldoIdx = tokens.findIndex((t) => t.label === 'saldo');
  if (saldoIdx !== -1) {
    return tokens.length - 1 - saldoIdx;
  }
  const dotAtualIdx = tokens.findIndex((t) => t.label === 'dotacao_atual');
  if (dotAtualIdx !== -1) {
    return tokens.length - 1 - dotAtualIdx;
  }
  return 0;
}

function isHeaderOrFooterNoise(line: string): boolean {
  return (
    /^PREFEITURA\s+MUNICIPAL/i.test(line) ||
    /^RUA\s+/i.test(line) ||
    /^EXECUÇÃO\s+ORÇAMENTÁRIA/i.test(line) ||
    /^Ficha\s+CLoc/i.test(line) ||
    /^Fonte\s+Rec/i.test(line) ||
    /^Cod\s+Aplicação/i.test(line) ||
    /^Entidade$/i.test(line) ||
    /^Fiorilli\s+S\/C/i.test(line) ||
    /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/i.test(line) ||
    /^Usuário:/i.test(line)
  );
}

/**
 * Extrai categoria, especificação e fonte de recurso do miolo da linha da ficha.
 */
function parseMiddleColumns(middle: string): {
  categoria: string;
  especificacao: string;
  fonteRecurso: string;
} {
  let remaining = middle.trim();
  let categoria = '';
  let especificacao = remaining;
  let fonteRecurso = '';

  // Ex: "4.4.90.00.00APLICAÇÕES DIRETAS" ou "4.4.90.00.00 APLICAÇÕES DIRETAS"
  const catMatch = remaining.match(/^(\d\.\d\.\d{2}\.\d{2}\.\d{2})\s*(.*)$/);
  if (catMatch) {
    categoria = catMatch[1];
    remaining = catMatch[2].trim();
  }

  // Procura bloco de Vinc Inci + Fonte Rec / Cod Aplicação no final do miolo
  // Ex: "1 1.1.500/110.000 1.500" ou "1 2.1.540/200.000 1.540.1070" ou "1 ../001.001"
  const fonteMatch = remaining.match(
    /\s+\d+\s+((?:\d+\.\d+\.\d+|\.\.)\/[\d.]+(?:\s+[\d.]+)?)\s*$/
  );
  if (fonteMatch && fonteMatch.index !== undefined) {
    fonteRecurso = fonteMatch[1].trim();
    especificacao = remaining.slice(0, fonteMatch.index).trim();
  } else {
    especificacao = remaining;
  }

  return { categoria, especificacao, fonteRecurso };
}

function isListagemFichasFormat(lines: string[]): boolean {
  const sample = lines.slice(0, 80);
  if (
    sample.some(
      (line) =>
        /LISTAGEM\s+DAS\s+FICHAS\s+DA\s+DESPESA/i.test(line) ||
        /Saldo\s+Com\s+Reserva/i.test(line),
    )
  ) {
    return true;
  }
  return sample.some((line) => /^\d{3,4}\s+(?:OR|ES)\b/.test(line));
}

/**
 * Faz o parse do relatório padrão Fiorilli "LISTAGEM DAS FICHAS DA DESPESA",
 * extraindo exclusivamente o Saldo Atual (Saldo / Saldo Com Reserva) de cada ficha.
 */
function parseListagemFichasLines(lines: string[], pageCount = 1): ParsedFichasDocument {
  let municipio = '';
  let exercicio = new Date().getFullYear();
  let currentOrgao = '';
  let currentUnidade = '';
  let currentFuncProg = '';
  let currentAcao = '';
  let pdfTotalInicial: number | undefined;
  let pdfTotalAlteracao: number | undefined;
  let pdfTotalAtual: number | undefined;

  const fichasMap = new Map<string, ParsedFichaOrcamentaria>();
  let activeFicha: ParsedFichaOrcamentaria | null = null;
  let orphanRow1: {
    categoria: string;
    especificacao: string;
    dotacaoInicial: number;
    alteracaoPdf: number;
  } | null = null;
  let expectingTotalSecondLine = false;

  const isListagemNoise = (line: string): boolean => {
    const t = line.trim();
    if (!t) return true;
    return (
      /^PREFEITURA\s+MUNICIPAL/i.test(t) ||
      /^C[ÂA]MARA\s+MUNICIPAL/i.test(t) ||
      /^[\d./-]+\s+Exerc[íi]cio:/i.test(t) ||
      /^Exerc[íi]cio:/i.test(t) ||
      /^LISTAGEM\s+DAS\s+FICHAS\s+DA\s+DESPESA/i.test(t) ||
      /^SITUA[ÇC][ÃA]O\s+AT[ÉE]/i.test(t) ||
      /^Entid\.\s+CLoc/i.test(t) ||
      /^Ficha\s+F\.R\.\s+C\.A\./i.test(t) ||
      /^Saldo\s+Reserva\s+Saldo\s+Com\s+Reserva/i.test(t) ||
      /^Fiorilli\s+S\/C/i.test(t) ||
      /^P[áa]gina\s+\d+/i.test(t) ||
      /^={3,}/.test(t) ||
      /^-{3,}/.test(t)
    );
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!municipio && /^PREFEITURA\s+MUNICIPAL/i.test(line)) {
      municipio = line;
    }

    const exMatch = line.match(/Exerc[íi]cio:\s*(\d{4})/i);
    if (exMatch) {
      exercicio = Number(exMatch[1]);
    }

    if (isListagemNoise(line)) {
      continue;
    }

    if (/^TOTAL\s+GERAL\b/i.test(line)) {
      const numsMatch = line.match(TRAILING_NUMS_RE);
      if (numsMatch) {
        const vals = (numsMatch[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || []).map(parsePtBrCurrency);
        if (vals.length >= 3) {
          pdfTotalInicial = vals[0];
          pdfTotalAlteracao = vals[1] + (vals[2] ?? 0);
        }
      }
      expectingTotalSecondLine = true;
      activeFicha = null;
      orphanRow1 = null;
      continue;
    }

    if (expectingTotalSecondLine) {
      const onlyNums = line.match(new RegExp(`^(${BR_NUM_PATTERN}(?:\\s+${BR_NUM_PATTERN})*)$`));
      if (onlyNums) {
        const vals = (onlyNums[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || []).map(parsePtBrCurrency);
        if (vals.length >= 2) {
          pdfTotalAtual = vals[vals.length - 1];
        }
        continue;
      }
      expectingTotalSecondLine = false;
    }

    if (/^TOTAL\s+/i.test(line)) {
      activeFicha = null;
      orphanRow1 = null;
      continue;
    }

    const clocMatch = line.match(/^(\d{6})\s+(.+)$/);
    if (clocMatch) {
      currentUnidade = `${clocMatch[1]} ${clocMatch[2].trim()}`;
      continue;
    }

    const funcProgMatch = line.match(/^(\d{2}\s+\d{3}\s+\d{4}\s+\d{4}\s+\d{4})\s+(.+)$/);
    if (funcProgMatch) {
      currentFuncProg = funcProgMatch[1];
      currentAcao = funcProgMatch[2].trim();
      continue;
    }

    if (
      /^\d{2}\s+[A-ZÀ-Ú]/.test(line) &&
      !/^\d{2}\s+\d{3}\s+\d{4}/.test(line) &&
      !TRAILING_NUMS_RE.test(line)
    ) {
      currentOrgao = line;
      continue;
    }

    // Caso de quebra de página: `<ficha> <OR|ES>` isolado após linha órfã de categoria/valores
    const splitFichaOnly = line.match(/^(\d{3,4})\s+(OR|ES)$/);
    if (splitFichaOnly && orphanRow1) {
      const fichaNum = splitFichaOnly[1].padStart(3, '0');
      const created: ParsedFichaOrcamentaria = {
        ficha: fichaNum,
        cloc: currentUnidade.slice(0, 6),
        orgao: currentOrgao,
        unidade: currentUnidade,
        funcProg: currentFuncProg,
        acaoDescricao: currentAcao,
        categoria: orphanRow1.categoria,
        especificacao: orphanRow1.especificacao,
        fonteRecurso: '',
        dotacaoInicial: orphanRow1.dotacaoInicial,
        alteracaoPdf: orphanRow1.alteracaoPdf,
        dotacaoAtual: 0,
      };
      fichasMap.set(fichaNum, created);
      activeFicha = created;
      orphanRow1 = null;
      continue;
    }

    // Linha 1 da Ficha: `<ficha> <OR|ES> <catgo/especificacao> <4 valores>`
    const row1Match = line.match(/^(\d{3,4})\s+(OR|ES)\s+(.+)$/);
    if (row1Match) {
      const fichaNum = row1Match[1].padStart(3, '0');
      const rest = row1Match[3];
      const numsMatch = rest.match(FLEX_TRAILING_NUMS_RE);
      if (numsMatch) {
        const vals = (numsMatch[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || []).map(parsePtBrCurrency);
        const prefix = rest.slice(0, rest.length - numsMatch[0].length).trim();
        const catMatch = prefix.match(/^(\d\.\d\.\d{2}\.\d{2}\.\d{2})\s*(.*)$/);
        const categoria = catMatch ? catMatch[1] : '';
        const especificacao = (catMatch ? catMatch[2] : prefix).trim();

        const dotacaoInicial = vals[0] ?? 0;
        const alteracaoPos = vals[1] ?? 0;
        const alteracaoNeg = vals[2] ?? 0;

        const created: ParsedFichaOrcamentaria = {
          ficha: fichaNum,
          cloc: currentUnidade.slice(0, 6),
          orgao: currentOrgao,
          unidade: currentUnidade,
          funcProg: currentFuncProg,
          acaoDescricao: currentAcao,
          categoria,
          especificacao,
          fonteRecurso: '',
          dotacaoInicial,
          alteracaoPdf: alteracaoPos + alteracaoNeg,
          dotacaoAtual: 0,
        };
        fichasMap.set(fichaNum, created);
        activeFicha = created;
        orphanRow1 = null;
        continue;
      }
    }

    // Linha 1 órfã no fim da página: `<catgo><especificacao> <4 valores>` sem `<ficha> <OR|ES>`
    const orphanCatMatch = line.match(/^(\d\.\d\.\d{2}\.\d{2}\.\d{2})\s*(.+)$/);
    if (orphanCatMatch) {
      const numsMatch = line.match(FLEX_TRAILING_NUMS_RE);
      if (numsMatch) {
        const vals = (numsMatch[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || []).map(parsePtBrCurrency);
        if (vals.length >= 4) {
          const restNoNums = orphanCatMatch[2]
            .slice(0, orphanCatMatch[2].length - numsMatch[0].length)
            .trim();
          orphanRow1 = {
            categoria: orphanCatMatch[1],
            especificacao: restNoNums,
            dotacaoInicial: vals[0] ?? 0,
            alteracaoPdf: (vals[1] ?? 0) + (vals[2] ?? 0),
          };
          continue;
        }
      }
    }

    // Linha 2 da Ficha: `<F.R.> <C.A.> <Descrição C.A.> <Empenhado> <Saldo>`
    const row2Match = line.match(/^(\d+\.\d+\.\d+|\.\.)\s+([\d.]+)\s+(.+)$/);
    if (row2Match && activeFicha) {
      const fr = row2Match[1];
      const ca = row2Match[2];
      const rest = row2Match[3];
      const numsMatch = rest.match(TRAILING_NUMS_RE);
      if (numsMatch) {
        const vals = (numsMatch[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || []).map(parsePtBrCurrency);
        const caDesc = rest.slice(0, rest.length - numsMatch[0].length).trim();
        activeFicha.fonteRecurso = `${fr} ${ca} ${caDesc}`.trim();
        if (vals.length >= 2) {
          // Puxa exclusivamente o Saldo Atual (2º número da linha 2), nunca Empenhado
          activeFicha.dotacaoAtual = vals[vals.length - 1];
        }
      }
      continue;
    }

    // Linha 3 da Ficha: `<Saldo Reserva> <Saldo Com Reserva>`
    const row3Match = line.match(new RegExp(`^(${BR_NUM_PATTERN})\\s+(${BR_NUM_PATTERN})$`));
    if (row3Match && activeFicha) {
      activeFicha.dotacaoAtual = parsePtBrCurrency(row3Match[2]);
      continue;
    }
  }

  return {
    municipio: municipio || 'Prefeitura Municipal',
    exercicio,
    pageCount,
    fichas: Array.from(fichasMap.values()),
    pdfTotalInicial,
    pdfTotalAlteracao,
    pdfTotalAtual,
  };
}

/**
 * Faz o parse das linhas de texto extraídas do PDF Fiorilli "Fichas da Despesa".
 */
export function parseFiorilliLines(lines: string[], pageCount = 1): ParsedFichasDocument {
  if (isListagemFichasFormat(lines)) {
    return parseListagemFichasLines(lines, pageCount);
  }

  let municipio = '';
  let exercicio = new Date().getFullYear();
  let currentOrgao = '';
  let currentUnidade = '';
  let currentFuncProg = '';
  let currentAcao = '';
  let pdfTotalInicial: number | undefined;
  let pdfTotalAlteracao: number | undefined;
  let pdfTotalAtual: number | undefined;
  let saldoOffsetFromEnd = 0;

  const fichasMap = new Map<string, ParsedFichaOrcamentaria>();
  let pendingSplit: {
    cloc: string;
    middle: string;
    dotacaoInicial: number;
    alteracaoPdf: number;
    orgao: string;
    unidade: string;
    funcProg: string;
    acaoDescricao: string;
  } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!municipio && /^PREFEITURA\s+MUNICIPAL\s+DE\s+/i.test(line)) {
      municipio = line.replace(/^PREFEITURA\s+MUNICIPAL\s+DE\s+/i, '').trim();
      continue;
    }

    const exMatch = line.match(/Exercício:\s*(\d{4})/i);
    if (exMatch) {
      exercicio = Number(exMatch[1]);
      continue;
    }

    if (/^Ficha\s+CLoc/i.test(line) || (/Dotac|Dotação/i.test(line) && /(Empenhad|Saldo|Atual)/i.test(line))) {
      saldoOffsetFromEnd = detectSaldoOffsetFromEnd(line);
      continue;
    }

    if (isHeaderOrFooterNoise(line)) continue;

    // Linha de Total Geral no fim do relatório
    if (/^Total\s+/i.test(line)) {
      const totAll = line.match(TRAILING_NUMS_RE);
      if (totAll) {
        const nums = (totAll[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || []).map(parsePtBrCurrency);
        if (nums.length >= 3) {
          pdfTotalInicial = nums[0];
          pdfTotalAlteracao = nums[1];
          const targetIdx = Math.max(0, nums.length - 1 - saldoOffsetFromEnd);
          pdfTotalAtual = nums[targetIdx] ?? nums[nums.length - 1];
        }
      }
      continue;
    }

    // 1) Linha padrão de Ficha: "<ficha> <cloc> ... <valores numéricos>" (suporta 3 ou mais colunas: Inicial, Alteração, Atual, Empenhado, Saldo Atual)
    const trailingNumsMatch = line.match(TRAILING_NUMS_RE);
    const fichaPrefixMatch = line.match(/^(\d{3,4})\s+(\d{6})\s+(.+)$/);

    if (trailingNumsMatch && fichaPrefixMatch && trailingNumsMatch.index !== undefined) {
      const numTokens = trailingNumsMatch[1].match(new RegExp(BR_NUM_PATTERN, 'g')) || [];
      if (numTokens.length >= 3) {
        const nums = numTokens.map(parsePtBrCurrency);
        const ficha = fichaPrefixMatch[1];
        const cloc = fichaPrefixMatch[2];
        const prefixLen = ficha.length + 1 + cloc.length;
        const middle = line.slice(prefixLen, trailingNumsMatch.index).trim();
        const { categoria, especificacao, fonteRecurso } = parseMiddleColumns(middle);

        const targetSaldoIdx = Math.max(0, nums.length - 1 - saldoOffsetFromEnd);
        const saldoAtualExtraido = nums[targetSaldoIdx] ?? nums[nums.length - 1];

        fichasMap.set(ficha, {
          ficha,
          cloc,
          orgao: currentOrgao,
          unidade: currentUnidade,
          funcProg: currentFuncProg,
          acaoDescricao: currentAcao,
          categoria,
          especificacao: especificacao || currentAcao || 'Despesa Orçamentária',
          fonteRecurso,
          dotacaoInicial: nums[0],
          alteracaoPdf: nums[1],
          dotacaoAtual: saldoAtualExtraido,
        });
        pendingSplit = null;
        continue;
      }
    }

    // 2) Tratamento de linha quebrada entre páginas (ex: Ficha 264 no relatório Fiorilli)
    if (pendingSplit) {
      const splitEndMatch = line.match(/^(\d{3,4})\s+(.+?)\s+(${BR_NUM_PATTERN})\s*$/);
      const oneNum = line.match(ONE_NUM_END_RE);
      const fichaOnlyStart = line.match(/^(\d{3,4})\s+(.+)$/);
      if (fichaOnlyStart && oneNum && oneNum.index !== undefined && !/^\d{6}/.test(fichaOnlyStart[2])) {
        const ficha = fichaOnlyStart[1];
        const extraSpec = line.slice(ficha.length, oneNum.index).trim();
        const { categoria, especificacao, fonteRecurso } = parseMiddleColumns(
          `${pendingSplit.middle} ${extraSpec}`.trim()
        );
        fichasMap.set(ficha, {
          ficha,
          cloc: pendingSplit.cloc,
          orgao: pendingSplit.orgao,
          unidade: pendingSplit.unidade,
          funcProg: pendingSplit.funcProg,
          acaoDescricao: pendingSplit.acaoDescricao,
          categoria,
          especificacao: especificacao || pendingSplit.acaoDescricao || 'Despesa Orçamentária',
          fonteRecurso,
          dotacaoInicial: pendingSplit.dotacaoInicial,
          alteracaoPdf: pendingSplit.alteracaoPdf,
          dotacaoAtual: parsePtBrCurrency(oneNum[1]),
        });
        pendingSplit = null;
        continue;
      }
      void splitEndMatch;
    }

    const twoNumsMatch = line.match(TWO_NUMS_END_RE);
    const clocStartMatch = line.match(/^(\d{6})\s+(.+)$/);
    if (clocStartMatch && twoNumsMatch && twoNumsMatch.index !== undefined) {
      pendingSplit = {
        cloc: clocStartMatch[1],
        middle: line.slice(clocStartMatch[1].length, twoNumsMatch.index).trim(),
        dotacaoInicial: parsePtBrCurrency(twoNumsMatch[1]),
        alteracaoPdf: parsePtBrCurrency(twoNumsMatch[2]),
        orgao: currentOrgao,
        unidade: currentUnidade,
        funcProg: currentFuncProg,
        acaoDescricao: currentAcao,
      };
      continue;
    }

    // 3) Linhas de hierarquia (Órgão / Unidade / Função-Programa-Ação)
    const acaoMatch = line.match(/^(\d{2}\s+\d{3}\s+\d{4}\s+\d{4}\s+\d{4})\s+(.+)$/);
    if (acaoMatch) {
      currentFuncProg = acaoMatch[1].trim();
      currentAcao = acaoMatch[2].trim();
      continue;
    }

    const unidadeMatch = line.match(/^(\d{2}\s+\d{2}(?:\s+\d{2})?)\s+(.+)$/);
    if (unidadeMatch) {
      const code = unidadeMatch[1].trim();
      const desc = unidadeMatch[2].trim();
      // Se tem 2 pares e não é apenas subfunção (ex: "04 122"), trata como unidade
      if (code.split(/\s+/).length === 3 || /^(GABINETE|SECRETARIA|FUNDO|DIRETORIA|DEPARTAMENTO|SERVICOS|GESTÃO|RESTOS|EXTRA)/i.test(desc)) {
        currentUnidade = `${code} - ${desc}`;
        continue;
      }
    }

    const orgaoMatch = line.match(/^(\d{2})\s+([A-ZÀ-Ú].+)$/);
    if (orgaoMatch) {
      const code = orgaoMatch[1];
      const desc = orgaoMatch[2].trim();
      if (/^(PREFEITURA|SECRETARIA|EXTRA|CAMARA|FUNDO|GABINETE)/i.test(desc)) {
        currentOrgao = `${code} - ${desc}`;
        continue;
      }
    }
  }

  return {
    municipio: municipio || 'Município',
    exercicio,
    pageCount,
    fichas: Array.from(fichasMap.values()),
    pdfTotalInicial,
    pdfTotalAlteracao,
    pdfTotalAtual,
  };
}

/**
 * Lê um arquivo PDF (Fiorilli / Execução Orçamentária - Fichas da Despesa) no navegador.
 */
export async function parseFiorilliFichasPdf(file: File): Promise<ParsedFichasDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const allLines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const pageLines = groupTokensIntoLines(textContent.items || []);
    allLines.push(...pageLines);
  }

  return parseFiorilliLines(allLines, pdf.numPages);
}

/**
 * Lê uma planilha Excel (.xlsx/.xls/.csv) com colunas de Fichas Orçamentárias.
 */
export async function parseFichasSpreadsheet(file: File): Promise<ParsedFichasDocument> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

  const fichas: ParsedFichaOrcamentaria[] = [];
  for (const row of rows) {
    const normalizedEntries = Object.entries(row).map(([k, v]) => [
      k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
      v,
    ] as const);

    const getField = (candidates: string[], exclude: string[] = []): string => {
      for (const c of candidates) {
        const found = normalizedEntries.find(
          ([k]) => k.includes(c) && !exclude.some((ex) => k.includes(ex))
        );
        if (found && String(found[1]).trim() !== '') return String(found[1]).trim();
      }
      return '';
    };

    const ficha = getField(['ficha']);
    if (!ficha || !/\d/.test(ficha)) continue;

    const dotacaoInicial = parsePtBrCurrency(getField(['inicial', 'dotac inicial', 'dotacao inicial']));
    const alteracaoPdf = parsePtBrCurrency(getField(['alteracao']));
    // Prioriza sempre o Saldo Atual da ficha (nunca o valor Empenhado)
    const dotacaoAtual = parsePtBrCurrency(
      getField(
        ['saldo atual', 'saldo disponivel', 'saldo a empenhar', 'saldo orcamentario', 'saldo', 'dotacao atual', 'atual', 'valor'],
        ['empenhado', 'empenhada', 'liquidado', 'pago']
      )
    );

    fichas.push({
      ficha: ficha.padStart(3, '0'),
      cloc: getField(['cloc', 'local']),
      orgao: getField(['orgao', 'secretaria']),
      unidade: getField(['unidade']),
      funcProg: getField(['func', 'programa']),
      acaoDescricao: getField(['acao', 'projeto', 'atividade']),
      categoria: getField(['catgo', 'categoria', 'natureza', 'elemento']),
      especificacao: getField(['especificacao', 'descricao']) || 'Despesa Orçamentária',
      fonteRecurso: getField(['fonte', 'recurso']),
      dotacaoInicial,
      alteracaoPdf,
      dotacaoAtual,
    });
  }

  return {
    municipio: 'Importado via Planilha',
    exercicio: new Date().getFullYear(),
    pageCount: 1,
    fichas,
  };
}

