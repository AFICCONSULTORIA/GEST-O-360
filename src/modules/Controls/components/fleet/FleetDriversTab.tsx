import React from 'react';
import {
  Users,
  Search,
  X,
  CloudUpload,
  Trash2,
  Building2,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import { FleetDriver } from '../../../../lib/api/fleetFuel';

export interface FleetDriversTabProps {
  drivers: FleetDriver[];
  filteredDrivers: FleetDriver[];
  paginatedDrivers: FleetDriver[];
  driverSearchTerm: string;
  onDriverSearchTermChange: (term: string) => void;
  onClearAllFilters: () => void;
  onSyncCloud: () => Promise<void>;
  onClearAllDrivers: () => void;
  onOpenDepartmentsModal: () => void;
  officialDepartmentsCount: number;
  onOpenDriverBatchModal: () => void;
  onOpenNewDriver: () => void;
  onOpenEditDriver: (driver: FleetDriver) => void;
  onDeleteDriver: (driver: FleetDriver) => void;
  paginationNode: React.ReactNode;
}

export const FleetDriversTab: React.FC<FleetDriversTabProps> = ({
  drivers,
  filteredDrivers,
  paginatedDrivers,
  driverSearchTerm,
  onDriverSearchTermChange,
  onClearAllFilters,
  onSyncCloud,
  onClearAllDrivers,
  onOpenDepartmentsModal,
  officialDepartmentsCount,
  onOpenDriverBatchModal,
  onOpenNewDriver,
  onOpenEditDriver,
  onDeleteDriver,
  paginationNode,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-amber-500" />
            Cadastro Oficial de Motoristas e Condutores
          </h4>
          <p className="text-neutral-400 text-xs">
            Identificação de condutores, CPF, data de nascimento e lotação funcional
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar motorista, CPF ou secretaria..."
              value={driverSearchTerm}
              onChange={(e) => onDriverSearchTermChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
            />
            {driverSearchTerm && (
              <button
                type="button"
                onClick={() => onDriverSearchTermChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full cursor-pointer"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => void onSyncCloud()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl cursor-pointer shrink-0 border border-amber-300 dark:border-amber-800 transition"
            title="Sincronizar motoristas com a nuvem Supabase"
          >
            <CloudUpload size={14} className="text-amber-600 dark:text-amber-400" />
            Sincronizar Nuvem
          </button>
          {drivers.length > 0 && (
            <button
              type="button"
              onClick={onClearAllDrivers}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl cursor-pointer shrink-0 border border-rose-300 dark:border-rose-800 transition shadow-sm"
              title="Excluir todos os motoristas cadastrados e zerar o banco de dados"
            >
              <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
              Limpar Todos
            </button>
          )}
          <button
            type="button"
            onClick={onOpenDepartmentsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl cursor-pointer shrink-0 border border-indigo-300 dark:border-indigo-800 transition"
            title="Cadastrar, excluir e padronizar secretarias oficiais do município"
          >
            <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
            Secretarias ({officialDepartmentsCount})
          </button>
          <button
            type="button"
            onClick={onOpenDriverBatchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl cursor-pointer shrink-0 border border-neutral-300 dark:border-neutral-700 transition"
          >
            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
            Importar Planilha (.xlsx)
          </button>
          <button
            onClick={onOpenNewDriver}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl cursor-pointer shrink-0"
          >
            <Plus size={14} /> Novo Motorista
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3.5">Nome Completo</th>
              <th className="px-4 py-3.5">CPF</th>
              <th className="px-4 py-3.5">Data de Nascimento</th>
              <th className="px-4 py-3.5">Secretaria / Lotação</th>
              <th className="px-4 py-3.5">CNH / Categoria</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-neutral-400">
                  <Users size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                  <p className="font-bold text-neutral-800 dark:text-white">
                    {drivers.length === 0
                      ? 'Nenhum motorista cadastrado ainda'
                      : 'Nenhum motorista encontrado para os filtros selecionados'}
                  </p>
                  <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                    {drivers.length === 0
                      ? 'Cadastre os condutores oficiais com Nome Completo, CPF, Data de Nascimento e Secretaria para emissão ágil de ordens.'
                      : 'Tente alterar os termos da busca ou ajustar os filtros de secretaria e status acima.'}
                  </p>
                  {drivers.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllFilters}
                      className="mt-3 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Limpar Todos os Filtros
                    </button>
                  )}
                  {drivers.length === 0 && (
                    <button
                      onClick={onOpenNewDriver}
                      className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Cadastrar Primeiro Motorista
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">{driver.full_name}</td>
                  <td className="px-4 py-3.5 font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                    {driver.cpf || (
                      <span className="text-neutral-400 italic font-sans font-normal">Não informado</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                    {driver.birth_date ? new Date(`${driver.birth_date}T00:00:00`).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">{driver.department}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {driver.cnh_number || '-'} {driver.cnh_category ? `(Cat. ${driver.cnh_category})` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {driver.status === 'ativo' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 size={10} /> Ativo
                      </span>
                    )}
                    {driver.status === 'afastado' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertCircle size={10} /> Afastado
                      </span>
                    )}
                    {driver.status === 'inativo' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenEditDriver(driver)}
                        title="Editar Motorista"
                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteDriver(driver)}
                        title="Excluir Motorista"
                        className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginationNode}
    </div>
  );
};
