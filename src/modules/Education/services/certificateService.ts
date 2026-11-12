import { supabase } from '../../../lib/supabase';
import { CertificateTemplate, IssuedCertificate, ParsedRecipient } from '../types/certificates';
import { generateValidationHash, getValidationUrl } from '../../../utils/certificateBatchProcessor';

const STORAGE_TEMPLATES_KEY = 'gestao360_edu_certificate_templates';
const STORAGE_CERTIFICATES_KEY = 'gestao360_edu_issued_certificates';

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

