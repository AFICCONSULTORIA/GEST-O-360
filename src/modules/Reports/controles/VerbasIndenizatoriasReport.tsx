import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Printer, Filter, X, Search, CheckCircle2, AlertTriangle, FileText, Download } from 'lucide-react';
import { REAL_VERBAS_INDENIZATORIAS_DATA } from '../../Controls/data/realVerbasIndenizatorias';

interface VerbasReportModalProps {
  onClose: () => void;
  currentInstitution?: { id: string; name?: string } | null;
}

export const VerbasIndenizatoriasReportModal: React.FC<VerbasReportModalProps> = ({
  onClose,
  currentInstitution
}) => {
  const [step, setStep] = useState<'config' | 'preview'>('config');
  const [selectedMonth, setSelectedMonth] = useState('Outubro');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const institutionName = currentInstitution?.name || 'Prefeitura Municipal de Torixoréu';

  // Obter registros salvos ou lista base oficial dos 32 cargos de Torixoréu
  const getStoredRows = () => {
    try {
      const storageKey = `gestao360_verbas_${selectedMonth}_${selectedYear}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return REAL_VERBAS_INDENIZATORIAS_DATA.map((item, idx) => ({
      id: `verba_${idx + 1}`,
      cargo: item.cargo,
      nome_responsavel: item.servidor_nome,
      requerimento_obrigatorio: item.cargo !== 'Controlador Interno' && item.cargo !== 'Diretor de comunicação' && item.cargo !== 'Secretario de Comunicação' && item.cargo !== 'LEONAN LONGHINE VASCONCELOS',
      relatorio_obrigatorio: item.cargo !== 'Prefeito' && item.cargo !== 'Controlador Interno' && item.cargo !== 'Diretor de comunicação' && item.cargo !== 'Secretario de Comunicação' && item.cargo !== 'LEONAN LONGHINE VASCONCELOS',
      requerimento_entregue: item.entregou_requerimento,
      relatorio_entregue: item.entregou_relatorio,
      valor: item.valor || 3500.00,
      secretaria_setor: item.secretaria_setor || 'Administração',
      data_entrega: '28/10/2026',
      observacoes: ''
    }));
  };

  const rows = getStoredRows();

  const filteredRows = rows.filter((r: any) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (r.nome_responsavel || '').toLowerCase().includes(q) ||
      (r.cargo || '').toLowerCase().includes(q);

    const isComplete = (!r.requerimento_obrigatorio || r.requerimento_entregue) &&
      (!r.relatorio_obrigatorio || r.relatorio_entregue);

    const matchStatus = filterStatus === 'Todos' ||
      (filterStatus === 'regular' && isComplete) ||
      (filterStatus === 'pendente' && !isComplete);

    return matchSearch && matchStatus;
  });

  const totalCargos = rows.length;
  const totalRegulares = rows.filter((r: any) => 
    (!r.requerimento_obrigatorio || r.requerimento_entregue) &&
    (!r.relatorio_obrigatorio || r.relatorio_entregue)
  ).length;
  const totalPendentes = totalCargos - totalRegulares;

  if (step === 'config') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">Relatório de Verbas Indenizatórias</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{institutionName} • Controle Interno</p>
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><X size={24} /></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Mês de Referência</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                >
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Ano</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Filtro de Situação</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
              >
                <option value="Todos">Todos os Responsáveis ({totalCargos})</option>
                <option value="regular">Totalmente Regulares (Documentação Entregue)</option>
                <option value="pendente">Com Pendência de Requerimento ou Relatório</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Buscar por Nome ou Cargo</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Nome do secretário, diretor ou cargo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <button onClick={onClose} className="px-5 py-2.5 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-xs">
              Cancelar
            </button>
            <button
              onClick={() => setStep('preview')}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              Visualizar Relatório Oficial
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-100 print:bg-white text-black flex flex-col print:block overflow-auto">
      {/* Barra de Ações */}
      <div className="sticky top-0 bg-white border-b border-neutral-300 p-4 flex items-center justify-between shadow-md print:hidden z-50">
        <div>
          <h3 className="font-black text-sm text-neutral-900">Prestação de Contas Mensal de Verba Indenizatória</h3>
          <p className="text-xs text-neutral-500">{institutionName} • Mês: {selectedMonth}/{selectedYear}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} /> Imprimir / Salvar PDF
          </button>
          <button
            onClick={() => setStep('config')}
            className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Filter size={16} /> Filtros
          </button>
          <button
            onClick={onClose}
            className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <X size={16} /> Fechar
          </button>
        </div>
      </div>

      {/* Folha do Relatório Timbrada */}
      <div className="max-w-5xl mx-auto my-6 p-8 sm:p-12 bg-white shadow-2xl print:shadow-none print:m-0 print:p-0 min-h-[297mm]">
        {/* Cabeçalho */}
        <div className="border-b-2 border-neutral-900 pb-5 mb-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            <img src="/brasao-municipio.png" alt="Brasão" className="max-h-16 max-w-full object-contain" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-neutral-900">{institutionName}</h1>
            <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-800">Unidade Central de Controle Interno • UCCI</h2>
            <p className="text-xs font-bold text-neutral-600 mt-1">
              Demonstrativo Mensal de Conformidade da Verba Indenizatória ({selectedMonth} / {selectedYear})
            </p>
          </div>
          <div className="text-right text-[11px] text-neutral-500 font-mono shrink-0">
            <p>Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
            <p>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
            <p className="text-[10px] font-black uppercase text-neutral-500">Total de Cargos Monitorados</p>
            <p className="text-2xl font-black text-neutral-900">{totalCargos}</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-[10px] font-black uppercase text-emerald-700">Documentação Completa (Apto)</p>
            <p className="text-2xl font-black text-emerald-700">{totalRegulares}</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-[10px] font-black uppercase text-rose-700">Pendências de Entrega</p>
            <p className="text-2xl font-black text-rose-700">{totalPendentes}</p>
          </div>
        </div>

        {/* Tabela de Cargos */}
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-800 bg-neutral-100">
              <th className="p-2 font-black uppercase w-8">#</th>
              <th className="p-2 font-black uppercase">Cargo / Função</th>
              <th className="p-2 font-black uppercase">Nome do Responsável</th>
              <th className="p-2 font-black uppercase text-center">Requerimento</th>
              <th className="p-2 font-black uppercase text-center">Relatório Ativ.</th>
              <th className="p-2 font-black uppercase text-right">Situação</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r: any, idx: number) => {
              const reqOk = !r.requerimento_obrigatorio || r.requerimento_entregue;
              const relOk = !r.relatorio_obrigatorio || r.relatorio_entregue;
              const isRegular = reqOk && relOk;

              return (
                <tr key={r.id || idx} className="border-b border-neutral-200">
                  <td className="p-2 font-mono text-neutral-400">{idx + 1}</td>
                  <td className="p-2 font-bold">{r.cargo}</td>
                  <td className="p-2 text-neutral-800 font-semibold">{r.nome_responsavel}</td>
                  <td className="p-2 text-center">
                    {!r.requerimento_obrigatorio ? (
                      <span className="text-neutral-400 text-[10px] uppercase">Isento</span>
                    ) : r.requerimento_entregue ? (
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">Entregue</span>
                    ) : (
                      <span className="text-rose-700 font-bold uppercase text-[10px]">Pendente</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {!r.relatorio_obrigatorio ? (
                      <span className="text-neutral-400 text-[10px] uppercase">Isento</span>
                    ) : r.relatorio_entregue ? (
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">Entregue</span>
                    ) : (
                      <span className="text-rose-700 font-bold uppercase text-[10px]">Pendente</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {isRegular ? (
                      <span className="font-bold text-emerald-700 uppercase text-[10px]">Regular (Apto)</span>
                    ) : (
                      <span className="font-bold text-rose-700 uppercase text-[10px]">Incompleto</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Rodapé e Assinaturas Oficiais */}
        <div className="mt-16 pt-8 border-t-2 border-neutral-200 grid grid-cols-2 gap-8 text-center print:mt-12">
          <div className="border-t border-neutral-800 pt-2">
            <p className="text-xs font-black uppercase text-neutral-900">Carlos Eduardo Freitas Barbosa</p>
            <p className="text-[11px] text-neutral-600 font-medium">Controlador Interno Municipal</p>
            <p className="text-[10px] text-neutral-400">{institutionName}</p>
          </div>
          <div className="border-t border-neutral-800 pt-2">
            <p className="text-xs font-black uppercase text-neutral-900">Thiago Timo Oliveira</p>
            <p className="text-[11px] text-neutral-600 font-medium">Prefeito Municipal</p>
            <p className="text-[10px] text-neutral-400">{institutionName}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

