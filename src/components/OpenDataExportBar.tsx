import React from 'react';
import * as XLSX from 'xlsx';
import { Download, FileCode, FileJson, FileSpreadsheet, FileText } from 'lucide-react';

export interface OpenDataExportBarProps {
  data: Record<string, unknown>[];
  filename: string;
  title?: string;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Barra Universal de Exportação em Dados Abertos (PNTP / Lei 12.527/2011).
 * Permite download imediato dos registros filtrados em CSV, JSON, XML e XLSX/ODS.
 */
export const OpenDataExportBar: React.FC<OpenDataExportBarProps> = ({
  data,
  filename,
  title = 'Exportar Dados Abertos (PNTP)',
}) => {
  const safeBase = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

  const exportCsv = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(';')
    );
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${safeBase}.csv`);
  };

  const exportJson = () => {
    const json = JSON.stringify(data, null, 2);
    triggerDownload(new Blob([json], { type: 'application/json;charset=utf-8;' }), `${safeBase}.json`);
  };

  const exportXml = () => {
    const itemsXml = data
      .map((row) => {
        const fields = Object.entries(row)
          .map(([k, v]) => {
            const tag = k.replace(/[^a-zA-Z0-9_]/g, '_');
            const val = typeof v === 'object' ? JSON.stringify(v) : v;
            return `    <${tag}>${escapeXml(val)}</${tag}>`;
          })
          .join('\n');
        return `  <registro>\n${fields}\n  </registro>`;
      })
      .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<dados_abertos total="${data.length}">\n${itemsXml}\n</dados_abertos>`;
    triggerDownload(new Blob([xml], { type: 'application/xml;charset=utf-8;' }), `${safeBase}.xml`);
  };

  const exportXlsx = () => {
    if (!data.length) return;
    const flat = data.map((row) => {
      const out: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = typeof v === 'object' && v !== null ? JSON.stringify(v) : (v as string | number | boolean) ?? '';
      }
      return out;
    });
    const worksheet = XLSX.utils.json_to_sheet(flat);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DadosAbertos');
    const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    triggerDownload(
      new Blob([outBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${safeBase}.xlsx`
    );
  };

  return (
    <div
      role="region"
      aria-label={title}
      className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-neutral-800/70 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-neutral-200">
        <Download size={14} />
        <span>{title}</span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
          ({data.length} {data.length === 1 ? 'registro' : 'registros'})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data.length}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-[11px] font-bold text-slate-800 dark:text-neutral-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          <FileText size={13} /> CSV
        </button>
        <button
          type="button"
          onClick={exportJson}
          disabled={!data.length}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-[11px] font-bold text-slate-800 dark:text-neutral-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          <FileJson size={13} /> JSON
        </button>
        <button
          type="button"
          onClick={exportXml}
          disabled={!data.length}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-[11px] font-bold text-slate-800 dark:text-neutral-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
        >
          <FileCode size={13} /> XML
        </button>
        <button
          type="button"
          onClick={exportXlsx}
          disabled={!data.length}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
        >
          <FileSpreadsheet size={13} /> XLSX / ODS
        </button>
      </div>
    </div>
  );
};

export default OpenDataExportBar;
