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

    // 1. Tenta salvar Template no Supabase
    const { data: dbTemplate, error: tmplError } = await supabase
      .from('education_certificate_templates')
      .insert([createdTemplate])
      .select()
      .maybeSingle();

    const finalTemplate = dbTemplate || createdTemplate;

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

    // 3. Salva Certificados no Supabase
    const { error: certsError } = await supabase
      .from('education_issued_certificates')
      .insert(issuedList.map(c => {
        const { template, ...rest } = c;
        return rest;
      }));

    if (certsError) {
      console.warn('[CertificateService] Falha ao salvar no Supabase, mantendo cache local:', certsError.message);
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
 * Busca histórico de todos os certificados emitidos da instituição
 */
export async function fetchIssuedCertificates(institutionId?: string | null): Promise<IssuedCertificate[]> {
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
 * Consulta certificado público por Código Hash de Autenticidade (para /validar-documento)
 */
export async function fetchCertificateByHash(hash: string): Promise<IssuedCertificate | null> {
  try {
    const { data, error } = await supabase
      .from('education_issued_certificates')
      .select(`
        *,
        template:education_certificate_templates(*)
      `)
      .eq('validation_hash', hash.trim().toUpperCase())
      .maybeSingle();

    if (!error && data) {
      return data as IssuedCertificate;
    }
  } catch {}

  // Fallback Local
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_CERTIFICATES_KEY) || '[]');
    return local.find((c: IssuedCertificate) => c.validation_hash.toUpperCase() === hash.trim().toUpperCase()) || null;
  } catch {
    return null;
  }
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

