import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';

export interface TransparencyFilterState {
  year: string;
  startDate: string;
  endDate: string;
  creditor: string;
  document: string;
  processNumber: string;
  department: string;
  keyword: string;
}

export const INITIAL_TRANSPARENCY_FILTERS: TransparencyFilterState = {
  year: String(new Date().getFullYear()),
  startDate: '',
  endDate: '',
  creditor: '',
  document: '',
  processNumber: '',
  department: '',
  keyword: '',
};

export interface TransparencyFilterBarProps {
  filters: TransparencyFilterState;
  onChange: (next: TransparencyFilterState) => void;
  availableYears?: number[];
  departments?: string[];
}

/**
 * Motor de Filtros Combinados do Portal da Transparência (PNTP).
 * Elimina dependência de Ctrl+F com pesquisa nativa por exercício, datas, credor, CPF/CNPJ, processo, secretaria e palavra-chave.
 */
export const TransparencyFilterBar: React.FC<TransparencyFilterBarProps> = ({
  filters,
  onChange,
  availableYears = [2026, 2025, 2024, 2023, 2022],
  departments = [],
}) => {
  const update = (key: keyof TransparencyFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section
      aria-label="Filtros combinados de pesquisa"
      className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
          <Filter size={14} />
          <span>Filtros Combinados de Consulta</span>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...INITIAL_TRANSPARENCY_FILTERS, year: filters.year })}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <RotateCcw size={13} />
          Limpar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label htmlFor="flt-year" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Exercício (Série Histórica)
          </label>
          <select
            id="flt-year"
            value={filters.year}
            onChange={(e) => update('year', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 font-semibold text-slate-900 dark:text-white"
          >
            <option value="all">Todos os exercícios</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="flt-start" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Data Inicial
          </label>
          <input
            id="flt-start"
            type="date"
            value={filters.startDate}
            onChange={(e) => update('startDate', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="flt-end" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Data Final
          </label>
          <input
            id="flt-end"
            type="date"
            value={filters.endDate}
            onChange={(e) => update('endDate', e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="flt-dept" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Secretaria / Órgão
          </label>
          {departments.length > 0 ? (
            <select
              id="flt-dept"
              value={filters.department}
              onChange={(e) => update('department', e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="">Todas as secretarias</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="flt-dept"
              type="text"
              value={filters.department}
              onChange={(e) => update('department', e.target.value)}
              placeholder="Ex.: Saúde, Educação..."
              className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
            />
          )}
        </div>

        <div>
          <label htmlFor="flt-creditor" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Credor / Fornecedor / Servidor
          </label>
          <input
            id="flt-creditor"
            type="text"
            value={filters.creditor}
            onChange={(e) => update('creditor', e.target.value)}
            placeholder="Nome ou razão social..."
            className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="flt-doc" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            CPF / CNPJ
          </label>
          <input
            id="flt-doc"
            type="text"
            value={filters.document}
            onChange={(e) => update('document', e.target.value)}
            placeholder="Somente números ou parcial..."
            className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="flt-proc" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Número de Processo / Edital
          </label>
          <input
            id="flt-proc"
            type="text"
            value={filters.processNumber}
            onChange={(e) => update('processNumber', e.target.value)}
            placeholder="Ex.: 045/2026..."
            className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="flt-keyword" className="block font-bold text-slate-600 dark:text-neutral-400 mb-1">
            Palavra-chave
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              id="flt-keyword"
              type="text"
              value={filters.keyword}
              onChange={(e) => update('keyword', e.target.value)}
              placeholder="Objeto, descrição, cargo..."
              className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 pl-8 pr-3 py-2 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransparencyFilterBar;
