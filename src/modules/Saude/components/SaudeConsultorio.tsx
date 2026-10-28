import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, User, Calendar, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, Phone, Search, Filter, 
  Pill, FileText, Printer, Building2, Plus, Sparkles, 
  Volume2, Eye, ShieldCheck, HeartPulse
} from 'lucide-react';
import { 
  Appointment, Patient, HealthUnit, HealthProfessional, 
  MedicalConsultation, MedicalPrescription, ExamRequest, 
  ExamType, MedicationDispensation, calculatePriority, 
  formatCPF, formatSUS, getAge, formatPhone 
} from '../types';
import { Medication } from '../Farmacia';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { printMedicalPrescription, printMedicalCertificate } from '../utils/printMedicalPrescription';
import { showToast } from '../../../components/ui/Toast';

interface SaudeConsultorioProps {
  appointments: Appointment[];
  patients: Patient[];
  units: HealthUnit[];
  professionals: HealthProfessional[];
  consultations: MedicalConsultation[];
  examRequests: ExamRequest[];
  examTypes: ExamType[];
  medications: Medication[];
  dispensations: MedicationDispensation[];
  currentInstitution?: { id: string; name?: string } | null;
  onSaveConsultation: (
    consultation: MedicalConsultation,
    newExams: ExamRequest[],
    prescription?: MedicalPrescription
  ) => Promise<void>;
  onRefresh: () => void;
}

export const SaudeConsultorio: React.FC<SaudeConsultorioProps> = ({
  appointments,
  patients,
  units,
  professionals,
  consultations,
  examRequests,
  examTypes,
  medications,
  dispensations,
  currentInstitution,
  onSaveConsultation,
  onRefresh
}) => {
  // 1. Seleção do Médico em Atendimento
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(() => {
    return professionals[0]?.id || 'demo-doctor';
  });

  const activeDoctor: HealthProfessional = useMemo(() => {
    const found = professionals.find(p => p.id === selectedProfessionalId);
    if (found) return found;
    return {
      id: 'demo-doctor',
      name: 'Dr. Roberto Carlos da Silva',
      specialty: 'Clínica Geral',
      crm_coren: 'CRM-MT 12458',
      is_active: true
    };
  }, [professionals, selectedProfessionalId]);

  // 2. Seleção de Unidade
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    return units[0]?.id || 'default-unit';
  });

  const activeUnitName = useMemo(() => {
    const u = units.find(unit => unit.id === selectedUnitId);
    return u?.name || 'UBS Central Municipal Dr. Arnaldo';
  }, [units, selectedUnitId]);

  // 3. Estado da Consulta Atual
  const [activeConsultationAppointment, setActiveConsultationAppointment] = useState<Appointment | null>(null);
  const [searchQueue, setSearchQueue] = useState('');
  const [viewingConsultation, setViewingConsultation] = useState<MedicalConsultation | null>(null);

  // Filtrar fila de pacientes do dia (Agendados / Triados aguardando consulta)
  const queueAppointments = useMemo(() => {
    return appointments.filter(a => a.status === 'Agendado' || a.status === 'Aguardando Regulação')
      .filter(a => {
        if (!searchQueue.trim()) return true;
        const q = searchQueue.toLowerCase();
        return (
          a.patient_name.toLowerCase().includes(q) ||
          a.patient_cpf.includes(q) ||
          a.patient_sus.includes(q)
        );
      })
      .sort((a, b) => {
        const pA = calculatePriority(a).level;
        const pB = calculatePriority(b).level;
        return pA - pB;
      });
  }, [appointments, searchQueue]);

  // Consultas realizadas hoje pelo médico selecionado
  const todayStr = new Date().toISOString().split('T')[0];
  const finishedToday = useMemo(() => {
    return consultations.filter(c => c.consultation_date === todayStr);
  }, [consultations, todayStr]);

  // Paciente selecionado para consulta
  const activePatient = useMemo(() => {
    if (!activeConsultationAppointment) return null;
    return patients.find(p => 
      (p.cpf && p.cpf === activeConsultationAppointment.patient_cpf) ||
      (p.sus_number && p.sus_number === activeConsultationAppointment.patient_sus) ||
      (p.id && p.id === activeConsultationAppointment.patient_id)
    ) || null;
  }, [patients, activeConsultationAppointment]);

  // Chamar paciente
  const handleCallPatient = (apt: Appointment) => {
    setActiveConsultationAppointment(apt);
    showToast(`Chamando paciente ${apt.patient_name} para o consultório...`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior do Consultório: Seleção do Médico & Unidade */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md">
            <Stethoscope size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Consultório Médico Digital
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Ativo
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Prontuário Eletrônico do Paciente (PEP), Registro Clínico e Prescrição Integrada à Farmácia
            </p>
          </div>
        </div>

        {/* Seletores de Médico e UBS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <User size={15} className="text-indigo-600" />
            <select
              value={selectedProfessionalId}
              onChange={e => setSelectedProfessionalId(e.target.value)}
              className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
            >
              {professionals.length > 0 ? (
                professionals.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-neutral-800">
                    {p.name} ({p.crm_coren || p.specialty})
                  </option>
                ))
              ) : (
                <option value="demo-doctor" className="dark:bg-neutral-800">
                  Dr. Roberto Carlos (CRM-MT 12458)
                </option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <Building2 size={15} className="text-indigo-600" />
            <select
              value={selectedUnitId}
              onChange={e => setSelectedUnitId(e.target.value)}
              className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer max-w-[200px] truncate"
            >
              {units.length > 0 ? (
                units.map(u => (
                  <option key={u.id} value={u.id} className="dark:bg-neutral-800">
                    {u.name}
                  </option>
                ))
              ) : (
                <option value="default-unit" className="dark:bg-neutral-800">
                  UBS Central Municipal Dr. Arnaldo
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo do Plantão Médico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 block uppercase">Fila de Espera Hoje</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">{queueAppointments.length}</span>
            <span className="text-[11px] text-indigo-600 block mt-0.5">Aguardando atendimento</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 block uppercase">Atendimentos Concluídos</span>
            <span className="text-2xl font-black text-emerald-600">{finishedToday.length}</span>
            <span className="text-[11px] text-neutral-500 block mt-0.5">Realizados hoje no plantão</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 block uppercase">Receitas Digitais Emitidas</span>
            <span className="text-2xl font-black text-violet-600">
              {finishedToday.filter(c => c.prescription).length}
            </span>
            <span className="text-[11px] text-neutral-500 block mt-0.5">Conectadas à Farmácia Municipal</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
            <Pill size={20} />
          </div>
        </div>
      </div>

      {/* Grid Principal: Fila de Espera do Médico + Histórico do Dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fila de Pacientes (2 colunas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <User size={18} className="text-indigo-600" />
                  <span>Fila de Pacientes para Atendimento</span>
                </h3>
                <p className="text-xs text-neutral-500">
                  Pacientes triados e agendados para atendimento médico no dia
                </p>
              </div>

              {/* Busca na Fila */}
              <div className="relative min-w-[240px]">
                <Search size={15} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou SUS..."
                  value={searchQueue}
                  onChange={e => setSearchQueue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {queueAppointments.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-sm text-neutral-700 dark:text-neutral-300">Nenhum paciente aguardando na fila!</p>
                <p className="text-xs text-neutral-400 mt-1">Todos os agendamentos do período foram atendidos ou não há novos agendamentos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queueAppointments.map((apt, index) => {
                  const priority = calculatePriority(apt);
                  const patData = patients.find(p => p.cpf === apt.patient_cpf);

                  return (
                    <div
                      key={apt.id}
                      className="p-4 bg-neutral-50 dark:bg-neutral-850/80 rounded-2xl border border-neutral-200/80 dark:border-neutral-750 flex flex-wrap items-center justify-between gap-3 hover:border-indigo-500/50 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-indigo-600 shadow-sm border border-neutral-100 dark:border-neutral-700">
                          #{index + 1}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-neutral-900 dark:text-white">
                              {apt.patient_name}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.color}`}>
                              {priority.label}
                            </span>
                            {patData?.allergies && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                Alérgico
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-3 flex-wrap">
                            <span>CPF: {formatCPF(apt.patient_cpf)}</span>
                            <span>SUS: {formatSUS(apt.patient_sus)}</span>
                            <span>Idade: {getAge(apt.patient_birth_date)} anos</span>
                            {apt.appointment_time && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                Horário: {apt.appointment_time}
                              </span>
                            )}
                          </div>

                          {apt.referral_details && (
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                              Motivo/Triagem: {apt.referral_details}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCallPatient(apt)}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
                        >
                          <Volume2 size={15} />
                          <span>Chamar Paciente</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Atendimentos Concluídos no Plantão (1 coluna) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>Atendimentos de Hoje ({finishedToday.length})</span>
            </h3>

            {finishedToday.length === 0 ? (
              <p className="text-xs text-neutral-400 p-4 text-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
                Nenhuma consulta finalizada hoje até o momento.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {finishedToday.map(c => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-neutral-900 dark:text-white truncate max-w-[170px]">
                        {c.patient_name}
                      </span>
                      <span className="text-neutral-400 text-[10px]">
                        {c.consultation_time || 'Hoje'}
                      </span>
                    </div>

                    {c.diagnosis_hypothesis && (
                      <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                        <strong>Dx:</strong> {c.diagnosis_hypothesis} {c.cid10 ? `(${c.cid10})` : ''}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                      {c.prescription && (
                        <button
                          onClick={() => {
                            printMedicalPrescription({
                              prescription: c.prescription!,
                              institutionName: currentInstitution?.name,
                              unitName: activeUnitName
                            });
                          }}
                          className="px-2 py-1 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-violet-200"
                          title="Reimprimir Receita Médica"
                        >
                          <Printer size={12} />
                          <span>Receita ({c.prescription.items.length})</span>
                        </button>
                      )}

                      {c.certificate && (
                        <button
                          onClick={() => {
                            printMedicalCertificate({
                              certificate: c.certificate!,
                              institutionName: currentInstitution?.name,
                              unitName: activeUnitName
                            });
                          }}
                          className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-200"
                          title="Reimprimir Atestado"
                        >
                          <Printer size={12} />
                          <span>Atestado ({c.certificate.days_off}d)</span>
                        </button>
                      )}

                      {c.exam_requests && c.exam_requests.length > 0 && (
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-lg text-[10px] font-bold">
                          {c.exam_requests.length} Exames
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Consulta Médica (PEP / SOAP / Prescrição) */}
      {activeConsultationAppointment && (
        <MedicalConsultationModal
          isOpen={true}
          onClose={() => setActiveConsultationAppointment(null)}
          appointment={activeConsultationAppointment}
          patient={activePatient}
          doctor={activeDoctor}
          consultationsHistory={consultations.filter(c => 
            (c.patient_cpf && c.patient_cpf === activeConsultationAppointment.patient_cpf) ||
            (c.patient_id && c.patient_id === activeConsultationAppointment.patient_id)
          )}
          examsHistory={examRequests.filter(e =>
            (e.patient_cpf && e.patient_cpf === activeConsultationAppointment.patient_cpf) ||
            (e.patient_id && e.patient_id === activeConsultationAppointment.patient_id)
          )}
          dispensationsHistory={dispensations.filter(d =>
            (d.patient_cpf && d.patient_cpf === activeConsultationAppointment.patient_cpf) ||
            (d.patient_id && d.patient_id === activeConsultationAppointment.patient_id)
          )}
          availableMedications={medications}
          availableExamTypes={examTypes}
          unitName={activeUnitName}
          institutionName={currentInstitution?.name || 'Prefeitura Municipal'}
          onFinishConsultation={async (consultation, newExams, prescription) => {
            await onSaveConsultation(consultation, newExams, prescription);
            setActiveConsultationAppointment(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
