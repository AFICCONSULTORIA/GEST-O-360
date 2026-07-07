import React, { useState } from 'react';
import { Plus, Search, X, Edit2, Trash2, MessagesSquare, CheckCircle2, Clock, AlertCircle, Printer, MapPin, ChevronRight, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../components/ui/Toast';

export interface Referral {
  id: string;
  patientName: string;
  date: string;
  destination: string;
  reason: string;
  status: 'Aguardando' | 'Encaminhado' | 'Finalizado';
}

const MOCK_REFERRALS: Referral[] = [
  {
    id: '1',
    patientName: 'Maria Silva',
    date: '2026-07-02',
    destination: 'CAPS (Saúde Mental)',
    reason: 'Paciente apresenta sintomas agudos de ansiedade generalizada com prejuízo no sono e alimentação. Necessita de avaliação psiquiátrica.',
    status: 'Encaminhado'
  },
  {
    id: '2',
    patientName: 'João Souza',
    date: '2026-07-05',
    destination: 'CRAS (Proteção Básica)',
    reason: 'Identificada situação de vulnerabilidade social extrema. Encaminhado para atualização do CadÚnico e inserção em programas de transferência de renda.',
    status: 'Aguardando'
  }
];

export const EncaminhamentosTab = () => {
  const [referrals, setReferrals] = useState<Referral[]>(MOCK_REFERRALS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  
  const [activeView, setActiveView] = useState<'list' | 'detail'>('list');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  const [formData, setFormData] = useState<Partial<Referral>>({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    destination: 'CAPS (Saúde Mental)',
    reason: '',
    status: 'Aguardando'
  });

  const filteredReferrals = referrals.filter(r => 
    (r.patientName.toLowerCase().includes(search.toLowerCase()) || r.destination.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === 'Todos' || r.status === filterStatus)
  );

  const handleSave = () => {
    if (!formData.patientName || !formData.date || !formData.destination || !formData.reason) {
      showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    if (editingReferral) {
      const updatedReferrals = referrals.map(r => r.id === editingReferral.id ? { ...r, ...formData } as Referral : r);
      MOCK_REFERRALS.length = 0;
      MOCK_REFERRALS.push(...updatedReferrals);
      setReferrals([...MOCK_REFERRALS]);
      
      if (selectedReferral?.id === editingReferral.id) {
        setSelectedReferral({ ...selectedReferral, ...formData } as Referral);
      }
      showToast('Encaminhamento atualizado!', 'success');
    } else {
      MOCK_REFERRALS.unshift({ id: crypto.randomUUID(), ...formData } as Referral);
      setReferrals([...MOCK_REFERRALS]);
      showToast('Encaminhamento registrado!', 'success');
    }
    
    setIsModalOpen(false);
    setEditingReferral(null);
    setFormData({ patientName: '', date: new Date().toISOString().split('T')[0], destination: 'CAPS (Saúde Mental)', reason: '', status: 'Aguardando' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este encaminhamento?')) {
      const updatedReferrals = referrals.filter(r => r.id !== id);
      MOCK_REFERRALS.length = 0;
      MOCK_REFERRALS.push(...updatedReferrals);
      setReferrals([...MOCK_REFERRALS]);
      
      if (selectedReferral?.id === id) {
        setActiveView('list');
      }
      showToast('Registro excluído.', 'info');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Aguardando': return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'Encaminhado': return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'Finalizado': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      default: return 'bg-neutral-50 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400 border-neutral-200 dark:border-neutral-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aguardando': return <Clock size={14} />;
      case 'Encaminhado': return <AlertCircle size={14} />;
      case 'Finalizado': return <CheckCircle2 size={14} />;
      default: return null;
    }
  };

  if (activeView === 'detail' && selectedReferral) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveView('list'); setSelectedReferral(null); }}
              className="p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border inline-block mb-1 ${getStatusStyle(selectedReferral.status)}`}>
                {selectedReferral.status}
              </span>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                Encaminhamento: {selectedReferral.patientName}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Printer size={16} /> Imprimir Guia
            </button>
            <button 
              onClick={() => {
                setEditingReferral(selectedReferral);
                setFormData(selectedReferral);
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
            >
              <Edit2 size={16} /> Editar
            </button>
          </div>
        </div>

        <style type="text/css" media="print">
          {`
            @page { size: A4; margin: 20mm; }
            body { background-color: white !important; }
            .print\\:hidden { display: none !important; }
          `}
        </style>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 md:p-12 shadow-sm print:border-none print:shadow-none print:p-0 print:bg-transparent">
          
          {/* Cabeçalho Oficial de Impressão */}
          <div className="hidden print:flex flex-col items-center mb-12 border-b-2 border-black pb-8">
            <div className="flex items-center gap-3 mb-4 text-black">
              <HeartHandshake size={36} />
              <h1 className="text-3xl font-black uppercase tracking-tight">GESTÃO 360</h1>
            </div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-black mb-1">Guia de Encaminhamento</h2>
            <p className="text-sm text-black">Secretaria Municipal de Assistência Social</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="print:border print:border-black print:p-6 print:rounded-2xl">
              <h3 className="text-sm font-black text-rose-500 print:text-black uppercase tracking-widest mb-4">Paciente</h3>
              <p className="text-xl font-bold text-neutral-900 dark:text-white print:text-black">{selectedReferral.patientName}</p>
              <p className="text-neutral-500 print:text-black mt-2">Data do Encaminhamento: {new Date(selectedReferral.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="print:border print:border-black print:p-6 print:rounded-2xl">
              <h3 className="text-sm font-black text-rose-500 print:text-black uppercase tracking-widest mb-4">Encaminhado Para</h3>
              <div className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white print:text-black">
                <MapPin size={24} className="text-rose-500 print:hidden" />
                {selectedReferral.destination}
              </div>
            </div>
          </div>
          
          <div className="print:border print:border-black print:p-6 print:rounded-2xl mb-12">
            <h3 className="text-sm font-black text-rose-500 print:text-black uppercase tracking-widest mb-4">Motivo do Encaminhamento</h3>
            <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl print:bg-transparent print:p-0 print:border-none border border-neutral-100 dark:border-neutral-800">
              <p className="text-neutral-700 dark:text-neutral-300 print:text-black text-lg whitespace-pre-wrap leading-relaxed text-justify">
                {selectedReferral.reason}
              </p>
            </div>
          </div>
          
          <div className="hidden print:block mt-32">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
              <div className="w-full border-t-2 border-black mb-4"></div>
              <p className="font-bold text-lg text-black">Assinatura e Carimbo do Profissional</p>
              <p className="text-sm text-black mt-1">Psicologia / Assistência Social</p>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {isModalOpen && (
            <ReferralModal formData={formData} setFormData={setFormData} onClose={() => setIsModalOpen(false)} onSave={handleSave} isEditing={true} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print:hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por paciente ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-bold text-neutral-700 dark:text-neutral-300 focus:ring-2 focus:ring-rose-500 outline-none whitespace-nowrap"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Aguardando">Aguardando</option>
            <option value="Encaminhado">Encaminhado</option>
            <option value="Finalizado">Finalizado</option>
          </select>
          <button
            onClick={() => {
              setEditingReferral(null);
              setFormData({ patientName: '', date: new Date().toISOString().split('T')[0], destination: 'CAPS (Saúde Mental)', reason: '', status: 'Aguardando' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 whitespace-nowrap"
          >
            <Plus size={18} /> Novo Encaminhamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReferrals.map(referral => (
          <div key={referral.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow relative group cursor-pointer" onClick={() => { setSelectedReferral(referral); setActiveView('detail'); }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
                <MessagesSquare size={24} />
              </div>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingReferral(referral); setFormData(referral); setIsModalOpen(true); }} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(referral.id); }} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h4 className="text-lg font-black text-neutral-900 dark:text-white mb-2 line-clamp-1">{referral.patientName}</h4>
            
            <div className="flex items-center gap-2 mb-4">
              <span className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getStatusStyle(referral.status)}`}>
                {getStatusIcon(referral.status)}
                {referral.status}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                {new Date(referral.date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
              <MapPin size={16} className="text-rose-500" />
              Para: {referral.destination}
            </div>
            
            <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3 mb-6 flex-1">
              <strong className="text-neutral-900 dark:text-white block mb-1">Motivo / Justificativa:</strong>
              {referral.reason}
            </p>

            <button onClick={(e) => { e.stopPropagation(); setSelectedReferral(referral); setActiveView('detail'); setTimeout(() => window.print(), 100); }} className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-bold transition-colors">
              <Printer size={16} /> Imprimir Guia
            </button>
          </div>
        ))}
        {filteredReferrals.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center mb-4">
              <MessagesSquare size={40} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Nenhum encaminhamento encontrado</h3>
            <p className="text-neutral-500 text-sm">Tente ajustar a busca ou o filtro de status.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <ReferralModal formData={formData} setFormData={setFormData} onClose={() => setIsModalOpen(false)} onSave={handleSave} isEditing={!!editingReferral} />
        )}
      </AnimatePresence>
    </div>
  );
};

const ReferralModal = ({ formData, setFormData, onClose, onSave, isEditing }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm print:hidden">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] p-8 sm:p-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{isEditing ? 'Editar Encaminhamento' : 'Novo Encaminhamento'}</h3>
          <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Paciente *</label>
            <input
              type="text"
              value={formData.patientName}
              onChange={e => setFormData({ ...formData, patientName: e.target.value })}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
              placeholder="Nome completo do paciente"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Data *</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
              >
                <option value="Aguardando">Aguardando</option>
                <option value="Encaminhado">Encaminhado</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Local de Destino *</label>
            <select
              value={formData.destination}
              onChange={e => setFormData({ ...formData, destination: e.target.value })}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
            >
              <option value="CAPS (Saúde Mental)">CAPS (Saúde Mental)</option>
              <option value="CRAS (Proteção Básica)">CRAS (Proteção Básica)</option>
              <option value="CREAS (Proteção Especial)">CREAS (Proteção Especial)</option>
              <option value="Conselho Tutelar">Conselho Tutelar</option>
              <option value="UBS (Saúde Básica)">UBS (Saúde Básica)</option>
              <option value="Especialidade Médica (Psiquiatria)">Especialidade Médica (Psiquiatria)</option>
              <option value="Especialidade Médica (Neurologia)">Especialidade Médica (Neurologia)</option>
              <option value="Ministério Público">Ministério Público</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Motivo do Encaminhamento *</label>
            <textarea
              rows={5}
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar text-neutral-900 dark:text-white"
              placeholder="Justificativa técnica e demanda do paciente para o encaminhamento..."
            />
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onSave} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
            {isEditing ? 'Salvar Edição' : 'Registrar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
