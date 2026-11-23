/**
 * Utilitário unificado de geração e leitura de planilhas (.xlsx e .csv) via ExcelJS.
 * Substitui o antigo pacote `xlsx` (vulnerabilidades conhecidas sem patch no npm).
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface SheetExportSpec {
  name: string;
  rows: Array<Record<string, unknown>> | unknown[][];
  colWidths?: number[];
}

export interface ParsedSpreadsheet {
  sheetNames: string[];
  rowsBySheet: Record<string, unknown[][]>;
  objectsBySheet: Record<string, Record<string, unknown>[]>;
}

function normalizeCellValue(val: ExcelJS.CellValue): unknown {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return val.toLocaleDateString('pt-BR');
  }
  if (typeof val === 'object') {
    const obj = val as unknown as Record<string, unknown>;
    if ('result' in obj && obj.result !== undefined) {
      return normalizeCellValue(obj.result as ExcelJS.CellValue);
    }
    if ('text' in obj && typeof obj.text === 'string') {
      return obj.text;
    }
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return obj.richText.map((part: any) => String(part?.text || '')).join('');
    }
    if ('hyperlink' in obj && 'text' in obj) {
      return String(obj.text || '');
    }
    return String(val);
  }
  return val;
}

function parseCsvText(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const firstLine = cleanText.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolons >= commas ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c !== ''));
}

function matrixToObjects(matrix: unknown[][]): Record<string, unknown>[] {
  if (matrix.length < 2) return [];
  const rawHeaders = matrix[0];
  const headers = rawHeaders.map((h, idx) => {
    const label = String(h ?? '').trim();
    return label || `Coluna_${idx + 1}`;
  });

  const objects: Record<string, unknown>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const hasValue = line.some((cell) => String(cell ?? '').trim() !== '');
    if (!hasValue) continue;

    const record: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = line[c] !== undefined ? line[c] : '';
    }
    objects.push(record);
  }
  return objects;
}

export async function downloadWorkbookXlsx(
  sheets: SheetExportSpec[],
  fileName: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestão 360';
  workbook.created = new Date();

  for (const spec of sheets) {
    const safeName = (spec.name || 'Dados').replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
    const worksheet = workbook.addWorksheet(safeName);

    const rows = spec.rows || [];
    if (rows.length > 0) {
      if (Array.isArray(rows[0])) {
        const aoa = rows as unknown[][];
        aoa.forEach((line) => worksheet.addRow(line));
      } else {
        const objs = rows as Record<string, unknown>[];
        const headers = Array.from(
          objs.reduce((set, row) => {
            Object.keys(row).forEach((k) => set.add(k));
            return set;
          }, new Set<string>())
        );
        worksheet.addRow(headers);
        objs.forEach((row) => {
          worksheet.addRow(headers.map((h) => row[h] ?? ''));
        });
      }
    }

    if (spec.colWidths && spec.colWidths.length > 0) {
      spec.colWidths.forEach((w, idx) => {
        const col = worksheet.getColumn(idx + 1);
        if (col) col.width = w;
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const finalName = fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  saveAs(blob, finalName);
}

export async function readSpreadsheetRows(fileOrBuffer: File | ArrayBuffer): Promise<ParsedSpreadsheet> {
  let fileName = '';
  let buffer: ArrayBuffer;

  if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
  } else {
    fileName = (fileOrBuffer.name || '').toLowerCase();
    buffer = await fileOrBuffer.arrayBuffer();
  }

  const bytes = new Uint8Array(buffer);
  const isZipXlsx = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK'
  const isOldBinaryXls =
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;

  if (isOldBinaryXls) {
    throw new Error(
      'O formato binário antigo (.xls) não é suportado por segurança. Salve a planilha como .xlsx (Excel moderno) ou .csv.'
    );
  }

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || !isZipXlsx) {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes);
    const matrix = parseCsvText(text);
    return {
      sheetNames: ['Dados'],
      rowsBySheet: { Dados: matrix },
      objectsBySheet: { Dados: matrixToObjects(matrix) },
    };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheetNames: string[] = [];
  const rowsBySheet: Record<string, unknown[][]> = {};
  const objectsBySheet: Record<string, Record<string, unknown>[]> = {};

  workbook.eachSheet((worksheet) => {
    const name = worksheet.name;
    sheetNames.push(name);
    const matrix: unknown[][] = [];

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as ExcelJS.CellValue[];
      // row.values no ExcelJS é 1-based (índice 0 vazio)
      const normalized = values.slice(1).map(normalizeCellValue);
      matrix.push(normalized);
    });

    rowsBySheet[name] = matrix;
    objectsBySheet[name] = matrixToObjects(matrix);
  });

  return { sheetNames, rowsBySheet, objectsBySheet };
}
