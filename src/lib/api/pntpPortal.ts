import { supabase } from '../supabase';

export type TransparencyModuleKey =
  | 'revenues'
  | 'expenses'
  | 'fiscal_reports'
  | 'biddings'
  | 'contracts'
  | 'public_works'
  | 'payroll'
  | 'per_diems'
  | 'interns'
  | 'outsourced'
  | 'agreements'
  | 'amendments'
  | 'sectoral'
  | 'councils';

export interface PublicTransparencyRecord {
  id: string;
  institution_id: string;
  module_key: TransparencyModuleKey;
  fiscal_year: number;
  record_date: string | null;
  department_name: string | null;
  process_number: string | null;
  creditor_or_subject: string | null;
  document_number: string | null;
  title: string;
  description: string | null;
  amount_planned: number;
  amount_executed: number;
  status: string;
  metadata: Record<string, unknown>;
  file_url: string | null;
}

export interface NonOccurrenceDeclaration {
  id: string;
  institution_id: string;
  module_key: string;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  justification: string;
  issuer_name: string;
  issuer_role: string;
  document_hash: string;
  published_at: string;
}

export interface InstitutionalLgpdConfig {
  institution_id: string;
  dpo_name: string;
  dpo_appointment_act: string;
  dpo_email: string;
  dpo_phone: string | null;
  dpo_address: string | null;
  privacy_policy_html: string | null;
  terms_of_use_html: string | null;
  updated_at: string;
}

export interface InstitutionalDepartment {
  id: string;
  institution_id: string;
  parent_id: string | null;
  name: string;
  acronym: string | null;
  legal_competencies: string | null;
  secretary_name: string | null;
  secretary_role: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  business_hours: string | null;
  display_order: number;
}

export interface CitizenServiceItem {
  id: string;
  institution_id: string;
  department_id: string | null;
  title: string;
  category: string;
  target_audience: string | null;
  requirements: string | null;
  required_documents: string[];
  steps: string[];
  max_deadline: string | null;
  fees: string | null;
  service_channels: string | null;
  online_url: string | null;
  satisfaction_yes: number;
  satisfaction_no: number;
}

export interface InstitutionalFaqItem {
  id: string;
  institution_id: string;
  category: string;
  question: string;
  answer: string;
  views_count: number;
}

export interface EsicRequestItem {
  id: string;
  institution_id: string;
  protocol_number: string;
  subject: string;
  description: string;
  status: 'aberto' | 'em_analise' | 'prorrogado' | 'respondido' | 'indeferido';
  created_at: string;
  due_date: string;
  extended_due_date: string | null;
  extension_justification: string | null;
  response_text: string | null;
  responded_at: string | null;
  masked_document?: string | null;
}

export interface EsicAppealItem {
  id: string;
  instance_level: 1 | 2;
  reason: string;
  status: 'aberto' | 'em_analise' | 'deferido' | 'indeferido';
  decision_text: string | null;
  created_at: string;
  decided_at: string | null;
}

export function maskCpfClient(doc?: string | null): string {
  if (!doc) return '—';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }
  return doc;
}

export async function fetchPublicTransparencyRecords(
  institutionId: string,
  moduleKeys?: TransparencyModuleKey[]
): Promise<PublicTransparencyRecord[]> {
  try {
    let query = supabase
      .from('v_public_transparency_records')
      .select('*')
      .eq('institution_id', institutionId)
      .order('record_date', { ascending: false })
      .limit(500);

    if (moduleKeys && moduleKeys.length > 0) {
      query = query.in('module_key', moduleKeys);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as PublicTransparencyRecord[];
  } catch {
    return [];
  }
}

export async function fetchNonOccurrenceDeclarations(
  institutionId: string
): Promise<NonOccurrenceDeclaration[]> {
  try {
    const { data, error } = await supabase
      .from('transparency_non_occurrence_declarations')
      .select('*')
      .eq('institution_id', institutionId)
      .order('published_at', { ascending: false });
    if (error || !data) return [];
    return data as NonOccurrenceDeclaration[];
  } catch {
    return [];
  }
}

export async function fetchLgpdConfig(institutionId: string): Promise<InstitutionalLgpdConfig | null> {
  try {
    const { data, error } = await supabase
      .from('institutional_lgpd_config')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();
    if (error || !data) return null;
    return data as InstitutionalLgpdConfig;
  } catch {
    return null;
  }
}

export async function fetchInstitutionalDepartments(
  institutionId: string
): Promise<InstitutionalDepartment[]> {
  try {
    const { data, error } = await supabase
      .from('institutional_departments')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_published', true)
      .order('display_order', { ascending: true });
    if (error || !data) return [];
    return data as InstitutionalDepartment[];
  } catch {
    return [];
  }
}

export async function fetchCitizenServiceCharter(
  institutionId: string
): Promise<CitizenServiceItem[]> {
  try {
    const { data, error } = await supabase
      .from('citizen_service_charter')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_published', true)
      .order('title', { ascending: true });
    if (error || !data) return [];
    return data as CitizenServiceItem[];
  } catch {
    return [];
  }
}

export async function voteServiceCharter(serviceId: string, useful: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('vote_service_charter_satisfaction', {
      p_service_id: serviceId,
      p_useful: useful,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchInstitutionalFaqs(
  institutionId: string
): Promise<InstitutionalFaqItem[]> {
  try {
    const { data, error } = await supabase
      .from('institutional_faqs')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_published', true)
      .order('category', { ascending: true });
    if (error || !data) return [];
    return data as InstitutionalFaqItem[];
  } catch {
    return [];
  }
}
