export type CertificateEventType = 'curso' | 'palestra' | 'formacao' | 'oficina';
export type CertificatePresetTheme = 'classico_azul' | 'verde_institucional' | 'elegante_dourado';
export type CertificateBackgroundMode = 'preset' | 'custom_upload';
export type CertificateRecipientRole = 'participante' | 'palestrante' | 'monitor';
export type CertificateStatus = 'valido' | 'revogado';

export interface CertificateTemplate {
  id: string;
  institution_id: string;
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
  recipient_name: string;
  recipient_document: string; // CPF ou Matrícula
  recipient_email?: string | null;
  recipient_role: CertificateRecipientRole;
  validation_hash: string; // Ex: CERT-2026-X7Y9Z1
  qr_code_url: string; // URL pública de validação
  download_count: number;
  last_download_at?: string;
  status: CertificateStatus;
  created_at: string;
  template?: CertificateTemplate;
}

export interface ParsedRecipient {
  name: string;
  document: string;
  email?: string;
  role: CertificateRecipientRole;
}

