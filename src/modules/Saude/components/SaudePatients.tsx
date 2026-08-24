import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, User, FileText, Phone, MapPin, Calendar, 
  Heart, AlertTriangle, CheckCircle2, Edit2, Trash2, XCircle, 
  Activity, Stethoscope, ChevronRight, Droplet, Clock, ShieldAlert,
  Baby, Accessibility, Pill, ShoppingBag, History, FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  Patient, Appointment, ExamRequest, MedicationDispensation, HealthUnit, HealthProfessional, DEFAULT_HEALTH_UNITS, 
  formatCPF, formatSUS, formatPhone, getAge 
} from '../types';

interface SaudePatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  requests?: ExamRequest[];
  dispensations?: MedicationDispensation[];
  units: HealthUnit[];
  professionals: HealthProfessional[];
  isLoading: boolean;
  onRefresh: () => void;
  onNewAppointmentForPatient?: (patient: Patient) => void;
  onNewExamForPatient?: (patient: Patient) => void;
  onNewDispensationForPatient?: (patient: Patient) => void;
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
  requests = [],
  dispensations = [],
  units,
  professionals,
  isLoading,
  onRefresh,
  onNewAppointmentForPatient,
  onNewExamForPatient,
  onNewDispensationForPatient,
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
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Cadastro de Pacientes & Mini-Prontuário 360°</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Histórico unificado de consultas, exames solicitados/realizados e medicamentos retirados.
            </p>
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

      {/* Tabela / Cards de Pacientes */}
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
            const cleanCpf = (patient.cpf || '').replace(/\D/g, '');
            const patientApts = appointments.filter(a => (a.patient_cpf || '').replace(/\D/g, '') === cleanCpf || a.patient_id === patient.id);
            const patientExams = requests.filter(r => (r.patient_cpf || '').replace(/\D/g, '') === cleanCpf || r.patient_id === patient.id);
            const patientDisps = dispensations.filter(d => (d.patient_cpf || '').replace(/\D/g, '') === cleanCpf || d.patient_id === patient.id);
            
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
                  </div>

                  {/* Resumo 360° de Atendimentos */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block">Consultas</span>
                      <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">{patientApts.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block">Exames</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{patientExams.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block">Remédios</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{patientDisps.length}</span>
                    </div>
                  </div>

                  {/* Condições Clínicas / Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {patient.is_pregnant && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200">
                        Gestante
                      </span>
                    )}
                    {patient.is_pcd && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200">
                        PCD
                      </span>
                    )}
                    {patient.conditions && patient.conditions.split(',').map((c, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer com Ações */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-neutral-400 font-medium">
                    {patient.ubs_reference || 'UBS Central'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setSelectedPatientForDrawer(patient)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      Prontuário 360° <ChevronRight size={14} />
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

      {/* Drawer de Visualização Completa / Mini-Prontuário 360° */}
      <AnimatePresence>
        {selectedPatientForDrawer && (
          <PatientDrawer 
            patient={selectedPatientForDrawer}
            appointments={appointments.filter(a => (a.patient_cpf || '').replace(/\D/g, '') === (selectedPatientForDrawer.cpf || '').replace(/\D/g, '') || a.patient_id === selectedPatientForDrawer.id)}
            requests={requests.filter(r => (r.patient_cpf || '').replace(/\D/g, '') === (selectedPatientForDrawer.cpf || '').replace(/\D/g, '') || r.patient_id === selectedPatientForDrawer.id)}
            dispensations={dispensations.filter(d => (d.patient_cpf || '').replace(/\D/g, '') === (selectedPatientForDrawer.cpf || '').replace(/\D/g, '') || d.patient_id === selectedPatientForDrawer.id)}
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
            onNewExam={() => {
              if (onNewExamForPatient) {
                onNewExamForPatient(selectedPatientForDrawer);
                setSelectedPatientForDrawer(null);
              }
            }}
            onNewDispensation={() => {
              if (onNewDispensationForPatient) {
                onNewDispensationForPatient(selectedPatientForDrawer);
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
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome da Mãe</label>
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

// =========================================================
// DRAWER / PRONTUÁRIO 360° DO PACIENTE COM ABAS INTEGRADAS
// =========================================================
interface PatientDrawerProps {
  patient: Patient;
  appointments: Appointment[];
  requests: ExamRequest[];
  dispensations: MedicationDispensation[];
  onClose: () => void;
  onEdit: () => void;
  onNewAppointment: () => void;
  onNewExam?: () => void;
  onNewDispensation?: () => void;
}

const PatientDrawer: React.FC<PatientDrawerProps> = ({
  patient,
  appointments,
  requests,
  dispensations,
  onClose,
  onEdit,
  onNewAppointment,
  onNewExam,
  onNewDispensation
}) => {
  const [activeTab, setActiveTab] = useState<'consultas' | 'exames' | 'farmacia' | 'dados'>('consultas');
  const age = getAge(patient.birth_date);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 h-full shadow-2xl flex flex-col border-l border-neutral-100 dark:border-neutral-800"
      >
        {/* Header do Drawer */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                {patient.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                CPF: {patient.cpf} · {age} anos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onEdit} 
              className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors"
              title="Editar Cadastro"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas do Prontuário */}
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 flex flex-wrap gap-2">
          <button 
            onClick={onNewAppointment}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            <Calendar size={14} /> Agendar Consulta
          </button>
          {onNewExam && (
            <button 
              onClick={onNewExam}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Activity size={14} /> Solicitar Exame
            </button>
          )}
          {onNewDispensation && (
            <button 
              onClick={onNewDispensation}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <ShoppingBag size={14} /> Dispensar Remédio
            </button>
          )}
        </div>

        {/* Abas do Prontuário 360° */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('consultas')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'consultas'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Calendar size={14} /> Consultas ({appointments.length})
          </button>

          <button
            onClick={() => setActiveTab('exames')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'exames'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Activity size={14} /> Exames Prescritos ({requests.length})
          </button>

          <button
            onClick={() => setActiveTab('farmacia')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'farmacia'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Pill size={14} /> Farmácia / Remédios ({dispensations.length})
          </button>

          <button
            onClick={() => setActiveTab('dados')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'dados'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <User size={14} /> Perfil & Ficha
          </button>
        </div>

        {/* Conteúdo da Ficha */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: CONSULTAS */}
          {activeTab === 'consultas' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl">
                  Nenhuma consulta ou agendamento registrado para este paciente.
                </div>
              ) : (
                appointments.map(apt => (
                  <div key={apt.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{apt.specialty}</p>
                      <p className="text-[11px] text-neutral-400">
                        {apt.appointment_date.split('-').reverse().join('/')} {apt.appointment_time ? `às ${apt.appointment_time}` : ''}
                        {apt.unit_name ? ` · ${apt.unit_name}` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      apt.status === 'Atendido' ? 'bg-emerald-100 text-emerald-700' :
                      apt.status === 'Faltou' ? 'bg-rose-100 text-rose-700' :
                      apt.status === 'Agendado' ? 'bg-sky-100 text-sky-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: EXAMES PRESCRITOS & REALIZADOS */}
          {activeTab === 'exames' && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl">
                  Nenhum exame prescrito para este paciente ainda.
                </div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-neutral-900 dark:text-white">{req.exam_name}</h4>
                        <p className="text-[11px] text-neutral-400">Categoria: {req.category} · Prescrito por: {req.doctor_name}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        req.status === 'Realizado' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'Agendado' ? 'bg-purple-100 text-purple-700' :
                        req.status === 'Bloqueado por Duplicidade' ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-neutral-500 font-mono">
                      <span>Data do Pedido: {req.requested_date?.split('-').reverse().join('/')}</span>
                      {req.performed_date && <span className="text-emerald-600 font-bold">Feito em: {req.performed_date.split('-').reverse().join('/')}</span>}
                    </div>

                    {req.result_notes && (
                      <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl text-[11px] border border-neutral-200 dark:border-neutral-700">
                        <span className="font-bold block text-neutral-700 dark:text-neutral-300">Laudo / Resultado:</span>
                        <p className="text-neutral-500 mt-0.5">{req.result_notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: MEDICAMENTOS RETIRADOS NA FARMÁCIA */}
          {activeTab === 'farmacia' && (
            <div className="space-y-3">
              {dispensations.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl">
                  Nenhuma retirada de medicamento registrada para este paciente.
                </div>
              ) : (
                dispensations.map(d => (
                  <div key={d.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-sky-600 dark:text-sky-400">{d.medication_name}</h4>
                        <p className="text-[11px] text-neutral-400">{d.dosage} - {d.form}</p>
                      </div>
                      <span className="font-black text-emerald-600 text-sm">
                        {d.quantity_dispensed} un.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 pt-1 font-mono">
                      <span>Data Retirada: {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '---'}</span>
                      <span className="text-purple-600 font-bold">Uso previsto: {d.days_of_treatment} dias</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: PERFIL & DADOS */}
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div className="bg-neutral-50 dark:bg-neutral-800/40 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-3 text-xs">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Identificação & Endereço</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Cartão SUS</span>
                    <span className="font-mono font-bold">{patient.sus_number || '---'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Telefone</span>
                    <span className="font-mono">{patient.phone ? formatPhone(patient.phone) : '---'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Nome da Mãe</span>
                    <span>{patient.mother_name || '---'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Bairro</span>
                    <span>{patient.neighborhood || '---'}</span>
                  </div>
                </div>
              </div>

              {patient.allergies && (
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-xs text-rose-800 dark:text-rose-300">
                  <span className="font-bold block mb-1">Alergias Cadastradas:</span>
                  <p>{patient.allergies}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
