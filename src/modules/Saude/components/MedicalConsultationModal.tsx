import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Heart, Activity, FileText, Pill, Stethoscope, 
  AlertTriangle, CheckCircle2, Clock, Calendar, Plus, Trash2, 
  Printer, ShieldAlert, Sparkles, AlertCircle, Search, Droplet, 
  Scale, Ruler, Thermometer, HeartPulse, ChevronRight, Check
} from 'lucide-react';
import { 
  Patient, Appointment, HealthProfessional, MedicalConsultation, 
  MedicalPrescription, PrescriptionItem, MedicalCertificate, 
  VitalSigns, ExamRequest, ExamType, MedicationDispensation,
  calculateBMI, generatePrescriptionNumber, generateUUID, formatCPF, formatSUS, getAge
} from '../types';
import { Medication } from '../Farmacia';
import { printMedicalPrescription, printMedicalCertificate } from '../utils/printMedicalPrescription';
import { showToast } from '../../../components/ui/Toast';

interface MedicalConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  patient: Patient | null;
  doctor: HealthProfessional;
  consultationsHistory?: MedicalConsultation[];
  examsHistory?: ExamRequest[];
  dispensationsHistory?: MedicationDispensation[];
  availableMedications: Medication[];
  availableExamTypes: ExamType[];
  unitName?: string;
  institutionName?: string;
  onFinishConsultation: (
    consultation: MedicalConsultation,
    newExams: ExamRequest[],
    prescription?: MedicalPrescription
  ) => Promise<void>;
}

const COMMON_CIDS = [
  { code: 'I10', desc: 'Hipertensão Essencial' },
  { code: 'E11', desc: 'Diabetes Mellitus Tipo 2' },
  { code: 'J00', desc: 'Nasofaringite Aguda (Resfriado)' },
  { code: 'J03', desc: 'Amigdalite Aguda' },
  { code: 'J20', desc: 'Bronquite Aguda' },
  { code: 'K29', desc: 'Gastrite e Duodenite' },
  { code: 'M54.5', desc: 'Dor Lombar Baixa (Lombalgia)' },
  { code: 'N39.0', desc: 'Infecção do Trato Urinário (ITU)' },
  { code: 'R50', desc: 'Febre de Origem Não Especificada' },
  { code: 'R51', desc: 'Cefaleia (Dor de Cabeça)' }
];

export const MedicalConsultationModal: React.FC<MedicalConsultationModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patient,
  doctor,
  consultationsHistory = [],
  examsHistory = [],
  dispensationsHistory = [],
  availableMedications = [],
  availableExamTypes = [],
  unitName = 'UBS Central Municipal',
  institutionName = 'Prefeitura Municipal',
  onFinishConsultation
}) => {
  const [activeTab, setActiveTab] = useState<'soap' | 'receita' | 'exames' | 'atestado' | 'prontuario'>('soap');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === 1. Dados Clínicos (SOAP) ===
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    blood_pressure: '',
    heart_rate: undefined,
    temperature: undefined,
    weight: undefined,
    height: undefined,
    blood_glucose: undefined
  });
  const [chiefComplaint, setChiefComplaint] = useState(appointment.referral_details || '');
  const [historyIllness, setHistoryIllness] = useState('');
  const [diagnosisHypothesis, setDiagnosisHypothesis] = useState('');
  const [cid10, setCid10] = useState('');
  const [clinicalEvolution, setClinicalEvolution] = useState('');

  // Cálculo de IMC automático
  const bmiInfo = useMemo(() => {
    return calculateBMI(vitalSigns.weight, vitalSigns.height);
  }, [vitalSigns.weight, vitalSigns.height]);

  // === 2. Prescrição Médica Conectada ===
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [medDosage, setMedDosage] = useState('');
  const [medInstructions, setMedInstructions] = useState('');
  const [medQuantity, setMedQuantity] = useState(1);
  const [medDuration, setMedDuration] = useState(7);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [currentPrescriptionNumber] = useState(() => generatePrescriptionNumber());

  // === 3. Solicitação de Exames Conectada ===
  const [selectedExams, setSelectedExams] = useState<{
    examType: ExamType;
    clinicalIndication: string;
    isDuplicateWarning: boolean;
    lastExamDate?: string;
    duplicateOverrideReason?: string;
  }[]>([]);
  const [examSearch, setExamSearch] = useState('');

  // === 4. Atestado Médico ===
  const [includeCertificate, setIncludeCertificate] = useState(false);
  const [certificateDays, setCertificateDays] = useState(1);
  const [certificateReason, setCertificateReason] = useState('');

  if (!isOpen) return null;

  // Filtragem de medicamentos da Farmácia Municipal
  const filteredMeds = availableMedications.filter(m => 
    m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
    m.active_ingredient.toLowerCase().includes(medSearch.toLowerCase())
  ).slice(0, 6);

  // Filtragem de catálogo de exames
  const filteredExamTypes = availableExamTypes.filter(e =>
    e.name.toLowerCase().includes(examSearch.toLowerCase()) ||
    e.category.toLowerCase().includes(examSearch.toLowerCase())
  ).slice(0, 6);

  // Adicionar medicamento à receita
  const handleAddMedication = () => {
    if (!selectedMed && !medSearch.trim()) {
      showToast('Selecione ou digite o nome do medicamento', 'warning');
      return;
    }
    if (!medInstructions.trim()) {
      showToast('Informe a posologia/modo de uso do medicamento', 'warning');
      return;
    }

    const newItem: PrescriptionItem = {
      id: generateUUID(),
      medication_id: selectedMed?.id,
      medication_name: selectedMed?.name || medSearch.trim(),
      active_ingredient: selectedMed?.active_ingredient,
      dosage: medDosage || selectedMed?.dosage || '',
      form: selectedMed?.form || 'Comprimido',
      quantity: medQuantity,
      instructions: medInstructions,
      duration_days: medDuration,
      available_in_stock: (selectedMed?.quantity || 0) > 0,
      current_stock: selectedMed?.quantity || 0
    };

    setPrescriptionItems([...prescriptionItems, newItem]);

    // Limpar campos de medicamento
    setSelectedMed(null);
    setMedSearch('');
    setMedDosage('');
    setMedInstructions('');
    setMedQuantity(1);
    setMedDuration(7);
    showToast('Medicamento adicionado à receita!', 'success');
  };

  const handleRemoveMedication = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  // Adicionar exame com checagem anti-duplicidade
  const handleAddExam = (exam: ExamType) => {
    if (selectedExams.some(e => e.examType.id === exam.id)) {
      showToast('Este exame já foi incluído na solicitação', 'warning');
      return;
    }

    // Verificar se o paciente realizou esse exame nos últimos X dias
    const pastExam = examsHistory.find(e => 
      e.exam_name.toLowerCase() === exam.name.toLowerCase() && 
      (e.status === 'Realizado' || e.status === 'Solicitado' || e.status === 'Agendado')
    );

    let isDuplicate = false;
    let lastDate: string | undefined;

    if (pastExam) {
      const examDate = new Date(pastExam.requested_date || pastExam.performed_date || '');
      const diffDays = Math.floor((new Date().getTime() - examDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= exam.min_interval_days) {
        isDuplicate = true;
        lastDate = pastExam.requested_date;
      }
    }

    setSelectedExams([
      ...selectedExams,
      {
        examType: exam,
        clinicalIndication: chiefComplaint || diagnosisHypothesis || 'Investigação diagnóstica',
        isDuplicateWarning: isDuplicate,
        lastExamDate: lastDate
      }
    ]);

    setExamSearch('');
    if (isDuplicate) {
      showToast(`Atenção: Exame ${exam.name} realizado recentemente (< ${exam.min_interval_days} dias)`, 'warning');
    } else {
      showToast(`Exame ${exam.name} adicionado`, 'success');
    }
  };

  const handleRemoveExam = (examId: string) => {
    setSelectedExams(selectedExams.filter(e => e.examType.id !== examId));
  };

  // Concluir Atendimento
  const handleFinish = async () => {
    if (!chiefComplaint.trim()) {
      showToast('Por favor, informe ao menos a Queixa Principal do paciente.', 'warning');
      setActiveTab('soap');
      return;
    }

    setIsSubmitting(true);
    try {
      const consultationId = generateUUID();
      const todayDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // 1. Criar Prescrição (se houver itens)
      let prescription: MedicalPrescription | undefined = undefined;
      if (prescriptionItems.length > 0) {
        prescription = {
          id: generateUUID(),
          institution_id: appointment.institution_id,
          consultation_id: consultationId,
          patient_id: appointment.patient_id || patient?.id,
          patient_name: appointment.patient_name,
          patient_cpf: appointment.patient_cpf,
          patient_sus: appointment.patient_sus,
          patient_birth_date: appointment.patient_birth_date,
          doctor_name: doctor.name,
          doctor_crm: doctor.crm_coren,
          unit_name: unitName,
          prescription_number: currentPrescriptionNumber,
          prescription_date: todayDate,
          items: prescriptionItems,
          notes: prescriptionNotes,
          status: 'ativa',
          created_at: new Date().toISOString()
        };
      }

      // 2. Criar Atestado (se selecionado)
      let certificate: MedicalCertificate | undefined = undefined;
      if (includeCertificate) {
        certificate = {
          id: generateUUID(),
          consultation_id: consultationId,
          patient_name: appointment.patient_name,
          patient_cpf: appointment.patient_cpf,
          doctor_name: doctor.name,
          doctor_crm: doctor.crm_coren,
          unit_name: unitName,
          days_off: certificateDays,
          cid10: cid10 || diagnosisHypothesis,
          reason: certificateReason,
          issued_date: todayDate,
          created_at: new Date().toISOString()
        };
      }

      // 3. Criar Solicitações de Exames
      const newExamRequests: ExamRequest[] = selectedExams.map(item => ({
        id: generateUUID(),
        institution_id: appointment.institution_id,
        patient_id: appointment.patient_id || patient?.id,
        patient_name: appointment.patient_name,
        patient_cpf: appointment.patient_cpf,
        patient_sus: appointment.patient_sus,
        patient_phone: appointment.patient_phone,
        patient_birth_date: appointment.patient_birth_date,
        exam_type_id: item.examType.id,
        exam_name: item.examType.name,
        category: item.examType.category,
        doctor_name: doctor.name,
        doctor_crm: doctor.crm_coren,
        requesting_unit: unitName,
        requested_date: todayDate,
        status: 'Solicitado',
        clinical_indication: item.clinicalIndication,
        is_urgent: appointment.is_urgent,
        is_duplicate_warning: item.isDuplicateWarning,
        is_duplicate_override: item.isDuplicateWarning,
        duplicate_override_reason: item.duplicateOverrideReason || 'Indicação clínica médica fundamentada',
        last_exam_date: item.lastExamDate || null,
        created_at: new Date().toISOString()
      }));

      // 4. Montar a Consulta Completa
      const consultation: MedicalConsultation = {
        id: consultationId,
        institution_id: appointment.institution_id,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id || patient?.id,
        patient_name: appointment.patient_name,
        patient_cpf: appointment.patient_cpf,
        patient_sus: appointment.patient_sus,
        patient_birth_date: appointment.patient_birth_date,
        doctor_name: doctor.name,
        doctor_crm: doctor.crm_coren,
        specialty: doctor.specialty || appointment.specialty,
        unit_name: unitName,
        consultation_date: todayDate,
        consultation_time: currentTime,
        chief_complaint: chiefComplaint,
        history_of_present_illness: historyIllness,
        vital_signs: {
          ...vitalSigns,
          bmi: bmiInfo?.bmi
        },
        diagnosis_hypothesis: diagnosisHypothesis,
        cid10,
        clinical_evolution: clinicalEvolution,
        prescription,
        exam_requests: newExamRequests,
        certificate,
        status: 'Finalizado',
        created_at: new Date().toISOString()
      };

      await onFinishConsultation(consultation, newExamRequests, prescription);

      // Opção de impressão automática se houver prescrição
      if (prescription) {
        const wantsPrint = window.confirm('Atendimento finalizado com sucesso! Deseja imprimir a Receita Médica Oficial agora?');
        if (wantsPrint) {
          printMedicalPrescription({
            prescription,
            institutionName,
            unitName,
            patient
          });
        }
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar atendimento: ' + (err?.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header do Consultório */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200/80 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Atendimento Médico · {appointment.patient_name}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                  Em Consulta
                </span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-3 mt-0.5 flex-wrap">
                <span>CPF: <strong>{formatCPF(appointment.patient_cpf)}</strong></span>
                <span>SUS: <strong>{formatSUS(appointment.patient_sus)}</strong></span>
                <span>Idade: <strong>{getAge(appointment.patient_birth_date)} anos</strong></span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Médico: {doctor.name} ({doctor.crm_coren || 'CRM'})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Finalizando...' : 'Finalizar Atendimento'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Alertas Críticos do Paciente (Faixa Superior) */}
        {patient && (patient.allergies || patient.conditions || patient.is_pregnant || patient.is_pcd) && (
          <div className="px-6 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200/50 dark:border-rose-900/40 flex items-center gap-3 overflow-x-auto text-xs">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span className="font-bold text-rose-700 dark:text-rose-300 shrink-0">Alertas Clínicos:</span>
            {patient.allergies && (
              <span className="px-2 py-0.5 rounded-md bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-semibold shrink-0">
                Alergias: {patient.allergies}
              </span>
            )}
            {patient.conditions && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 shrink-0 font-medium">
                Condições: {patient.conditions}
              </span>
            )}
            {patient.is_pregnant && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300 shrink-0 font-medium">
                Gestante
              </span>
            )}
            {patient.blood_type && (
              <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 shrink-0 font-bold">
                Tipo: {patient.blood_type}
              </span>
            )}
          </div>
        )}

        {/* Abas de Navegação do Atendimento */}
        <div className="flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('soap')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'soap'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Activity size={16} />
            <span>Registro Clínico (SOAP)</span>
          </button>

          <button
            onClick={() => setActiveTab('receita')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'receita'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Pill size={16} />
            <span>Prescrição Conectada</span>
            {prescriptionItems.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {prescriptionItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('exames')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'exames'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span>Solicitar Exames</span>
            {selectedExams.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {selectedExams.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('atestado')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'atestado'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Printer size={16} />
            <span>Atestado Médico</span>
            {includeCertificate && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('prontuario')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'prontuario'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <User size={16} />
            <span>Prontuário 360 (Histórico)</span>
            <span className="text-[10px] text-neutral-400 font-normal">
              ({consultationsHistory.length} consultas, {examsHistory.length} exames)
            </span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-6">
          
          {/* ABA 1: REGISTRO CLÍNICO (SOAP) */}
          {activeTab === 'soap' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Sinais Vitais */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <HeartPulse size={18} className="text-rose-500" />
                    <span>Sinais Vitais & Biometria</span>
                  </h4>
                  {bmiInfo && (
                    <div className="text-xs px-3 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold flex items-center gap-1.5">
                      <span>IMC: {bmiInfo.bmi}</span>
                      <span className="text-[10px] font-normal">({bmiInfo.classification})</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                      Pressão (PA)
                    </label>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={vitalSigns.blood_pressure || ''}
                      onChange={e => setVitalSigns({ ...vitalSigns, blood_pressure: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                      FC (bpm)
                    </label>
                    <input
                      type="number"
                      placeholder="75"
                      value={vitalSigns.heart_rate || ''}
                      onChange={e => setVitalSigns({ ...vitalSigns, heart_rate: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                      Temp (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="36.5"
                      value={vitalSigns.temperature || ''}
                      onChange={e => setVitalSigns({ ...vitalSigns, temperature: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="70.5"
                      value={vitalSigns.weight || ''}
                      onChange={e => setVitalSigns({ ...vitalSigns, weight: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      placeholder="172"
                      value={vitalSigns.height || ''}
                      onChange={e => setVitalSigns({ ...vitalSigns, height: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                      Glicemia (mg/dL)
                    </label>
                    <input
                      type="number"
                      placeholder="95"
                      value={vitalSigns.blood_glucose || ''}
                      onChange={e => setVitalSigns({ ...vitalSigns, blood_glucose: Number(e.target.value) || undefined })}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Queixa Principal e Anamnese */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
                  <label className="font-bold text-xs text-neutral-900 dark:text-white flex items-center justify-between">
                    <span>Subjetivo · Queixa Principal *</span>
                    <span className="text-[10px] text-indigo-600 font-normal">Motivo da consulta</span>
                  </label>
                  <textarea
                    rows={4}
                    value={chiefComplaint}
                    onChange={e => setChiefComplaint(e.target.value)}
                    placeholder="Ex: Paciente relata dor de cabeça frontal intensa há 3 dias acompanhada de febre e congestão nasal..."
                    className="w-full p-3 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
                  <label className="font-bold text-xs text-neutral-900 dark:text-white flex items-center justify-between">
                    <span>Histórico da Doença Atual (HDA) / Exame Físico</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Objetivo</span>
                  </label>
                  <textarea
                    rows={4}
                    value={historyIllness}
                    onChange={e => setHistoryIllness(e.target.value)}
                    placeholder="Ex: Oroscopia com hiperemia em amígdalas, sem exsudato. Murmúrio vesicular presente e simétrico. Abdome flácido..."
                    className="w-full p-3 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Hipótese Diagnóstica e CID-10 */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Avaliação · Hipótese Diagnóstica & CID-10</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Descrição do Diagnóstico / Hipótese
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Faringoamigdalite aguda / Hipertensão arterial sistêmica descompensada"
                      value={diagnosisHypothesis}
                      onChange={e => setDiagnosisHypothesis(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Código CID-10
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: J03.9 ou I10"
                      value={cid10}
                      onChange={e => setCid10(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 font-mono uppercase"
                    />
                  </div>
                </div>

                {/* CIDs Rápidos */}
                <div>
                  <span className="text-[10px] text-neutral-400 font-semibold block mb-1.5 uppercase">
                    Atalhos de CIDs Frequentes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CIDS.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCid10(c.code);
                          if (!diagnosisHypothesis) setDiagnosisHypothesis(c.desc);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors"
                      >
                        <strong>{c.code}</strong> - {c.desc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conduta Médica e Plano Terapêutico */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
                <label className="font-bold text-xs text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Plano · Conduta Médica / Recomendações ao Paciente</span>
                  <span className="text-[10px] text-indigo-600 font-normal">Orientações e acompanhamento</span>
                </label>
                <textarea
                  rows={3}
                  value={clinicalEvolution}
                  onChange={e => setClinicalEvolution(e.target.value)}
                  placeholder="Ex: Prescrita medicação sintomática, hidratação oral abundante (2 a 3 litros/dia) e repouso. Retornar em caso de febre persistente por mais de 72h ou piora clínica..."
                  className="w-full p-3 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ABA 2: PRESCRIÇÃO DIGITAL CONECTADA COM A FARMÁCIA MUNICIPAL */}
          {activeTab === 'receita' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Box de Inclusão de Medicamentos */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                      <Pill size={18} className="text-indigo-600" />
                      <span>Prescrever Medicamento (Conectado à Farmácia Municipal)</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Consulte a disponibilidade em tempo real no estoque da farmácia da UBS.
                    </p>
                  </div>
                  <div className="text-xs px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl font-mono text-neutral-600 dark:text-neutral-400">
                    Receita: <strong>{currentPrescriptionNumber}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Busca no Estoque Municipal */}
                  <div className="md:col-span-2 relative">
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Medicamento / Princípio Ativo *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar medicamento na Farmácia Municipal (ex: Amoxicilina, Dipirona, Losartana)..."
                        value={selectedMed ? `${selectedMed.name} (${selectedMed.dosage}) - ${selectedMed.form}` : medSearch}
                        onChange={e => {
                          setSelectedMed(null);
                          setMedSearch(e.target.value);
                        }}
                        className="w-full px-3 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 pr-8"
                      />
                      {selectedMed && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMed(null);
                            setMedSearch('');
                          }}
                          className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown de sugestões da Farmácia */}
                    {!selectedMed && medSearch.trim().length > 1 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-20 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-700">
                        {filteredMeds.length > 0 ? (
                          filteredMeds.map(med => (
                            <button
                              key={med.id}
                              type="button"
                              onClick={() => {
                                setSelectedMed(med);
                                setMedDosage(med.dosage);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 dark:hover:bg-neutral-700 flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <span className="font-bold text-neutral-900 dark:text-white">{med.name}</span>
                                <span className="text-[11px] text-neutral-500 ml-1.5">{med.active_ingredient} · {med.dosage} ({med.form})</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                med.quantity > 0 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {med.quantity > 0 ? `${med.quantity} em estoque` : 'Esgotado'}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-neutral-500 text-center">
                            Medicamento não encontrado na Farmácia Municipal. Você pode prescrever como medicamento avulso.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Dosagem / Apresentação
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 500mg ou 10mg"
                      value={medDosage}
                      onChange={e => setMedDosage(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Posologia / Modo de Uso *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Tomar 1 comprimido por via oral de 8 em 8 horas por 7 dias."
                      value={medInstructions}
                      onChange={e => setMedInstructions(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={medQuantity}
                        onChange={e => setMedQuantity(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                        Dias
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={medDuration}
                        onChange={e => setMedDuration(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <Plus size={15} />
                    <span>Adicionar à Receita</span>
                  </button>
                </div>
              </div>

              {/* Lista de Medicamentos Prescritos na Receita */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>Itens Prescritos na Receita ({prescriptionItems.length})</span>
                  </h4>
                  {prescriptionItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        printMedicalPrescription({
                          prescription: {
                            id: 'preview',
                            prescription_number: currentPrescriptionNumber,
                            prescription_date: new Date().toISOString().split('T')[0],
                            patient_name: appointment.patient_name,
                            patient_cpf: appointment.patient_cpf,
                            patient_sus: appointment.patient_sus,
                            doctor_name: doctor.name,
                            doctor_crm: doctor.crm_coren,
                            unit_name: unitName,
                            items: prescriptionItems,
                            notes: prescriptionNotes,
                            status: 'ativa'
                          },
                          institutionName,
                          unitName,
                          patient
                        });
                      }}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Printer size={14} />
                      <span>Pré-visualizar Impressão</span>
                    </button>
                  )}
                </div>

                {prescriptionItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <Pill size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-xs text-neutral-500">Nenhum medicamento adicionado à receita ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prescriptionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600">{idx + 1}.</span>
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {item.medication_name} {item.dosage}
                            </span>
                            <span className="text-[11px] text-neutral-400">({item.form})</span>
                            {item.available_in_stock ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-medium">
                                Disponível na UBS ({item.current_stock} un)
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-medium">
                                Não padronizado ou sem estoque
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-600 dark:text-neutral-300 font-medium">
                            {item.instructions}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Quantidade total: <strong>{item.quantity} unidades</strong> · Duração: <strong>{item.duration_days} dias</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(idx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Observações da Receita */}
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                    Recomendações Clínicas Adicionais da Receita (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tomar após as refeições. Não ingerir com bebidas alcoólicas."
                    value={prescriptionNotes}
                    onChange={e => setPrescriptionNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: SOLICITAÇÃO DE EXAMES COM ANTI-DUPLICIDADE */}
          {activeTab === 'exames' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600" />
                    <span>Prescrever Exames (Com Controle Anti-Duplicidade SUS)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    O sistema verifica automaticamente se o paciente realizou o mesmo exame nos últimos 30 dias na rede municipal.
                  </p>
                </div>

                {/* Busca de Exames */}
                <div>
                  <input
                    type="text"
                    placeholder="Buscar exame pelo nome (ex: Hemograma, Glicemia, Raio-X, Ultrassom)..."
                    value={examSearch}
                    onChange={e => setExamSearch(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                  />

                  {examSearch.trim() && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredExamTypes.map(exam => (
                        <div
                          key={exam.id}
                          className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{exam.name}</div>
                            <div className="text-[10px] text-neutral-500">
                              {exam.category} · Carência: {exam.min_interval_days} dias
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddExam(exam)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                          >
                            Prescrever
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Exames Selecionados */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                  Exames Solicitados nesta Consulta ({selectedExams.length})
                </h4>

                {selectedExams.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <FileText size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-xs text-neutral-500">Nenhum exame solicitado nesta consulta.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedExams.map((item, idx) => (
                      <div
                        key={item.examType.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                          item.isDuplicateWarning
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                            : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600">{idx + 1}.</span>
                            <span className="font-bold text-neutral-900 dark:text-white">{item.examType.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 font-medium">
                              {item.examType.category}
                            </span>
                            {item.isDuplicateWarning && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                Repetição Recente
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExam(item.examType.id)}
                            className="text-neutral-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {item.isDuplicateWarning && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 p-2 rounded-lg">
                            ⚠️ Este paciente já realizou este exame em {item.lastExamDate ? item.lastExamDate.split('-').reverse().join('/') : 'data recente'}.
                            A liberação antes do prazo padrão ({item.examType.min_interval_days} dias) requer justificativa clínica:
                            <input
                              type="text"
                              placeholder="Justificativa da repetição médica..."
                              value={item.duplicateOverrideReason || ''}
                              onChange={e => {
                                const newReason = e.target.value;
                                setSelectedExams(selectedExams.map(ex => 
                                  ex.examType.id === item.examType.id 
                                    ? { ...ex, duplicateOverrideReason: newReason } 
                                    : ex
                                ));
                              }}
                              className="mt-1.5 w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 rounded-md border border-amber-300 dark:border-amber-700 outline-none text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 4: ATESTADO MÉDICO */}
          {activeTab === 'atestado' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enable-cert"
                      checked={includeCertificate}
                      onChange={e => setIncludeCertificate(e.target.checked)}
                      className="w-5 h-5 rounded-lg text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="enable-cert" className="font-bold text-sm text-neutral-900 dark:text-white cursor-pointer">
                      Emitir Atestado Médico de Afastamento
                    </label>
                  </div>

                  {includeCertificate && (
                    <button
                      type="button"
                      onClick={() => {
                        printMedicalCertificate({
                          certificate: {
                            id: 'preview',
                            patient_name: appointment.patient_name,
                            patient_cpf: formatCPF(appointment.patient_cpf),
                            doctor_name: doctor.name,
                            doctor_crm: doctor.crm_coren,
                            unit_name: unitName,
                            days_off: certificateDays,
                            cid10: cid10 || diagnosisHypothesis,
                            reason: certificateReason,
                            issued_date: new Date().toISOString().split('T')[0]
                          },
                          institutionName,
                          unitName
                        });
                      }}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      <span>Imprimir Atestado</span>
                    </button>
                  )}
                </div>

                {includeCertificate && (
                  <div className="space-y-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <div>
                      <label className="font-semibold text-neutral-500 block mb-1">
                        Dias de Afastamento Solicitados
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={certificateDays}
                        onChange={e => setCertificateDays(Number(e.target.value) || 1)}
                        className="w-32 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500 font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-500 block mb-1">
                        CID-10 no Atestado
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: J03 ou I10 (Com autorização do paciente)"
                        value={cid10}
                        onChange={e => setCid10(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-500 block mb-1">
                        Observação / Justificativa adicional
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Compareceu para consulta médica no período matutino."
                        value={certificateReason}
                        onChange={e => setCertificateReason(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 5: PRONTUÁRIO 360 DO PACIENTE (HISTÓRICO COMPLETO) */}
          {activeTab === 'prontuario' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Consultas Anteriores */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  <span>Histórico de Consultas Médicas Anteriores ({consultationsHistory.length})</span>
                </h4>

                {consultationsHistory.length === 0 ? (
                  <p className="text-xs text-neutral-400 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                    Nenhum registro de consulta anterior encontrado para este paciente.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {consultationsHistory.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-indigo-600">
                            {c.consultation_date ? c.consultation_date.split('-').reverse().join('/') : 'Data não informada'} · Dr(a). {c.doctor_name}
                          </span>
                          <span className="text-neutral-400 text-[11px]">{c.unit_name}</span>
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-300">
                          <strong>Queixa:</strong> {c.chief_complaint}
                        </p>
                        {c.diagnosis_hypothesis && (
                          <p className="text-neutral-700 dark:text-neutral-300">
                            <strong>Diagnóstico:</strong> {c.diagnosis_hypothesis} {c.cid10 ? `(CID: ${c.cid10})` : ''}
                          </p>
                        )}
                        {c.clinical_evolution && (
                          <p className="text-neutral-500 text-[11px]">
                            <strong>Conduta:</strong> {c.clinical_evolution}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exames Anteriores */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" />
                  <span>Exames Anteriores Realizados e Laudos ({examsHistory.length})</span>
                </h4>

                {examsHistory.length === 0 ? (
                  <p className="text-xs text-neutral-400 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                    Nenhum exame anterior registrado para este paciente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {examsHistory.map((ex, i) => (
                      <div
                        key={ex.id || i}
                        className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white">{ex.exam_name}</div>
                          <div className="text-[11px] text-neutral-500">
                            Data: {ex.performed_date ? ex.performed_date.split('-').reverse().join('/') : ex.requested_date.split('-').reverse().join('/')} · Solicitado por: {ex.doctor_name}
                          </div>
                          {ex.result_notes && (
                            <div className="text-[11px] text-emerald-600 font-medium mt-1">
                              Laudo: {ex.result_notes}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ex.status === 'Realizado' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          {ex.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remédios Retirados na Farmácia */}
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <Pill size={16} className="text-indigo-600" />
                  <span>Histórico de Retiradas na Farmácia Municipal ({dispensationsHistory.length})</span>
                </h4>

                {dispensationsHistory.length === 0 ? (
                  <p className="text-xs text-neutral-400 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                    Nenhuma dispensação de medicamento registrada para este paciente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dispensationsHistory.map((d, i) => (
                      <div
                        key={d.id || i}
                        className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white">{d.medication_name} ({d.dosage})</div>
                          <div className="text-[11px] text-neutral-500">
                            Retirado em: {d.created_at ? d.created_at.split('T')[0].split('-').reverse().join('/') : d.prescription_date} · Quantidade: {d.quantity_dispensed} un.
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono">
                          Receita: {d.prescription_number || 'S/N'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
