import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, HeartPulse, User, Clock, ShieldCheck, 
  Activity, CheckCircle2, AlertTriangle, Search, Filter, 
  FileText, Pill, Plus, ArrowRight, Lock, Building2, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { AdminUser } from '../../types';
import { 
  Appointment, Patient, HealthUnit, HealthProfessional, 
  MedicalConsultation, MedicalPrescription, ExamRequest, 
  ExamType, MedicationDispensation, VitalSigns,
  calculateBMI, calculatePriority, formatCPF, formatSUS, getAge, generateUUID
} from './types';
import { Medication } from './Farmacia';
import { DEFAULT_MEDICATIONS } from './index';
import { SaudeConsultorio } from './components/SaudeConsultorio';

interface ConsultorioModuleProps {
  currentInstitution?: { id: string; name?: string } | null;
  currentUser?: AdminUser | null;
}

export const ConsultorioModule: React.FC<ConsultorioModuleProps> = ({
  currentInstitution,
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'consultorio' | 'triagem' | 'historico'>('consultorio');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [professionals, setProfessionals] = useState<HealthProfessional[]>([]);
  const [consultations, setConsultations] = useState<MedicalConsultation[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [dispensations, setDispensations] = useState<MedicationDispensation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Estado de Triagem de Enfermagem
  const [triagingAppointment, setTriagingAppointment] = useState<Appointment | null>(null);
  const [triageVitals, setTriageVitals] = useState<VitalSigns>({
    blood_pressure: '',
    heart_rate: undefined,
    temperature: undefined,
    weight: undefined,
    height: undefined,
    blood_glucose: undefined
  });
  const [triageNotes, setTriageNotes] = useState('');
  const [triagePriority, setTriagePriority] = useState<'normal' | 'prioridade' | '80+' | 'urgente'>('normal');

  const triageBmi = useMemo(() => {
    return calculateBMI(triageVitals.weight, triageVitals.height);
  }, [triageVitals.weight, triageVitals.height]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Agendamentos
      let aptQuery = supabase.from('appointments').select('*');
      if (currentInstitution?.id) aptQuery = aptQuery.eq('institution_id', currentInstitution.id);
      const { data: aptData } = await aptQuery.order('appointment_date', { ascending: true });
      if (aptData && aptData.length > 0) {
        setAppointments(aptData as Appointment[]);
      } else {
        const demoApts = localStorage.getItem('gestao360_demo_saude_appointments');
        if (demoApts) setAppointments(JSON.parse(demoApts));
      }

      // 2. Pacientes
      let patQuery = supabase.from('patients').select('*');
      if (currentInstitution?.id) patQuery = patQuery.eq('institution_id', currentInstitution.id);
      const { data: patData } = await patQuery.order('name', { ascending: true });
      if (patData && patData.length > 0) {
        setPatients(patData as Patient[]);
      } else {
        const demoPats = localStorage.getItem('gestao360_demo_saude_patients');
        if (demoPats) setPatients(JSON.parse(demoPats));
      }

      // 3. Unidades e Profissionais
      let unitsQuery = supabase.from('health_units').select('*');
      if (currentInstitution?.id) unitsQuery = unitsQuery.eq('institution_id', currentInstitution.id);
      const { data: unitsData } = await unitsQuery.order('name');
      if (unitsData) setUnits(unitsData as HealthUnit[]);

      let profQuery = supabase.from('health_professionals').select('*');
      if (currentInstitution?.id) profQuery = profQuery.eq('institution_id', currentInstitution.id);
      const { data: profData } = await profQuery.order('name');
      if (profData) setProfessionals(profData as HealthProfessional[]);

      // 4. Consultas
      let consultQuery = supabase.from('medical_consultations').select('*');
      if (currentInstitution?.id) consultQuery = consultQuery.eq('institution_id', currentInstitution.id);
      const { data: consultData } = await consultQuery.order('created_at', { ascending: false });
      if (consultData && consultData.length > 0) {
        setConsultations(consultData as MedicalConsultation[]);
      } else {
        const demoConsults = localStorage.getItem('gestao360_demo_saude_consultations');
        if (demoConsults) setConsultations(JSON.parse(demoConsults));
      }

      // 5. Exames
      let examQuery = supabase.from('exam_requests').select('*');
      if (currentInstitution?.id) examQuery = examQuery.eq('institution_id', currentInstitution.id);
      const { data: examData } = await examQuery.order('requested_date', { ascending: false });
      if (examData && examData.length > 0) {
        setExamRequests(examData as ExamRequest[]);
      } else {
        const demoExams = localStorage.getItem('gestao360_demo_saude_exams');
        if (demoExams) setExamRequests(JSON.parse(demoExams));
      }

      let typeQuery = supabase.from('exam_types').select('*');
      if (currentInstitution?.id) typeQuery = typeQuery.eq('institution_id', currentInstitution.id);
      const { data: typeData } = await typeQuery.order('name');
      if (typeData) setExamTypes(typeData as ExamType[]);

      // 6. Medicamentos da Farmácia
      let medQuery = supabase.from('medications').select('*');
      if (currentInstitution?.id) medQuery = medQuery.eq('institution_id', currentInstitution.id);
      const { data: medData } = await medQuery.order('name');
      if (medData && medData.length > 0) {
        setMedications(medData as Medication[]);
      } else {
        const localMeds = localStorage.getItem('gestao360_demo_saude_medications');
        if (localMeds) setMedications(JSON.parse(localMeds));
        else setMedications(DEFAULT_MEDICATIONS);
      }

      // 7. Dispensações
      let dispQuery = supabase.from('medication_dispensations').select('*');
      if (currentInstitution?.id) dispQuery = dispQuery.eq('institution_id', currentInstitution.id);
      const { data: dispData } = await dispQuery.order('created_at', { ascending: false });
      if (dispData) setDispensations(dispData as MedicationDispensation[]);

    } catch (e) {
      console.error('Erro ao carregar dados do Consultório:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentInstitution?.id]);

  // Salvar Consulta Médica (SOAP + Prescrição + Exames)
  const handleSaveConsultation = async (
    consultation: MedicalConsultation,
    newExams: ExamRequest[],
    prescription?: MedicalPrescription
  ) => {
    // 1. Agendamento vira 'Atendido'
    if (consultation.appointment_id) {
      setAppointments(prev => prev.map(a => a.id === consultation.appointment_id ? { ...a, status: 'Atendido' } : a));
      try {
        await supabase.from('appointments').update({ 
          status: 'Atendido', 
          attended_at: new Date().toISOString() 
        }).eq('id', consultation.appointment_id);
      } catch (e) {
        console.warn('Erro ao atualizar agendamento:', e);
      }
    }

    // 2. Consulta salva
    setConsultations(prev => [consultation, ...prev]);
    const updatedConsults = [consultation, ...consultations];
    localStorage.setItem('gestao360_demo_saude_consultations', JSON.stringify(updatedConsults));
    try {
      await supabase.from('medical_consultations').insert(consultation);
    } catch (e) {
      console.warn('Erro ao salvar consulta no Supabase:', e);
    }

    // 3. Prescrição Digital salva (conectada à Farmácia)
    if (prescription) {
      const updatedPresc = [prescription];
      try {
        const savedRaw = localStorage.getItem('gestao360_demo_saude_prescriptions');
        const list = savedRaw ? JSON.parse(savedRaw) : [];
        localStorage.setItem('gestao360_demo_saude_prescriptions', JSON.stringify([prescription, ...list]));
        await supabase.from('medical_prescriptions').insert(prescription);
      } catch (e) {
        console.warn('Erro ao salvar receita:', e);
      }
    }

    // 4. Novos Exames salvos
    if (newExams.length > 0) {
      setExamRequests(prev => [...newExams, ...prev]);
      try {
        const savedRaw = localStorage.getItem('gestao360_demo_saude_exams');
        const list = savedRaw ? JSON.parse(savedRaw) : [];
        localStorage.setItem('gestao360_demo_saude_exams', JSON.stringify([...newExams, ...list]));
        await supabase.from('exam_requests').insert(newExams);
      } catch (e) {
        console.warn('Erro ao salvar exames:', e);
      }
    }

    showToast(`Atendimento de ${consultation.patient_name} concluído e sincronizado!`, 'success');
  };

  // Salvar Triagem da Enfermagem
  const handleSaveTriage = async () => {
    if (!triagingAppointment) return;

    try {
      const updatedAppointment: Appointment = {
        ...triagingAppointment,
        status: 'Agendado', // Pronto para chamar pelo médico
        queue_priority: triagePriority,
        triage_notes: triageNotes,
        checked_in_at: new Date().toISOString(),
        referral_details: triageNotes || triagingAppointment.referral_details
      };

      setAppointments(prev => prev.map(a => a.id === triagingAppointment.id ? updatedAppointment : a));
      localStorage.setItem('gestao360_demo_saude_appointments', JSON.stringify(
        appointments.map(a => a.id === triagingAppointment.id ? updatedAppointment : a)
      ));

      try {
        await supabase.from('appointments').update({
          status: 'Agendado',
          queue_priority: triagePriority,
          triage_notes: triageNotes,
          checked_in_at: new Date().toISOString(),
          referral_details: triageNotes
        }).eq('id', triagingAppointment.id);
      } catch (e) {
        console.warn('Erro ao sincronizar triagem no Supabase:', e);
      }

      showToast(`Triagem de ${triagingAppointment.patient_name} realizada! Paciente enviado para a fila do médico.`, 'success');
      setTriagingAppointment(null);
    } catch (e: any) {
      showToast('Erro ao salvar triagem: ' + e?.message, 'error');
    }
  };

  // Pacientes aguardando triagem (chegaram e ainda não passaram por sinais vitais)
  const waitingTriage = useMemo(() => {
    return appointments.filter(a => a.status === 'Aguardando Regulação' || !a.checked_in_at);
  }, [appointments]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Banner de Área Exclusiva Assistencial */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-neutral-900 rounded-3xl text-white shadow-xl border border-indigo-800/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 border border-white/10">
            <Lock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Acesso Restrito · Equipe Clínica (CFM / COFEN)
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white mt-0.5">
              Área do Médico & Triagem de Enfermagem (PEP)
            </h1>
          </div>
        </div>

        {/* Abas Exclusivas do Consultório */}
        <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('consultorio')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'consultorio'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Stethoscope size={15} />
            <span>Consultório Médico</span>
          </button>

          <button
            onClick={() => setActiveSubTab('triagem')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'triagem'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <HeartPulse size={15} />
            <span>Triagem / Enfermagem</span>
            {waitingTriage.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {waitingTriage.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-ABA 1: CONSULTÓRIO MÉDICO (PEP & PRESCRIÇÃO CONECTADA) */}
      {activeSubTab === 'consultorio' && (
        <SaudeConsultorio
          appointments={appointments}
          patients={patients}
          units={units}
          professionals={professionals}
          consultations={consultations}
          examRequests={examRequests}
          examTypes={examTypes}
          medications={medications}
          dispensations={dispensations}
          currentInstitution={currentInstitution}
          onSaveConsultation={handleSaveConsultation}
          onRefresh={loadData}
        />
      )}

      {/* SUB-ABA 2: TRIAGEM & ACOLHIMENTO DA ENFERMAGEM */}
      {activeSubTab === 'triagem' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <HeartPulse size={20} className="text-rose-500" />
                <span>Acolhimento & Triagem de Enfermagem (Classificação de Risco)</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Aferição de sinais vitais e prioridade de atendimento antes do paciente entrar no consultório médico.
              </p>
            </div>

            {waitingTriage.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-sm text-neutral-700 dark:text-neutral-300">Nenhum paciente aguardando triagem!</p>
                <p className="text-xs text-neutral-400 mt-1">Todos os pacientes que chegaram à UBS já foram triados para o médico.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingTriage.map((apt, idx) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-white">
                        <span>#{idx + 1}</span>
                        <span>{apt.patient_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Aguardando Triagem
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-3 mt-1">
                        <span>CPF: {formatCPF(apt.patient_cpf)}</span>
                        <span>SUS: {formatSUS(apt.patient_sus)}</span>
                        <span>Idade: {getAge(apt.patient_birth_date)} anos</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTriagingAppointment(apt);
                        setTriageNotes(apt.referral_details || '');
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                    >
                      <Activity size={15} />
                      <span>Iniciar Triagem</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE TRIAGEM RÁPIDA (SINAIS VITAIS + RISCO) */}
      {triagingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5"
          >
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <HeartPulse size={22} className="text-rose-500" />
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                    Triagem: {triagingAppointment.patient_name}
                  </h3>
                  <p className="text-xs text-neutral-500">Aferição de sinais vitais pré-consulta médica</p>
                </div>
              </div>
              <button onClick={() => setTriagingAppointment(null)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>

            {/* Sinais Vitais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Pressão (PA)</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={triageVitals.blood_pressure || ''}
                  onChange={e => setTriageVitals({ ...triageVitals, blood_pressure: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">FC (bpm)</label>
                <input
                  type="number"
                  placeholder="76"
                  value={triageVitals.heart_rate || ''}
                  onChange={e => setTriageVitals({ ...triageVitals, heart_rate: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={triageVitals.temperature || ''}
                  onChange={e => setTriageVitals({ ...triageVitals, temperature: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="72.0"
                  value={triageVitals.weight || ''}
                  onChange={e => setTriageVitals({ ...triageVitals, weight: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Altura (cm)</label>
                <input
                  type="number"
                  placeholder="175"
                  value={triageVitals.height || ''}
                  onChange={e => setTriageVitals({ ...triageVitals, height: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Glicemia (mg/dL)</label>
                <input
                  type="number"
                  placeholder="95"
                  value={triageVitals.blood_glucose || ''}
                  onChange={e => setTriageVitals({ ...triageVitals, blood_glucose: Number(e.target.value) || undefined })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {triageBmi && (
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-between">
                <span>IMC: {triageBmi.bmi}</span>
                <span>{triageBmi.classification}</span>
              </div>
            )}

            {/* Classificação de Prioridade */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Classificação de Prioridade / Manchester</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'normal', label: 'Geral (Verde)', color: 'bg-emerald-600' },
                  { id: 'prioridade', label: 'Prioritário (Amarelo)', color: 'bg-amber-500' },
                  { id: '80+', label: 'Idoso 80+ (Laranja)', color: 'bg-orange-600' },
                  { id: 'urgente', label: 'Urgente (Vermelho)', color: 'bg-rose-600' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTriagePriority(p.id as any)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold text-white transition-all ${
                      triagePriority === p.id ? `${p.color} ring-2 ring-offset-2 ring-neutral-900` : 'bg-neutral-400 opacity-60'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Queixa & Observações da Enfermagem */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 block mb-1">Queixa Relatada no Acolhimento</label>
              <textarea
                rows={3}
                value={triageNotes}
                onChange={e => setTriageNotes(e.target.value)}
                placeholder="Ex: Paciente relata cefaleia e náuseas desde o início da manhã. PA elevada..."
                className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTriagingAppointment(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTriage}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Salvar Triagem e Liberar para o Médico
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
