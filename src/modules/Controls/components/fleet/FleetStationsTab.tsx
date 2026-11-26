import React from 'react';
import { Store, Search, CloudUpload, Trash2, Plus, CheckCircle2, Edit2 } from 'lucide-react';
import { FleetFuelStation } from '../../../../lib/api/fleetFuel';

export interface FleetStationsTabProps {
  stations: FleetFuelStation[];
  filteredStations: FleetFuelStation[];
  paginatedStations: FleetFuelStation[];
  stationSearchTerm: string;
  onStationSearchTermChange: (term: string) => void;
  onSyncCloud: () => Promise<void>;
  onClearAllStations: () => void;
  onOpenNewStation: () => void;
  onOpenEditStation: (station: FleetFuelStation) => void;
  onDeleteStation: (station: FleetFuelStation) => void;
  paginationNode: React.ReactNode;
}

export const FleetStationsTab: React.FC<FleetStationsTabProps> = ({
  stations,
  filteredStations,
  paginatedStations,
  stationSearchTerm,
  onStationSearchTermChange,
  onSyncCloud,
  onClearAllStations,
  onOpenNewStation,
  onOpenEditStation,
  onDeleteStation,
  paginationNode,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Store size={16} className="text-amber-500" />
            Rede de Postos Conveniados Credenciados
          </h4>
          <p className="text-neutral-400 text-xs">
            Fornecedores habilitados para fornecimento de combustível à frota
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar posto ou CNPJ..."
              value={stationSearchTerm}
              onChange={(e) => onStationSearchTermChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void onSyncCloud()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl cursor-pointer shrink-0 border border-amber-300 dark:border-amber-800 transition"
            title="Sincronizar postos com a nuvem Supabase"
          >
            <CloudUpload size={14} className="text-amber-600 dark:text-amber-400" />
            Sincronizar Nuvem
          </button>
          {stations.length > 0 && (
            <button
              type="button"
              onClick={onClearAllStations}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl cursor-pointer shrink-0 border border-rose-300 dark:border-rose-800 transition shadow-sm"
              title="Excluir todos os postos credenciados e zerar o banco de dados"
            >
              <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
              Limpar Todos
            </button>
          )}
          <button
            onClick={onOpenNewStation}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl cursor-pointer shrink-0"
          >
            <Plus size={14} /> Novo Posto
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3.5">Razão Social / Nome Fantasia</th>
              <th className="px-4 py-3.5">CNPJ</th>
              <th className="px-4 py-3.5">Endereço / Localização</th>
              <th className="px-4 py-3.5">Município / UF</th>
              <th className="px-4 py-3.5">Telefone</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
            {filteredStations.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-neutral-400">
                  <Store size={36} className="mx-auto text-amber-500 mb-2 opacity-60" />
                  <p className="font-bold text-neutral-800 dark:text-white">
                    Nenhum posto credenciado cadastrado ainda
                  </p>
                  <p className="text-xs mt-1 max-w-md mx-auto text-neutral-500">
                    Cadastre os postos de combustíveis conveniados para facilitar a emissão ágil de ordens.
                  </p>
                  <button
                    onClick={onOpenNewStation}
                    className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Cadastrar Primeiro Posto
                  </button>
                </td>
              </tr>
            ) : (
              paginatedStations.map((station) => (
                <tr key={station.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">{station.name}</td>
                  <td className="px-4 py-3.5 font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                    {station.cnpj || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">{station.address || '-'}</td>
                  <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300 font-medium">
                    {station.city || 'Torixoréu - MT'}
                  </td>
                  <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">{station.phone || '-'}</td>
                  <td className="px-4 py-3.5">
                    {station.status === 'ativo' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 size={10} /> Credenciado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenEditStation(station)}
                        title="Editar Posto"
                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteStation(station)}
                        title="Excluir Posto"
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
