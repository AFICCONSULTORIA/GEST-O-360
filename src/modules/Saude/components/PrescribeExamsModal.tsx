import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Activity, AlertTriangle, CheckCircle, Plus, Trash2, 
  Printer, Stethoscope, User, Building2, Clock, ShieldAlert,
  FileText, Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  Patient, HealthUnit, HealthProfessional, ExamRequest, ExamCategory, ExamType,
  checkExamDuplicity, DuplicityCheckResult, generateUUID, getAge
} from '../types';
import { printPrescriptionExamRequisition } from '../utils/printReceipt';
import { ManageExamTypesModal } from './ManageExamTypesModal';

interface PrescribeExamsModalProps {
  patient: Patient;
  units: HealthUnit[];
  professionals: HealthProfessional[];
  allExamRequests: ExamRequest[];
  examTypes?: ExamType[];
  currentInstitution?: { id: string; name?: string } | null;
  onClose: () => void;
  onSuccess: (newRequests: ExamRequest[]) => void;
}

interface SelectedExamItem {
  id: string;
  name: string;
  category: ExamCategory;
  minIntervalDays?: number;
  notes?: string;
  duplicityResult?: DuplicityCheckResult;
  overrideDuplicate?: boolean;
  overrideReason?: string;
}

const COMMON_SUS_EXAMS: Array<{ name: string; category: ExamCategory; minIntervalDays: number }> = [
  { name: 'Hemograma Completo', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'Glicemia de Jejum', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'Lipidograma Completo (Colesterol e Triglicerídeos)', category: 'Laboratorial', minIntervalDays: 60 },
  { name: 'Urina Tipo I (EAS) e Urocultura', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'Ureia e Creatinina (Função Renal)', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'TSH e T4 Livre (Tireoide)', category: 'Laboratorial', minIntervalDays: 60 },
  { name: 'Hemoglobina Glicada (HbA1c)', category: 'Laboratorial', minIntervalDays: 60 },
  { name: 'Ácido Úrico', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'Parasitológico de Fezes (EPF)', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'Raio-X de Tórax (PA e Perfil)', category: 'Imagem', minIntervalDays: 30 },
  { name: 'Eletrocardiograma (ECG)', category: 'Cardiológico', minIntervalDays: 30 },
  { name: 'Ultrassonografia de Abdome Total', category: 'Imagem', minIntervalDays: 60 },
  { name: 'Sorologias (HIV, Sífilis, Hepatites B e C)', category: 'Laboratorial', minIntervalDays: 30 },
  { name: 'Mamografia Bilateral', category: 'Imagem', minIntervalDays: 180 }
];

export const PrescribeExamsModal: React.FC<PrescribeExamsModalProps> = ({
  patient,
  units,
  professionals,
  allExamRequests,
  examTypes = [],
  currentInstitution,
  onClose,
  onSuccess
}) => {
  // Pré-selecionar médico caso haja médicos na lista
  const doctorsList = useMemo(() => {
    return professionals.filter(p => 
      !p.role || p.role.toLowerCase().includes('médic') || p.role.toLowerCase().includes('medic') ||
      p.council_number?.toUpperCase().includes('CRM') || professionals.length <= 5
    );
  }, [professionals]);

  const defaultDoctor = doctorsList[0] || professionals[0];
  const defaultUnit = units[0]?.name || 'UBS Central de Saúde';

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(defaultDoctor?.id || '');
  const [doctorName, setDoctorName] = useState<string>(defaultDoctor?.name || '');
  const [doctorCrm, setDoctorCrm] = useState<string>(defaultDoctor?.council_number || '');
  const [requestingUnit, setRequestingUnit] = useState<string>(defaultUnit);

  // Lista de exames selecionados
  const [selectedExams, setSelectedExams] = useState<SelectedExamItem[]>([]);
  
  // Custom exam input com carência e opção de salvar no catálogo
  const [customExamName, setCustomExamName] = useState('');
  const [customExamCategory, setCustomExamCategory] = useState<ExamCategory>('Laboratorial');
  const [customExamInterval, setCustomExamInterval] = useState<number>(30);
  const [saveToCatalog, setSaveToCatalog] = useState<boolean>(true);

  // Catálogo interno sincronizado
  const [internalExamTypes, setInternalExamTypes] = useState<ExamType[]>(examTypes);
  const [isManageCatalogOpen, setIsManageCatalogOpen] = useState(false);

  React.useEffect(() => {
    setInternalExamTypes(examTypes);
  }, [examTypes]);

  // Montar lista de procedimentos unificada
  const resolvedCatalog = useMemo(() => {
    const list: Array<{ name: string; category: ExamCategory; minIntervalDays: number }> = [];
    const seen = new Set<string>();

    if (internalExamTypes && internalExamTypes.length > 0) {
      for (const t of internalExamTypes) {
        const key = t.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            name: t.name,
            category: t.category,
            minIntervalDays: t.min_interval_days || 30
          });
        }
      }
    }

    for (const c of COMMON_SUS_EXAMS) {
      const key = c.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: c.name,
          category: c.category,
          minIntervalDays: c.minIntervalDays || 30
        });
      }
    }

    return list;
  }, [internalExamTypes]);

  const getExamMinInterval = (name: string): number => {
    const found = resolvedCatalog.find(e => e.name.toLowerCase().trim() === name.toLowerCase().trim());
    return found?.minIntervalDays || 30;
  };

  // Dados clínicos
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [generalInstructions, setGeneralInstructions] = useState('');

  // Estados de envio
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Atualizar dados do médico selecionado
  const handleSelectDoctor = (profId: string) => {
    setSelectedDoctorId(profId);
    const prof = professionals.find(p => p.id === profId);
    if (prof) {
      setDoctorName(prof.name);
      setDoctorCrm(prof.council_number || '');
    }
  };

  // Toggle ou Adicionar exame
  const handleToggleExam = (name: string, category: ExamCategory, customInterval?: number) => {
    const existingIndex = selectedExams.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      setSelectedExams(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      const interval = customInterval || getExamMinInterval(name);
      const dup = checkExamDuplicity(patient.cpf, name, allExamRequests, new Date().toISOString().split('T')[0], interval);
      setSelectedExams(prev => [
        ...prev,
        {
          id: generateUUID(),
          name,
          category,
          minIntervalDays: interval,
          duplicityResult: dup,
          overrideDuplicate: false,
          overrideReason: ''
        }
      ]);
    }
  };

  // Adicionar exame avulso/personalizado
  const handleAddCustomExam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customExamName.trim();
    if (!trimmed) return;

    if (selectedExams.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomExamName('');
      return;
    }

    const interval = customExamInterval > 0 ? customExamInterval : 30;
    const dup = checkExamDuplicity(patient.cpf, trimmed, allExamRequests, new Date().toISOString().split('T')[0], interval);

    setSelectedExams(prev => [
      ...prev,
      {
        id: generateUUID(),
        name: trimmed,
        category: customExamCategory,
        minIntervalDays: interval,
        duplicityResult: dup,
        overrideDuplicate: false,
        overrideReason: ''
      }
    ]);

    // Se marcado para salvar no catálogo permanente do município
    if (saveToCatalog) {
      const newType: ExamType = {
        id: generateUUID(),
        name: trimmed,
        category: customExamCategory,
        min_interval_days: interval,
        institution_id: currentInstitution?.id || null,
        is_active: true
      };

      try {
        await supabase.from('exam_types').insert([newType]);
      } catch (err) {
        console.warn('Erro ao persistir no Supabase, mantendo local:', err);
      }

      try {
        const rawLocal = localStorage.getItem('gestao360_custom_exam_types');
        const localList: ExamType[] = rawLocal ? JSON.parse(rawLocal) : [];
        if (!localList.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
          localList.push(newType);
          localStorage.setItem('gestao360_custom_exam_types', JSON.stringify(localList));
        }
      } catch (err) {
        console.error(err);
      }

      setInternalExamTypes(prev => [...prev, newType]);
      showToast(`Exame "${trimmed}" registrado no catálogo com carência de ${interval} dias!`, 'success');
    }

    setCustomExamName('');
  };

  // Remover exame
  const handleRemoveExam = (id: string) => {
    setSelectedExams(prev => prev.filter(e => e.id !== id));
  };

  // Atualizar liberação de duplicidade
  const handleToggleOverride = (id: string, override: boolean, reason?: string) => {
    setSelectedExams(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          overrideDuplicate: override,
          overrideReason: reason !== undefined ? reason : item.overrideReason
        };
      }
      return item;
    }));
  };

  // Salvar prescrição médica
  const handleSubmit = async (andPrint: boolean = false) => {
    setFeedbackError('');

    if (selectedExams.length === 0) {
      setFeedbackError('Selecione pelo menos um exame para gerar a prescrição.');
      return;
    }

    if (!doctorName.trim()) {
      setFeedbackError('Por favor, informe o nome do médico solicitante.');
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const createdRequests: ExamRequest[] = [];

      for (const item of selectedExams) {
        const isDuplicate = item.duplicityResult?.isDuplicate || false;
        const status = isDuplicate && !item.overrideDuplicate ? 'Bloqueado por Duplicidade' : 'Solicitado';

        const newRequestData: Partial<ExamRequest> = {
          institution_id: currentInstitution?.id || null,
          patient_id: patient.id || null,
          patient_name: patient.name,
          patient_cpf: patient.cpf,
          patient_sus: patient.sus_number,
          patient_phone: patient.phone,
          patient_birth_date: patient.birth_date,
          exam_name: item.name,
          category: item.category,
          doctor_name: doctorName.trim(),
          doctor_crm: doctorCrm.trim() || undefined,
          requesting_unit: requestingUnit,
          requested_date: today,
          status,
          clinical_indication: clinicalIndication.trim() || undefined,
          is_urgent: isUrgent,
          is_duplicate_warning: isDuplicate,
          is_duplicate_override: item.overrideDuplicate || false,
          duplicate_override_reason: item.overrideDuplicate ? (item.overrideReason || 'Liberação médica sob conduta clínica') : undefined,
          last_exam_date: item.duplicityResult?.lastExam?.performed_date || item.duplicityResult?.lastExam?.requested_date || null,
          days_since_last_exam: item.duplicityResult?.daysSince !== 999 ? item.duplicityResult?.daysSince : null,
          notes: generalInstructions.trim() || undefined
        };

        const { data, error } = await supabase
          .from('exam_requests')
          .insert([newRequestData])
          .select()
          .single();

        if (error) {
          console.warn('Erro ao inserir exame no Supabase, gerando registro local:', error);
          createdRequests.push({
            id: generateUUID(),
            created_at: new Date().toISOString(),
            ...newRequestData
          } as ExamRequest);
        } else if (data) {
          createdRequests.push(data as ExamRequest);
        }
      }

      // Se solicitado impressão imediata da guia consolidada
      if (andPrint) {
        printPrescriptionExamRequisition({
          patient: {
            name: patient.name,
            cpf: patient.cpf,
            sus_number: patient.sus_number,
            birth_date: patient.birth_date,
            phone: patient.phone
          },
          exams: selectedExams.map(ex => ({
            name: ex.name,
            category: ex.category,
            notes: ex.overrideDuplicate ? 'Liberação excepcional médica' : undefined
          })),
          doctorName: doctorName.trim(),
          doctorCrm: doctorCrm.trim() || undefined,
          clinicalIndication: clinicalIndication.trim() || undefined,
          isUrgent,
          requestingUnit,
          institutionName: currentInstitution?.name || 'Prefeitura Municipal'
        });
      }

      onSuccess(createdRequests);
    } catch (err: any) {
      console.error('Erro ao salvar prescrição de exames:', err);
      setFeedbackError('Ocorreu um erro ao registrar os exames. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientAge = patient.birth_date ? getAge(patient.birth_date) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Prescrição Médica de Exames</h2>
              <p className="text-xs text-blue-100/90">Solicitação clínica rápida vinculada à ficha do paciente</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com rolagem suave */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-neutral-800 dark:text-neutral-200">
          
          {/* Cartão de Identificação do Paciente */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                <User size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 block">Paciente em Atendimento</span>
                <h3 className="font-black text-sm text-neutral-900 dark:text-white">{patient.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  CPF: {patient.cpf} · CNS/SUS: {patient.sus_number || 'Não informado'} {patientAge !== null ? `· ${patientAge} anos` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-3 py-1 bg-white dark:bg-neutral-800 rounded-full border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                Prontuário Ativo
              </span>
            </div>
          </div>

          {/* Dados do Médico e Unidade Solicitante */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Stethoscope size={14} className="text-blue-600" /> Médico(a) Solicitante *
              </label>
              {doctorsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedDoctorId}
                    onChange={e => handleSelectDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Selecione ou digite manualmente --</option>
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} {doc.council_number ? `(${doc.council_number})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={doctorCrm}
                    onChange={e => setDoctorCrm(e.target.value)}
                    placeholder="CRM (ex: CRM 12345/SP)"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    placeholder="Nome do Médico Solicitante"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={doctorCrm}
                    onChange={e => setDoctorCrm(e.target.value)}
                    placeholder="CRM / Registro Profissional"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600" /> Unidade Solicitante
              </label>
              <select
                value={requestingUnit}
                onChange={e => setRequestingUnit(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {units.length > 0 ? (
                  units.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))
                ) : (
                  <option value="UBS Central de Saúde">UBS Central de Saúde</option>
                )}
              </select>
            </div>
          </div>

          {/* Seleção Rápida de Procedimentos do Catálogo & SUS (Chips) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <Activity size={14} className="text-blue-600" /> Catálogo de Procedimentos (Clique para marcar)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageCatalogOpen(true)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  title="Configurar carências e procedimentos"
                >
                  <ShieldAlert size={12} /> Ajustar Carências
                </button>
                <span className="text-[11px] text-neutral-400 font-medium">
                  {selectedExams.length} marcado{selectedExams.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {resolvedCatalog.map(item => {
                const isSelected = selectedExams.some(e => e.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleToggleExam(item.name, item.category, item.minIntervalDays)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                    }`}
                    title={`Prazo de carência: ${item.minIntervalDays} dias`}
                  >
                    {isSelected ? <CheckCircle size={13} className="text-white" /> : <Plus size={13} />}
                    <span>{item.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-neutral-200/80 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {item.minIntervalDays}d
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adicionar Outro Exame / Busca com Prazo de Carência */}
          <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Plus size={14} className="text-blue-600" /> Cadastrar Outro Exame & Definir Prazo de Carência
              </label>
              <button
                type="button"
                onClick={() => setIsManageCatalogOpen(true)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert size={12} /> Ver Todos os Prazos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={customExamName}
                onChange={e => setCustomExamName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomExam(); } }}
                placeholder="Ex: Ecocardiograma, PSA Total, Citopatológico..."
                className="sm:col-span-6 px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <select
                value={customExamCategory}
                onChange={e => setCustomExamCategory(e.target.value as ExamCategory)}
                className="sm:col-span-3 px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Laboratorial">Laboratorial</option>
                <option value="Imagem">Imagem</option>
                <option value="Cardiológico">Cardiológico</option>
                <option value="Endoscópico">Endoscópico</option>
                <option value="Ginecológico">Ginecológico</option>
                <option value="Outros">Outros</option>
              </select>

              <div className="sm:col-span-3 flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <Clock size={13} className="text-amber-500 shrink-0" />
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customExamInterval}
                  onChange={e => setCustomExamInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  title="Carência em dias (Anti-Duplicidade)"
                  placeholder="30"
                  className="w-full text-xs font-bold text-neutral-800 dark:text-white bg-transparent outline-none"
                />
                <span className="text-[10px] text-neutral-400 font-bold shrink-0">dias</span>
              </div>
            </div>

            {/* Presets rápidos de carência & Salvar no Catálogo */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-neutral-400 font-bold">Carência rápida:</span>
                {[15, 30, 60, 90, 180, 365].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setCustomExamInterval(days)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      customExamInterval === days
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-amber-400'
                    }`}
                  >
                    {days === 365 ? '1 ano' : `${days}d`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToCatalog}
                    onChange={e => setSaveToCatalog(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
                  />
                  Salvar no catálogo do município
                </label>

                <button
                  type="button"
                  onClick={() => handleAddCustomExam()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Incluir
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Exames Selecionados na Prescrição com Alertas Anti-Duplicidade */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
              <span>Itens da Prescrição Médica ({selectedExams.length})</span>
              {selectedExams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedExams([])}
                  className="text-[11px] text-rose-500 hover:underline font-medium cursor-pointer"
                >
                  Limpar todos
                </button>
              )}
            </h4>

            {selectedExams.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 dark:text-neutral-500 text-xs italic bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                Nenhum exame selecionado ainda. Clique nos botões acima para incluir na prescrição.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedExams.map((item, idx) => {
                  const isDup = item.duplicityResult?.isDuplicate;
                  const lastDate = item.duplicityResult?.lastExam?.performed_date || item.duplicityResult?.lastExam?.requested_date;

                  return (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-2xl border text-xs transition-all ${
                        isDup && !item.overrideDuplicate
                          ? 'bg-amber-50 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800/70'
                          : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-black text-neutral-900 dark:text-white">{item.name}</span>
                            <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                              {item.category}
                            </span>
                            <span className="ml-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                              Carência: {item.minIntervalDays || 30}d
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExam(item.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Remover exame do pedido"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Alerta Anti-Duplicidade se houver realização recente */}
                      {isDup && (
                        <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-800/50 space-y-2">
                          <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300 text-[11px]">
                            <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-600" />
                            <span>
                              <strong>Aviso Anti-Duplicidade SUS:</strong> Este paciente realizou/solicitou este exame há{' '}
                              <strong>{item.duplicityResult?.daysSince} dia(s)</strong> em{' '}
                              {lastDate ? lastDate.split('-').reverse().join('/') : 'data recente'} (Prazo de carência configurado: <strong>{item.minIntervalDays || 30} dias</strong>).
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.overrideDuplicate || false}
                                onChange={e => handleToggleOverride(item.id, e.target.checked)}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
                              />
                              Liberar excepcionalmente sob conduta médica
                            </label>
                          </div>

                          {item.overrideDuplicate && (
                            <input
                              type="text"
                              value={item.overrideReason || ''}
                              onChange={e => handleToggleOverride(item.id, true, e.target.value)}
                              placeholder="Justificativa clínica para repetição (ex: alteração aguda de sintomas)"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 rounded-lg border border-amber-300 dark:border-amber-700 text-[11px] focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Indicação Clínica / Justificativa / CID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" /> Indicação Clínica / Hipótese Diagnóstica / CID-10
              </span>
              <span className="text-[11px] text-neutral-400 font-normal">Opcional para a central</span>
            </label>
            <textarea
              value={clinicalIndication}
              onChange={e => setClinicalIndication(e.target.value)}
              rows={2}
              placeholder="Ex: Investigação de astenia crônica, controle semestral de DM2 e HAS, rastreamento preventivo..."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Urgência Médica e Instruções */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <input
                type="checkbox"
                id="isUrgentExam"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-neutral-300 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="isUrgentExam" className="text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer flex items-center gap-1">
                🚨 Urgência Clínica Prioritária
                <span className="text-[10px] text-neutral-400 font-normal block">Priorizar na regulação</span>
              </label>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <input
                type="text"
                value={generalInstructions}
                onChange={e => setGeneralInstructions(e.target.value)}
                placeholder="Instruções de preparo (ex: jejum 12h)"
                className="w-full bg-transparent text-xs outline-none text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
              />
            </div>
          </div>

          {/* Mensagem de Erro / Validação */}
          {feedbackError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{feedbackError}</span>
            </div>
          )}

        </div>

        {/* Rodapé de Ações */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs text-neutral-500">
            Total a prescrever: <strong className="text-blue-600 font-black">{selectedExams.length}</strong> exame(s)
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSubmitting || selectedExams.length === 0}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2.5 text-xs font-bold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Gravando...' : 'Apenas Salvar'}
            </button>

            <button
              type="button"
              disabled={isSubmitting || selectedExams.length === 0}
              onClick={() => handleSubmit(true)}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer size={15} />
              {isSubmitting ? 'Processando...' : 'Salvar e Imprimir Guia'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal Secundário: Gerenciador de Catálogo de Exames e Carência */}
      <AnimatePresence>
        {isManageCatalogOpen && (
          <ManageExamTypesModal
            examTypes={internalExamTypes}
            currentInstitution={currentInstitution}
            onClose={() => setIsManageCatalogOpen(false)}
            onRefresh={async () => {
              try {
                const { data } = await supabase.from('exam_types').select('*').order('name');
                const rawLocal = localStorage.getItem('gestao360_custom_exam_types');
                const localList: ExamType[] = rawLocal ? JSON.parse(rawLocal) : [];
                const mergedMap = new Map<string, ExamType>();
                (data || []).forEach((t: ExamType) => mergedMap.set(t.name.toLowerCase().trim(), t));
                localList.forEach((t: ExamType) => {
                  if (!mergedMap.has(t.name.toLowerCase().trim())) mergedMap.set(t.name.toLowerCase().trim(), t);
                });
                setInternalExamTypes(Array.from(mergedMap.values()));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
