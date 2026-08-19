import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, User, FileText, Phone, MapPin, Calendar, 
  Heart, AlertTriangle, CheckCircle2, Edit2, Trash2, XCircle, 
  Activity, Stethoscope, ChevronRight, Droplet, Clock, ShieldAlert,
  Baby, Accessibility
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  Patient, Appointment, HealthUnit, HealthProfessional, DEFAULT_HEALTH_UNITS, 
  formatCPF, formatSUS, formatPhone, getAge 
} from '../types';

interface SaudePatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  units: HealthUnit[];
  professionals: HealthProfessional[];
  isLoading: boolean;
  onRefresh: () => void;
  onNewAppointmentForPatient?: (patient: Patient) => void;
  currentInstitution?: { id: string } | null;
}

const COMMON_CONDITIONS = [
  'Hipertensão Arterial',
  'Diabetes Mellitus',
  'Asma / Bronquite',
  'Cardiopatia',
  'Doença Renal',
  'Hipotireoidismo',
  'Tabagismo',
  'Obesidade'
];

export const SaudePatients: React.FC<SaudePatientsProps> = ({
  patients,
  appointments,
  units,
  professionals,
  isLoading,
  onRefresh,
  onNewAppointmentForPatient,
  currentInstitution
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCondition, setFilterCondition] = useState('Todas');
  const [filterUbs, setFilterUbs] = useState('Todas');
  const [selectedPatientForDrawer, setSelectedPatientForDrawer] = useState<Patient | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const filteredPatients = patients.filter(p => {
    const matchSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cpf.includes(searchQuery) ||
      p.sus_number.includes(searchQuery) ||
      (p.neighborhood && p.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchUbs = filterUbs === 'Todas' || p.ubs_reference === filterUbs;
    const matchCondition = 
      filterCondition === 'Todas' ||
      (filterCondition === 'gestante' && p.is_pregnant) ||
      (filterCondition === 'pcd' && p.is_pcd) ||
      (p.conditions && p.conditions.toLowerCase().includes(filterCondition.toLowerCase()));

    return matchSearch && matchUbs && matchCondition;
  });

  const handleDeletePatient = async (patient: Patient) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro do paciente ${patient.name}?`)) return;

    try {
      const { error } = await supabase.from('patients').delete().eq('id', patient.id);
      if (error) throw error;
      showToast('Paciente excluído com sucesso!', 'success');
      onRefresh();
      if (selectedPatientForDrawer?.id === patient.id) {
        setSelectedPatientForDrawer(null);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  // KPIs
  const totalPatients = patients.length;
  const chronicCount = patients.filter(p => p.conditions && p.conditions.length > 0).length;
  const pregnantCount = patients.filter(p => p.is_pregnant).length;
  const pcdCount = patients.filter(p => p.is_pcd).length;

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total de Pacientes</p>
            <h4 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{totalPatients}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
            <User size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Comorbidades Crônicas</p>
            <h4 className="text-2xl font-black text-rose-600 mt-1">{chronicCount}</h4>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center">
            <Activity size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Gestantes Acompanhadas</p>
            <h4 className="text-2xl font-black text-amber-600 mt-1">{pregnantCount}</h4>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
            <Baby size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Pessoas com Deficiência (PCD)</p>
            <h4 className="text-2xl font-black text-purple-600 mt-1">{pcdCount}</h4>
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center">
            <Accessibility size={22} />
          </div>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-2xl">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Cadastro de Pacientes & Mini-Prontuário</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Histórico clínico, comorbidades e controle de faltas dos munícipes.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar por nome, CPF, SUS ou bairro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
            />
          </div>

          <select 
            value={filterCondition}
            onChange={e => setFilterCondition(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas as Condições</option>
            <option value="Hipertensão">Hipertensos</option>
            <option value="Diabetes">Diabéticos</option>
            <option value="gestante">Gestantes</option>
            <option value="pcd">PCD</option>
          </select>

          <select 
            value={filterUbs}
            onChange={e => setFilterUbs(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas as UBS</option>
            {units.length > 0 
              ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
              : DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <button 
            onClick={() => {
              setEditingPatient(null);
              setIsFormModalOpen(true);
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
          >
            <Plus size={16} /> Cadastrar Paciente
          </button>
        </div>
      </div>

      {/* Tabela de Pacientes */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-100 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Nenhum paciente cadastrado</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
            Cadastre os munícipes para manter o histórico de saúde e agilizar novos agendamentos no sistema.
          </p>
          <button 
            onClick={() => {
              setEditingPatient(null);
              setIsFormModalOpen(true);
            }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            Cadastrar Primeiro Paciente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPatients.map(patient => {
            const age = getAge(patient.birth_date);
            const patientApts = appointments.filter(a => a.patient_cpf === patient.cpf || a.patient_id === patient.id);
            const attendedCount = patientApts.filter(a => a.status === 'Atendido').length;
            const noShowCount = patientApts.filter(a => a.status === 'Faltou').length;

            return (
              <div 
                key={patient.id}
                onClick={() => setSelectedPatientForDrawer(patient)}
                className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                          {patient.name}
                        </h4>
                        <p className="text-xs text-neutral-400">
                          {age} anos {patient.gender ? `· ${patient.gender === 'M' ? 'Masc' : patient.gender === 'F' ? 'Fem' : patient.gender}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setEditingPatient(patient);
                          setIsFormModalOpen(true);
                        }}
                        title="Editar Paciente"
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeletePatient(patient)}
                        title="Excluir Paciente"
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono mb-4 pt-1">
                    <p className="flex items-center gap-2">
                      <FileText size={13} className="text-neutral-400 shrink-0" />
                      CPF: {patient.cpf || 'Não informado'}
                    </p>
                    <p className="flex items-center gap-2">
                      <FileText size={13} className="text-neutral-400 shrink-0" />
                      SUS: {patient.sus_number || 'Não informado'}
                    </p>
                    {patient.phone && (
                      <p className="flex items-center gap-2">
                        <Phone size={13} className="text-neutral-400 shrink-0" />
                        {formatPhone(patient.phone)}
                      </p>
                    )}
                    {patient.neighborhood && (
                      <p className="flex items-center gap-2 font-sans">
                        <MapPin size={13} className="text-neutral-400 shrink-0" />
                        Bairro: {patient.neighborhood}
                      </p>
                    )}
                  </div>

                  {/* Condições Clínicas / Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {patient.is_pregnant && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                        Gestante
                      </span>
                    )}
                    {patient.is_pcd && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                        PCD
                      </span>
                    )}
                    {patient.blood_type && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                        Tipo {patient.blood_type}
                      </span>
                    )}
                    {patient.conditions && patient.conditions.split(',').map((c, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer com Mini-Métricas e Botão */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Consultas Atendidas">
                      {attendedCount} atendidas
                    </span>
                    {noShowCount > 0 && (
                      <span className="text-rose-500 font-bold" title="Faltas sem justificativa">
                        {noShowCount} faltas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onNewAppointmentForPatient && (
                      <button 
                        onClick={() => onNewAppointmentForPatient(patient)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Calendar size={13} /> Agendar
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedPatientForDrawer(patient)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição de Paciente */}
      <AnimatePresence>
        {isFormModalOpen && (
          <PatientFormModal 
            patient={editingPatient}
            units={units}
            onClose={() => setIsFormModalOpen(false)}
            onSuccess={() => {
              setIsFormModalOpen(false);
              onRefresh();
            }}
            currentInstitution={currentInstitution}
          />
        )}
      </AnimatePresence>

      {/* Drawer de Visualização Completa / Mini-Prontuário */}
      <AnimatePresence>
        {selectedPatientForDrawer && (
          <PatientDrawer 
            patient={selectedPatientForDrawer}
            appointments={appointments.filter(a => a.patient_cpf === selectedPatientForDrawer.cpf || a.patient_id === selectedPatientForDrawer.id)}
            onClose={() => setSelectedPatientForDrawer(null)}
            onEdit={() => {
              setEditingPatient(selectedPatientForDrawer);
              setIsFormModalOpen(true);
            }}
            onNewAppointment={() => {
              if (onNewAppointmentForPatient) {
                onNewAppointmentForPatient(selectedPatientForDrawer);
                setSelectedPatientForDrawer(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal de Formulário (Cadastro / Edição)
interface PatientFormModalProps {
  patient: Patient | null;
  units: HealthUnit[];
  onClose: () => void;
  onSuccess: () => void;
  currentInstitution?: { id: string } | null;
}

const PatientFormModal: React.FC<PatientFormModalProps> = ({ patient, units, onClose, onSuccess, currentInstitution }) => {
  const [formData, setFormData] = useState({
    name: patient?.name || '',
    cpf: patient?.cpf || '',
    sus_number: patient?.sus_number || '',
    birth_date: patient?.birth_date || '',
    gender: patient?.gender || 'M',
    mother_name: patient?.mother_name || '',
    phone: patient?.phone || '',
    address: patient?.address || '',
    neighborhood: patient?.neighborhood || '',
    ubs_reference: patient?.ubs_reference || (units.length > 0 ? units[0].name : DEFAULT_HEALTH_UNITS[0]),
    blood_type: patient?.blood_type || '',
    allergies: patient?.allergies || '',
    conditions: patient?.conditions ? patient.conditions.split(',').map(c => c.trim()) : [] as string[],
    is_pregnant: patient?.is_pregnant || false,
    is_pcd: patient?.is_pcd || false,
    notes: patient?.notes || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCondition = (cond: string) => {
    if (formData.conditions.includes(cond)) {
      setFormData({ ...formData, conditions: formData.conditions.filter(c => c !== cond) });
    } else {
      setFormData({ ...formData, conditions: [...formData.conditions, cond] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        cpf: formData.cpf,
        sus_number: formData.sus_number,
        birth_date: formData.birth_date || null,
        gender: formData.gender,
        mother_name: formData.mother_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        neighborhood: formData.neighborhood || null,
        ubs_reference: formData.ubs_reference || null,
        blood_type: formData.blood_type || null,
        allergies: formData.allergies || null,
        conditions: formData.conditions.join(', '),
        is_pregnant: formData.is_pregnant,
        is_pcd: formData.is_pcd,
        notes: formData.notes || null,
        institution_id: currentInstitution?.id || null
      };

      if (patient) {
        const { error } = await supabase.from('patients').update(payload).eq('id', patient.id);
        if (error) throw error;
        showToast('Cadastro atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase.from('patients').insert([payload]);
        if (error) throw error;
        showToast('Paciente cadastrado com sucesso!', 'success');
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar paciente: ' + err.message, 'error');
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
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">
              {patient ? 'Editar Dados do Paciente' : 'Novo Cadastro de Paciente'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Preencha as informações clínicas e pessoais do munícipe.</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome Completo *</label>
              <input 
                type="text" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: João da Silva Santos"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CPF *</label>
              <input 
                type="text" required
                value={formData.cpf} onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cartão Nacional do SUS *</label>
              <input 
                type="text" required
                value={formData.sus_number} onChange={e => setFormData({...formData, sus_number: formatSUS(e.target.value)})}
                placeholder="000 0000 0000 0000"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data de Nascimento *</label>
              <input 
                type="date" required
                value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Gênero</label>
              <select 
                value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome da Mãe (Importante para evitar homônimos)</label>
              <input 
                type="text"
                value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})}
                placeholder="Ex: Maria de Souza Santos"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefone / WhatsApp</label>
              <input 
                type="text"
                value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})}
                placeholder="(00) 00000-0000"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">UBS de Referência</label>
              <select 
                value={formData.ubs_reference} onChange={e => setFormData({...formData, ubs_reference: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                {units.length > 0
                  ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                  : DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Bairro</label>
              <input 
                type="text"
                value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                placeholder="Ex: Centro"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tipo Sanguíneo</label>
              <select 
                value={formData.blood_type} onChange={e => setFormData({...formData, blood_type: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                <option value="">Não informado</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Alergias Conhecidas</label>
              <input 
                type="text"
                value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})}
                placeholder="Ex: Penicilina, Dipirona, Frutos do Mar..."
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            {/* Condições Crônicas */}
            <div className="space-y-2 md:col-span-2 pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Condições de Saúde / Comorbidades</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_CONDITIONS.map(cond => {
                  const isSelected = formData.conditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleCondition(cond)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-6 md:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.is_pregnant}
                  onChange={e => setFormData({...formData, is_pregnant: e.target.checked})}
                  className="rounded text-amber-500"
                />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Paciente Gestante</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.is_pcd}
                  onChange={e => setFormData({...formData, is_pcd: e.target.checked})}
                  className="rounded text-purple-500"
                />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Pessoa com Deficiência (PCD)</span>
              </label>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Observações Gerais / Prontuário</label>
              <textarea 
                rows={2}
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Anotações de acompanhamento, cuidados especiais..."
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Paciente'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Drawer / Ficha Completa do Paciente (Mini-Prontuário)
interface PatientDrawerProps {
  patient: Patient;
  appointments: Appointment[];
  onClose: () => void;
  onEdit: () => void;
  onNewAppointment: () => void;
}

const PatientDrawer: React.FC<PatientDrawerProps> = ({
  patient,
  appointments,
  onClose,
  onEdit,
  onNewAppointment
}) => {
  const age = getAge(patient.birth_date);
  const attendedCount = appointments.filter(a => a.status === 'Atendido').length;
  const noShowCount = appointments.filter(a => a.status === 'Faltou').length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-100 dark:border-neutral-800"
      >
        {/* Header do Drawer */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">{patient.name}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {age} anos {patient.birth_date ? `· Nasc: ${patient.birth_date.split('-').reverse().join('/')}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onEdit} 
              className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo da Ficha */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Card de Resumo e Ações Rápidas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Consultas Atendidas</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{attendedCount}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Histórico de Faltas</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{noShowCount}</p>
            </div>
          </div>

          <button 
            onClick={onNewAppointment}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Calendar size={16} /> Agendar Nova Consulta para {patient.name.split(' ')[0]}
          </button>

          {/* Dados Pessoais & Documentos */}
          <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/40 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Identificação & Contato</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">CPF</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{patient.cpf || '---'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Cartão SUS</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{patient.sus_number || '---'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Telefone / WhatsApp</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{patient.phone ? formatPhone(patient.phone) : '---'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Nome da Mãe</span>
                <span className="font-bold text-neutral-900 dark:text-white">{patient.mother_name || '---'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Bairro</span>
                <span className="font-bold text-neutral-900 dark:text-white">{patient.neighborhood || '---'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">UBS de Referência</span>
                <span className="font-bold text-neutral-900 dark:text-white">{patient.ubs_reference || '---'}</span>
              </div>
            </div>
          </div>

          {/* Perfil Clínico */}
          <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/40 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Perfil Clínico</h4>
            <div className="space-y-2 text-xs">
              {patient.blood_type && (
                <div className="flex items-center gap-2">
                  <Droplet size={14} className="text-rose-500" />
                  <span className="font-bold">Tipo Sanguíneo: {patient.blood_type}</span>
                </div>
              )}
              {patient.allergies && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Alergias:</span>
                    <span>{patient.allergies}</span>
                  </div>
                </div>
              )}
              {patient.conditions && (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-1">Comorbidades / Condições:</span>
                  <div className="flex flex-wrap gap-1">
                    {patient.conditions.split(',').map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded-lg text-[11px] font-bold">
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Histórico Cronológico de Atendimentos */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center justify-between">
              <span>Histórico de Consultas</span>
              <span className="text-[10px] font-bold text-neutral-500">{appointments.length} registros</span>
            </h4>

            {appointments.length === 0 ? (
              <p className="text-xs text-neutral-400 italic p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-center">
                Nenhum agendamento anterior para este paciente.
              </p>
            ) : (
              <div className="space-y-2">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{apt.specialty}</p>
                      <p className="text-[11px] text-neutral-400">
                        {apt.appointment_date.split('-').reverse().join('/')} {apt.appointment_time ? `às ${apt.appointment_time}` : ''}
                        {apt.unit_name ? ` · ${apt.unit_name}` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      apt.status === 'Atendido' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      apt.status === 'Faltou' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                      apt.status === 'Agendado' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
