import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, User, Plus, Edit2, Trash2, XCircle, 
  MapPin, Phone, Stethoscope, Briefcase, FileText, CheckCircle2,
  Activity, ShieldAlert, DollarSign, Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  HealthUnit, HealthProfessional, ExamType, ExamCategory, 
  COMMON_SPECIALTIES, COMMON_EXAM_CATEGORIES, DEFAULT_EXAM_TYPES 
} from '../types';

interface SaudeSettingsProps {
  units: HealthUnit[];
  professionals: HealthProfessional[];
  examTypes?: ExamType[];
  isLoading: boolean;
  onRefresh: () => void;
  currentInstitution?: { id: string } | null;
}

export const SaudeSettings: React.FC<SaudeSettingsProps> = ({
  units,
  professionals,
  examTypes = [],
  isLoading,
  onRefresh,
  currentInstitution
}) => {
  const [activeTab, setActiveTab] = useState<'unidades' | 'profissionais' | 'exames'>('unidades');

  // Formulário de Unidade
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<HealthUnit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true
  });

  // Formulário de Profissional
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<HealthProfessional | null>(null);
  const [profForm, setProfForm] = useState({
    name: '',
    specialty: COMMON_SPECIALTIES[0],
    crm_coren: '',
    unit_id: '',
    working_days: '',
    is_active: true
  });

  // Formulário de Tipo de Exame
  const [isExamTypeModalOpen, setIsExamTypeModalOpen] = useState(false);
  const [editingExamType, setEditingExamType] = useState<ExamType | null>(null);
  const [examTypeForm, setExamTypeForm] = useState({
    name: '',
    category: 'Laboratorial' as ExamCategory,
    min_interval_days: 30,
    preparation_instructions: '',
    estimated_cost: 0.00,
    is_active: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // === HANDLERS PARA UNIDADES ===
  const handleOpenUnitForm = (unit?: HealthUnit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        name: unit.name,
        address: unit.address || '',
        phone: unit.phone || '',
        is_active: unit.is_active
      });
    } else {
      setEditingUnit(null);
      setUnitForm({ name: '', address: '', phone: '', is_active: true });
    }
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...unitForm,
        institution_id: currentInstitution?.id || null
      };

      if (editingUnit) {
        const { error } = await supabase.from('health_units').update(payload).eq('id', editingUnit.id);
        if (error) throw error;
        showToast('Unidade atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase.from('health_units').insert(payload);
        if (error) throw error;
        showToast('Unidade cadastrada com sucesso!', 'success');
      }
      setIsUnitModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao salvar unidade: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unit: HealthUnit) => {
    if (!window.confirm(`Excluir a unidade ${unit.name}? Profissionais vinculados a ela serão afetados.`)) return;
    try {
      const { error } = await supabase.from('health_units').delete().eq('id', unit.id);
      if (error) throw error;
      showToast('Unidade excluída!', 'success');
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  // === HANDLERS PARA PROFISSIONAIS ===
  const handleOpenProfForm = (prof?: HealthProfessional) => {
    if (prof) {
      setEditingProf(prof);
      setProfForm({
        name: prof.name,
        specialty: prof.specialty,
        crm_coren: prof.crm_coren || '',
        unit_id: prof.unit_id || '',
        working_days: prof.working_days || '',
        is_active: prof.is_active
      });
    } else {
      setEditingProf(null);
      setProfForm({ 
        name: '', 
        specialty: COMMON_SPECIALTIES[0], 
        crm_coren: '', 
        unit_id: units.length > 0 ? units[0].id : '', 
        working_days: '', 
        is_active: true 
      });
    }
    setIsProfModalOpen(true);
  };

  const handleSaveProf = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...profForm,
        unit_id: profForm.unit_id || null,
        institution_id: currentInstitution?.id || null
      };

      if (editingProf) {
        const { error } = await supabase.from('health_professionals').update(payload).eq('id', editingProf.id);
        if (error) throw error;
        showToast('Profissional atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase.from('health_professionals').insert(payload);
        if (error) throw error;
        showToast('Profissional cadastrado com sucesso!', 'success');
      }
      setIsProfModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao salvar profissional: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProf = async (prof: HealthProfessional) => {
    if (!window.confirm(`Excluir o profissional ${prof.name}?`)) return;
    try {
      const { error } = await supabase.from('health_professionals').delete().eq('id', prof.id);
      if (error) throw error;
      showToast('Profissional excluído!', 'success');
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  // === HANDLERS PARA TIPOS DE EXAMES ===
  const handleOpenExamTypeForm = (exam?: ExamType) => {
    if (exam) {
      setEditingExamType(exam);
      setExamTypeForm({
        name: exam.name,
        category: exam.category,
        min_interval_days: exam.min_interval_days || 30,
        preparation_instructions: exam.preparation_instructions || '',
        estimated_cost: exam.estimated_cost || 0.00,
        is_active: exam.is_active
      });
    } else {
      setEditingExamType(null);
      setExamTypeForm({
        name: '',
        category: 'Laboratorial',
        min_interval_days: 30,
        preparation_instructions: '',
        estimated_cost: 0.00,
        is_active: true
      });
    }
    setIsExamTypeModalOpen(true);
  };

  const handleSaveExamType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...examTypeForm,
        institution_id: currentInstitution?.id || null
      };

      if (editingExamType) {
        const { error } = await supabase.from('exam_types').update(payload).eq('id', editingExamType.id);
        if (error) throw error;
        showToast('Exame atualizado no catálogo!', 'success');
      } else {
        const { error } = await supabase.from('exam_types').insert(payload);
        if (error) throw error;
        showToast('Novo exame cadastrado no catálogo!', 'success');
      }
      setIsExamTypeModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao salvar exame: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExamType = async (exam: ExamType) => {
    if (!window.confirm(`Excluir o exame "${exam.name}" do catálogo municipal?`)) return;
    try {
      const { error } = await supabase.from('exam_types').delete().eq('id', exam.id);
      if (error) throw error;
      showToast('Exame excluído do catálogo!', 'success');
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao excluir exame: ' + err.message, 'error');
    }
  };

  const displayExamTypes = examTypes.length > 0 
    ? examTypes 
    : DEFAULT_EXAM_TYPES.map((t, idx) => ({ ...t, id: `mock_${idx}` } as ExamType));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-2xl">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Cadastros e Parâmetros da Saúde</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Unidades, Profissionais e Catálogo de Exames com Prazos de Carência.</p>
          </div>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl flex-wrap">
          <button
            onClick={() => setActiveTab('unidades')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'unidades' 
                ? 'bg-white dark:bg-neutral-900 text-blue-600 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            }`}
          >
            Unidades ({units.length})
          </button>
          <button
            onClick={() => setActiveTab('profissionais')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profissionais' 
                ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            }`}
          >
            Médicos / Profissionais ({professionals.length})
          </button>
          <button
            onClick={() => setActiveTab('exames')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'exames' 
                ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            }`}
          >
            Catálogo de Exames & Carência ({displayExamTypes.length})
          </button>
        </div>
      </div>

      {/* TAB 1: UNIDADES */}
      {activeTab === 'unidades' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <h4 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-blue-500" /> Locais de Atendimento
            </h4>
            <button 
              onClick={() => handleOpenUnitForm()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Plus size={16} /> Nova Unidade
            </button>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase tracking-widest text-neutral-500">
                  <th className="p-4 font-black">Nome da Unidade</th>
                  <th className="p-4 font-black">Endereço</th>
                  <th className="p-4 font-black">Telefone</th>
                  <th className="p-4 font-black">Status</th>
                  <th className="p-4 font-black text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-400 italic">
                      Nenhuma unidade cadastrada. Clique em "Nova Unidade" para adicionar.
                    </td>
                  </tr>
                ) : (
                  units.map(unit => (
                    <tr key={unit.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="p-4 font-bold text-neutral-900 dark:text-white">
                        {unit.name}
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{unit.address || '-'}</td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{unit.phone || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                          unit.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
                        }`}>
                          {unit.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenUnitForm(unit)} className="p-1.5 text-neutral-400 hover:text-blue-600 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteUnit(unit)} className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROFISSIONAIS */}
      {activeTab === 'profissionais' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <h4 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Stethoscope size={18} className="text-emerald-500" /> Profissionais Ativos
            </h4>
            <button 
              onClick={() => handleOpenProfForm()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Plus size={16} /> Novo Profissional
            </button>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase tracking-widest text-neutral-500">
                  <th className="p-4 font-black">Profissional</th>
                  <th className="p-4 font-black">Especialidade / CRM</th>
                  <th className="p-4 font-black">Unidade Vinculada</th>
                  <th className="p-4 font-black">Dias de Atend.</th>
                  <th className="p-4 font-black">Status</th>
                  <th className="p-4 font-black text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                {professionals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 italic">
                      Nenhum profissional cadastrado. Clique em "Novo Profissional" para adicionar.
                    </td>
                  </tr>
                ) : (
                  professionals.map(prof => {
                    const unit = units.find(u => u.id === prof.unit_id);
                    return (
                      <tr key={prof.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="p-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">
                            {prof.name.charAt(0)}
                          </div>
                          {prof.name}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{prof.specialty}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">{prof.crm_coren || 'Sem CRM'}</p>
                        </td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-300">
                          {unit ? unit.name : <span className="italic text-neutral-400">Não vinculada</span>}
                        </td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400">{prof.working_days || '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                            prof.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {prof.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenProfForm(prof)} className="p-1.5 text-neutral-400 hover:text-emerald-600 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteProf(prof)} className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CATÁLOGO DE EXAMES & CARÊNCIA */}
      {activeTab === 'exames' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div>
              <h4 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Activity size={18} className="text-purple-600" /> Catálogo de Exames & Prazos Mínimos de Repetição
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Defina os dias mínimos de carência para cada tipo de exame para alimentar a trava inteligente anti-duplicidade.
              </p>
            </div>
            <button 
              onClick={() => handleOpenExamTypeForm()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 shrink-0"
            >
              <Plus size={16} /> Novo Tipo de Exame
            </button>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase tracking-widest text-neutral-500">
                  <th className="p-4 font-black">Nome do Procedimento</th>
                  <th className="p-4 font-black">Categoria</th>
                  <th className="p-4 font-black">Carência Mínima (Anti-Duplicidade)</th>
                  <th className="p-4 font-black">Instruções de Preparo</th>
                  <th className="p-4 font-black">Custo Ref.</th>
                  <th className="p-4 font-black text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                {displayExamTypes.map(exam => (
                  <tr key={exam.id || exam.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4 font-bold text-neutral-900 dark:text-white">
                      {exam.name}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {exam.category}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-rose-600 dark:text-rose-400">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert size={14} />
                        {exam.min_interval_days} dias de carência
                      </div>
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-400 max-w-xs truncate" title={exam.preparation_instructions}>
                      {exam.preparation_instructions || 'Nenhum preparo especial'}
                    </td>
                    <td className="p-4 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      {exam.estimated_cost ? `R$ ${exam.estimated_cost.toFixed(2)}` : 'R$ 0,00'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenExamTypeForm(exam)} className="p-1.5 text-neutral-400 hover:text-purple-600 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteExamType(exam)} className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: UNIDADE */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsUnitModalOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-blue-50 dark:bg-blue-900/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Building2 size={20} />
                </div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  {editingUnit ? 'Editar Unidade' : 'Nova Unidade'}
                </h3>
              </div>
              <button onClick={() => setIsUnitModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome da UBS/Unidade *</label>
                <input 
                  type="text" required
                  value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Endereço</label>
                <input 
                  type="text"
                  value={unitForm.address} onChange={e => setUnitForm({...unitForm, address: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefone</label>
                <input 
                  type="text"
                  value={unitForm.phone} onChange={e => setUnitForm({...unitForm, phone: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsUnitModalOpen(false)} className="flex-1 py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/30">
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: PROFISSIONAL */}
      {isProfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsProfModalOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Stethoscope size={20} />
                </div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  {editingProf ? 'Editar Profissional' : 'Novo Profissional'}
                </h3>
              </div>
              <button onClick={() => setIsProfModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProf} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome *</label>
                <input 
                  type="text" required
                  value={profForm.name} onChange={e => setProfForm({...profForm, name: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Especialidade *</label>
                  <input 
                    type="text" required list="specialties"
                    value={profForm.specialty} onChange={e => setProfForm({...profForm, specialty: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                  />
                  <datalist id="specialties">
                    {COMMON_SPECIALTIES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CRM/COREN</label>
                  <input 
                    type="text"
                    value={profForm.crm_coren} onChange={e => setProfForm({...profForm, crm_coren: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsProfModalOpen(false)} className="flex-1 py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30">
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: TIPO DE EXAME */}
      {isExamTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsExamTypeModalOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-purple-50 dark:bg-purple-900/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 text-white rounded-xl">
                  <Activity size={20} />
                </div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  {editingExamType ? 'Editar Tipo de Exame' : 'Novo Tipo de Exame'}
                </h3>
              </div>
              <button onClick={() => setIsExamTypeModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExamType} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome do Exame / Procedimento *</label>
                <input 
                  type="text" required
                  value={examTypeForm.name} onChange={e => setExamTypeForm({...examTypeForm, name: e.target.value})}
                  placeholder="Ex: Hemograma Completo, Ultrassom Abdominal"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Categoria *</label>
                  <select
                    value={examTypeForm.category} onChange={e => setExamTypeForm({...examTypeForm, category: e.target.value as ExamCategory})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
                  >
                    {COMMON_EXAM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 font-black">
                    Carência Anti-Duplicidade (Dias) *
                  </label>
                  <input 
                    type="number" required min="1"
                    value={examTypeForm.min_interval_days} onChange={e => setExamTypeForm({...examTypeForm, min_interval_days: parseInt(e.target.value) || 30})}
                    className="w-full bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Custo Estimado de Referência (R$)</label>
                <input 
                  type="number" step="0.01" min="0"
                  value={examTypeForm.estimated_cost || ''} onChange={e => setExamTypeForm({...examTypeForm, estimated_cost: parseFloat(e.target.value) || 0})}
                  placeholder="Ex: 45.00"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Instruções de Preparo para o Paciente</label>
                <textarea 
                  rows={2}
                  value={examTypeForm.preparation_instructions} onChange={e => setExamTypeForm({...examTypeForm, preparation_instructions: e.target.value})}
                  placeholder="Ex: Jejum obrigatório de 8 horas..."
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs outline-none dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsExamTypeModalOpen(false)} className="flex-1 py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-purple-500/30">
                  {isSubmitting ? 'Salvando...' : 'Salvar no Catálogo'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
