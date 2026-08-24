import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Package, AlertTriangle, AlertCircle, Edit2, Trash2, 
  XCircle, FileText, Calendar as CalendarIcon, TrendingUp, TrendingDown,
  User, CheckCircle2, ShieldAlert, Printer, Clock, ArrowRight, DollarSign,
  Pill, History, Stethoscope, ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { 
  Patient, MedicationDispensation, HealthUnit, HealthProfessional,
  formatCPF, formatSUS, formatPhone, checkMedicationEarlyRefill, EarlyRefillCheckResult, DEFAULT_HEALTH_UNITS,
  generateUUID, isValidUUID
} from './types';

export interface Medication {
  id: string;
  institution_id?: string | null;
  name: string;
  active_ingredient: string;
  dosage: string;
  form: string;
  quantity: number;
  expiration_date: string;
  batch_number: string;
  created_at?: string;
}

const COMMON_FORMS = [
  'Comprimido',
  'Cápsula',
  'Xarope',
  'Suspensão',
  'Solução',
  'Gotas',
  'Pomada',
  'Creme',
  'Injetável'
];

interface FarmaciaModuleProps {
  currentInstitution?: { id: string; name?: string } | null;
  patients?: Patient[];
  dispensations?: MedicationDispensation[];
  onRefreshData?: () => void;
}

export const FarmaciaModule: React.FC<FarmaciaModuleProps> = ({ 
  currentInstitution,
  patients = [],
  dispensations = [],
  onRefreshData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dispensacao' | 'estoque' | 'historico'>('dispensacao');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [localDispensations, setLocalDispensations] = useState<MedicationDispensation[]>(dispensations);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modais de Medicamento e Estoque
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState<{ isOpen: boolean; type: 'in' | 'out'; med: Medication | null }>({
    isOpen: false,
    type: 'in',
    med: null
  });

  // Modal de Dispensação e Impressão de Comprovante
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [selectedDispenseToPrint, setSelectedDispenseToPrint] = useState<MedicationDispensation | null>(null);

  const loadMedicationsAndDispensations = async () => {
    setIsLoading(true);
    try {
      let medQuery = supabase.from('medications').select('*');
      if (currentInstitution?.id) medQuery = medQuery.eq('institution_id', currentInstitution.id);
      const { data: medData, error: medError } = await medQuery.order('name', { ascending: true });
      if (medData) setMedications(medData as Medication[]);

      let dispQuery = supabase.from('medication_dispensations').select('*');
      if (currentInstitution?.id) dispQuery = dispQuery.eq('institution_id', currentInstitution.id);
      const { data: dispData } = await dispQuery.order('created_at', { ascending: false });
      if (dispData) setLocalDispensations(dispData as MedicationDispensation[]);
    } catch (err) {
      console.error('Erro ao carregar dados da farmácia:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedicationsAndDispensations();

    const channel = supabase
      .channel('farmacia-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
        loadMedicationsAndDispensations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_dispensations' }, () => {
        loadMedicationsAndDispensations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentInstitution?.id]);

  const deleteMedication = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este medicamento do sistema?')) return;
    const { error } = await supabase.from('medications').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir medicamento', 'error');
    } else {
      setMedications(medications.filter(m => m.id !== id));
      showToast('Medicamento excluído com sucesso!', 'success');
    }
  };

  const isExpiringSoon = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(expDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 60 && expDate > today;
  };

  const isExpired = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    return expDate < today;
  };

  const filteredMeds = medications.filter(m => {
    const search = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(search) || m.active_ingredient.toLowerCase().includes(search);
  });

  const lowStockCount = medications.filter(m => m.quantity < 50).length;
  const expiredCount = medications.filter(m => isExpired(m.expiration_date)).length;
  const totalDispensationsMonth = localDispensations.length;
  const totalUnitsDispensed = localDispensations.reduce((acc, curr) => acc + (curr.quantity_dispensed || 1), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner de KPIs da Farmácia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Total de Medicamentos Cadastrados</p>
              <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1.5">{medications.length}</h3>
              <p className="text-xs text-neutral-500 mt-1">Itens disponíveis na REMUME</p>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Dispensações Realizadas</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{totalDispensationsMonth}</h3>
              <p className="text-xs text-neutral-500 mt-1">{totalUnitsDispensed} unidades entregues a munícipes</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShoppingBag size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-amber-100 dark:border-amber-950/30 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Alerta de Estoque Baixo</p>
              <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{lowStockCount}</h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">Menos de 50 unidades no estoque</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-rose-100 dark:border-rose-950/30 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Medicamentos Vencidos</p>
              <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1.5">{expiredCount}</h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1">Lotes impróprios para dispensação</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Header Operacional e Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-black italic tracking-tight uppercase dark:text-neutral-100 flex items-center gap-3">
            <span className="bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 p-2 rounded-xl">
              <Pill size={22} />
            </span>
            Farmácia Popular & SUS
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
            Controle de dispensação por paciente (CPF/SUS), carência de 30 dias e gestão de estoque.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsDispenseModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
          >
            <ShoppingBag size={16} /> Dispensar Medicamento ao Paciente
          </button>

          <button 
            onClick={() => { setEditingMedication(null); setIsMedModalOpen(true); }}
            className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-sky-500/30 flex items-center gap-2"
          >
            <Plus size={16} /> Novo Medicamento no Estoque
          </button>
        </div>
      </div>

      {/* Navegação entre Sub-abas */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('dispensacao')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeSubTab === 'dispensacao'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <ShoppingBag size={16} />
          Dispensação Rápida
        </button>

        <button
          onClick={() => setActiveSubTab('estoque')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeSubTab === 'estoque'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <Package size={16} />
          Estoque & Lotes ({medications.length})
        </button>

        <button
          onClick={() => setActiveSubTab('historico')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeSubTab === 'historico'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <History size={16} />
          Histórico de Retiradas por Paciente ({localDispensations.length})
        </button>
      </div>

      {/* CONTEÚDO 1: DISPENSAÇÃO RÁPIDA / GUIA */}
      {activeSubTab === 'dispensacao' && (
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-6">
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">Registro de Entrega de Medicamentos</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Evite fraudes e retiradas antecipadas. O sistema valida automaticamente o tempo de uso prescrito.
              </p>
            </div>
            <button
              onClick={() => setIsDispenseModalOpen(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 self-start"
            >
              <Plus size={18} /> Iniciar Nova Dispensação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-xl flex items-center justify-center font-black">1</div>
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">Identifique o Paciente</h4>
              <p className="text-xs text-neutral-500">Busca rápida por Nome, CPF ou Cartão SUS para verificar o histórico de retiradas anteriores.</p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="w-10 h-10 bg-sky-100 dark:bg-sky-500/20 text-sky-600 rounded-xl flex items-center justify-center font-black">2</div>
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">Selecione o Medicamento & Posologia</h4>
              <p className="text-xs text-neutral-500">Informe a quantidade e os dias de tratamento. O sistema calcula a data da próxima retirada autorizada.</p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 text-purple-600 rounded-xl flex items-center justify-center font-black">3</div>
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">Baixa no Estoque & Comprovante</h4>
              <p className="text-xs text-neutral-500">O estoque é debitado instantaneamente e você pode imprimir o comprovante de entrega para o cidadão.</p>
            </div>
          </div>

          {/* Últimas Dispensações Registradas */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Últimas Dispensações Realizadas Hoje</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Medicamento</th>
                    <th className="p-3">Qtd. Entregue</th>
                    <th className="p-3">Dias Cobertos</th>
                    <th className="p-3">Data da Retirada</th>
                    <th className="p-3 text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {localDispensations.slice(0, 5).map(d => (
                    <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="p-3 font-bold text-neutral-900 dark:text-white">
                        {d.patient_name}
                        <span className="block font-mono text-[10px] text-neutral-400 font-normal">CPF: {d.patient_cpf}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-sky-600 dark:text-sky-400">{d.medication_name}</span>
                        <span className="block text-[10px] text-neutral-400">{d.dosage} - {d.form}</span>
                      </td>
                      <td className="p-3 font-black text-emerald-600">{d.quantity_dispensed} un.</td>
                      <td className="p-3 font-medium text-neutral-600 dark:text-neutral-300">{d.days_of_treatment} dias</td>
                      <td className="p-3 text-neutral-500 font-mono">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => setSelectedDispenseToPrint(d)}
                          className="p-1.5 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="Imprimir Comprovante"
                        >
                          <Printer size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {localDispensations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400 italic">
                        Nenhuma dispensação registrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO 2: ESTOQUE & LOTES */}
      {activeSubTab === 'estoque' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text"
                placeholder="Buscar medicamento no estoque por nome ou princípio ativo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    <th className="p-4">Medicamento</th>
                    <th className="p-4">Princípio Ativo</th>
                    <th className="p-4">Apresentação</th>
                    <th className="p-4">Estoque</th>
                    <th className="p-4">Validade / Lote</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredMeds.map(med => {
                    const expired = isExpired(med.expiration_date);
                    const expiringSoon = isExpiringSoon(med.expiration_date);
                    const lowStock = med.quantity < 50;
                    
                    return (
                      <tr key={med.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-neutral-900 dark:text-neutral-100">{med.name}</div>
                        </td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400">
                          {med.active_ingredient}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-neutral-800 dark:text-neutral-200">{med.dosage}</div>
                          <div className="text-[11px] text-neutral-400">{med.form}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-base font-black ${
                              lowStock ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {med.quantity}
                            </span>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => setIsStockModalOpen({ isOpen: true, type: 'in', med })} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
                                Entrada
                              </button>
                              <button onClick={() => setIsStockModalOpen({ isOpen: true, type: 'out', med })} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400">
                                Saída
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`font-bold flex items-center gap-1.5 ${
                            expired ? 'text-rose-600 dark:text-rose-400' : 
                            expiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'
                          }`}>
                            <CalendarIcon size={14} /> 
                            {med.expiration_date ? med.expiration_date.split('-').reverse().join('/') : '---'}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Lote: {med.batch_number}</div>
                        </td>
                        <td className="p-4 text-right space-x-1">
                          <button 
                            onClick={() => { setEditingMedication(med); setIsMedModalOpen(true); }}
                            className="p-2 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteMedication(med.id)}
                            className="p-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO 3: HISTÓRICO DE DISPENSAÇÕES */}
      {activeSubTab === 'historico' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Histórico Geral de Dispensações</h3>
              <p className="text-xs text-neutral-400">Rastreabilidade completa de todas as entregas realizadas na rede municipal.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  <th className="p-4">Paciente (Cidadão)</th>
                  <th className="p-4">Medicamento & Dosagem</th>
                  <th className="p-4">Qtd. / Tratamento</th>
                  <th className="p-4">Médico & Receita</th>
                  <th className="p-4">Data Retirada & Próxima Liberada</th>
                  <th className="p-4 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {localDispensations.map(d => (
                  <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-neutral-900 dark:text-white">{d.patient_name}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">CPF: {d.patient_cpf} · SUS: {d.patient_sus}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-sky-600 dark:text-sky-400">{d.medication_name}</div>
                      <div className="text-[11px] text-neutral-400">{d.dosage} - {d.form}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-black text-emerald-600">{d.quantity_dispensed} un.</div>
                      <div className="text-[11px] text-neutral-400">{d.days_of_treatment} dias de uso</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-neutral-800 dark:text-neutral-200">{d.doctor_name || 'Médico da Rede'}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">Receita: {d.prescription_number || 'Sem nº'} {d.doctor_crm ? `· ${d.doctor_crm}` : ''}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-neutral-700 dark:text-neutral-300 font-mono">
                        Entregue: {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '---'}
                      </div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold font-mono">
                        Próx: {d.next_allowed_dispensation_date ? d.next_allowed_dispensation_date.split('-').reverse().join('/') : '---'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedDispenseToPrint(d)}
                        className="p-2 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-colors"
                        title="Imprimir Comprovante"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: REGISTRO DE DISPENSAÇÃO AO PACIENTE COM TRAVA     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isDispenseModalOpen && (
          <DispenseMedicationModal 
            medications={medications}
            patients={patients}
            dispensations={localDispensations}
            onClose={() => setIsDispenseModalOpen(false)}
            onSuccess={() => {
              setIsDispenseModalOpen(false);
              loadMedicationsAndDispensations();
              if (onRefreshData) onRefreshData();
            }}
            currentInstitution={currentInstitution}
          />
        )}

        {/* MODAL 2: CADASTRO / EDIÇÃO DE MEDICAMENTO NO ESTOQUE */}
        {isMedModalOpen && (
          <MedicationModal 
            medication={editingMedication}
            onClose={() => setIsMedModalOpen(false)}
            onSuccess={() => { 
              loadMedicationsAndDispensations(); 
              setIsMedModalOpen(false); 
              if (onRefreshData) onRefreshData();
            }}
            currentInstitution={currentInstitution}
          />
        )}

        {/* MODAL 3: ENTRADA / SAÍDA DE ESTOQUE */}
        {isStockModalOpen.isOpen && isStockModalOpen.med && (
          <StockModal 
            medication={isStockModalOpen.med}
            type={isStockModalOpen.type}
            onClose={() => setIsStockModalOpen({ isOpen: false, type: 'in', med: null })}
            onSuccess={() => { 
              loadMedicationsAndDispensations(); 
              setIsStockModalOpen({ isOpen: false, type: 'in', med: null }); 
              if (onRefreshData) onRefreshData();
            }}
          />
        )}

        {/* MODAL 4: IMPRESSÃO DE COMPROVANTE DE DISPENSAÇÃO */}
        {selectedDispenseToPrint && (
          <PrintDispensationReceiptModal 
            disp={selectedDispenseToPrint}
            currentInstitution={currentInstitution}
            onClose={() => setSelectedDispenseToPrint(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE DISPENSAÇÃO COM VERIFICAÇÃO ANTECIPADA
// =========================================================
interface DispenseMedicationModalProps {
  medications: Medication[];
  patients: Patient[];
  dispensations: MedicationDispensation[];
  onClose: () => void;
  onSuccess: () => void;
  currentInstitution?: { id: string; name?: string } | null;
}

const DispenseMedicationModal: React.FC<DispenseMedicationModalProps> = ({
  medications,
  patients,
  dispensations,
  onClose,
  onSuccess,
  currentInstitution
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    patient_cpf: '',
    patient_sus: '',
    patient_phone: '',
    medication_id: medications.length > 0 ? medications[0].id : '',
    quantity_dispensed: 30,
    days_of_treatment: 30, // Quantidade de dias da receita
    doctor_name: 'Dr. Clínico da UBS',
    doctor_crm: '',
    prescription_number: '',
    prescription_date: new Date().toISOString().split('T')[0],
    dispensing_unit: 'Farmácia Popular Municipal',
    pharmacist_name: 'Atendente da Farmácia',
    notes: '',
    override_early_refill: false,
    override_reason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchedPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.cpf.includes(patientSearch) ||
    p.sus_number.includes(patientSearch)
  ).slice(0, 5);

  const handleSelectPatient = (p: Patient) => {
    setFormData(prev => ({
      ...prev,
      patient_id: p.id,
      patient_name: p.name,
      patient_cpf: p.cpf,
      patient_sus: p.sus_number,
      patient_phone: p.phone || ''
    }));
    setPatientSearch(p.name);
    setShowPatientResults(false);
  };

  const selectedMed = medications.find(m => m.id === formData.medication_id);

  // Verificação de Retirada Antecipada
  const earlyRefillCheck: EarlyRefillCheckResult = checkMedicationEarlyRefill(
    formData.patient_cpf,
    formData.medication_id,
    dispensations,
    formData.prescription_date
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_name || !formData.medication_id) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    if (!selectedMed) {
      showToast('Medicamento não encontrado.', 'error');
      return;
    }

    if (formData.quantity_dispensed > selectedMed.quantity) {
      showToast(`Estoque insuficiente! Disponível: ${selectedMed.quantity} unidades.`, 'error');
      return;
    }

    if (earlyRefillCheck.isEarly && !formData.override_early_refill) {
      showToast('Aviso: Paciente em período de tratamento ativo. Marque a liberação com justificativa se autorizado pelo farmacêutico.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Calcular a data mínima da próxima retirada autorizada
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + formData.days_of_treatment);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      // 2. Inserir Registro de Dispensação
      const newDisp: Partial<MedicationDispensation> = {
        id: generateUUID(),
        patient_id: isValidUUID(formData.patient_id) ? formData.patient_id : null,
        patient_name: formData.patient_name,
        patient_cpf: formData.patient_cpf,
        patient_sus: formData.patient_sus,
        patient_phone: formData.patient_phone || null,
        medication_id: selectedMed.id,
        medication_name: selectedMed.name,
        dosage: selectedMed.dosage,
        form: selectedMed.form,
        batch_number: selectedMed.batch_number,
        quantity_dispensed: formData.quantity_dispensed,
        days_of_treatment: formData.days_of_treatment,
        next_allowed_dispensation_date: nextDateStr,
        doctor_name: formData.doctor_name || null,
        doctor_crm: formData.doctor_crm || null,
        prescription_number: formData.prescription_number || null,
        prescription_date: formData.prescription_date,
        dispensing_unit: formData.dispensing_unit,
        pharmacist_name: formData.pharmacist_name || null,
        notes: formData.override_early_refill 
          ? `[LIBERAÇÃO ANTECIPADA]: ${formData.override_reason}. ${formData.notes || ''}` 
          : formData.notes || null,
        institution_id: currentInstitution?.id || null
      };

      const { error: dispError } = await supabase.from('medication_dispensations').insert([newDisp]);
      if (dispError) throw dispError;

      // 3. Atualizar Estoque (Debitar quantidade entregue)
      const newQty = selectedMed.quantity - formData.quantity_dispensed;
      const { error: medError } = await supabase.from('medications').update({ quantity: newQty }).eq('id', selectedMed.id);
      if (medError) console.error('Erro ao debitar estoque:', medError);

      showToast(`Dispensação de ${formData.quantity_dispensed} un. de ${selectedMed.name} concluída com sucesso!`, 'success');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao registrar dispensação: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">Dispensação de Medicamento (Farmácia Popular)</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Vinculação direta por CPF/SUS com baixa automática no estoque.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Autocomplete de Paciente */}
          <div className="relative space-y-1 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Buscar Paciente Cadastrado
            </label>
            <div className="relative">
              <input 
                type="text"
                value={patientSearch}
                onChange={e => {
                  setPatientSearch(e.target.value);
                  setShowPatientResults(true);
                }}
                onFocus={() => setShowPatientResults(true)}
                placeholder="Digite o Nome, CPF ou Cartão SUS..."
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            {showPatientResults && patientSearch && matchedPatients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-30 overflow-hidden">
                {matchedPatients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-neutral-800 flex justify-between items-center text-xs border-b last:border-0 border-neutral-100 dark:border-neutral-800"
                  >
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{p.name}</p>
                      <p className="text-[11px] text-neutral-400 font-mono">CPF: {p.cpf} · SUS: {p.sus_number}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">Selecionar</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome do Paciente *</label>
              <input 
                type="text" required
                value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CPF *</label>
              <input 
                type="text" required
                value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: formatCPF(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cartão SUS *</label>
              <input 
                type="text" required
                value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: formatSUS(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            {/* Seleção do Medicamento */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Medicamento Solicitado *
              </label>
              <select 
                value={formData.medication_id}
                onChange={e => setFormData({...formData, medication_id: e.target.value})}
                required
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-sky-300 dark:border-sky-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                {medications.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.dosage} - {m.form}) — Estoque: {m.quantity} un.
                  </option>
                ))}
              </select>
            </div>

            {/* ========================================================= */}
            {/* 🛑 ALERTA DE RETIRADA ANTECIPADA NA FARMÁCIA POPULAR      */}
            {/* ========================================================= */}
            {earlyRefillCheck.isEarly && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:col-span-2 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-amber-800 dark:text-amber-300">
                      AVISO DE RETIRADA ANTECIPADA / TRATAMENTO EM ANDAMENTO
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-1 leading-relaxed">
                      {earlyRefillCheck.message}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-900 dark:text-amber-200">
                    <input 
                      type="checkbox"
                      checked={formData.override_early_refill}
                      onChange={e => setFormData({...formData, override_early_refill: e.target.checked})}
                      className="rounded text-amber-600"
                    />
                    <span>Autorizar Nova Retirada com Parecer do Farmacêutico</span>
                  </label>

                  {formData.override_early_refill && (
                    <input 
                      type="text" required
                      value={formData.override_reason}
                      onChange={e => setFormData({...formData, override_reason: e.target.value})}
                      placeholder="Motivo da liberação antecipada (ex: aumento de dose prescrita pelo médico, perda justificada)..."
                      className="w-full bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 px-4 py-2 rounded-xl text-xs outline-none dark:text-white"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Quantidade & Dias de Tratamento */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Quantidade a Entregar *</label>
              <input 
                type="number" required min="1" max={selectedMed?.quantity}
                value={formData.quantity_dispensed || ''} onChange={e => setFormData({...formData, quantity_dispensed: parseInt(e.target.value) || 0})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Duração da Prescrição (Dias) *</label>
              <input 
                type="number" required min="1"
                value={formData.days_of_treatment || ''} onChange={e => setFormData({...formData, days_of_treatment: parseInt(e.target.value) || 30})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              />
            </div>

            {/* Médico Prescritor */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Médico Prescritor</label>
              <input 
                type="text"
                value={formData.doctor_name} onChange={e => setFormData({...formData, doctor_name: e.target.value})}
                placeholder="Nome do médico na receita"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nº da Receita / CRM</label>
              <input 
                type="text"
                value={formData.prescription_number} onChange={e => setFormData({...formData, prescription_number: e.target.value})}
                placeholder="Ex: REC-45812 / CRM 9988"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || (earlyRefillCheck.isEarly && !formData.override_early_refill)}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Entrega e Baixa'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE MEDICAMENTO (ESTOQUE)
// =========================================================
const MedicationModal = ({ 
  medication, 
  onClose, 
  onSuccess, 
  currentInstitution 
}: { 
  medication: Medication | null; 
  onClose: () => void; 
  onSuccess: () => void; 
  currentInstitution?: { id: string } | null;
}) => {
  const [formData, setFormData] = useState<Partial<Medication>>(
    medication || {
      name: '',
      active_ingredient: '',
      dosage: '',
      form: COMMON_FORMS[0],
      quantity: 0,
      expiration_date: '',
      batch_number: ''
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (medication) {
      const { error } = await supabase.from('medications').update(formData).eq('id', medication.id);
      if (error) {
        showToast('Erro ao atualizar medicamento.', 'error');
      } else {
        showToast('Medicamento atualizado com sucesso!', 'success');
        onSuccess();
      }
    } else {
      const newMed = {
        id: generateUUID(),
        ...formData,
        institution_id: currentInstitution?.id || null
      };
      const { error } = await supabase.from('medications').insert(newMed);
      if (error) {
        showToast('Erro ao cadastrar medicamento.', 'error');
      } else {
        showToast('Medicamento cadastrado com sucesso!', 'success');
        onSuccess();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-sky-50 dark:bg-sky-900/20">
          <h3 className="text-xl font-black text-sky-900 dark:text-sky-100 flex items-center gap-2">
            <Package size={24} className="text-sky-600 dark:text-sky-400" /> 
            {medication ? 'Editar Medicamento' : 'Novo Medicamento no Estoque'}
          </h3>
          <button onClick={onClose} className="p-2 bg-white dark:bg-neutral-800 rounded-full hover:bg-neutral-100 transition-colors">
            <XCircle size={20} className="text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome Comercial / Genérico *</label>
              <input 
                type="text" required
                value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
                placeholder="Ex: Losartana Potássica, Amoxicilina"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Princípio Ativo *</label>
              <input 
                type="text" required
                value={formData.active_ingredient || ''} onChange={e => setFormData({...formData, active_ingredient: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Dosagem *</label>
              <input 
                type="text" required
                value={formData.dosage || ''} onChange={e => setFormData({...formData, dosage: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
                placeholder="Ex: 50mg, 500mg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Forma Farmacêutica *</label>
              <select 
                required
                value={formData.form || COMMON_FORMS[0]} onChange={e => setFormData({...formData, form: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
              >
                {COMMON_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Estoque Inicial *</label>
              <input 
                type="number" required min="0"
                value={formData.quantity !== undefined ? formData.quantity : 0} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data de Validade *</label>
              <input 
                type="date" required
                value={formData.expiration_date || ''} onChange={e => setFormData({...formData, expiration_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Número do Lote *</label>
              <input 
                type="text" required
                value={formData.batch_number || ''} onChange={e => setFormData({...formData, batch_number: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-sky-500/30">
              {isSubmitting ? 'Salvando...' : medication ? 'Atualizar Medicamento' : 'Cadastrar Medicamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE ENTRADA / SAÍDA DE ESTOQUE
// =========================================================
const StockModal = ({ medication, type, onClose, onSuccess }: { medication: Medication; type: 'in' | 'out'; onClose: () => void; onSuccess: () => void }) => {
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsSubmitting(true);
    let newQuantity = medication.quantity;
    
    if (type === 'in') {
      newQuantity += amount;
    } else {
      if (amount > medication.quantity) {
        showToast('Quantidade de saída maior que o estoque!', 'error');
        setIsSubmitting(false);
        return;
      }
      newQuantity -= amount;
    }

    const { error } = await supabase.from('medications').update({ quantity: newQuantity }).eq('id', medication.id);
    
    if (error) {
      showToast('Erro ao atualizar estoque.', 'error');
    } else {
      showToast(`Estoque atualizado com sucesso!`, 'success');
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center ${
          type === 'in' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
        }`}>
          <h3 className={`text-base font-black flex items-center gap-2 ${
            type === 'in' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'
          }`}>
            {type === 'in' ? <TrendingUp size={20} className="text-emerald-600" /> : <TrendingDown size={20} className="text-amber-600" />} 
            {type === 'in' ? 'Entrada de Estoque' : 'Saída de Estoque'}
          </h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white">
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <p className="font-bold text-neutral-900 dark:text-white">{medication.name}</p>
            <p className="text-xs text-neutral-500">{medication.dosage} - {medication.form}</p>
            <p className="text-xs font-medium mt-1">Estoque atual: <span className="font-black text-sm">{medication.quantity}</span></p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Quantidade a Movimentar</label>
            <input 
              type="number" required min="1" max={type === 'out' ? medication.quantity : undefined}
              value={amount || ''} onChange={e => setAmount(parseInt(e.target.value) || 0)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-3 rounded-2xl text-center text-xl font-black outline-none dark:text-white"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || amount <= 0}
            className={`w-full text-white py-3.5 rounded-2xl font-bold text-xs shadow-lg disabled:opacity-50 ${
              type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
            }`}
          >
            {isSubmitting ? 'Processando...' : 'Confirmar Ajuste'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: COMPROVANTE DE DISPENSAÇÃO (IMPRESSÃO)
// =========================================================
const PrintDispensationReceiptModal: React.FC<{
  disp: MedicationDispensation;
  currentInstitution?: { id: string; name?: string } | null;
  onClose: () => void;
}> = ({ disp, currentInstitution, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl text-neutral-900"
      >
        <div className="p-4 bg-neutral-100 flex justify-between items-center border-b print:hidden">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Recibo de Dispensação de Medicamentos</span>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md">
              <Printer size={14} /> Imprimir Comprovante
            </button>
            <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-900">
              <XCircle size={18} />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 text-xs">
          <div className="border-b-2 border-neutral-900 pb-3 text-center">
            <h2 className="text-base font-black uppercase">{currentInstitution?.name || 'Prefeitura Municipal'}</h2>
            <p className="text-xs font-bold text-neutral-600">Secretaria Municipal de Saúde · Farmácia Popular / SUS</p>
            <p className="text-[10px] font-mono text-neutral-400 mt-1">Comprovante Nº: {disp.id.toUpperCase()}</p>
          </div>

          <div className="space-y-2 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <p><strong>Paciente:</strong> {disp.patient_name}</p>
            <p className="font-mono"><strong>CPF:</strong> {disp.patient_cpf} · <strong>SUS:</strong> {disp.patient_sus}</p>
            <p><strong>Médico Prescritor:</strong> {disp.doctor_name || 'Médico da Rede'} {disp.doctor_crm ? `(${disp.doctor_crm})` : ''}</p>
            <p><strong>Receita Nº:</strong> {disp.prescription_number || 'Sem número'}</p>
          </div>

          <div className="border-t border-b border-neutral-300 py-3 space-y-1">
            <p className="text-sm font-black text-emerald-800">{disp.medication_name}</p>
            <p className="text-neutral-600">Dosagem: {disp.dosage} · Forma: {disp.form}</p>
            <p className="font-bold">Quantidade Entregue: {disp.quantity_dispensed} unidades</p>
            <p className="text-neutral-500 font-mono">Lote: {disp.batch_number || 'Padrão'}</p>
            <p className="font-bold text-purple-800 mt-2">
              Período de Tratamento: {disp.days_of_treatment} dias (Próxima retirada a partir de: {disp.next_allowed_dispensation_date?.split('-').reverse().join('/')})
            </p>
          </div>

          <div className="pt-6 grid grid-cols-2 gap-6 text-center text-[10px]">
            <div>
              <div className="border-b border-neutral-400 pb-1 mb-1 font-bold">{disp.patient_name}</div>
              <span className="text-neutral-500 uppercase">Assinatura do Paciente</span>
            </div>
            <div>
              <div className="border-b border-neutral-400 pb-1 mb-1 font-bold">{disp.pharmacist_name || 'Farmácia Municipal'}</div>
              <span className="text-neutral-500 uppercase">Dispensador Responsável</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
