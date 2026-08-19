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
  'Unidade de Saúde da Família (USF) Rural'
];

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
