import { supabase } from '../supabase';
import {
  GazetteActCategory,
  GazetteActStatus,
  GazetteEditionStatus,
  Institution,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../../types';
import { isValidUuid } from './municipalNews';
import { sanitizeLawStorageName } from './municipalLaws';
import { isDemoEnvironment } from '../demoManager';

export const GAZETTE_UPDATED_EVENT = 'gestao360:gazette-updated';
const MAX_INLINE_GAZETTE_PDF_BYTES = 4 * 1024 * 1024;

export const GAZETTE_ACT_CATEGORIES: GazetteActCategory[] = [
  'Decreto',
  'Portaria',
  'Lei',
  'Licitação & Edital',
  'Contrato & Extrato',
  'Nomeação & RH',
  'Resolução & Instrução',
  'Aviso & Comunicado',
];

const editionsCacheKey = (institutionId?: string | null) =>
  `gestao360_gazette_editions_${institutionId || 'default'}`;

const actsCacheKey = (institutionId?: string | null) =>
  `gestao360_gazette_acts_${institutionId || 'default'}`;

const resolveInstitutionId = (institution?: Institution | string | null): string | undefined => {
  if (!institution) return undefined;
  return typeof institution === 'string' ? institution : institution.id;
};

const canSyncRemoteGazette = (
  institution?: Institution | string | null,
  instId?: string
): instId is string => {
  if (!instId || !instId.trim()) return false;
  const instObj = typeof institution === 'object' && institution !== null ? institution : undefined;
  return !isDemoEnvironment(instObj);
};

export const dispatchGazetteUpdated = (institutionId?: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GAZETTE_UPDATED_EVENT, { detail: { institutionId } }));
};

export const generateGazetteVerificationCode = (editionNumber: string, year: number): string => {
  const cleanSeq = editionNumber.replace(/[^0-9A-Z]/gi, '').slice(0, 6) || '001';
  const randA = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randB = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOM-${year}-${cleanSeq}-${randA}${randB}`;
};

export const generateNextEditionInfo = (
  editions: OfficialGazetteEdition[],
  year = new Date().getFullYear()
): { sequenceNumber: number; editionNumber: string } => {
  const sameYear = editions.filter((e) => Number(e.year) === year);
  const maxSeq = sameYear.reduce((acc, item) => Math.max(acc, Number(item.sequence_number) || 0), 0);
  const nextSeq = maxSeq + 1;
  return {
    sequenceNumber: nextSeq,
    editionNumber: `${String(nextSeq).padStart(3, '0')}/${year}`,
  };
};

const readEditionsCache = (institutionId?: string | null): OfficialGazetteEdition[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(editionsCacheKey(institutionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeEditionsCache = (items: OfficialGazetteEdition[], institutionId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(editionsCacheKey(institutionId), JSON.stringify(items));
  } catch {
    // ignora cota local
  }
};

const readActsCache = (institutionId?: string | null): OfficialGazetteAct[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(actsCacheKey(institutionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeActsCache = (items: OfficialGazetteAct[], institutionId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(actsCacheKey(institutionId), JSON.stringify(items));
  } catch {
    // ignora cota local
  }
};

const sortEditions = (items: OfficialGazetteEdition[]) =>
  [...items].sort((a, b) => {
    const dateA = a.publication_date ? new Date(a.publication_date).getTime() : 0;
    const dateB = b.publication_date ? new Date(b.publication_date).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
    return (b.sequence_number || 0) - (a.sequence_number || 0);
  });

const sortActs = (items: OfficialGazetteAct[]) =>
  [...items].sort((a, b) => {
    const orderDiff = (a.order_index ?? 999) - (b.order_index ?? 999);
    if (orderDiff !== 0) return orderDiff;
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

const readFileAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler PDF localmente'));
    reader.readAsDataURL(file);
  });

/** Uploads a Gazette PDF cleanly using an ASCII key on UUID tenants, with local Data URL fallback. */
export const uploadGazettePdf = async (
  pdfFile: File,
  institution?: Institution | string | null,
  subfolder: 'edicoes' | 'atos' = 'edicoes'
): Promise<string | undefined> => {
  const instId = resolveInstitutionId(institution);
  const safeBase = sanitizeLawStorageName(pdfFile.name);
  const extMatch = pdfFile.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';

  if (canSyncRemoteGazette(institution, instId)) {
    const safeInst = sanitizeLawStorageName(instId);
    const key = `${safeInst}/${subfolder}/${Date.now()}-${safeBase}.${ext}`;
    try {
      const { error } = await supabase.storage
        .from('diario_oficial')
        .upload(key, pdfFile, {
          upsert: true,
          contentType: pdfFile.type || 'application/pdf',
        });

      if (!error) {
        const { data } = supabase.storage.from('diario_oficial').getPublicUrl(key);
        return data.publicUrl;
      }
    } catch (err) {
      console.warn('[officialGazette] Erro ao enviar PDF ao Storage:', err);
    }
  }

  if (pdfFile.size <= MAX_INLINE_GAZETTE_PDF_BYTES) {
    try {
      return await readFileAsDataUrl(pdfFile);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

export const fetchGazetteEditions = async (
  institution?: Institution | string | null,
  options: { onlyPublished?: boolean; limit?: number } = {}
): Promise<OfficialGazetteEdition[]> => {
  const instId = resolveInstitutionId(institution);

  const filterAndLimit = (items: OfficialGazetteEdition[]) => {
    const filtered = options.onlyPublished
      ? items.filter((e) => e.status === 'published')
      : items;
    const sorted = sortEditions(filtered);
    return options.limit ? sorted.slice(0, options.limit) : sorted;
  };

  if (!canSyncRemoteGazette(institution, instId)) {
    return filterAndLimit(readEditionsCache(instId));
  }

  try {
    let query = supabase
      .from('official_gazette_editions')
      .select(
        'id, institution_id, edition_number, sequence_number, year, edition_type, publication_date, title, summary, status, pdf_url, verification_code, signed_by, signed_role, published_at, created_by, updated_by, created_at, updated_at'
      )
      .eq('institution_id', instId)
      .order('publication_date', { ascending: false })
      .order('sequence_number', { ascending: false })
      .limit(100);

    if (options.onlyPublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      const typed = data as OfficialGazetteEdition[];
      if (!options.onlyPublished && typed.length > 0) {
        writeEditionsCache(typed, instId);
      }
      if (typed.length > 0) {
        return filterAndLimit(typed);
      }
    }
  } catch (err) {
    console.warn('[officialGazette] Falha ao buscar edições no Supabase:', err);
  }

  return filterAndLimit(readEditionsCache(instId));
};

export const fetchGazetteActs = async (
  institution?: Institution | string | null,
  options: { editionId?: string; onlyPublished?: boolean } = {}
): Promise<OfficialGazetteAct[]> => {
  const instId = resolveInstitutionId(institution);

  const filterItems = (items: OfficialGazetteAct[]) => {
    let list = items;
    if (options.editionId) {
      list = list.filter((a) => a.edition_id === options.editionId);
    }
    if (options.onlyPublished) {
      list = list.filter((a) => a.status === 'published');
    }
    return sortActs(list);
  };

  if (!canSyncRemoteGazette(institution, instId)) {
    return filterItems(readActsCache(instId));
  }

  try {
    let query = supabase
      .from('official_gazette_acts')
      .select(
        'id, institution_id, edition_id, category, department, act_number, title, summary, content, attachment_url, status, order_index, created_by, updated_by, created_at, updated_at'
      )
      .eq('institution_id', instId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(200);

    if (options.editionId) {
      query = query.eq('edition_id', options.editionId);
    }
    if (options.onlyPublished) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      const typed = data as OfficialGazetteAct[];
      if (!options.editionId && !options.onlyPublished && typed.length > 0) {
        writeActsCache(typed, instId);
      }
      if (typed.length > 0) {
        return filterItems(typed);
      }
    }
  } catch (err) {
    console.warn('[officialGazette] Falha ao buscar atos no Supabase:', err);
  }

  return filterItems(readActsCache(instId));
};

export const saveGazetteAct = async (
  actData: Partial<OfficialGazetteAct>,
  institution?: Institution | string | null,
  pdfFile?: File | null,
  actorName?: string
): Promise<{ item: OfficialGazetteAct; syncedRemote: boolean }> => {
  const instId = resolveInstitutionId(institution);
  let attachmentUrl = actData.attachment_url;

  if (pdfFile) {
    const uploaded = await uploadGazettePdf(pdfFile, instId, 'atos');
    if (uploaded) attachmentUrl = uploaded;
  }

  const isUpdate = Boolean(actData.id && isValidUuid(actData.id));
  const id = isUpdate && actData.id ? actData.id : crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const payload: OfficialGazetteAct = {
    id,
    institution_id: instId,
    edition_id: actData.edition_id || null,
    category: actData.category || 'Decreto',
    department: actData.department?.trim() || '',
    act_number: actData.act_number?.trim() || '',
    title: actData.title?.trim() || '',
    summary: actData.summary?.trim() || '',
    content: actData.content?.trim() || '',
    attachment_url: attachmentUrl || undefined,
    status: actData.status || (actData.edition_id ? 'published' : 'queued'),
    order_index: actData.order_index ?? 0,
    created_by: actData.created_by || actorName || 'Servidor Municipal',
    updated_by: actorName || 'Servidor Municipal',
    created_at: actData.created_at || nowIso,
    updated_at: nowIso,
  };

  let syncedRemote = false;
  let savedRecord = payload;

  if (canSyncRemoteGazette(institution, instId)) {
    const dbRow = {
      id: payload.id,
      institution_id: instId,
      edition_id: payload.edition_id || null,
      category: payload.category,
      department: payload.department,
      act_number: payload.act_number,
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
      attachment_url: payload.attachment_url || null,
      status: payload.status,
      order_index: payload.order_index,
      created_by: payload.created_by,
      updated_by: payload.updated_by,
      updated_at: nowIso,
    };

    const query = isUpdate
      ? supabase.from('official_gazette_acts').update(dbRow).eq('id', id).select().maybeSingle()
      : supabase.from('official_gazette_acts').insert([dbRow]).select().maybeSingle();

    const { data, error } = await query;
    if (!error && data) {
      syncedRemote = true;
      savedRecord = { ...payload, ...(data as OfficialGazetteAct) };
    }
  }

  const current = readActsCache(instId);
  const exists = current.some((item) => item.id === savedRecord.id);
  const next = exists
    ? current.map((item) => (item.id === savedRecord.id ? savedRecord : item))
    : [savedRecord, ...current];
  writeActsCache(next, instId);
  dispatchGazetteUpdated(instId);

  return { item: savedRecord, syncedRemote };
};

export const deleteGazetteAct = async (
  actId: string,
  institution?: Institution | string | null
): Promise<void> => {
  const instId = resolveInstitutionId(institution);
  if (canSyncRemoteGazette(institution, instId) && isValidUuid(actId)) {
    await supabase
      .from('official_gazette_acts')
      .delete()
      .eq('id', actId)
      .eq('institution_id', instId);
  }

  const next = readActsCache(instId).filter((a) => a.id !== actId);
  writeActsCache(next, instId);
  dispatchGazetteUpdated(instId);
};

export const saveGazetteEdition = async (
  editionData: Partial<OfficialGazetteEdition>,
  actIdsToLink: string[],
  institution?: Institution | string | null,
  pdfFile?: File | null,
  actorName?: string
): Promise<{ item: OfficialGazetteEdition; syncedRemote: boolean }> => {
  const instId = resolveInstitutionId(institution);
  let pdfUrl = editionData.pdf_url;

  if (pdfFile) {
    const uploaded = await uploadGazettePdf(pdfFile, instId, 'edicoes');
    if (uploaded) pdfUrl = uploaded;
  }

  const isUpdate = Boolean(editionData.id && isValidUuid(editionData.id));
  const id = isUpdate && editionData.id ? editionData.id : crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const year =
    Number(editionData.year) ||
    Number((editionData.publication_date || '').slice(0, 4)) ||
    new Date().getFullYear();

  const existingEditions = readEditionsCache(instId);
  const nextDefaults = generateNextEditionInfo(existingEditions, year);
  const sequenceNumber = Number(editionData.sequence_number) || nextDefaults.sequenceNumber;
  const editionNumber =
    editionData.edition_number?.trim() || `${String(sequenceNumber).padStart(3, '0')}/${year}`;
  const status: GazetteEditionStatus = editionData.status || 'draft';

  const payload: OfficialGazetteEdition = {
    id,
    institution_id: instId,
    edition_number: editionNumber,
    sequence_number: sequenceNumber,
    year,
    edition_type: editionData.edition_type || 'Ordinária',
    publication_date: editionData.publication_date || nowIso.slice(0, 10),
    title: editionData.title?.trim() || `Edição Nº ${editionNumber}`,
    summary: editionData.summary?.trim() || '',
    status,
    pdf_url: pdfUrl || undefined,
    verification_code:
      editionData.verification_code || generateGazetteVerificationCode(editionNumber, year),
    signed_by: editionData.signed_by?.trim() || actorName || '',
    signed_role: editionData.signed_role?.trim() || 'Secretaria Municipal de Administração',
    published_at:
      status === 'published' ? editionData.published_at || nowIso : editionData.published_at,
    created_by: editionData.created_by || actorName || 'Servidor Municipal',
    updated_by: actorName || 'Servidor Municipal',
    created_at: editionData.created_at || nowIso,
    updated_at: nowIso,
  };

  let syncedRemote = false;
  let savedEdition = payload;

  if (canSyncRemoteGazette(institution, instId)) {
    const dbRow = {
      id: payload.id,
      institution_id: instId,
      edition_number: payload.edition_number,
      sequence_number: payload.sequence_number,
      year: payload.year,
      edition_type: payload.edition_type,
      publication_date: payload.publication_date,
      title: payload.title,
      summary: payload.summary,
      status: payload.status,
      pdf_url: payload.pdf_url || null,
      verification_code: payload.verification_code,
      signed_by: payload.signed_by,
      signed_role: payload.signed_role,
      published_at: payload.published_at || null,
      created_by: payload.created_by,
      updated_by: payload.updated_by,
      updated_at: nowIso,
    };

    const query = isUpdate
      ? supabase
          .from('official_gazette_editions')
          .update(dbRow)
          .eq('id', id)
          .select()
          .maybeSingle()
      : supabase.from('official_gazette_editions').insert([dbRow]).select().maybeSingle();

    const { data, error } = await query;
    if (!error && data) {
      syncedRemote = true;
      savedEdition = { ...payload, ...(data as OfficialGazetteEdition) };
    }

    // Desvincula atos que saíram desta edição e vincula os selecionados
    try {
      await supabase
        .from('official_gazette_acts')
        .update({ edition_id: null, status: 'queued', updated_at: nowIso })
        .eq('institution_id', instId)
        .eq('edition_id', savedEdition.id);

      if (actIdsToLink.length > 0) {
        const linkedActStatus = savedEdition.status === 'published' ? 'published' : 'queued';
        await supabase
          .from('official_gazette_acts')
          .update({ edition_id: savedEdition.id, status: linkedActStatus, updated_at: nowIso })
          .eq('institution_id', instId)
          .in('id', actIdsToLink);
      }
    } catch (err) {
      console.warn('[officialGazette] Aviso ao vincular atos no Supabase:', err);
    }
  }

  // Atualiza cache local de edições
  const nextEditions = existingEditions.some((e) => e.id === savedEdition.id)
    ? existingEditions.map((e) => (e.id === savedEdition.id ? savedEdition : e))
    : [savedEdition, ...existingEditions];
  writeEditionsCache(nextEditions, instId);

  // Atualiza vínculo dos atos no cache local
  const selectedSet = new Set(actIdsToLink);
  const linkedActStatus: GazetteActStatus =
    savedEdition.status === 'published' ? 'published' : 'queued';
  const nextActs: OfficialGazetteAct[] = readActsCache(instId).map((act) => {
    if (selectedSet.has(act.id)) {
      return { ...act, edition_id: savedEdition.id, status: linkedActStatus, updated_at: nowIso };
    }
    if (act.edition_id === savedEdition.id) {
      return { ...act, edition_id: null, status: 'queued' as const, updated_at: nowIso };
    }
    return act;
  });
  writeActsCache(nextActs, instId);

  dispatchGazetteUpdated(instId);
  return { item: savedEdition, syncedRemote };
};

export const publishGazetteEdition = async (
  edition: OfficialGazetteEdition,
  institution?: Institution | string | null,
  actorName?: string
): Promise<OfficialGazetteEdition> => {
  const acts = await fetchGazetteActs(institution, { editionId: edition.id });
  const { item } = await saveGazetteEdition(
    {
      ...edition,
      status: 'published',
      published_at: edition.published_at || new Date().toISOString(),
    },
    acts.map((a) => a.id),
    institution,
    null,
    actorName
  );
  return item;
};

export const deleteGazetteEdition = async (
  editionId: string,
  institution?: Institution | string | null
): Promise<void> => {
  const instId = resolveInstitutionId(institution);
  const nowIso = new Date().toISOString();

  if (canSyncRemoteGazette(institution, instId) && isValidUuid(editionId)) {
    await supabase
      .from('official_gazette_acts')
      .update({ edition_id: null, status: 'queued', updated_at: nowIso })
      .eq('institution_id', instId)
      .eq('edition_id', editionId);

    await supabase
      .from('official_gazette_editions')
      .delete()
      .eq('id', editionId)
      .eq('institution_id', instId);
  }

  writeActsCache(
    readActsCache(instId).map((a) =>
      a.edition_id === editionId
        ? { ...a, edition_id: null, status: 'queued' as const, updated_at: nowIso }
        : a
    ),
    instId
  );
  writeEditionsCache(
    readEditionsCache(instId).filter((e) => e.id !== editionId),
    instId
  );
  dispatchGazetteUpdated(instId);
};
