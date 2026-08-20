import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  headerColor?: string; // Hex ARGB e.g. "FF7C3AED" (Purple) or "FF1E293B" (Slate)
}

/**
 * Exporta dados tabulares para um arquivo Excel (.xlsx) estilizado profissionalmente com ExcelJS
 */
export async function exportToExcel(
  columns: string[],
  data: Record<string, any>[],
  options: ExcelExportOptions = {}
): Promise<void> {
  const {
    fileName = 'Extracao_PDF_Gestao360',
    sheetName = 'Dados Extraídos',
    title = 'GESTÃO 360 - EXTRAÇÃO INTELIGENTE DE PDF',
    subtitle = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • Total de Registros: ${data.length}`,
    headerColor = 'FF7C3AED' // Roxo moderno institucional
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestão 360';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // Linha 1: Título Principal
  worksheet.mergeCells(1, 1, 1, Math.max(columns.length, 3));
  const titleRow = worksheet.getRow(1);
  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Linha 2: Subtítulo
  worksheet.mergeCells(2, 1, 2, Math.max(columns.length, 3));
  const subRow = worksheet.getRow(2);
  subRow.height = 20;
  const subCell = subRow.getCell(1);
  subCell.value = subtitle;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Linha 3: Espaçador
  worksheet.getRow(3).height = 10;

  // Linha 4: Cabeçalho das Colunas
  const headerRowNumber = 4;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 26;

  columns.forEach((col, idx) => {
    const colIndex = idx + 1;
    const cell = headerRow.getCell(colIndex);
    cell.value = col;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // Inserção dos dados
  data.forEach((item, rowIdx) => {
    const currentRowNumber = headerRowNumber + 1 + rowIdx;
    const row = worksheet.getRow(currentRowNumber);
    row.height = 22;
    const isEven = rowIdx % 2 === 0;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      let val = item[col];

      if (val === undefined || val === null) {
        val = '';
      }

      // Detecção de números / moedas
      if (typeof val === 'number') {
        cell.value = val;
        cell.numFmt = '#,##0.00';
      } else if (typeof val === 'string' && /^R\$\s?[\d.,]+$/.test(val.trim())) {
        const numClean = parseFloat(val.replace('R$', '').trim().replace(/\./g, '').replace(',', '.'));
        if (!isNaN(numClean)) {
          cell.value = numClean;
          cell.numFmt = '"R$" #,##0.00';
        } else {
          cell.value = val;
        }
      } else {
        cell.value = String(val);
      }

      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
      cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Ajuste automático de largura das colunas
  columns.forEach((col, idx) => {
    let maxLength = col.length;
    data.forEach(row => {
      const valStr = String(row[col] ?? '');
      if (valStr.length > maxLength) {
        maxLength = Math.min(valStr.length, 60); // Limita em 60 caracteres
      }
    });
    const colWidth = Math.max(maxLength + 4, 15);
    worksheet.getColumn(idx + 1).width = colWidth;
  });

  // Gera o buffer e dispara download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeFileName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, safeFileName);
}

/**
 * Exporta dados tabulares para arquivo CSV delimitado por ponto e vírgula (padrão Brasil/Excel)
 */
export function exportToCsv(
  columns: string[],
  data: Record<string, any>[],
  fileName: string = 'Extracao_PDF_Gestao360'
): void {
  const header = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(';');
  const rows = data.map(item => {
    return columns.map(col => {
      const val = item[col] !== undefined && item[col] !== null ? String(item[col]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(';');
  });

  // Adiciona BOM UTF-8 (\uFEFF) para garantir abertura correta no Excel com acentuação
  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeFileName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, safeFileName);
}

/**
 * Copia os dados no formato TSV para a área de transferência (permite colar direto no Excel ou Google Sheets)
 */
export async function copyToClipboardAsTsv(
  columns: string[],
  data: Record<string, any>[]
): Promise<boolean> {
  try {
    const header = columns.join('\t');
    const rows = data.map(item => {
      return columns.map(col => {
        const val = item[col] !== undefined && item[col] !== null ? String(item[col]) : '';
        return val.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
      }).join('\t');
    });

    const tsvContent = [header, ...rows].join('\n');
    await navigator.clipboard.writeText(tsvContent);
    return true;
  } catch (err) {
    console.error('Erro ao copiar para clipboard:', err);
    return false;
  }
}
