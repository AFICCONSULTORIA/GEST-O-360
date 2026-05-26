import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Download, Plus, Search, Filter, Printer, X, HeartPulse, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PatrimonioItem } from '../../types';
import { Appointment } from '../Saude';
import { Demanda } from '../ServicosPublicos';

// ==========================================
// SAÚDE: RELATÓRIO DE AGENDAMENTOS
// ==========================================
const SaudePrintView = ({ onClose }: { onClose: () => void }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('Todas');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: false });
    if (!error && data) {
      setAppointments(data as Appointment[]);
    }
    setLoading(false);
  };

  const filteredItems = appointments.filter(item => {
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
    if (filterSpecialty !== 'Todas' && item.specialty !== filterSpecialty) return false;
    
    if (filterStartDate && item.appointment_date && item.appointment_date < filterStartDate) return false;
    if (filterEndDate && item.appointment_date && item.appointment_date > filterEndDate) return false;

    if (filterSearch) {
      const query = filterSearch.toLowerCase();
      const matchName = item.patient_name.toLowerCase().includes(query);
      const matchCpf = item.patient_cpf.includes(query);
      const matchSus = item.patient_sus.includes(query);
      const matchPhone = item.patient_phone?.includes(query);
      if (!matchName && !matchCpf && !matchSus && !matchPhone) return false;
    }
    
    return true;
  });

  const uniqueSpecialties = Array.from(new Set(appointments.map(i => i.specialty))).filter(Boolean);

  if (step === 'config') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <HeartPulse className="text-emerald-500" /> Relatório de Saúde
            </h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><X size={24} /></button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Busca Rápida</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Buscar paciente, CPF ou Tel..." 
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Data Inicial (De)</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Data Final (Até)</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Especialidade</label>
                <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="Todas">Todas Especialidades</option>
                  {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="Todos">Todos os Status</option>
                  <option value="Aguardando Regulação">Aguardando Regulação</option>
                  <option value="Agendado">Agendado</option>
                  <option value="Atendido">Atendido</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Faltou">Faltou</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors">Cancelar</button>
            <button 
              onClick={() => setStep('preview')} 
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              {loading ? 'Carregando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-100 print:bg-white text-black print:text-black flex flex-col">
      <div className="bg-white border-b border-neutral-300 p-4 flex flex-col sm:flex-row gap-4 print:hidden z-50 items-center justify-between shadow-md shrink-0">
        <div className="font-bold text-neutral-500 text-sm hidden md:block">
          Visualização do Relatório - Selecionados: {filteredItems.length}
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end overflow-x-auto hide-scrollbar">
          <button onClick={() => window.print()} className="bg-neutral-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-800 whitespace-nowrap">
            <Printer size={16} /> <span className="hidden sm:inline">Imprimir / Salvar PDF</span><span className="sm:hidden">Imprimir</span>
          </button>
          <button onClick={() => setStep('config')} className="bg-neutral-200 text-neutral-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-300 whitespace-nowrap">
            <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
          </button>
          <button onClick={onClose} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-200 whitespace-nowrap">
            <X size={16} /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 flex justify-center items-start">
        <div className="bg-white shadow-2xl print:shadow-none print:w-full w-full max-w-[210mm] min-h-[297mm]">
          <SaudePrintLayout filteredItems={filteredItems} filters={{ search: filterSearch, status: filterStatus, specialty: filterSpecialty, startDate: filterStartDate, endDate: filterEndDate }} loading={loading} />
        </div>
      </div>
    </div>,
    document.body
  );
};

const SaudePrintLayout = ({ filteredItems, filters, loading }: { filteredItems: Appointment[], filters: any, loading: boolean }) => {
  if (loading) return <div className="p-10 text-center font-bold">Carregando dados...</div>;

  const atendidosCount = filteredItems.filter(item => item.status === 'Atendido').length;
  
  return (
    <div className="mx-auto p-6 sm:p-10 bg-white min-h-[297mm] print:p-0 print:m-0 text-black">
      <div className="text-center mb-10 border-b-2 border-neutral-200 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-widest">Relatório de Agendamentos (Saúde)</h1>
        <p className="text-sm text-neutral-500 mt-2">Plataforma Gestão 360 - Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        
        {filters && (filters.specialty !== 'Todas' || filters.status !== 'Todos' || filters.search || filters.startDate || filters.endDate) && (
          <div className="mt-4 flex flex-wrap justify-center gap-3 print:hidden">
            {filters.search && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Busca: "{filters.search}"</span>}
            {filters.startDate && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">De: {filters.startDate.split('-').reverse().join('/')}</span>}
            {filters.endDate && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Até: {filters.endDate.split('-').reverse().join('/')}</span>}
            {filters.specialty !== 'Todas' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Especialidade: {filters.specialty}</span>}
            {filters.status !== 'Todos' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Status: {filters.status}</span>}
          </div>
        )}
      </div>

      <div className="flex justify-between mb-8">
        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 w-[48%]">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total de Consultas Listadas</p>
          <p className="text-2xl font-black">{filteredItems.length}</p>
        </div>
        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 w-[48%]">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Atendimentos Concluídos</p>
          <p className="text-2xl font-black text-emerald-600">{atendidosCount}</p>
        </div>
      </div>

      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-800">
            <th className="py-3 px-2 font-black uppercase tracking-widest">Data / Hora</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Paciente</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">WhatsApp/Tel</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Especialidade</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-3 px-2 font-mono text-xs whitespace-nowrap">
                {item.appointment_date ? item.appointment_date.split('-').reverse().join('/') : '-'}
                {item.appointment_time ? ` às ${item.appointment_time}` : ''}
              </td>
              <td className="py-3 px-2">
                <p className="font-bold">{item.patient_name}</p>
                <p className="text-[10px] text-neutral-500 font-mono">SUS: {item.patient_sus}</p>
              </td>
              <td className="py-3 px-2 text-neutral-600 font-mono text-xs whitespace-nowrap">
                {item.patient_phone || '-'}
                {item.whatsapp_sent ? <span className="ml-1 text-[10px] text-emerald-600 font-bold uppercase">(Enviado)</span> : ''}
              </td>
              <td className="py-3 px-2 text-neutral-600">{item.specialty}</td>
              <td className="py-3 px-2 font-bold text-right text-xs uppercase">{item.status}</td>
            </tr>
          ))}
          {filteredItems.length === 0 && (
            <tr><td colSpan={5} className="py-8 text-center text-neutral-500 italic">Nenhum agendamento encontrado.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};


// ==========================================
// SERVIÇOS PÚBLICOS: RELATÓRIO DE DEMANDAS
// ==========================================
const ServicosPublicosPrintView = ({ onClose }: { onClose: () => void }) => {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicos_publicos_demandas').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setDemandas(data as Demanda[]);
    }
    setLoading(false);
  };

  const filteredItems = demandas.filter(item => {
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
    if (filterCategory !== 'Todas' && item.categoria !== filterCategory) return false;
    return true;
  });

  const uniqueCategories = Array.from(new Set(demandas.map(i => i.categoria))).filter(Boolean);

  if (step === 'config') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <Wrench className="text-sky-500" /> Relatório de Demandas
            </h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><X size={24} /></button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Categoria</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-sky-500 outline-none">
                  <option value="Todas">Todas as Categorias</option>
                  {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-sky-500 outline-none">
                  <option value="Todos">Todos os Status</option>
                  <option value="Aberto">Aberto</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors">Cancelar</button>
            <button 
              onClick={() => setStep('preview')} 
              disabled={loading}
              className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              {loading ? 'Carregando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-100 print:bg-white text-black print:text-black flex flex-col">
      <div className="bg-white border-b border-neutral-300 p-4 flex flex-col sm:flex-row gap-4 print:hidden z-50 items-center justify-between shadow-md shrink-0">
        <div className="font-bold text-neutral-500 text-sm hidden md:block">
          Visualização do Relatório - Selecionados: {filteredItems.length}
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end overflow-x-auto hide-scrollbar">
          <button onClick={() => window.print()} className="bg-neutral-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-800 whitespace-nowrap">
            <Printer size={16} /> <span className="hidden sm:inline">Imprimir / Salvar PDF</span><span className="sm:hidden">Imprimir</span>
          </button>
          <button onClick={() => setStep('config')} className="bg-neutral-200 text-neutral-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-300 whitespace-nowrap">
            <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
          </button>
          <button onClick={onClose} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-200 whitespace-nowrap">
            <X size={16} /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 flex justify-center items-start">
        <div className="bg-white shadow-2xl print:shadow-none w-full print:w-full max-w-[210mm] min-h-[297mm]">
          <ServicosPublicosPrintLayout filteredItems={filteredItems} filters={{ status: filterStatus, category: filterCategory }} loading={loading} />
        </div>
      </div>
    </div>,
    document.body
  );
};

const ServicosPublicosPrintLayout = ({ filteredItems, filters, loading }: { filteredItems: Demanda[], filters: any, loading: boolean }) => {
  if (loading) return <div className="p-10 text-center font-bold">Carregando dados...</div>;

  const concluidosCount = filteredItems.filter(item => item.status === 'Concluído').length;
  
  return (
    <div className="mx-auto p-6 sm:p-10 bg-white min-h-[297mm] print:p-0 print:m-0 text-black">
      <div className="text-center mb-10 border-b-2 border-neutral-200 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-widest">Relatório de Demandas (Serviços Públicos)</h1>
        <p className="text-sm text-neutral-500 mt-2">Plataforma Gestão 360 - Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        
        {filters && (filters.category !== 'Todas' || filters.status !== 'Todos') && (
          <div className="mt-4 flex flex-wrap justify-center gap-3 print:hidden">
            {filters.category !== 'Todas' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Categoria: {filters.category}</span>}
            {filters.status !== 'Todos' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Status: {filters.status}</span>}
          </div>
        )}
      </div>

      <div className="flex justify-between mb-8">
        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 w-[48%]">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total de Solicitações</p>
          <p className="text-2xl font-black">{filteredItems.length}</p>
        </div>
        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 w-[48%]">
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Demandas Concluídas</p>
          <p className="text-2xl font-black text-emerald-600">{concluidosCount}</p>
        </div>
      </div>

      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-800">
            <th className="py-3 px-2 font-black uppercase tracking-widest">Protocolo</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Solicitante</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Categoria</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest">Endereço</th>
            <th className="py-3 px-2 font-black uppercase tracking-widest text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-3 px-2 font-mono text-xs">{item.protocolo}</td>
              <td className="py-3 px-2 font-bold">{item.solicitante}</td>
              <td className="py-3 px-2 text-neutral-600">{item.categoria}</td>
              <td className="py-3 px-2 text-neutral-600 text-xs">{item.endereco}</td>
              <td className="py-3 px-2 font-bold text-right text-xs uppercase">{item.status}</td>
            </tr>
          ))}
          {filteredItems.length === 0 && (
            <tr><td colSpan={5} className="py-8 text-center text-neutral-500 italic">Nenhuma demanda encontrada.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};


// ==========================================
// PATRIMÔNIO: RELATÓRIO
// ==========================================
const PatrimonioPrintView = ({ patrimonioItems, onClose }: { patrimonioItems: PatrimonioItem[], onClose: () => void }) => {
  const [step, setStep] = React.useState<'config' | 'preview'>('config');
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

  if (step === 'config') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <Package className="text-neutral-500" /> Relatório Patrimonial
            </h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><X size={24} /></button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Buscar Patrimônio</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Código ou Nome do Objeto..." 
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Departamento</label>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-neutral-900 outline-none">
                  <option value="Todos">Todos os Departamentos</option>
                  {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Condição</label>
                <select value={filterCond} onChange={e => setFilterCond(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-neutral-900 outline-none">
                  <option value="Todos">Todos os Estados</option>
                  <option value="Excelente">Excelente</option>
                  <option value="Bom">Bom</option>
                  <option value="Ruim">Ruim</option>
                  <option value="Muito Ruim">Muito Ruim</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-neutral-900 outline-none">
                <option value="Todos">Todos os Status</option>
                <option value="Servível">Servível</option>
                <option value="Inservível">Inservível</option>
                <option value="Ocioso">Ocioso</option>
                <option value="Em Manutenção">Em Manutenção</option>
                <option value="Baixado">Baixado</option>
              </select>
            </div>
          </div>

          <div className="mt-10 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors">Cancelar</button>
            <button 
              onClick={() => setStep('preview')} 
              className="px-8 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-100 print:bg-white text-black print:text-black flex flex-col">
      <div className="bg-white border-b border-neutral-300 p-4 flex flex-col sm:flex-row gap-4 print:hidden z-50 items-center justify-between shadow-md shrink-0">
        <div className="font-bold text-neutral-500 text-sm hidden md:block">
          Visualização do Relatório - Selecionados: {filteredItems.length}
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end overflow-x-auto hide-scrollbar">
          <button onClick={() => window.print()} className="bg-neutral-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-800 whitespace-nowrap">
            <Printer size={16} /> <span className="hidden sm:inline">Imprimir / Salvar PDF</span><span className="sm:hidden">Imprimir</span>
          </button>
          <button onClick={() => setStep('config')} className="bg-neutral-200 text-neutral-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-neutral-300 whitespace-nowrap">
            <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
          </button>
          <button onClick={onClose} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-rose-200 whitespace-nowrap">
            <X size={16} /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 flex justify-center items-start">
        <div className="bg-white shadow-2xl print:shadow-none w-full print:w-full max-w-[210mm] min-h-[297mm]">
          <PatrimonioPrintLayout filteredItems={filteredItems} filters={{ dept: filterDept, cond: filterCond, status: filterStatus, search: filterSearch }} />
        </div>
      </div>
    </div>,
    document.body
  );
};

const PatrimonioPrintLayout = ({ filteredItems, filters }: { filteredItems: PatrimonioItem[], filters?: { dept?: string, cond?: string, search?: string, status?: string } }) => {
  const servivelCount = filteredItems.filter(item => item.status === 'Servível').length;
  
  return (
    <div className="max-w-[210mm] mx-auto p-10 bg-white min-h-[297mm] print:p-0 print:m-0 text-black">
      <div className="text-center mb-10 border-b-2 border-neutral-200 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-widest">Relatório de Controle Patrimonial</h1>
        <p className="text-sm text-neutral-500 mt-2">Plataforma Gestão 360 - Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        
        {filters && (filters.dept !== 'Todos' || filters.cond !== 'Todos' || filters.status !== 'Todos' || filters.search) && (
          <div className="mt-4 flex flex-wrap justify-center gap-3 print:hidden">
            {filters.dept && filters.dept !== 'Todos' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Departamento: {filters.dept}</span>}
            {filters.cond && filters.cond !== 'Todos' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Estado: {filters.cond}</span>}
            {filters.status && filters.status !== 'Todos' && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Status: {filters.status}</span>}
            {filters.search && <span className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-200">Busca: "{filters.search}"</span>}
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
          <p className="text-2xl font-black">{servivelCount}</p>
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
            <tr><td colSpan={5} className="py-8 text-center text-neutral-500 italic">Nenhum item encontrado com os filtros atuais.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// MÓDULO PRINCIPAL DE RELATÓRIOS
// ==========================================
const ReportsModule = ({ patrimonioItems, initialReport, clearPendingReport }: { patrimonioItems: PatrimonioItem[], initialReport?: 'patrimonio' | 'saude' | 'servicos_publicos' | null, clearPendingReport?: () => void }) => {
  const [activeReport, setActiveReport] = React.useState<'patrimonio' | 'saude' | 'servicos_publicos' | null>(initialReport || null);

  React.useEffect(() => {
    if (initialReport) {
      setActiveReport(initialReport);
      if (clearPendingReport) clearPendingReport();
    }
  }, [initialReport, clearPendingReport]);

  if (activeReport === 'patrimonio') {
    return <PatrimonioPrintView patrimonioItems={patrimonioItems} onClose={() => setActiveReport(null)} />;
  }

  if (activeReport === 'saude') {
    return <SaudePrintView onClose={() => setActiveReport(null)} />;
  }

  if (activeReport === 'servicos_publicos') {
    return <ServicosPublicosPrintView onClose={() => setActiveReport(null)} />;
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
        
        {/* Card: Saúde */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 flex flex-col hover:border-emerald-500/30 transition-colors shadow-sm hover:shadow-md">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <HeartPulse size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 mb-2">Saúde: Agendamentos</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 flex-1">
            Relatório de controle de pacientes, exames, consultas e situação de atendimento em tempo real.
          </p>
          <button 
            onClick={() => setActiveReport('saude')}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download size={16} /> Emitir Relatório
          </button>
        </div>

        {/* Card: Serviços Públicos */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 flex flex-col hover:border-sky-500/30 transition-colors shadow-sm hover:shadow-md">
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center mb-4">
            <Wrench size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 mb-2">Serviços Públicos: Demandas</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 flex-1">
            Relação de chamados abertos pelo cidadão, categorizados por serviço e seus respectivos status de atendimento.
          </p>
          <button 
            onClick={() => setActiveReport('servicos_publicos')}
            className="w-full py-3 bg-sky-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
          >
            <Download size={16} /> Emitir Relatório
          </button>
        </div>

        {/* Card: Patrimônio */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 flex flex-col hover:border-neutral-400/30 transition-colors shadow-sm hover:shadow-md">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl flex items-center justify-center mb-4">
            <Package size={24} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 mb-2">Controle Patrimonial</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 flex-1">
            Relatório completo com a relação de todos os bens cadastrados, seus valores, estado de conservação e tombamento.
          </p>
          <button 
            onClick={() => setActiveReport('patrimonio')}
            className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Download size={16} /> Emitir Relatório
          </button>
        </div>

      </div>
    </div>
  );
};

export { ReportsModule, PatrimonioPrintView, PatrimonioPrintLayout };
