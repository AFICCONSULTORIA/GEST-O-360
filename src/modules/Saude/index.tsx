import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar, Clock, User, FileText, CheckCircle2, 
  XCircle, AlertCircle, Phone, MessageCircle, LayoutGrid, 
  Package, Activity, RefreshCw, UserCheck, HeartPulse, Building2,
  Stethoscope, ShieldAlert, Pill, ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { FarmaciaModule } from './Farmacia';
import { SaudeQueue } from './components/SaudeQueue';
import { SaudeAgenda } from './components/SaudeAgenda';
import { SaudePatients } from './components/SaudePatients';
import { SaudeSettings } from './components/SaudeSettings';
import { SaudeExams } from './components/SaudeExams';
import { 
  Appointment, Patient, HealthUnit, HealthProfessional, ExamRequest, ExamType, MedicationDispensation,
  COMMON_SPECIALTIES, DEFAULT_HEALTH_UNITS, DEFAULT_EXAM_TYPES,
  formatCPF, formatSUS, formatPhone, calculatePriority, getAge,
  generateUUID, isValidUUID 
} from './types';

export * from './types';

export const SaudeModule = ({ currentInstitution }: { currentInstitution?: { id: string; name?: string } | null }) => {
  const [activeTab, setActiveTab] = useState<'fila' | 'agenda' | 'exames' | 'pacientes' | 'farmacia' | 'cadastros'>('fila');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [professionals, setProfessionals] = useState<HealthProfessional[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [dispensations, setDispensations] = useState<MedicationDispensation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [prefilledPatientForApt, setPrefilledPatientForApt] = useState<Patient | null>(null);
  const [prefilledPatientForExam, setPrefilledPatientForExam] = useState<Patient | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Carregar Agendamentos
      let aptQuery = supabase.from('appointments').select('*');
      if (currentInstitution?.id) aptQuery = aptQuery.eq('institution_id', currentInstitution.id);
      const { data: aptData, error: aptError } = await aptQuery.order('appointment_date', { ascending: true });
      if (aptData) setAppointments(aptData as Appointment[]);

      // 2. Carregar Pacientes
      let patQuery = supabase.from('patients').select('*');
      if (currentInstitution?.id) patQuery = patQuery.eq('institution_id', currentInstitution.id);
      const { data: patData } = await patQuery.order('name', { ascending: true });
      if (patData) setPatients(patData as Patient[]);

      // 3. Carregar Unidades e Profissionais
      let unitsQuery = supabase.from('health_units').select('*');
      if (currentInstitution?.id) unitsQuery = unitsQuery.eq('institution_id', currentInstitution.id);
      const { data: unitsData } = await unitsQuery.order('name');
      if (unitsData) setUnits(unitsData as HealthUnit[]);

      let profQuery = supabase.from('health_professionals').select('*');
      if (currentInstitution?.id) profQuery = profQuery.eq('institution_id', currentInstitution.id);
      const { data: profData } = await profQuery.order('name');
      if (profData) setProfessionals(profData as HealthProfessional[]);

      // 4. Carregar Solicitações de Exames
      let examQuery = supabase.from('exam_requests').select('*');
      if (currentInstitution?.id) examQuery = examQuery.eq('institution_id', currentInstitution.id);
      const { data: examData } = await examQuery.order('requested_date', { ascending: false });
      if (examData) setExamRequests(examData as ExamRequest[]);

      // 5. Carregar Tipos de Exames
      let typeQuery = supabase.from('exam_types').select('*');
      if (currentInstitution?.id) typeQuery = typeQuery.eq('institution_id', currentInstitution.id);
      const { data: typeData } = await typeQuery.order('name');
      if (typeData && typeData.length > 0) {
        setExamTypes(typeData as ExamType[]);
      } else {
        // Fallback para catálogo padrão municipal
        setExamTypes(DEFAULT_EXAM_TYPES.map((t, idx) => ({ ...t, id: `def_${idx}` } as ExamType)));
      }

      // 6. Carregar Dispensações da Farmácia
      let dispQuery = supabase.from('medication_dispensations').select('*');
      if (currentInstitution?.id) dispQuery = dispQuery.eq('institution_id', currentInstitution.id);
      const { data: dispData } = await dispQuery.order('created_at', { ascending: false });
      if (dispData) setDispensations(dispData as MedicationDispensation[]);

    } catch (err) {
      console.error('Erro ao buscar dados de saúde:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscrições em Tempo Real
    const aptChannel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadData();
      })
      .subscribe();

    const patChannel = supabase
      .channel('patients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
        loadData();
      })
      .subscribe();

    const examChannel = supabase
      .channel('exam-requests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_requests' }, () => {
        loadData();
      })
      .subscribe();

    const dispChannel = supabase
      .channel('dispensations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_dispensations' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(aptChannel);
      supabase.removeChannel(patChannel);
      supabase.removeChannel(examChannel);
      supabase.removeChannel(dispChannel);
    };
  }, [currentInstitution?.id]);

  const queueCount = appointments.filter(a => a.status === 'Aguardando Regulação').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointmentsCount = appointments.filter(a => a.appointment_date === todayStr && a.status !== 'Aguardando Regulação').length;
  
  // Contadores para o módulo de exames
  const pendingExamsCount = examRequests.filter(r => r.status === 'Solicitado' || r.status === 'Aprovado').length;
  const blockedDuplicatesCount = examRequests.filter(r => r.status === 'Bloqueado por Duplicidade' || r.is_duplicate_warning).length;

  const handleOpenNewAppointment = (patient?: Patient) => {
    if (patient) {
      setPrefilledPatientForApt(patient);
    } else {
      setPrefilledPatientForApt(null);
    }
    setIsNewAppointmentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Navegação da Secretaria */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight uppercase dark:text-white flex items-center gap-3">
            <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 p-2.5 rounded-2xl">
              <HeartPulse size={26} />
            </span>
            Secretaria Municipal de Saúde
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Gestão Integrada de Regulação, Controle Anti-Duplicidade de Exames e Farmácia Popular.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => handleOpenNewAppointment()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
          >
            <Calendar size={18} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Tabs de Controle Operacional */}
      <div className="bg-white dark:bg-neutral-900 p-2 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2 w-fit">
        {/* Tab 1: Fila de Regulação */}
        <button
          onClick={() => setActiveTab('fila')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'fila'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 shadow-sm'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Clock size={16} />
          Fila de Regulação
          {queueCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
              {queueCount}
            </span>
          )}
        </button>

        {/* Tab 2: Agenda & Recepção */}
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'agenda'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-sm'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Calendar size={16} />
          Agenda & Recepção
          {todayAppointmentsCount > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {todayAppointmentsCount} hoje
            </span>
          )}
        </button>

        {/* Tab 3: Controle de Exames (NOVO) */}
        <button
          onClick={() => setActiveTab('exames')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'exames'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 shadow-sm'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Activity size={16} />
          Controle de Exames
          {pendingExamsCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {pendingExamsCount}
            </span>
          )}
          {blockedDuplicatesCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full" title="Duplicidades identificadas">
              <ShieldAlert size={10} className="inline" /> {blockedDuplicatesCount}
            </span>
          )}
        </button>

        {/* Tab 4: Farmácia Popular & SUS */}
        <button
          onClick={() => setActiveTab('farmacia')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'farmacia'
              ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 shadow-sm'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Pill size={16} />
          Farmácia SUS
        </button>

        {/* Tab 5: Pacientes & Mini-Prontuário */}
        <button
          onClick={() => setActiveTab('pacientes')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'pacientes'
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 shadow-sm'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <User size={16} />
          Pacientes & Prontuário 360°
        </button>

        {/* Tab 6: Cadastros & Configurações */}
        <button
          onClick={() => setActiveTab('cadastros')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'cadastros'
              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Building2 size={16} />
          Cadastros & Prazos
        </button>
      </div>

      {/* Conteúdo da Tab Ativa */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'fila' && (
            <SaudeQueue 
              appointments={appointments}
              units={units}
              professionals={professionals}
              isLoading={isLoading}
              onRefresh={loadData}
              onSelectAppointment={apt => setSelectedAppointment(apt)}
              currentInstitution={currentInstitution}
            />
          )}

          {activeTab === 'agenda' && (
            <SaudeAgenda 
              appointments={appointments}
              units={units}
              professionals={professionals}
              isLoading={isLoading}
              onRefresh={loadData}
              onSelectAppointment={apt => setSelectedAppointment(apt)}
              currentInstitution={currentInstitution}
            />
          )}

          {activeTab === 'exames' && (
            <SaudeExams 
              requests={examRequests}
              examTypes={examTypes}
              patients={patients}
              units={units}
              professionals={professionals}
              isLoading={isLoading}
              onRefresh={loadData}
              currentInstitution={currentInstitution}
              onNewRequestPrefilled={prefilledPatientForExam}
            />
          )}

          {activeTab === 'pacientes' && (
            <SaudePatients 
              patients={patients}
              appointments={appointments}
              requests={examRequests}
              dispensations={dispensations}
              units={units}
              professionals={professionals}
              isLoading={isLoading}
              onRefresh={loadData}
              onNewAppointmentForPatient={patient => handleOpenNewAppointment(patient)}
              onNewExamForPatient={patient => {
                setPrefilledPatientForExam(patient);
                setActiveTab('exames');
              }}
              onNewDispensationForPatient={() => {
                setActiveTab('farmacia');
              }}
              currentInstitution={currentInstitution}
            />
          )}

          {activeTab === 'farmacia' && (
            <FarmaciaModule 
              currentInstitution={currentInstitution}
              patients={patients}
              dispensations={dispensations}
              onRefreshData={loadData}
            />
          )}

          {activeTab === 'cadastros' && (
            <SaudeSettings 
              units={units}
              professionals={professionals}
              examTypes={examTypes}
              isLoading={isLoading}
              onRefresh={loadData}
              currentInstitution={currentInstitution}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modais Globais */}
      <AnimatePresence>
        {isNewAppointmentModalOpen && (
          <NewAppointmentModal 
            patients={patients}
            units={units}
            professionals={professionals}
            prefilledPatient={prefilledPatientForApt}
            onClose={() => setIsNewAppointmentModalOpen(false)}
            onSuccess={() => {
              loadData();
              setIsNewAppointmentModalOpen(false);
            }}
            currentInstitution={currentInstitution}
          />
        )}

        {selectedAppointment && (
          <AppointmentDetailsModal
            apt={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onUpdateStatus={() => {
              loadData();
              setSelectedAppointment(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================
// MODAL DE NOVO AGENDAMENTO DE CONSULTA
// =========================================================
interface NewAppointmentModalProps {
  patients: Patient[];
  units: HealthUnit[];
  professionals: HealthProfessional[];
  prefilledPatient: Patient | null;
  onClose: () => void;
  onSuccess: () => void;
  currentInstitution?: { id: string } | null;
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  patients,
  units,
  professionals,
  prefilledPatient,
  onClose,
  onSuccess,
  currentInstitution
}) => {
  const [formData, setFormData] = useState({
    patient_id: prefilledPatient?.id || '',
    patient_name: prefilledPatient?.name || '',
    patient_cpf: prefilledPatient?.cpf || '',
    patient_sus: prefilledPatient?.sus_number || '',
    patient_phone: prefilledPatient?.phone || '',
    patient_birth_date: prefilledPatient?.birth_date || '',
    is_pregnant: prefilledPatient?.is_pregnant || false,
    is_urgent: false,
    specialty: professionals.length > 0 ? professionals[0].specialty : COMMON_SPECIALTIES[0],
    unit_name: units.length > 0 ? units[0].name : DEFAULT_HEALTH_UNITS[0],
    doctor_name: '',
    referral_details: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '08:00',
    notes: '',
    destiny: 'fila' as 'fila' | 'agendado'
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
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
      patient_phone: p.phone || '',
      patient_birth_date: p.birth_date || '',
      is_pregnant: p.is_pregnant || false,
      unit_name: p.ubs_reference || prev.unit_name
    }));
    setShowPatientResults(false);
    setPatientSearch(p.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isQueue = formData.destiny === 'fila';

      const newAppointment = {
        id: generateUUID(),
        patient_id: isValidUUID(formData.patient_id) ? formData.patient_id : null,
        patient_name: formData.patient_name,
        patient_cpf: formData.patient_cpf,
        patient_sus: formData.patient_sus,
        patient_phone: formData.patient_phone || null,
        patient_birth_date: formData.patient_birth_date,
        is_pregnant: formData.is_pregnant,
        is_urgent: formData.is_urgent,
        specialty: formData.specialty,
        unit_name: formData.unit_name,
        doctor_name: formData.doctor_name || null,
        referral_details: formData.specialty === 'Clínico Geral' ? null : formData.referral_details,
        appointment_date: formData.appointment_date,
        appointment_time: isQueue ? null : formData.appointment_time,
        status: isQueue ? 'Aguardando Regulação' : 'Agendado',
        notes: formData.notes || null,
        institution_id: currentInstitution?.id || null
      };

      const { error } = await supabase.from('appointments').insert(newAppointment);
      if (error) throw error;

      showToast(isQueue ? 'Solicitação inserida na Fila de Regulação!' : 'Consulta agendada com sucesso!', 'success');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao criar agendamento: ' + err.message, 'error');
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
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">Novo Agendamento / Solicitação</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Insira na Fila de Regulação ou confirme o agendamento direto.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Autocomplete de Paciente */}
          <div className="relative space-y-1 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Buscar Paciente Cadastrado (Auto-Preenchimento)
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
                placeholder="Digite o Nome, CPF ou SUS para buscar..."
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

          {/* Dados do Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome do Paciente *</label>
              <input 
                type="text" required
                value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})}
                placeholder="Ex: João da Silva"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CPF *</label>
              <input 
                type="text" required
                value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cartão do SUS *</label>
              <input 
                type="text" required
                value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: formatSUS(e.target.value)})}
                placeholder="000 0000 0000 0000"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefone / WhatsApp</label>
              <input 
                type="text"
                value={formData.patient_phone} onChange={e => setFormData({...formData, patient_phone: formatPhone(e.target.value)})}
                placeholder="(00) 00000-0000"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data de Nascimento *</label>
              <input 
                type="date" required
                value={formData.patient_birth_date} onChange={e => setFormData({...formData, patient_birth_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-6 md:col-span-2 pt-1">
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
                  checked={formData.is_urgent}
                  onChange={e => setFormData({...formData, is_urgent: e.target.checked})}
                  className="rounded text-rose-600"
                />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">🚨 Urgência Médica</span>
              </label>
            </div>

            {/* Especialidade e Unidade */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Especialidade Desejada *</label>
              <select 
                value={formData.specialty}
                onChange={e => setFormData({...formData, specialty: e.target.value})}
                required
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                {professionals.length > 0 
                  ? Array.from(new Set(professionals.map(p => p.specialty))).map(s => <option key={s} value={s}>{s}</option>)
                  : COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Unidade de Saúde (UBS)</label>
              <select 
                value={formData.unit_name}
                onChange={e => setFormData({...formData, unit_name: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                {units.length > 0
                  ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                  : DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {formData.specialty !== 'Clínico Geral' && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  Médico Solicitante / CRM / Guia de Encaminhamento *
                </label>
                <input 
                  type="text" required
                  value={formData.referral_details} onChange={e => setFormData({...formData, referral_details: e.target.value})}
                  placeholder="Ex: Dr. Carlos (Clínico Geral) - CRM 12345"
                  className="w-full bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                />
              </div>
            )}

            {/* Fluxo */}
            <div className="space-y-2 md:col-span-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Fluxo do Agendamento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, destiny: 'fila'})}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    formData.destiny === 'fila'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <p className="font-black text-xs">⏳ Fila de Regulação (Recomendado)</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Cai na fila para triagem e definição de vaga pela equipe de regulação.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({...formData, destiny: 'agendado'})}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    formData.destiny === 'agendado'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <p className="font-black text-xs">📅 Agendamento Imediato</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Define diretamente a data e o horário fixo da consulta.
                  </p>
                </button>
              </div>
            </div>

            {formData.destiny === 'agendado' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data Fixa da Consulta *</label>
                  <input 
                    type="date" required
                    value={formData.appointment_date} onChange={e => setFormData({...formData, appointment_date: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Horário *</label>
                  <input 
                    type="time" required
                    value={formData.appointment_time} onChange={e => setFormData({...formData, appointment_time: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Observações / Sintomas</label>
              <textarea 
                rows={2}
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações clínicas ou motivo da consulta..."
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white resize-none"
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
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : formData.destiny === 'fila' ? 'Inserir na Fila de Regulação' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// MODAL DE DETALHES DO AGENDAMENTO DE CONSULTA
// =========================================================
interface AppointmentDetailsModalProps {
  apt: Appointment;
  onClose: () => void;
  onUpdateStatus: (newStatus: string) => void;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ apt, onClose }) => {
  const priority = calculatePriority(apt);
  const age = getAge(apt.patient_birth_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">Detalhes do Agendamento</h3>
            <p className="text-xs text-neutral-400 font-mono">Protocolo: {apt.id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <XCircle size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Status: {apt.status}
            </span>
            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
              priority.level === -1 ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
            }`}>
              {priority.label}
            </span>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Dados do Paciente</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Nome</span>
                <span className="font-bold text-neutral-900 dark:text-white">{apt.patient_name} ({age} anos)</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">CPF</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{apt.patient_cpf}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Cartão SUS</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{apt.patient_sus}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Telefone</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{apt.patient_phone ? formatPhone(apt.patient_phone) : 'Não informado'}</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Informações da Consulta</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Especialidade</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{apt.specialty}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Unidade de Saúde</span>
                <span className="font-bold text-neutral-900 dark:text-white">{apt.unit_name || 'A definir pela Regulação'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Data da Consulta</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {apt.appointment_date ? apt.appointment_date.split('-').reverse().join('/') : 'Em análise'}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold uppercase">Horário</span>
                <span className="font-bold text-neutral-900 dark:text-white">{apt.appointment_time || 'A definir'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-xs">
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
