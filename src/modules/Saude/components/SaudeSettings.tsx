import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, User, Plus, Edit2, Trash2, XCircle, 
  MapPin, Phone, Stethoscope, Briefcase, FileText, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { HealthUnit, HealthProfessional, COMMON_SPECIALTIES } from '../types';

interface SaudeSettingsProps {
  units: HealthUnit[];
  professionals: HealthProfessional[];
  isLoading: boolean;
  onRefresh: () => void;
  currentInstitution?: { id: string } | null;
}

export const SaudeSettings: React.FC<SaudeSettingsProps> = ({
  units,
  professionals,
  isLoading,
  onRefresh,
  currentInstitution
}) => {
  const [activeTab, setActiveTab] = useState<'unidades' | 'profissionais'>('unidades');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-2xl">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Cadastros e Configurações</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Gerencie Unidades de Saúde e Profissionais Ativos.</p>
          </div>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('unidades')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'unidades' 
                ? 'bg-white dark:bg-neutral-900 text-blue-600 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            }`}
          >
            Unidades de Atendimento
          </button>
          <button
            onClick={() => setActiveTab('profissionais')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profissionais' 
                ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
            }`}
          >
            Profissionais de Saúde
          </button>
        </div>
      </div>

      {/* Tabela de Unidades */}
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

      {/* Tabela de Profissionais */}
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

      {/* Modal: Unidade */}
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
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
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
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefone da Recepção</label>
                <input 
                  type="text"
                  value={unitForm.phone} onChange={e => setUnitForm({...unitForm, phone: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input 
                  type="checkbox"
                  checked={unitForm.is_active}
                  onChange={e => setUnitForm({...unitForm, is_active: e.target.checked})}
                  className="rounded text-blue-600"
                />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Unidade Ativa e Recebendo Agendamentos</span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsUnitModalOpen(false)} className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Salvar Unidade'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Profissional */}
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
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome do Profissional *</label>
                <input 
                  type="text" required
                  value={profForm.name} onChange={e => setProfForm({...profForm, name: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Especialidade *</label>
                  <input 
                    type="text" required list="specialties"
                    value={profForm.specialty} onChange={e => setProfForm({...profForm, specialty: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
                  />
                  <datalist id="specialties">
                    {COMMON_SPECIALTIES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Registro (CRM/COREN)</label>
                  <input 
                    type="text"
                    value={profForm.crm_coren} onChange={e => setProfForm({...profForm, crm_coren: e.target.value})}
                    placeholder="Ex: CRM 12345"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Vincular a uma Unidade (UBS)</label>
                <select 
                  value={profForm.unit_id} onChange={e => setProfForm({...profForm, unit_id: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                >
                  <option value="">Nenhuma unidade fixa (Atende na rede)</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Dias de Atendimento</label>
                <input 
                  type="text"
                  value={profForm.working_days} onChange={e => setProfForm({...profForm, working_days: e.target.value})}
                  placeholder="Ex: Segunda e Quarta (Manhã)"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input 
                  type="checkbox"
                  checked={profForm.is_active}
                  onChange={e => setProfForm({...profForm, is_active: e.target.checked})}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Profissional Ativo na Regulação</span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsProfModalOpen(false)} className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Salvar Profissional'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
