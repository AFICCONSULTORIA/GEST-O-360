import React from 'react';
import { Package, Download, Plus, Search, Filter, Printer, X } from 'lucide-react';
import { PatrimonioItem } from '../../types';

const PatrimonioPrintView = ({ patrimonioItems, onClose }: { patrimonioItems: PatrimonioItem[], onClose: () => void }) => {
  const [filterDept, setFilterDept] = React.useState<string>('Todos');
  const [filterCond, setFilterCond] = React.useState<string>('Todos');
  const [filterStatus, setFilterStatus] = React.useState<string>('Todos');
  const [filterSearch, setFilterSearch] = React.useState<string>('');

  const filteredItems = patrimonioItems.filter(item => {
    if (filterDept !== 'Todos' && item.department !== filterDept) return false;
    if (filterCond !== 'Todos' && item.condition !== filterCond) return false;
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
    if (filterSearch && !item.objectName.toLowerCase().includes(filterSearch.toLowerCase()) && !item.code.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const uniqueDepts = Array.from(new Set(patrimonioItems.map(i => i.department)));

  return (
    <div className="fixed inset-0 z-[100] bg-white print:bg-white text-black print:text-black overflow-y-auto">
      {/* Only visible on screen, hidden on print */}
      <div className="sticky top-0 bg-neutral-100 border-b border-neutral-200 p-4 flex flex-col md:flex-row gap-4 print:hidden z-50 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-4 flex-1 w-full">
          <input 
            type="text" 
            placeholder="Buscar no relatório..." 
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-sm flex-1 min-w-[200px]"
          />
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-sm flex-1 min-w-[150px]"
          >
            <option value="Todos">Todos os Departamentos</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={filterCond} 
            onChange={e => setFilterCond(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-sm flex-1 min-w-[150px]"
          >
            <option value="Todos">Todos os Estados</option>
            <option value="Excelente">Excelente</option>
            <option value="Bom">Bom</option>
            <option value="Ruim">Ruim</option>
            <option value="Muito Ruim">Muito Ruim</option>
          </select>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-sm flex-1 min-w-[120px]"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Servível">Servível</option>
            <option value="Inservível">Inservível</option>
            <option value="Ocioso">Ocioso</option>
            <option value="Em Manutenção">Em Manutenção</option>
            <option value="Baixado">Baixado</option>
          </select>
        </div>
        <div className="flex gap-4 w-full md:w-auto justify-end">
          <button onClick={() => window.print()} className="bg-neutral-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-800">
            <Download size={16} /> <span className="hidden sm:inline">Imprimir / Salvar PDF</span><span className="sm:hidden">Imprimir</span>
          </button>
          <button onClick={onClose} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-200">
            <X size={16} /> Fechar
          </button>
        </div>
      </div>

      <PatrimonioPrintLayout 
        filteredItems={filteredItems} 
        filters={{ dept: filterDept, cond: filterCond, status: filterStatus, search: filterSearch }} 
      />
    </div>
  );
};

const ReportsModule = ({ patrimonioItems, initialReport, clearPendingReport }: { patrimonioItems: PatrimonioItem[], initialReport?: 'patrimonio' | null, clearPendingReport?: () => void }) => {
  const [activeReport, setActiveReport] = React.useState<'patrimonio' | null>(initialReport || null);

  React.useEffect(() => {
    if (initialReport) {
      setActiveReport(initialReport);
      if (clearPendingReport) clearPendingReport();
    }
  }, [initialReport, clearPendingReport]);

  if (activeReport === 'patrimonio') {
    return <PatrimonioPrintView patrimonioItems={patrimonioItems} onClose={() => setActiveReport(null)} />;
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Relatórios <span className="text-neutral-400 font-normal">Inteligentes</span></h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Central de emissão de relatórios personalizados e automatizados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card: Patrimônio */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 flex flex-col hover:border-emerald-500/30 transition-colors shadow-sm hover:shadow-md">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <Package size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 mb-2">Controle Patrimonial</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 flex-1">
            Relatório completo com a relação de todos os bens cadastrados, seus valores, estado de conservação e número de tombamento.
          </p>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Itens</span>
              <span className="font-mono font-bold dark:text-white">{patrimonioItems.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Servíveis</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {patrimonioItems.filter(item => item.status === 'Servível').length}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setActiveReport('patrimonio')}
            className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} /> Emitir Relatório
          </button>
        </div>

        {/* Placeholder for future reports */}
        <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl flex items-center justify-center mb-4">
            <Plus size={24} />
          </div>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Em Breve</p>
          <p className="text-xs text-neutral-500 mt-2">Novos relatórios automatizados serão adicionados aqui.</p>
        </div>
      </div>
    </div>
  );
};



const PatrimonioPrintLayout = ({ filteredItems, filters }: { filteredItems: PatrimonioItem[], filters?: { dept?: string, cond?: string, search?: string, status?: string } }) => {
  const servivelCount = filteredItems.filter(item => item.status === 'Servível').length;
  
  return (
    <div className="max-w-[210mm] mx-auto p-10 bg-white min-h-[297mm] print:p-0 print:m-0 text-black">
      <div className="text-center mb-10 border-b-2 border-neutral-200 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-widest">Relatório de Controle Patrimonial</h1>
        <p className="text-sm text-neutral-500 mt-2">Plataforma Gestão 360 - Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        
        {/* Active Filters Display */}
        {filters && (filters.dept !== 'Todos' || filters.cond !== 'Todos' || filters.status !== 'Todos' || filters.search) && (
          <div className="mt-4 flex flex-wrap justify-center gap-3 print:hidden">
            {filters.dept && filters.dept !== 'Todos' && (
              <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">
                Departamento: {filters.dept}
              </span>
            )}
            {filters.cond && filters.cond !== 'Todos' && (
              <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">
                Estado: {filters.cond}
              </span>
            )}
            {filters.status && filters.status !== 'Todos' && (
              <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">
                Status: {filters.status}
              </span>
            )}
            {filters.search && (
              <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">
                Busca: "{filters.search}"
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between mb-8">
        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 w-[48%]">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total de Itens Listados</p>
          <p className="text-2xl font-black">{filteredItems.length}</p>
        </div>
        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 w-[48%]">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Itens Servíveis</p>
          <p className="text-2xl font-black">
            {servivelCount}
          </p>
        </div>
      </div>

      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-800">
            <th className="py-3 px-2 font-black uppercase tracking-widest">Código</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Objeto</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Departamento</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Estado</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest text-right">Ano</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-3 px-2 font-mono text-xs">{item.code}</td>
              <td className="py-3 px-2 font-bold">{item.objectName}</td>
              <td className="py-3 px-2 text-neutral-600">{item.department}</td>
              <td className="py-3 px-2 text-neutral-600">{item.condition}</td>
              <td className="py-3 px-2 font-mono text-right">{item.year}</td>
            </tr>
          ))}
          {filteredItems.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-neutral-500 italic">Nenhum item encontrado com os filtros atuais.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-20 pt-8 border-t border-neutral-200 flex justify-around text-center">
        <div>
          <div className="w-48 border-b border-neutral-400 mx-auto mb-2"></div>
          <p className="text-xs font-bold uppercase tracking-widest">Responsável pelo Patrimônio</p>
        </div>
        <div>
          <div className="w-48 border-b border-neutral-400 mx-auto mb-2"></div>
          <p className="text-xs font-bold uppercase tracking-widest">Gestor da Unidade</p>
        </div>
      </div>
    </div>
  );
};

export { ReportsModule, PatrimonioPrintView, PatrimonioPrintLayout };
