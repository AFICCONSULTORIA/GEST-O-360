export interface Patient {
  id: string;
  institution_id?: string | null;
  name: string;
  cpf: string;
  sus_number: string;
  birth_date: string;
  gender?: 'M' | 'F' | 'Outro';
  mother_name?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  ubs_reference?: string;
  blood_type?: string;
  allergies?: string;
  conditions?: string; // Hipertensão, Diabetes, etc.
  is_pregnant?: boolean;
  is_pcd?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HealthUnit {
  id: string;
  institution_id?: string | null;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
}

export interface HealthProfessional {
  id: string;
  institution_id?: string | null;
  unit_id?: string | null;
  name: string;
  specialty: string;
  crm_coren?: string;
  working_days?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Appointment {
  id: string;
  institution_id?: string | null;
  patient_id?: string | null;
  patient_name: string;
  patient_cpf: string;
  patient_sus: string;
  patient_phone?: string;
  patient_birth_date: string;
  is_pregnant: boolean;
  is_urgent: boolean;
  specialty: string;
  referral_details?: string;
  appointment_date: string;
  appointment_time?: string;
  unit_name?: string;
  doctor_name?: string;
  status: 'Aguardando Regulação' | 'Agendado' | 'Atendido' | 'Cancelado' | 'Faltou';
  queue_priority?: 'urgente' | '80+' | 'prioridade' | 'normal';
  triage_notes?: string;
  checked_in_at?: string;
  attended_at?: string;
  cancellation_reason?: string;
  whatsapp_sent?: boolean;
  notes?: string;
  created_at?: string;
}

// === TIPOS PARA CONTROLE DE EXAMES E ANTI-DUPLICIDADE ===

export type ExamCategory = 'Laboratorial' | 'Imagem' | 'Cardiológico' | 'Endoscópico' | 'Ginecológico' | 'Outros';

export interface ExamType {
  id: string;
  institution_id?: string | null;
  name: string;
  category: ExamCategory;
  min_interval_days: number; // Padrão: 30 dias (tempo mínimo entre repetições do mesmo exame)
  preparation_instructions?: string; // Ex: Jejum de 8h, bexiga cheia, etc.
  estimated_cost?: number; // Custo de referência para cálculo de economia evitada
  is_active: boolean;
  created_at?: string;
}

export type ExamStatus = 'Solicitado' | 'Aprovado' | 'Agendado' | 'Realizado' | 'Cancelado' | 'Bloqueado por Duplicidade';

export interface ExamRequest {
  id: string;
  institution_id?: string | null;
  patient_id?: string | null;
  patient_name: string;
  patient_cpf: string;
  patient_sus: string;
  patient_phone?: string;
  patient_birth_date?: string;
  exam_type_id?: string;
  exam_name: string;
  category: ExamCategory;
  doctor_name: string; // Médico que prescreveu
  doctor_crm?: string; // CRM do médico solicitante
  requesting_unit?: string; // UBS que solicitou
  executing_unit?: string; // Laboratório/Clínica ou Policlínica que vai realizar
  requested_date: string; // Data da prescrição médica
  scheduled_date?: string; // Data agendada
  performed_date?: string; // Data em que o exame foi efetivamente realizado
  status: ExamStatus;
  clinical_indication?: string; // Justificativa / CID / Hipótese diagnóstica
  is_urgent?: boolean;
  // Campos de Controle Anti-Duplicidade
  is_duplicate_warning?: boolean;
  is_duplicate_override?: boolean; // Liberado mesmo após aviso de duplicidade <30 dias
  duplicate_override_reason?: string; // Justificativa médica da liberação excepcional
  last_exam_date?: string | null;
  days_since_last_exam?: number | null;
  result_notes?: string; // Resumo do laudo / entrega de resultado
  notes?: string;
  created_at?: string;
}

// === TIPOS PARA DISPENSAÇÃO DA FARMÁCIA POPULAR / MUNICIPAL ===

export interface MedicationDispensation {
  id: string;
  institution_id?: string | null;
  patient_id?: string | null;
  patient_name: string;
  patient_cpf: string;
  patient_sus: string;
  patient_phone?: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  form: string;
  batch_number?: string;
  quantity_dispensed: number;
  days_of_treatment: number; // Quantidade de dias cobertos pela retirada (ex: 30 dias)
  next_allowed_dispensation_date: string; // Data a partir da qual pode retirar novamente
  doctor_name?: string; // Médico que prescreveu
  doctor_crm?: string;
  prescription_number?: string;
  prescription_date?: string;
  dispensing_unit?: string; // UBS / Farmácia Central
  pharmacist_name?: string; // Atendente/Farmacêutico responsável
  notes?: string;
  created_at?: string;
}

// === CONSTANTES E CATÁLOGOS PADRÃO ===

export const COMMON_EXAM_CATEGORIES: ExamCategory[] = [
  'Laboratorial',
  'Imagem',
  'Cardiológico',
  'Endoscópico',
  'Ginecológico',
  'Outros'
];

export const DEFAULT_EXAM_TYPES: Array<Omit<ExamType, 'id'>> = [
  {
    name: 'Hemograma Completo',
    category: 'Laboratorial',
    min_interval_days: 30,
    preparation_instructions: 'Jejum obrigatório de 4 horas. Evitar esforço físico antes da coleta.',
    estimated_cost: 15.00,
    is_active: true
  },
  {
    name: 'Glicemia de Jejum',
    category: 'Laboratorial',
    min_interval_days: 30,
    preparation_instructions: 'Jejum de 8 a 12 horas. Ingestão moderada de água permitida.',
    estimated_cost: 8.50,
    is_active: true
  },
  {
    name: 'Lipidograma Completo (Colesterol e Triglicerídeos)',
    category: 'Laboratorial',
    min_interval_days: 60,
    preparation_instructions: 'Jejum de 12 horas. Evitar bebidas alcoólicas 3 dias antes.',
    estimated_cost: 25.00,
    is_active: true
  },
  {
    name: 'Ureia e Creatinina (Função Renal)',
    category: 'Laboratorial',
    min_interval_days: 30,
    preparation_instructions: 'Jejum de 4 horas.',
    estimated_cost: 18.00,
    is_active: true
  },
  {
    name: 'TSH e T4 Livre (Tireoide)',
    category: 'Laboratorial',
    min_interval_days: 60,
    preparation_instructions: 'Jejum de 4 horas. Tomar medicamentos de tireoide apenas após a coleta.',
    estimated_cost: 32.00,
    is_active: true
  },
  {
    name: 'Urina Tipo I (EAS) e Urocultura',
    category: 'Laboratorial',
    min_interval_days: 30,
    preparation_instructions: 'Coletar primeira urina da manhã (jato médio) após higiene íntima.',
    estimated_cost: 16.00,
    is_active: true
  },
  {
    name: 'Ultrassonografia Abdominal Total',
    category: 'Imagem',
    min_interval_days: 60,
    preparation_instructions: 'Jejum de 6 horas e retenção urinária (bexiga cheia).',
    estimated_cost: 95.00,
    is_active: true
  },
  {
    name: 'Ultrassonografia Transvaginal / Pélvica',
    category: 'Imagem',
    min_interval_days: 60,
    preparation_instructions: 'Bexiga vazia para transvaginal; bexiga cheia para via pélvica abdominal.',
    estimated_cost: 90.00,
    is_active: true
  },
  {
    name: 'Raio-X de Tórax (PA e Perfil)',
    category: 'Imagem',
    min_interval_days: 30,
    preparation_instructions: 'Retirar correntes, colares e objetos metálicos da região do tórax.',
    estimated_cost: 45.00,
    is_active: true
  },
  {
    name: 'Eletrocardiograma (ECG)',
    category: 'Cardiológico',
    min_interval_days: 30,
    preparation_instructions: 'Evitar cremes e loções no peito no dia do exame.',
    estimated_cost: 35.00,
    is_active: true
  },
  {
    name: 'Ecocardiograma Transtorácico com Doppler',
    category: 'Cardiológico',
    min_interval_days: 90,
    preparation_instructions: 'Não necessita jejum. Trazer exames anteriores.',
    estimated_cost: 160.00,
    is_active: true
  },
  {
    name: 'Mamografia Digital Bilateral',
    category: 'Ginecológico',
    min_interval_days: 180, // Rastreamento semestral/anual
    preparation_instructions: 'Não usar desodorante, talco ou cremes nas axilas e mamas no dia do exame.',
    estimated_cost: 110.00,
    is_active: true
  },
  {
    name: 'Preventivo do Câncer de Colo Uterino (Papanicolau)',
    category: 'Ginecológico',
    min_interval_days: 180,
    preparation_instructions: 'Evitar relações sexuais e duchas vaginais 48 horas antes.',
    estimated_cost: 30.00,
    is_active: true
  },
  {
    name: 'Endoscopia Digestiva Alta',
    category: 'Endoscópico',
    min_interval_days: 90,
    preparation_instructions: 'Jejum absoluto de 8 horas. Necessário vir acompanhado.',
    estimated_cost: 210.00,
    is_active: true
  },
  {
    name: 'Tomografia Computadorizada (Crânio / Tórax / Abdômen)',
    category: 'Imagem',
    min_interval_days: 90,
    preparation_instructions: 'Jejum de 4 horas se houver uso de contraste iodado.',
    estimated_cost: 280.00,
    is_active: true
  }
];

export const COMMON_SPECIALTIES = [
  'Clínico Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Odontologia',
  'Fisioterapia',
  'Ortopedia',
  'Psicologia',
  'Cardiologia',
  'Dermatologia',
  'Oftalmologia',
  'Nutrição',
  'Fonoaudiologia',
  'Enfermagem'
];

export const DEFAULT_HEALTH_UNITS = [
  'UBS Central',
  'UBS Vila Nova',
  'UBS Bairro São José',
  'UBS Jardim Primavera',
  'Centro de Especialidades Médicas (CEM)',
  'Policlínica Municipal',
  'Unidade de Saúde da Família (USF) Rural',
  'Laboratório Central Municipal',
  'Farmácia Popular Municipal'
];

// === FUNÇÕES UTILITÁRIAS DE FORMATAÇÃO E CÁLCULO ===

export const formatCPF = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1-$2');
  return v;
};

export const formatSUS = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 15);
  v = v.replace(/(\d{3})(\d)/, '$1 $2');
  v = v.replace(/(\d{4})(\d)/, '$1 $2');
  v = v.replace(/(\d{4})(\d)/, '$1 $2');
  return v;
};

export const formatPhone = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 5) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else {
    v = v.replace(/^(\d*)/, '($1');
  }
  return v;
};

// === LGPD: MASCARAMENTO SEGURO DE DADOS PESSOAIS E SENSÍVEIS ===

export const maskCPF = (cpf?: string | null): string => {
  if (!cpf) return '***.***.***-**';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length < 11) return '***.***.***-**';
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
};

export const maskSUS = (sus?: string | null): string => {
  if (!sus) return '*** **** **** ****';
  const clean = sus.replace(/\D/g, '');
  if (clean.length < 15) return '*** **** **** ****';
  return `*** **** **** ${clean.substring(11)}`;
};

export const maskPhone = (phone?: string | null): string => {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) 9****-${clean.substring(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ****-${clean.substring(6)}`;
  }
  return '(**) *****-****';
};

export const maskName = (name?: string | null): string => {
  if (!name) return 'Munícipe';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initials = parts.slice(1, -1).map(p => `${p.charAt(0).toUpperCase()}.`).join(' ');
  return `${first} ${initials ? initials + ' ' : ''}${last}`;
};

export interface CitizenSession {
  patient: Patient;
  authenticatedAt: string;
}


export const getAge = (birthDate?: string) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return isNaN(age) ? 0 : age;
};

export const calculatePriority = (apt: { is_urgent?: boolean; patient_birth_date?: string; is_pregnant?: boolean }) => {
  if (apt.is_urgent) return { level: -1, label: 'Urgência Médica', color: 'red' };
  const age = getAge(apt.patient_birth_date);
  if (age >= 80) return { level: 0, label: 'Prioridade Especial 80+', color: 'purple' };
  if (age >= 60 || apt.is_pregnant) return { level: 1, label: apt.is_pregnant ? 'Gestante (Prioritária)' : 'Prioridade 60+', color: 'amber' };
  return { level: 2, label: 'Fila Geral (Cronológica)', color: 'emerald' };
};

// === MOTOR DE VALIDAÇÃO ANTI-DUPLICIDADE DE EXAMES ===

export interface DuplicityCheckResult {
  isDuplicate: boolean;
  daysSince: number;
  minInterval: number;
  lastExam: ExamRequest | null;
  message: string;
}

export const checkExamDuplicity = (
  patientCpf: string,
  examName: string,
  allRequests: ExamRequest[],
  targetDate: string = new Date().toISOString().split('T')[0],
  minIntervalDays: number = 30
): DuplicityCheckResult => {
  const cleanCpf = patientCpf.replace(/\D/g, '');
  if (!cleanCpf || !examName) {
    return { isDuplicate: false, daysSince: 999, minInterval: minIntervalDays, lastExam: null, message: '' };
  }

  // Filtrar exames anteriores do mesmo paciente para o mesmo tipo de exame que não foram cancelados
  const normalizedExam = examName.trim().toLowerCase();
  const patientExams = allRequests.filter(req => {
    const reqCleanCpf = (req.patient_cpf || '').replace(/\D/g, '');
    const isSamePatient = reqCleanCpf === cleanCpf;
    const isSameExam = req.exam_name.trim().toLowerCase() === normalizedExam;
    const isValidStatus = req.status !== 'Cancelado' && req.status !== 'Bloqueado por Duplicidade';
    return isSamePatient && isSameExam && isValidStatus;
  });

  if (patientExams.length === 0) {
    return { isDuplicate: false, daysSince: 999, minInterval: minIntervalDays, lastExam: null, message: '' };
  }

  // Encontrar o exame mais recente (pela data de realização ou de solicitação)
  const sorted = [...patientExams].sort((a, b) => {
    const dateA = new Date(a.performed_date || a.requested_date || a.created_at || '').getTime();
    const dateB = new Date(b.performed_date || b.requested_date || b.created_at || '').getTime();
    return dateB - dateA;
  });

  const lastExam = sorted[0];
  const lastDateStr = lastExam.performed_date || lastExam.requested_date || (lastExam.created_at ? lastExam.created_at.split('T')[0] : targetDate);
  const lastDate = new Date(lastDateStr);
  const currentDate = new Date(targetDate);

  const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
  const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysSince < minIntervalDays) {
    const formattedLastDate = lastDateStr.split('-').reverse().join('/');
    return {
      isDuplicate: true,
      daysSince,
      minInterval: minIntervalDays,
      lastExam,
      message: `ALERTA DE DUPLICIDADE: Este paciente realizou/solicitou o exame "${examName}" há apenas ${daysSince} dia(s) (em ${formattedLastDate}, solicitado por ${lastExam.doctor_name || 'Médico da rede'}). O intervalo mínimo recomendado é de ${minIntervalDays} dias.`
    };
  }

  return { isDuplicate: false, daysSince, minInterval: minIntervalDays, lastExam, message: '' };
};

// === MOTOR DE VALIDAÇÃO DE RETIRADA ANTECIPADA NA FARMÁCIA ===

export interface EarlyRefillCheckResult {
  isEarly: boolean;
  daysSince: number;
  daysRemaining: number;
  lastDispensation: MedicationDispensation | null;
  message: string;
}

export const checkMedicationEarlyRefill = (
  patientCpf: string,
  medicationId: string,
  dispensations: MedicationDispensation[],
  currentDateStr: string = new Date().toISOString().split('T')[0]
): EarlyRefillCheckResult => {
  const cleanCpf = patientCpf.replace(/\D/g, '');
  if (!cleanCpf || !medicationId) {
    return { isEarly: false, daysSince: 999, daysRemaining: 0, lastDispensation: null, message: '' };
  }

  // Filtrar dispensações anteriores deste medicamento para este paciente
  const patientDisps = dispensations.filter(d => {
    const dCleanCpf = (d.patient_cpf || '').replace(/\D/g, '');
    return dCleanCpf === cleanCpf && d.medication_id === medicationId;
  });

  if (patientDisps.length === 0) {
    return { isEarly: false, daysSince: 999, daysRemaining: 0, lastDispensation: null, message: '' };
  }

  // Ordenar pela dispensação mais recente
  const sorted = [...patientDisps].sort((a, b) => {
    const dateA = new Date(a.created_at || a.prescription_date || '').getTime();
    const dateB = new Date(b.created_at || b.prescription_date || '').getTime();
    return dateB - dateA;
  });

  const lastDisp = sorted[0];
  const lastDispDateStr = lastDisp.created_at ? lastDisp.created_at.split('T')[0] : (lastDisp.prescription_date || currentDateStr);
  const lastDate = new Date(lastDispDateStr);
  const now = new Date(currentDateStr);

  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const treatmentDays = lastDisp.days_of_treatment || 30;
  const daysRemaining = treatmentDays - daysSince;

  if (daysRemaining > 0) {
    const formattedLastDate = lastDispDateStr.split('-').reverse().join('/');
    const nextAllowedDate = lastDisp.next_allowed_dispensation_date 
      ? lastDisp.next_allowed_dispensation_date.split('-').reverse().join('/')
      : new Date(lastDate.getTime() + treatmentDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

    return {
      isEarly: true,
      daysSince,
      daysRemaining,
      lastDispensation: lastDisp,
      message: `AVISO DE RETIRADA ANTECIPADA: O paciente já retirou ${lastDisp.quantity_dispensed} un. deste medicamento em ${formattedLastDate} (${daysSince} dias atrás) com prescrição para ${treatmentDays} dias. Nova retirada prevista apenas a partir de ${nextAllowedDate} (faltam ${daysRemaining} dias).`
    };
  }

  return { isEarly: false, daysSince, daysRemaining: 0, lastDispensation: lastDisp, message: '' };
};

// === GERADOR E VALIDADOR DE UUID SEGURO ===
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

