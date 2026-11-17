import { supabase } from '../../../lib/supabase';
import {
  CertificateTemplate,
  DeclarationCampaign,
  DeclarationSubmission,
  IssuedCertificate,
  ParsedRecipient
} from '../types/certificates';
import { generateValidationHash, getValidationUrl } from '../../../utils/certificateBatchProcessor';
import { formatCPF } from '../../../lib/masks';

const STORAGE_TEMPLATES_KEY = 'gestao360_edu_certificate_templates';
const STORAGE_CERTIFICATES_KEY = 'gestao360_edu_issued_certificates';
const STORAGE_CAMPAIGNS_KEY = 'gestao360_edu_declaration_campaigns';
const STORAGE_SUBMISSIONS_KEY = 'gestao360_edu_declaration_submissions';

/**
 * Cria template e certificados em lote no Supabase (com fallback local seguro)
 */
export async function createBatchCertificates({
  templateData,
  recipients,
  institutionId
}: {
  templateData: Omit<CertificateTemplate, 'id' | 'created_at'>;
  recipients: ParsedRecipient[];
  institutionId: string;
}): Promise<{ success: boolean; template: CertificateTemplate; certificates: IssuedCertificate[]; error?: string }> {
  try {
    const templateId = crypto.randomUUID();
    const createdTemplate: CertificateTemplate = {
      ...templateData,
      id: templateId,
      institution_id: institutionId,
      created_at: new Date().toISOString()
    };

    // 1. Salva Template no Supabase (com upsert seguro e fallback caso coluna secretariat_name não exista)
    let { data: dbTemplate, error: tmplError } = await supabase
      .from('education_certificate_templates')
      .upsert([createdTemplate], { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (tmplError && (tmplError.code === 'PGRST204' || tmplError.message?.includes('secretariat_name'))) {
      const { secretariat_name: _ignored, ...fallbackTemplate } = createdTemplate as any;
      const retryRes = await supabase
        .from('education_certificate_templates')
        .upsert([fallbackTemplate], { onConflict: 'id' })
        .select()
        .maybeSingle();
      dbTemplate = retryRes.data;
      tmplError = retryRes.error;
    }

    if (tmplError) {
      console.warn('[CertificateService] Aviso ao persistir template no Supabase:', tmplError.message);
    }

    const finalTemplate: CertificateTemplate = dbTemplate
      ? { ...dbTemplate, secretariat_name: (dbTemplate as any).secretariat_name || createdTemplate.secretariat_name || null }
      : createdTemplate;

    // 2. Prepara Certificados Individuais com Hash e QR Code únicos
    const issuedList: IssuedCertificate[] = recipients.map(r => {
      const hash = generateValidationHash();
      return {
        id: crypto.randomUUID(),
        institution_id: institutionId,
        template_id: finalTemplate.id,
        recipient_name: r.name,
        recipient_document: r.document,
        recipient_email: r.email || null,
        recipient_role: r.role || 'participante',
        validation_hash: hash,
        qr_code_url: getValidationUrl(hash),
        download_count: 1,
        last_download_at: new Date().toISOString(),
        status: 'valido',
        created_at: new Date().toISOString(),
        template: finalTemplate
      };
    });

    // 3. Salva Certificados no Supabase via upsert
    const certRows = issuedList.map(c => {
      const { template, ...rest } = c;
      return rest;
    });

    const { error: certsError } = await supabase
      .from('education_issued_certificates')
      .upsert(certRows, { onConflict: 'validation_hash' });

    if (certsError) {
      console.warn('[CertificateService] Falha no upsert em lote no Supabase, tentando individualmente:', certsError.message);
      for (const row of certRows) {
        await supabase.from('education_issued_certificates').upsert([row], { onConflict: 'validation_hash' });
      }
    }

    // 4. Salva em cache local (LocalStorage) para resiliência offline e visualização instantânea
    try {
      const savedTemplates = JSON.parse(localStorage.getItem(STORAGE_TEMPLATES_KEY) || '[]');
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify([finalTemplate, ...savedTemplates]));

      const savedCerts = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
      localStorage.setItem(STORAGE_CERTIFICATES_KEY, JSON.stringify([...issuedList, ...savedCerts]));
    } catch {}

    return {
      success: true,
      template: finalTemplate,
      certificates: issuedList
    };
  } catch (err: any) {
    console.error('[CertificateService] Erro ao emitir lote de certificados:', err);
    return {
      success: false,
      template: {} as any,
      certificates: [],
      error: err?.message || 'Falha ao processar certificados'
    };
  }
}

/**
 * Sincroniza automaticamente certificados do cache local para o Supabase
 */
export async function syncLocalCertificatesToSupabase(): Promise<void> {
  try {
    const localCerts: IssuedCertificate[] = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
    const localTemplates: CertificateTemplate[] = JSON.parse(localStorage.getItem(STORAGE_TEMPLATES_KEY) || '[]');

    if (!localCerts || localCerts.length === 0) return;

    // 1. Sincroniza templates pendentes
    for (const tmpl of localTemplates) {
      if (tmpl && tmpl.id) {
        await supabase
          .from('education_certificate_templates')
          .upsert([tmpl], { onConflict: 'id' });
      }
    }

    // 2. Sincroniza certificados pendentes
    const certRows = localCerts.map(c => {
      const { template, ...rest } = c;
      return rest;
    });

    if (certRows.length > 0) {
      await supabase
        .from('education_issued_certificates')
        .upsert(certRows, { onConflict: 'validation_hash' });
    }
  } catch (err) {
    console.warn('[CertificateService] Aviso na sincronização automática:', err);
  }
}

/**
 * Busca histórico de todos os certificados emitidos da instituição
 */
export async function fetchIssuedCertificates(institutionId?: string | null): Promise<IssuedCertificate[]> {
  // Dispara sincronização em segundo plano de eventuais certificados locais pendentes
  syncLocalCertificatesToSupabase().catch(() => {});

  try {
    let query = supabase
      .from('education_issued_certificates')
      .select(`
        *,
        template:education_certificate_templates(*)
      `)
      .order('created_at', { ascending: false });

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data as IssuedCertificate[];
    }
  } catch (err) {
    console.warn('[CertificateService] Erro ao buscar certificados no Supabase:', err);
  }

  // Fallback LocalStorage
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
    if (institutionId) {
      return local.filter((c: IssuedCertificate) => c.institution_id === institutionId);
    }
    return local;
  } catch {
    return [];
  }
}

/**
 * Registra a emissão de 2ª via (incrementa download_count)
 */
export async function registerCertificateDownload(certificateId: string): Promise<number> {
  try {
    const now = new Date().toISOString();
    // 1. Atualiza no Supabase
    const { data } = await supabase
      .from('education_issued_certificates')
      .select('download_count')
      .eq('id', certificateId)
      .maybeSingle();

    const nextCount = (data?.download_count || 1) + 1;

    await supabase
      .from('education_issued_certificates')
      .update({
        download_count: nextCount,
        last_download_at: now
      })
      .eq('id', certificateId);

    // 2. Atualiza LocalStorage
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
      const updated = local.map((c: IssuedCertificate) => 
        c.id === certificateId 
          ? { ...c, download_count: nextCount, last_download_at: now } 
          : c
      );
      localStorage.setItem(STORAGE_CERTIFICATES_KEY, JSON.stringify(updated));
    } catch {}

    return nextCount;
  } catch {
    return 2;
  }
}

/**
 * Consulta certificado público por Código Hash de Autenticidade ou CPF (para /validar-documento)
 * Suporta múltiplos formatos:
 * - Hash completo: CERT-2026-X8Y9Z1
 * - Apenas o código: X8Y9Z1 ou x8y9z1
 * - Parcial: 2026-X8Y9Z1
 * - CPF do participante (com ou sem pontuação)
 */
export async function fetchCertificateByHash(queryStr: string): Promise<IssuedCertificate | null> {
  const cleanInput = (queryStr || '').trim().toUpperCase();
  if (!cleanInput) return null;

  const currentYear = new Date().getFullYear();
  const digitsOnly = cleanInput.replace(/\D/g, '');

  try {
    // 1. Busca direta por validation_hash (exato ou case-insensitive)
    const { data: exactMatch } = await supabase
      .from('education_issued_certificates')
      .select(`*, template:education_certificate_templates(*)`)
      .ilike('validation_hash', cleanInput)
      .maybeSingle();

    if (exactMatch) return exactMatch as IssuedCertificate;

    // 2. Se o usuário digitou apenas o código final (ex: 'FLX6NX' ou '2026-FLX6NX')
    if (!cleanInput.startsWith('CERT-')) {
      const candidates = [
        `CERT-${cleanInput}`,
        `CERT-${currentYear}-${cleanInput}`
      ];
      for (const cand of candidates) {
        const { data: candMatch } = await supabase
          .from('education_issued_certificates')
          .select(`*, template:education_certificate_templates(*)`)
          .ilike('validation_hash', cand)
          .maybeSingle();
        if (candMatch) return candMatch as IssuedCertificate;
      }
    }

    // 3. Busca por correspondência parcial de código
    if (cleanInput.length >= 4) {
      const { data: partialMatch } = await supabase
        .from('education_issued_certificates')
        .select(`*, template:education_certificate_templates(*)`)
        .ilike('validation_hash', `%${cleanInput}%`)
        .limit(1)
        .maybeSingle();

      if (partialMatch) return partialMatch as IssuedCertificate;
    }

    // 4. Busca por CPF do participante (11 dígitos)
    if (digitsOnly.length === 11) {
      const { data: cpfMatch } = await supabase
        .from('education_issued_certificates')
        .select(`*, template:education_certificate_templates(*)`)
        .or(`recipient_document.eq.${cleanInput},recipient_document.ilike.%${digitsOnly}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cpfMatch) return cpfMatch as IssuedCertificate;
    }
  } catch (err) {
    console.warn('[CertificateService] Falha na consulta Supabase, testando cache local:', err);
  }

  // Fallback Local (LocalStorage)
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
    const found = local.find((c: IssuedCertificate) => {
      const vh = (c.validation_hash || '').toUpperCase();
      const doc = (c.recipient_document || '').replace(/\D/g, '');
      return vh === cleanInput ||
             vh === `CERT-${currentYear}-${cleanInput}` ||
             vh.includes(cleanInput) ||
             (digitsOnly.length === 11 && doc === digitsOnly);
    });

    if (found) {
      // Se encontrou no LocalStorage, sincroniza em segundo plano com o Supabase
      syncLocalCertificatesToSupabase().catch(() => {});
      return found as IssuedCertificate;
    }
  } catch {}

  return null;
}

/**
 * Exclui um certificado emitido pelo ID (apenas Super Admin / Admin autorizado)
 */
export async function deleteIssuedCertificate(certificateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Deleta no Supabase
    const { error: dbError } = await supabase
      .from('education_issued_certificates')
      .delete()
      .eq('id', certificateId);

    if (dbError) {
      console.warn('[CertificateService] Falha ao deletar no Supabase, prosseguindo com cache local:', dbError.message);
    }

    // 2. Remove do cache local (LocalStorage)
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
      const filtered = local.filter((c: IssuedCertificate) => c.id !== certificateId);
      localStorage.setItem(STORAGE_CERTIFICATES_KEY, JSON.stringify(filtered));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[CertificateService] Erro ao excluir certificado:', err);
    return { success: false, error: err?.message || 'Falha ao excluir certificado' };
  }
}

/**
 * Exclui múltiplos certificados em lote pelos IDs (apenas Super Admin / Admin autorizado)
 */
export async function deleteBatchIssuedCertificates(certificateIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (!certificateIds || certificateIds.length === 0) return { success: true };

    // 1. Deleta no Supabase
    const { error: dbError } = await supabase
      .from('education_issued_certificates')
      .delete()
      .in('id', certificateIds);

    if (dbError) {
      console.warn('[CertificateService] Falha ao deletar lote no Supabase, prosseguindo com cache local:', dbError.message);
    }

    // 2. Remove do cache local (LocalStorage)
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
      const idSet = new Set(certificateIds);
      const filtered = local.filter((c: IssuedCertificate) => !idSet.has(c.id));
      localStorage.setItem(STORAGE_CERTIFICATES_KEY, JSON.stringify(filtered));
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('[CertificateService] Erro ao excluir lote de certificados:', err);
    return { success: false, error: err?.message || 'Falha ao excluir lote de certificados' };
  }
}

// ============================================================================
// DECLARAÇÕES DE PARTICIPAÇÃO VIA QR CODE (CAMPANHAS & AUTOEMISSÃO)
// ============================================================================

function generateCampaignSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'evento';
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}

export function getDeclarationFormUrl(slug: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gestao360sistema.com.br';
  return `${origin}/declaracao/${encodeURIComponent(slug)}`;
}

export function buildTemplateFromCampaign(campaign: DeclarationCampaign): CertificateTemplate {
  return {
    id: campaign.template_id || campaign.id,
    institution_id: campaign.institution_id,
    document_kind: 'declaracao',
    title: campaign.title,
    event_type: campaign.event_type,
    workload_hours: campaign.workload_hours,
    event_date_start: campaign.event_date_start,
    event_date_end: campaign.event_date_end || null,
    issuer_name: campaign.issuer_name,
    issuer_role: campaign.issuer_role,
    secretariat_name: campaign.secretariat_name || null,
    background_mode: 'preset',
    preset_theme: campaign.preset_theme || 'classico_azul',
    created_at: campaign.created_at
  };
}

/**
 * Cria uma nova campanha de Declaração de Participação via QR Code
 */
export async function createDeclarationCampaign(
  payload: Omit<DeclarationCampaign, 'id' | 'slug' | 'template_id' | 'submissions_count' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; campaign?: DeclarationCampaign; error?: string }> {
  try {
    const campaignId = crypto.randomUUID();
    const templateId = crypto.randomUUID();
    const slug = generateCampaignSlug(payload.title);
    const now = new Date().toISOString();

    // 1. Cria template vinculado para que o Banco de Certificados e Validação Pública funcionem nativamente
    const templateRow: CertificateTemplate = {
      id: templateId,
      institution_id: payload.institution_id,
      document_kind: 'declaracao',
      title: payload.title,
      event_type: payload.event_type,
      workload_hours: payload.workload_hours,
      event_date_start: payload.event_date_start,
      event_date_end: payload.event_date_end || null,
      issuer_name: payload.issuer_name,
      issuer_role: payload.issuer_role,
      secretariat_name: payload.secretariat_name || null,
      background_mode: 'preset',
      preset_theme: payload.preset_theme || 'classico_azul',
      created_at: now
    };

    const { error: tmplErr } = await supabase
      .from('education_certificate_templates')
      .upsert([templateRow], { onConflict: 'id' });

    if (tmplErr) {
      console.warn('[CertificateService] Aviso ao criar template da declaração:', tmplErr.message);
    }

    // 2. Cria campanha de QR Code
    const campaign: DeclarationCampaign = {
      ...payload,
      id: campaignId,
      template_id: templateId,
      slug,
      submissions_count: 0,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('education_declaration_campaigns')
      .insert([campaign])
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[CertificateService] Aviso ao salvar campanha no Supabase:', error.message);
    }

    const saved = (data as DeclarationCampaign) || campaign;

    try {
      const local: DeclarationCampaign[] = JSON.parse(localStorage.getItem(STORAGE_CAMPAIGNS_KEY) || '[]');
      localStorage.setItem(STORAGE_CAMPAIGNS_KEY, JSON.stringify([saved, ...local]));
    } catch {}

    return { success: true, campaign: saved };
  } catch (err: any) {
    console.error('[CertificateService] Erro ao criar campanha de declaração:', err);
    return { success: false, error: err?.message || 'Erro ao criar campanha' };
  }
}

/**
 * Lista campanhas de Declaração de Participação da instituição
 */
export async function fetchDeclarationCampaigns(institutionId: string): Promise<DeclarationCampaign[]> {
  try {
    const { data, error } = await supabase
      .from('education_declaration_campaigns')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      return data as DeclarationCampaign[];
    }
  } catch (err) {
    console.warn('[CertificateService] Falha ao buscar campanhas:', err);
  }

  try {
    const local: DeclarationCampaign[] = JSON.parse(localStorage.getItem(STORAGE_CAMPAIGNS_KEY) || '[]');
    return local.filter(c => c.institution_id === institutionId);
  } catch {
    return [];
  }
}

/**
 * Busca uma campanha pública pelo slug (para o formulário aberto via QR Code)
 */
export async function fetchDeclarationCampaignBySlug(slug: string): Promise<DeclarationCampaign | null> {
  const cleanSlug = decodeURIComponent(slug).trim();
  if (!cleanSlug) return null;

  try {
    const { data, error } = await supabase
      .from('education_declaration_campaigns')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (!error && data) {
      return data as DeclarationCampaign;
    }
  } catch (err) {
    console.warn('[CertificateService] Erro ao buscar campanha por slug:', err);
  }

  try {
    const local: DeclarationCampaign[] = JSON.parse(localStorage.getItem(STORAGE_CAMPAIGNS_KEY) || '[]');
    return local.find(c => c.slug === cleanSlug) || null;
  } catch {
    return null;
  }
}

/**
 * Ativa ou pausa uma campanha de QR Code
 */
export async function toggleDeclarationCampaignStatus(
  campaignId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('education_declaration_campaigns')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    if (error) {
      console.warn('[CertificateService] Aviso ao atualizar status da campanha:', error.message);
    }

    try {
      const local: DeclarationCampaign[] = JSON.parse(localStorage.getItem(STORAGE_CAMPAIGNS_KEY) || '[]');
      const updated = local.map(c => (c.id === campaignId ? { ...c, is_active: isActive } : c));
      localStorage.setItem(STORAGE_CAMPAIGNS_KEY, JSON.stringify(updated));
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar campanha' };
  }
}

/**
 * Exclui uma campanha de declaração
 */
export async function deleteDeclarationCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('education_declaration_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      console.warn('[CertificateService] Aviso ao excluir campanha:', error.message);
    }

    try {
      const local: DeclarationCampaign[] = JSON.parse(localStorage.getItem(STORAGE_CAMPAIGNS_KEY) || '[]');
      localStorage.setItem(STORAGE_CAMPAIGNS_KEY, JSON.stringify(local.filter(c => c.id !== campaignId)));
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir campanha' };
  }
}

/**
 * Emite uma Declaração de Participação para o participante que preencheu o formulário do QR Code.
 * Se o mesmo CPF já emitiu para esta campanha, retorna a declaração existente (evita duplicidade).
 */
export async function issueParticipationDeclaration({
  campaign,
  name,
  cpf,
  email
}: {
  campaign: DeclarationCampaign;
  name: string;
  cpf: string;
  email: string;
}): Promise<{
  success: boolean;
  declaration?: IssuedCertificate;
  template?: CertificateTemplate;
  alreadyIssued?: boolean;
  error?: string;
}> {
  try {
    const formattedCpf = formatCPF(cpf);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const template = buildTemplateFromCampaign(campaign);

    // 1. Verifica se já existe declaração emitida para este CPF nesta campanha
    const { data: existingData } = await supabase
      .from('education_issued_certificates')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('recipient_document', formattedCpf)
      .maybeSingle();

    if (existingData) {
      // Atualiza e-mail caso o participante tenha informado outro na reemissão
      if (cleanEmail && existingData.recipient_email !== cleanEmail) {
        await supabase
          .from('education_issued_certificates')
          .update({ recipient_email: cleanEmail })
          .eq('id', existingData.id);
      }
      const existing: IssuedCertificate = {
        ...(existingData as IssuedCertificate),
        recipient_email: cleanEmail || existingData.recipient_email,
        document_kind: 'declaracao',
        template
      };
      return { success: true, declaration: existing, template, alreadyIssued: true };
    }

    // 2. Garante que o template existe no banco (caso tenha sido criado offline antes)
    await supabase
      .from('education_certificate_templates')
      .upsert([template], { onConflict: 'id' });

    // 3. Gera hash único com prefixo DECL-
    const rawHash = generateValidationHash().replace(/^CERT-/, 'DECL-');
    const now = new Date().toISOString();

    const newDeclaration: IssuedCertificate = {
      id: crypto.randomUUID(),
      institution_id: campaign.institution_id,
      template_id: template.id,
      campaign_id: campaign.id,
      document_kind: 'declaracao',
      recipient_name: cleanName,
      recipient_document: formattedCpf,
      recipient_email: cleanEmail,
      recipient_role: 'participante',
      validation_hash: rawHash,
      qr_code_url: getValidationUrl(rawHash),
      download_count: 1,
      last_download_at: now,
      status: 'valido',
      created_at: now,
      template
    };

    const { template: _tmpl, ...dbRow } = newDeclaration;
    const { error: insertErr } = await supabase
      .from('education_issued_certificates')
      .insert([dbRow]);

    if (insertErr) {
      console.warn('[CertificateService] Erro ao persistir declaração no Supabase:', insertErr.message);
    }

    // 4. Incrementa contador da campanha
    await supabase
      .from('education_declaration_campaigns')
      .update({
        submissions_count: (campaign.submissions_count || 0) + 1,
        updated_at: now
      })
      .eq('id', campaign.id);

    // 5. Cache local
    try {
      const savedCerts = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
      localStorage.setItem(STORAGE_CERTIFICATES_KEY, JSON.stringify([newDeclaration, ...savedCerts]));
    } catch {}

    return { success: true, declaration: newDeclaration, template, alreadyIssued: false };
  } catch (err: any) {
    console.error('[CertificateService] Erro ao emitir declaração:', err);
    return { success: false, error: err?.message || 'Não foi possível emitir a declaração.' };
  }
}

/**
 * Envia a Declaração de Participação em PDF por e-mail via Edge Function `institutional-email-send`
 */
export async function sendDeclarationEmail({
  declaration,
  template,
  institutionName,
  senderEmail,
  recipientEmail,
  pdfBase64
}: {
  declaration: IssuedCertificate;
  template: CertificateTemplate;
  institutionName: string;
  senderEmail?: string | null;
  recipientEmail: string;
  pdfBase64?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const safeFilename = `Declaracao_${declaration.recipient_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const fromHeader = senderEmail?.trim()
      ? `${institutionName} <${senderEmail.trim()}>`
      : undefined;

    const htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; color: #ffffff; padding: 24px 28px;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fbbf24; font-weight: bold;">${institutionName}</p>
          <h1 style="margin: 6px 0 0; font-size: 20px;">Declaração de Participação Emitida</h1>
        </div>
        <div style="padding: 28px;">
          <p style="margin: 0 0 14px; font-size: 15px;">Olá, <strong>${declaration.recipient_name}</strong>!</p>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">
            Sua <strong>Declaração de Participação</strong> referente à atividade <strong>"${template.title}"</strong> (${template.workload_hours}h) foi emitida com sucesso e segue em anexo neste e-mail em formato PDF.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">Código de Autenticidade (Lei 14.063/2020):</p>
            <p style="margin: 0; font-size: 16px; font-weight: bold; font-family: monospace; color: #0f172a;">${declaration.validation_hash}</p>
          </div>
          <p style="margin: 0; font-size: 13px; color: #475569;">
            Você também pode conferir a autenticidade do documento a qualquer momento em:<br/>
            <a href="${declaration.qr_code_url}" style="color: #2563eb; word-break: break-all;">${declaration.qr_code_url}</a>
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 14px 28px; font-size: 11px; color: #64748b; text-align: center;">
          Documento oficial expedido pelo Portal Gestão 360 · ${institutionName}
        </div>
      </div>
    `;

    const textBody = [
      `Olá, ${declaration.recipient_name}!`,
      '',
      `Sua Declaração de Participação referente a "${template.title}" (${template.workload_hours}h) foi emitida com sucesso.`,
      `Código de Autenticidade: ${declaration.validation_hash}`,
      `Validação online: ${declaration.qr_code_url}`,
      '',
      `${institutionName} - Gestão 360`
    ].join('\n');

    const { data, error } = await supabase.functions.invoke('institutional-email-send', {
      body: {
        institution_id: declaration.institution_id,
        from: fromHeader,
        to: [recipientEmail],
        subject: `Declaração de Participação - ${template.title}`,
        text: textBody,
        html: htmlBody,
        attachments: pdfBase64
          ? [{ filename: safeFilename, content: pdfBase64, content_type: 'application/pdf' }]
          : undefined
      }
    });

    const resp = data as { ok?: boolean; error?: string } | null;
    if (error || resp?.ok === false) {
      return {
        success: false,
        error: resp?.error || error?.message || 'Falha ao enviar e-mail.'
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão ao enviar e-mail.' };
  }
}

// ============================================================================
// COLETA DE PARTICIPAÇÃO & AVALIAÇÃO DO EVENTO (SEM EMISSÃO IMEDIATA)
// ============================================================================

/**
 * Registra a participação e avaliação do evento para emissão posterior pela organização.
 * Evita duplicidade pelo CPF dentro da mesma campanha.
 */
export async function submitDeclarationParticipation({
  campaign,
  name,
  cpf,
  email,
  rating,
  feedback
}: {
  campaign: DeclarationCampaign;
  name: string;
  cpf: string;
  email: string;
  rating: number;
  feedback?: string;
}): Promise<{
  success: boolean;
  submission?: DeclarationSubmission;
  alreadyRegistered?: boolean;
  error?: string;
}> {
  try {
    const formattedCpf = formatCPF(cpf);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFeedback = feedback?.trim() || null;
    const safeRating = Math.min(5, Math.max(1, Math.round(rating || 5)));
    const now = new Date().toISOString();

    // Verifica se o CPF já registrou participação nesta campanha
    const { data: existing } = await supabase
      .from('education_declaration_submissions')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('participant_cpf', formattedCpf)
      .maybeSingle();

    if (existing) {
      const { data: updated } = await supabase
        .from('education_declaration_submissions')
        .update({
          participant_name: cleanName,
          participant_email: cleanEmail,
          rating: safeRating,
          feedback: cleanFeedback
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      return {
        success: true,
        submission: (updated as DeclarationSubmission) || (existing as DeclarationSubmission),
        alreadyRegistered: true
      };
    }

    const newSubmission: DeclarationSubmission = {
      id: crypto.randomUUID(),
      institution_id: campaign.institution_id,
      campaign_id: campaign.id,
      participant_name: cleanName,
      participant_cpf: formattedCpf,
      participant_email: cleanEmail,
      rating: safeRating,
      feedback: cleanFeedback,
      emission_status: 'pendente',
      issued_certificate_id: null,
      issued_at: null,
      created_at: now
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('education_declaration_submissions')
      .insert([newSubmission])
      .select()
      .maybeSingle();

    if (insertErr) {
      console.warn('[CertificateService] Aviso ao salvar coleta no Supabase:', insertErr.message);
    }

    // Atualiza contador de participações coletadas na campanha
    await supabase
      .from('education_declaration_campaigns')
      .update({
        submissions_count: (campaign.submissions_count || 0) + 1,
        updated_at: now
      })
      .eq('id', campaign.id);

    const saved = (inserted as DeclarationSubmission) || newSubmission;

    try {
      const local: DeclarationSubmission[] = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS_KEY) || '[]');
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify([saved, ...local]));
    } catch {}

    return { success: true, submission: saved, alreadyRegistered: false };
  } catch (err: any) {
    console.error('[CertificateService] Erro ao registrar coleta:', err);
    return { success: false, error: err?.message || 'Não foi possível registrar sua participação.' };
  }
}

/**
 * Lista todas as participações e avaliações coletadas de uma campanha
 */
export async function fetchDeclarationSubmissions(campaignId: string): Promise<DeclarationSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('education_declaration_submissions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && Array.isArray(data)) {
      return data as DeclarationSubmission[];
    }
  } catch (err) {
    console.warn('[CertificateService] Falha ao buscar coletas:', err);
  }

  try {
    const local: DeclarationSubmission[] = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS_KEY) || '[]');
    return local.filter((s) => s.campaign_id === campaignId);
  } catch {
    return [];
  }
}

/**
 * Marca uma coleta como emitida posteriormente
 */
export async function markSubmissionAsIssued(
  submissionId: string,
  issuedCertificateId: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await supabase
      .from('education_declaration_submissions')
      .update({
        emission_status: 'emitido',
        issued_certificate_id: issuedCertificateId,
        issued_at: now
      })
      .eq('id', submissionId);
  } catch (err) {
    console.warn('[CertificateService] Aviso ao atualizar status de coleta:', err);
  }

  try {
    const local: DeclarationSubmission[] = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS_KEY) || '[]');
    const updated = local.map((s) =>
      s.id === submissionId
        ? { ...s, emission_status: 'emitido' as const, issued_certificate_id: issuedCertificateId, issued_at: now }
        : s
    );
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(updated));
  } catch {}
}

// ============================================================================
// FLUXO EM DUAS ETAPAS: MANHÃ (PRESENÇA) -> TARDE (CONFIRMAÇÃO + EMISSÃO)
// ============================================================================

/**
 * Busca registro existente pelo CPF dentro de uma campanha (para auto-preencher na etapa da tarde)
 */
export async function lookupSubmissionByCpf(
  campaignId: string,
  cpf: string
): Promise<DeclarationSubmission | null> {
  const formattedCpf = formatCPF(cpf);
  if (formattedCpf.replace(/\D/g, '').length !== 11) return null;

  try {
    const { data, error } = await supabase
      .from('education_declaration_submissions')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('participant_cpf', formattedCpf)
      .maybeSingle();

    if (!error && data) return data as DeclarationSubmission;
  } catch {}

  try {
    const local: DeclarationSubmission[] = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS_KEY) || '[]');
    return local.find((s) => s.campaign_id === campaignId && s.participant_cpf === formattedCpf) || null;
  } catch {
    return null;
  }
}

/**
 * Etapa 1 (Manhã): Confirma a presença do participante no período da manhã.
 */
export async function submitMorningCheckin({
  campaign,
  name,
  cpf,
  email
}: {
  campaign: DeclarationCampaign;
  name: string;
  cpf: string;
  email: string;
}): Promise<{
  success: boolean;
  submission?: DeclarationSubmission;
  alreadyCheckedIn?: boolean;
  error?: string;
}> {
  try {
    const formattedCpf = formatCPF(cpf);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('education_declaration_submissions')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('participant_cpf', formattedCpf)
      .maybeSingle();

    if (existing) {
      const { data: updated } = await supabase
        .from('education_declaration_submissions')
        .update({
          participant_name: cleanName,
          participant_email: cleanEmail,
          morning_checkin_at: existing.morning_checkin_at || now
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      return {
        success: true,
        submission: (updated as DeclarationSubmission) || (existing as DeclarationSubmission),
        alreadyCheckedIn: Boolean(existing.morning_checkin_at)
      };
    }

    const newSubmission: DeclarationSubmission = {
      id: crypto.randomUUID(),
      institution_id: campaign.institution_id,
      campaign_id: campaign.id,
      participant_name: cleanName,
      participant_cpf: formattedCpf,
      participant_email: cleanEmail,
      rating: null,
      feedback: null,
      morning_checkin_at: now,
      afternoon_checkin_at: null,
      emission_status: 'pendente',
      issued_certificate_id: null,
      issued_at: null,
      created_at: now
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('education_declaration_submissions')
      .insert([newSubmission])
      .select()
      .maybeSingle();

    if (insertErr) {
      console.error('[CertificateService] Erro ao salvar check-in da manhã no Supabase:', insertErr);
      return {
        success: false,
        error: `Não foi possível registrar no banco de dados (${insertErr.message}). Verifique se a migração do Supabase foi aplicada.`
      };
    }

    // Atualiza contador real de participações na campanha
    const { count } = await supabase
      .from('education_declaration_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    await supabase
      .from('education_declaration_campaigns')
      .update({
        submissions_count: typeof count === 'number' ? count : (campaign.submissions_count || 0) + 1,
        updated_at: now
      })
      .eq('id', campaign.id);

    const saved = (inserted as DeclarationSubmission) || newSubmission;

    try {
      const local: DeclarationSubmission[] = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS_KEY) || '[]');
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify([saved, ...local]));
    } catch {}

    return { success: true, submission: saved, alreadyCheckedIn: false };
  } catch (err: any) {
    console.error('[CertificateService] Erro no check-in da manhã:', err);
    return { success: false, error: err?.message || 'Não foi possível confirmar sua presença.' };
  }
}

/**
 * Etapa 2 (Tarde): Valida a presença da manhã (se exigida), registra presença da tarde + avaliação
 * e emite imediatamente a Declaração de Participação.
 */
export async function submitAfternoonAndIssue({
  campaign,
  name,
  cpf,
  email,
  rating,
  feedback
}: {
  campaign: DeclarationCampaign;
  name: string;
  cpf: string;
  email: string;
  rating: number;
  feedback?: string;
}): Promise<{
  success: boolean;
  missingMorningCheckin?: boolean;
  declaration?: IssuedCertificate;
  template?: CertificateTemplate;
  alreadyIssued?: boolean;
  error?: string;
}> {
  try {
    const formattedCpf = formatCPF(cpf);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFeedback = feedback?.trim() || null;
    const safeRating = Math.min(5, Math.max(1, Math.round(rating || 5)));
    const now = new Date().toISOString();

    const existing = await lookupSubmissionByCpf(campaign.id, formattedCpf);
    const requireMorning = campaign.require_morning_checkin !== false;

    if (requireMorning && (!existing || !existing.morning_checkin_at)) {
      return {
        success: false,
        missingMorningCheckin: true,
        error:
          'Presença do período da manhã não localizada para este CPF. Caso tenha participado pela manhã e não conseguiu registrar, procure a organização do evento.'
      };
    }

    // Emite ou recupera a declaração
    const issueRes = await issueParticipationDeclaration({
      campaign,
      name: cleanName,
      cpf: formattedCpf,
      email: cleanEmail
    });

    if (!issueRes.success || !issueRes.declaration || !issueRes.template) {
      return {
        success: false,
        error: issueRes.error || 'Falha ao emitir a declaração de participação.'
      };
    }

    if (existing) {
      const { error: updErr } = await supabase
        .from('education_declaration_submissions')
        .update({
          participant_name: cleanName,
          participant_email: cleanEmail,
          rating: safeRating,
          feedback: cleanFeedback,
          afternoon_checkin_at: existing.afternoon_checkin_at || now,
          emission_status: 'emitido',
          issued_certificate_id: issueRes.declaration.id,
          issued_at: now
        })
        .eq('id', existing.id);

      if (updErr) {
        console.error('[CertificateService] Erro ao atualizar etapa da tarde:', updErr);
      }
    } else {
      // Caso a campanha não exija presença da manhã, cria o registro completo já emitido
      const newSub: DeclarationSubmission = {
        id: crypto.randomUUID(),
        institution_id: campaign.institution_id,
        campaign_id: campaign.id,
        participant_name: cleanName,
        participant_cpf: formattedCpf,
        participant_email: cleanEmail,
        rating: safeRating,
        feedback: cleanFeedback,
        morning_checkin_at: null,
        afternoon_checkin_at: now,
        emission_status: 'emitido',
        issued_certificate_id: issueRes.declaration.id,
        issued_at: now,
        created_at: now
      };
      const { error: insErr } = await supabase.from('education_declaration_submissions').insert([newSub]);
      if (insErr) {
        return {
          success: false,
          error: `Não foi possível salvar os dados no banco (${insErr.message}).`
        };
      }
    }

    return {
      success: true,
      declaration: issueRes.declaration,
      template: issueRes.template,
      alreadyIssued: issueRes.alreadyIssued
    };
  } catch (err: any) {
    console.error('[CertificateService] Erro na etapa da tarde:', err);
    return { success: false, error: err?.message || 'Erro ao confirmar presença e emitir declaração.' };
  }
}

/**
 * Permite que a organização confirme manualmente a presença da manhã de um participante
 */
export async function confirmManualMorningCheckin(submissionId: string): Promise<{ success: boolean }> {
  const now = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('education_declaration_submissions')
      .update({ morning_checkin_at: now })
      .eq('id', submissionId);
    if (error) return { success: false };
    return { success: true };
  } catch {
    return { success: false };
  }
}

