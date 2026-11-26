import React from 'react';
import { History, Search, FileSpreadsheet, Calendar, ArrowRight } from 'lucide-react';
import { FleetFuelAuditLog } from '../../../../lib/api/fleetFuelAudit';

export interface FleetLogsTabProps {
  auditLogs: FleetFuelAuditLog[];
  filteredAuditLogs: FleetFuelAuditLog[];
  paginatedAuditLogs: FleetFuelAuditLog[];
  auditLogSearchTerm: string;
  onAuditLogSearchTermChange: (term: string) => void;
  auditLogTypeFilter: string;
  onAuditLogTypeFilterChange: (type: string) => void;
  onExportAuditLogsExcel: () => void;
  paginationNode: React.ReactNode;
}

export const FleetLogsTab: React.FC<FleetLogsTabProps> = ({
  auditLogs,
  filteredAuditLogs,
  paginatedAuditLogs,
  auditLogSearchTerm,
  onAuditLogSearchTermChange,
  auditLogTypeFilter,
  onAuditLogTypeFilterChange,
  onExportAuditLogsExcel,
  paginationNode,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <History size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Trilha de Auditoria & Logs de Alterações do Sistema
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Data Original Protegida
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Registro cronológico de todas as edições de abastecimento, alterações manuais de data, mudanças de dotação e homologações para auditorias futuras.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar ordem, placa, responsável ou campo..."
                value={auditLogSearchTerm}
                onChange={(e) => onAuditLogSearchTermChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={auditLogTypeFilter}
              onChange={(e) => onAuditLogTypeFilterChange(e.target.value)}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Todas as Operações ({auditLogs.length})</option>
              <option value="EDICAO_ABASTECIMENTO">Edição de Dados (Data Preservada)</option>
              <option value="ALTERACAO_DATA">Alteração Manual de Data</option>
              <option value="ALTERACAO_DOTACAO">Alteração de Ficha Orçamentária</option>
              <option value="HOMOLOGACAO_TCE">Homologação TCE</option>
              <option value="REABERTURA_ORDEM">Reabertura de Ordem</option>
              <option value="RETIRADA_RISCO_FRAUDE">Retirada de Risco de Fraude</option>
              <option value="GLOSA_ORDEM">Glosa / Bloqueio</option>
              <option value="EXCLUSAO_ORDEM">Exclusão de Ordem</option>
            </select>

            <button
              type="button"
              onClick={onExportAuditLogsExcel}
              disabled={filteredAuditLogs.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <FileSpreadsheet size={14} />
              <span>Exportar Logs (Excel)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800">
            <span className="text-[10px] font-bold uppercase text-neutral-400 block">Total de Eventos</span>
            <span className="text-lg font-black text-neutral-900 dark:text-white">{auditLogs.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40">
            <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">
              Edições de Abastecimento
            </span>
            <span className="text-lg font-black text-blue-700 dark:text-blue-300">
              {auditLogs.filter((l) => l.action_type === 'EDICAO_ABASTECIMENTO').length}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
              Alterações Manuais de Data
            </span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-300">
              {
                auditLogs.filter(
                  (l) => l.action_type === 'ALTERACAO_DATA' || (l.changes || []).some((c) => c.field === 'supplied_at'),
                ).length
              }
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
              Dotações & Homologações
            </span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
              {
                auditLogs.filter(
                  (l) =>
                    l.action_type === 'ALTERACAO_DOTACAO' ||
                    l.action_type === 'HOMOLOGACAO_TCE' ||
                    l.action_type === 'REABERTURA_ORDEM',
                ).length
              }
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3.5">Data/Hora do Log</th>
              <th className="px-4 py-3.5">Ordem & Veículo</th>
              <th className="px-4 py-3.5">Data do Abastecimento</th>
              <th className="px-4 py-3.5">Operação</th>
              <th className="px-4 py-3.5">Alterações Registradas (De → Para)</th>
              <th className="px-4 py-3.5">Responsável</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
            {filteredAuditLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-neutral-400">
                  <History size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                  <p className="font-bold text-neutral-800 dark:text-white">
                    Nenhum registro de alteração encontrado
                  </p>
                  <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                    Toda edição de quilometragem, litragem, ficha orçamentária ou data de abastecimento ficará gravada aqui automaticamente para auditoria.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedAuditLogs.map((log) => {
                const badgeStyle =
                  log.action_type === 'ALTERACAO_DATA'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                    : log.action_type === 'EDICAO_ABASTECIMENTO'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
                      : log.action_type === 'ALTERACAO_DOTACAO'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300'
                        : log.action_type === 'EXCLUSAO_ORDEM' || log.action_type === 'GLOSA_ORDEM'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors align-top"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                      <span className="font-bold text-neutral-900 dark:text-white block">
                        {new Date(log.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        às {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 block">
                        #{log.order_number}
                      </span>
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-300 font-bold">
                        {log.vehicle_plate || 'Frota'} {log.vehicle_model ? `• ${log.vehicle_model}` : ''}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        <Calendar size={12} className="text-amber-500" />
                        {log.fueling_date || '-'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}
                      >
                        {log.action_label}
                      </span>
                      {log.notes && <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">{log.notes}</p>}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="space-y-1.5">
                        {(log.changes || []).map((chg, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center gap-1.5 text-[11px] bg-neutral-50 dark:bg-neutral-800/70 px-2.5 py-1.5 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70"
                          >
                            <strong className="text-neutral-700 dark:text-neutral-200">{chg.label}:</strong>
                            <span className="line-through text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                              {chg.oldValue}
                            </span>
                            <ArrowRight size={11} className="text-neutral-400 shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              {chg.newValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-neutral-900 dark:text-white block">{log.actor_name}</span>
                      <span className="text-[10px] text-neutral-400">{log.actor_role || 'Gestor'}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paginationNode}
    </div>
  );
};
