import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, RefreshCw, Clock, User, 
  Building2, Key, AlertCircle, FileText, Filter 
} from 'lucide-react';
import { PlatformAuditLog } from '../../types';
import { fetchPlatformAuditLogs } from '../../services/platformAdminService';

export const SaaSControlCenterAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await fetchPlatformAuditLogs(100);
    setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const query = searchFilter.toLowerCase();
    const matchesSearch =
      (log.action || '').toLowerCase().includes(query) ||
      (log.actor_name || '').toLowerCase().includes(query) ||
      (log.actor_email || '').toLowerCase().includes(query) ||
      (log.target_name || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('TENANT')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
          <Building2 className="w-3 h-3" /> {action}
        </span>
      );
    }
    if (action.includes('USER') || action.includes('PASSWORD')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1 w-fit">
          <Key className="w-3 h-3" /> {action}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
        <ShieldCheck className="w-3 h-3" /> {action}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Trilha Imutável de Auditoria da Plataforma (SaaS Audit Logs)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Registro detalhado de todas as intervenções administrativas e operacionais realizadas na rede
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-bold border border-neutral-200 dark:border-neutral-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Atualizar Trilha</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar por operador, e-mail, município ou ação..."
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-emerald-500 w-full sm:w-auto font-medium"
        >
          <option value="all">Todas as Ações</option>
          <option value="CREATE_TENANT">Criação de Município</option>
          <option value="UPDATE_TENANT">Edição de Município</option>
          <option value="DELETE_TENANT">Exclusão de Município</option>
          <option value="CREATE_USER">Criação de Servidor</option>
          <option value="RESET_PASSWORD">Reset de Senha</option>
          <option value="BLOCK_USER">Bloqueio de Usuário</option>
          <option value="PUBLISH_ANNOUNCEMENT">Publicação de Alerta</option>
        </select>
      </div>

      {/* Tabela de Logs */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Operador Responsável</th>
                <th className="py-3 px-4">Alvo da Intervenção</th>
                <th className="py-3 px-4">Parâmetros / Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition">
                  <td className="py-3 px-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-neutral-900 dark:text-white">
                      {log.actor_name || 'Superadmin'}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {log.actor_email}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {log.target_name || log.target_id || 'Sistema'}
                    </span>
                    <span className="block text-[10px] text-neutral-400 uppercase">
                      Tipo: {log.target_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 font-mono text-[10px] max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    Nenhum registro de auditoria encontrado para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SaaSControlCenterAuditLogs;

