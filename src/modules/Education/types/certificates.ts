export type CertificateEventType = 'curso' | 'palestra' | 'formacao' | 'oficina' | string;

export function getActivityTypeLabel(type?: string | null): string {
  if (!type) return 'Curso';
  const norm = type.toLowerCase().trim();
  switch (norm) {
    case 'curso':
      return 'Curso';
    case 'palestra':
      return 'Palestra';
    case 'formacao':
    case 'formação':
    case 'formacao continuada':
    case 'formação continuada':
      return 'Formação Continuada';
    case 'oficina':
    case 'oficina pedagogica':
    case 'oficina pedagógica':
      return 'Oficina Pedagógica';
    case 'workshop':
      return 'Workshop';
    case 'seminario':
    case 'seminário':
      return 'Seminário';
    case 'simposio':
    case 'simpósio':
      return 'Simpósio';
    case 'capacitacao':
    case 'capacitação':
      return 'Capacitação';
    case 'congresso':
      return 'Congresso';
    case 'conferencia':
    case 'conferência':
      return 'Conferência';
    case 'treinamento':
      return 'Treinamento';
    case 'evento':
      return 'Evento';
    case 'audiencia':
    case 'audiência':
      return 'Audiência Pública';
    case 'reuniao':
    case 'reunião':
      return 'Reunião Institucional';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
export type CertificateDocumentKind = 'certificado' | 'declaracao';
export type CertificatePresetTheme = 'classico_azul' | 'verde_institucional' | 'elegante_dourado';
export type CertificateBackgroundMode = 'preset' | 'custom_upload';
export type CertificateRecipientRole = 'participante' | 'palestrante' | 'monitor';
export type CertificateStatus = 'valido' | 'revogado';

export interface CertificateTemplate {
  id: string;
  institution_id: string;
  document_kind?: CertificateDocumentKind;
  title: string;
  event_type: CertificateEventType;
  workload_hours: number;
  event_date_start: string;
  event_date_end?: string | null;
  issuer_name: string;
  issuer_role: string;
  secretariat_name?: string | null;
  background_mode: CertificateBackgroundMode;
  preset_theme: CertificatePresetTheme;
  custom_background_url?: string | null;
  program_content?: string | null;
  created_at?: string;
}

export interface IssuedCertificate {
  id: string;
  institution_id: string;
  template_id: string;
  campaign_id?: string | null;
  document_kind?: CertificateDocumentKind;
  recipient_name: string;
  recipient_document: string; // CPF ou Matrícula
  recipient_email?: string | null;
  recipient_role: CertificateRecipientRole;
  validation_hash: string; // Ex: CERT-2026-X7Y9Z1 ou DECL-2026-X7Y9Z1
  qr_code_url: string; // URL pública de validação
  download_count: number;
  last_download_at?: string;
  status: CertificateStatus;
  created_at: string;
  template?: CertificateTemplate;
}

export interface DeclarationCampaign {
  id: string;
  institution_id: string;
  template_id?: string | null;
  slug: string;
  title: string;
  event_type: CertificateEventType;
  workload_hours: number;
  event_date_start: string;
  event_date_end?: string | null;
  location?: string | null;
  issuer_name: string;
  issuer_role: string;
  secretariat_name?: string | null;
  preset_theme: CertificatePresetTheme;
  sender_email?: string | null;
  is_active: boolean;
  require_morning_checkin?: boolean;
  submissions_count: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeclarationSubmission {
  id: string;
  institution_id: string;
  campaign_id: string;
  participant_name: string;
  participant_cpf: string;
  participant_email: string;
  rating?: number | null;
  feedback?: string | null;
  morning_checkin_at?: string | null;
  afternoon_checkin_at?: string | null;
  emission_status: 'pendente' | 'emitido';
  issued_certificate_id?: string | null;
  issued_at?: string | null;
  created_at: string;
}

export interface ParsedRecipient {
  name: string;
  document: string;
  email?: string;
  role: CertificateRecipientRole;
}

