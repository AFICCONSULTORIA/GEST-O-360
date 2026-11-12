import { supabase } from '../supabase';
import { Institution, MunicipalLaw } from '../../types';
import { isValidUuid } from './municipalNews';
import { isDemoEnvironment } from '../demoManager';
import { INITIAL_REAL_LAWS } from '../../modules/Laws/data/realInitialLaws';

export const LAWS_UPDATED_EVENT = 'gestao360:laws-updated';

const LEGACY_LAWS_CACHE_KEY = 'gestao360_laws';
const LEGACY_LAWS_CLEARED_KEY = 'gestao360_laws_cleared';
const MAX_INLINE_PDF_BYTES = 3.5 * 1024 * 1024;
const LEGACY_MOCK_LAW_IDS = new Set([
  'law_1331_2026',
  'law_1',
  'law_2',
  'law_3',
  'law_4',
  'law_5',
  'law_6',
  'law_7',
  'law_8',
  'law_9',
]);

const getLawsCacheKey = (institutionId?: string | null) =>
  `gestao360_laws_cache_${institutionId || 'default'}`;

const getLawsClearedKey = (institutionId?: string | null) =>
  `gestao360_laws_cleared_${institutionId || 'default'}`;

export const isLegacyMockLaw = (law: Partial<MunicipalLaw>): boolean =>
  Boolean(law.id && (LEGACY_MOCK_LAW_IDS.has(law.id) || law.id.startsWith('law_mock')));

const resolveInstitutionId = (institution?: Institution | string | null): string | undefined => {
  if (!institution) return undefined;
  return typeof institution === 'string' ? institution : institution.id;
};

const canSyncRemoteLaws = (
  institution?: Institution | string | null,
  instId?: string
): instId is string => {
  if (!instId || !instId.trim()) return false;
  const instObj = typeof institution === 'object' && institution !== null ? institution : undefined;
  return !isDemoEnvironment(instObj);
};

/** Sanitizes a filename into an ASCII-safe slug for Supabase Storage keys. */
export const sanitizeLawStorageName = (rawName: string): string => {
  const withoutExt = rawName.replace(/\.[^/.]+$/, '');
  const slug = withoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || 'ato-normativo';
};

/** Notifies open modules and the public site that municipal laws changed. */
export const dispatchLawsUpdated = (institutionId?: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LAWS_UPDATED_EVENT, { detail: { institutionId } }));
};

const readFileAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler arquivo localmente'));
    reader.readAsDataURL(file);
  });

const isDefaultDemoTenant = (institutionId?: string | null) =>
  !institutionId || institutionId === 'inst_1' || institutionId === 'default';

const readLawsCache = (institutionId?: string | null): MunicipalLaw[] => {
  if (typeof window === 'undefined') return [];
  try {
    const scoped = localStorage.getItem(getLawsCacheKey(institutionId));
    const raw =
      scoped ?? (isDefaultDemoTenant(institutionId) ? localStorage.getItem(LEGACY_LAWS_CACHE_KEY) : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => !isLegacyMockLaw(item))
      .map((item) => ({
        ...item,
        publish_on_site: item.publish_on_site ?? true,
        site_featured: Boolean(item.site_featured),
      }));
  } catch {
    return [];
  }
};

const writeLawsCache = (items: MunicipalLaw[], institutionId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const clean = items.filter((item) => !isLegacyMockLaw(item));
    const payload = JSON.stringify(clean);
    localStorage.setItem(getLawsCacheKey(institutionId), payload);
    if (isDefaultDemoTenant(institutionId)) {
      localStorage.setItem(LEGACY_LAWS_CACHE_KEY, payload);
    }
  } catch {
    // Ignora limite de quota no navegador
  }
};

export const isLawsClearedByAdmin = (institutionId?: string | null): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return (
      localStorage.getItem(getLawsClearedKey(institutionId)) === 'true' ||
      localStorage.getItem(LEGACY_LAWS_CLEARED_KEY) === 'true'
    );
  } catch {
    return false;
  }
};

const setLawsClearedFlag = (cleared: boolean, institutionId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (cleared) {
      localStorage.setItem(getLawsClearedKey(institutionId), 'true');
      localStorage.setItem(LEGACY_LAWS_CLEARED_KEY, 'true');
    } else {
      localStorage.removeItem(getLawsClearedKey(institutionId));
      localStorage.removeItem(LEGACY_LAWS_CLEARED_KEY);
    }
  } catch {
    // ignora
  }
};

const parseLawNumberParts = (numStr: string) => {
  const parts = (numStr || '').split('/');
  const num = parseInt((parts[0] || '0').replace(/\D/g, ''), 10) || 0;
  const rawYear = parseInt(parts[1] || '0', 10) || 0;
  const year = rawYear > 0 && rawYear < 100 ? (rawYear > 50 ? 1900 + rawYear : 2000 + rawYear) : rawYear;
  return { year, num };
};

export const sortMunicipalLaws = (items: MunicipalLaw[], prioritizeSiteFeatured = false): MunicipalLaw[] =>
  [...items].sort((a, b) => {
    if (prioritizeSiteFeatured) {
      const featDiff = Number(Boolean(b.site_featured)) - Number(Boolean(a.site_featured));
      if (featDiff !== 0) return featDiff;
    }

    const dateA = a.publication_date ? new Date(a.publication_date).getTime() : 0;
    const dateB = b.publication_date ? new Date(b.publication_date).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;

    const pA = parseLawNumberParts(a.number);
    const pB = parseLawNumberParts(b.number);
    if (pB.year !== pA.year) return pB.year - pA.year;
    return pB.num - pA.num;
  });

/** Builds Supabase insert/update payload safely, toggling extended columns for forward compatibility. */
export const buildLawSupabasePayload = (law: Partial<MunicipalLaw>, includeExtended = true) => {
  const base: Record<string, any> = {
    number: law.number || '',
    title: law.title || '',
    type: law.type || 'Lei Ordinária',
    category: law.category || 'Administração Geral',
    publication_date: law.publication_date || new Date().toISOString().split('T')[0],
    status: law.status || 'Em Vigor',
    author: law.author || '',
    ementa: law.ementa || '',
    full_text: law.full_text || '',
    tags: Array.isArray(law.tags) ? law.tags : [],
    file_url: law.file_url || null,
    external_link: law.external_link || null,
  };

  if (isValidUuid(law.id)) base.id = law.id;
  if (law.institution_id && law.institution_id.trim()) base.institution_id = law.institution_id.trim();

  if (includeExtended) {
    if (law.origin_power) base.origin_power = law.origin_power;
    if (law.compiled_text !== undefined && law.compiled_text !== null) base.compiled_text = law.compiled_text;
    if (law.is_compiled !== undefined) base.is_compiled = law.is_compiled;
    if (law.materia_numero) base.materia_numero = law.materia_numero;
    if (law.materia_id) base.materia_id = law.materia_id;
    if (law.parent_law_id) base.parent_law_id = law.parent_law_id;
    if (law.parent_law_number) base.parent_law_number = law.parent_law_number;
    if (law.parent_law_title) base.parent_law_title = law.parent_law_title;
    if (law.revoked_by_id) base.revoked_by_id = law.revoked_by_id;
    if (law.revoked_by_number) base.revoked_by_number = law.revoked_by_number;
    if (law.publish_on_site !== undefined) base.publish_on_site = law.publish_on_site;
    if (law.site_featured !== undefined) base.site_featured = law.site_featured;
  }

  return base;
};

/** Uploads an official PDF using an ASCII-safe key on valid UUID tenants, falling back to Data URL when needed. */
export const uploadLawPdf = async (
  pdfFile: File,
  institution?: Institution | string | null
): Promise<string | undefined> => {
  const instId = resolveInstitutionId(institution);
  const safeBase = sanitizeLawStorageName(pdfFile.name);
  const extMatch = pdfFile.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';

  if (canSyncRemoteLaws(institution, instId)) {
    const safeInst = sanitizeLawStorageName(instId);
    const filename = `${safeInst}/law_${Date.now()}_${safeBase}.${ext}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('leis')
        .upload(filename, pdfFile, {
          upsert: true,
          contentType: pdfFile.type || 'application/pdf',
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('leis').getPublicUrl(filename);
        return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('[municipalLaws] Falha no upload do PDF para storage, tentando inline:', err);
    }
  }

  if (pdfFile.size <= MAX_INLINE_PDF_BYTES) {
    try {
      return await readFileAsDataUrl(pdfFile);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

export interface FetchLawsOptions {
  onlySitePublished?: boolean;
  prioritizeFeatured?: boolean;
  seedIfEmpty?: boolean;
}

/** Fetches institution laws from Supabase (valid UUIDs) or local cache, preserving local-first resilience. */
export const fetchInstitutionLaws = async (
  institution?: Institution | string | null,
  options: FetchLawsOptions = {}
): Promise<MunicipalLaw[]> => {
  const instId = resolveInstitutionId(institution);
  const cleared = isLawsClearedByAdmin(instId);

  const applyFilters = (items: MunicipalLaw[]) => {
    const clean = items
      .filter((item) => !isLegacyMockLaw(item))
      .map((item) => ({
        ...item,
        publish_on_site: item.publish_on_site ?? true,
        site_featured: Boolean(item.site_featured),
      }));

    const filtered = options.onlySitePublished
      ? clean.filter((item) => item.publish_on_site !== false)
      : clean;

    return sortMunicipalLaws(filtered, Boolean(options.prioritizeFeatured));
  };

  const isTorixoreuTenant =
    instId === 'inst_1' ||
    (typeof institution === 'object' &&
      institution?.subdomain?.toLowerCase().trim() === 'torixoreu');

  if (!canSyncRemoteLaws(institution, instId)) {
    const cached = readLawsCache(instId);
    if (cached.length === 0 && options.seedIfEmpty && !cleared && isTorixoreuTenant) {
      writeLawsCache(INITIAL_REAL_LAWS, instId);
      return applyFilters(INITIAL_REAL_LAWS);
    }
    return applyFilters(cached);
  }

  try {
    const { data, error } = await supabase
      .from('municipal_laws')
      .select('*')
      .eq('institution_id', instId)
      .order('publication_date', { ascending: false });

    if (!error && Array.isArray(data)) {
      const realLaws = (data as MunicipalLaw[]).filter((item) => !isLegacyMockLaw(item));

      if (realLaws.length === 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = Boolean(sessionData?.session);
        const cached = readLawsCache(instId);
        if (cached.length > 0) {
          if (hasSession) {
            // Promove para a nuvem as leis que estavam presas apenas no cache local (somente autenticado)
            const syncPayloads = cached.map((law) => {
              const p = buildLawSupabasePayload({ ...law, institution_id: instId }, true);
              p.id = isValidUuid(law.id) ? law.id : crypto.randomUUID();
              return p;
            });
            supabase.from('municipal_laws').upsert(syncPayloads, { onConflict: 'id' }).then(() => {});
          }
          return applyFilters(cached);
        }
        if (options.seedIfEmpty && !cleared && isTorixoreuTenant) {
          const seeded = INITIAL_REAL_LAWS.map((seed) => ({
            ...seed,
            institution_id: instId,
            publish_on_site: true,
          }));
          writeLawsCache(seeded, instId);
          if (hasSession) {
            for (const seedLaw of seeded) {
              const payload = buildLawSupabasePayload(seedLaw, false);
              payload.id = seedLaw.id;
              supabase.from('municipal_laws').insert([payload]).then();
            }
          }
          return applyFilters(seeded);
        }
        return [];
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = Boolean(sessionData?.session);

      // Enriquecer registros legados com texto incompleto usando sementes oficiais correspondentes
      const enrichedLaws = realLaws.map((existing) => {
        const cleanNum = String(existing.number || '').split('/')[0].replace(/\D/g, '');
        const matchedSeed = INITIAL_REAL_LAWS.find(
          (s) => s.id === existing.id || String(s.number).split('/')[0].replace(/\D/g, '') === cleanNum
        );
        const hasIncompleteText =
          !existing.full_text ||
          existing.full_text.length < 160 ||
          /Documento oficial anexo/i.test(existing.full_text);

        if (matchedSeed && hasIncompleteText) {
          const repaired: MunicipalLaw = {
            ...existing,
            number: matchedSeed.number,
            title: matchedSeed.title,
            type: matchedSeed.type,
            category: matchedSeed.category,
            publication_date: matchedSeed.publication_date,
            author: matchedSeed.author,
            origin_power: matchedSeed.origin_power,
            ementa: matchedSeed.ementa,
            full_text: matchedSeed.full_text,
            tags: matchedSeed.tags,
          };
          if (hasSession) {
            const updatePayload = buildLawSupabasePayload(repaired, false);
            delete updatePayload.id;
            supabase.from('municipal_laws').update(updatePayload).eq('id', existing.id).then();
          }
          return repaired;
        }
        return existing;
      });

      writeLawsCache(enrichedLaws, instId);
      return applyFilters(enrichedLaws);
    }
  } catch (err) {
    console.warn('[municipalLaws] Erro ao carregar leis do Supabase:', err);
  }

  const fallback = readLawsCache(instId);
  if (fallback.length === 0 && options.seedIfEmpty && !cleared && isTorixoreuTenant) {
    return applyFilters(INITIAL_REAL_LAWS);
  }
  return applyFilters(fallback);
};

/** Saves (inserts or updates) a municipal law across Supabase and local cache, emitting update events. */
export const saveInstitutionLawItem = async (
  lawData: Partial<MunicipalLaw>,
  institution?: Institution | string | null,
  pdfFile?: File | null
): Promise<{ item: MunicipalLaw; syncedRemote: boolean }> => {
  const instId = resolveInstitutionId(institution);
  let fileUrl = lawData.file_url;

  if (pdfFile) {
    const uploaded = await uploadLawPdf(pdfFile, instId);
    if (uploaded) {
      fileUrl = uploaded;
    }
  }

  const isUpdating = Boolean(lawData.id && isValidUuid(lawData.id));
  const finalId = isUpdating && lawData.id ? lawData.id : crypto.randomUUID();

  const fullLaw: MunicipalLaw = {
    id: finalId,
    number: lawData.number?.trim() || '',
    title: lawData.title?.trim() || '',
    type: (lawData.type as MunicipalLaw['type']) || 'Lei Ordinária',
    category: lawData.category || 'Administração Geral',
    ementa: lawData.ementa?.trim() || '',
    publication_date: lawData.publication_date || new Date().toISOString().split('T')[0],
    status: (lawData.status as MunicipalLaw['status']) || 'Em Vigor',
    full_text: lawData.full_text || '',
    compiled_text: lawData.compiled_text || undefined,
    is_compiled: Boolean(lawData.is_compiled),
    author: lawData.author?.trim() || '',
    origin_power: lawData.origin_power || 'executivo',
    materia_id: lawData.materia_id,
    materia_numero: lawData.materia_numero,
    parent_law_id: lawData.parent_law_id,
    parent_law_number: lawData.parent_law_number,
    parent_law_title: lawData.parent_law_title,
    revoked_by_id: lawData.revoked_by_id,
    revoked_by_number: lawData.revoked_by_number,
    file_url: fileUrl || undefined,
    external_link: lawData.external_link || undefined,
    tags: Array.isArray(lawData.tags) ? lawData.tags : [],
    publish_on_site: lawData.publish_on_site ?? true,
    site_featured: Boolean(lawData.site_featured),
    institution_id: instId,
    created_at: lawData.created_at || new Date().toISOString(),
  };

  let syncedRemote = false;
  let finalRecord: MunicipalLaw = fullLaw;

  if (canSyncRemoteLaws(institution, instId)) {
    if (isUpdating) {
      let updatePayload = buildLawSupabasePayload(fullLaw, true);
      delete updatePayload.id;

      let { data: updatedRecord, error } = await supabase
        .from('municipal_laws')
        .update(updatePayload)
        .eq('id', finalId)
        .select()
        .maybeSingle();

      if (error) {
        updatePayload = buildLawSupabasePayload(fullLaw, false);
        delete updatePayload.id;
        const retry = await supabase
          .from('municipal_laws')
          .update(updatePayload)
          .eq('id', finalId)
          .select()
          .maybeSingle();

        if (!retry.error) {
          updatedRecord = retry.data;
          error = null;
        }
      }

      if (!error) {
        syncedRemote = true;
        if (updatedRecord) {
          finalRecord = { ...fullLaw, ...(updatedRecord as MunicipalLaw) };
        }
      }
    } else {
      let insertPayload = buildLawSupabasePayload(fullLaw, true);
      insertPayload.id = finalId;

      let { data: insertedRecord, error } = await supabase
        .from('municipal_laws')
        .insert([insertPayload])
        .select()
        .maybeSingle();

      if (error) {
        insertPayload = buildLawSupabasePayload(fullLaw, false);
        insertPayload.id = finalId;
        const retry = await supabase
          .from('municipal_laws')
          .insert([insertPayload])
          .select()
          .maybeSingle();

        if (!retry.error) {
          insertedRecord = retry.data;
          error = null;
        }
      }

      if (!error) {
        syncedRemote = true;
        if (insertedRecord) {
          finalRecord = { ...fullLaw, ...(insertedRecord as MunicipalLaw) };
        }
      }
    }
  }

  setLawsClearedFlag(false, instId);
  const current = readLawsCache(instId);
  const exists = current.some((item) => item.id === finalRecord.id);
  const updated = exists
    ? current.map((item) => (item.id === finalRecord.id ? finalRecord : item))
    : [finalRecord, ...current];

  writeLawsCache(updated, instId);
  dispatchLawsUpdated(instId);

  return { item: finalRecord, syncedRemote };
};

/** Saves a batch of extracted/imported laws cleanly across Supabase and local cache. */
export const saveInstitutionLawsBatch = async (
  lawsToSave: Array<{ data: Partial<MunicipalLaw>; file?: File }>,
  institution?: Institution | string | null
): Promise<{ items: MunicipalLaw[]; syncedRemote: boolean }> => {
  const instId = resolveInstitutionId(institution);
  const prepared: MunicipalLaw[] = [];

  for (const entry of lawsToSave) {
    const { data, file } = entry;
    let fileUrl = data.file_url;

    if (file) {
      const uploaded = await uploadLawPdf(file, instId);
      if (uploaded) fileUrl = uploaded;
    }

    prepared.push({
      id: crypto.randomUUID(),
      number: data.number?.trim() || '',
      title: data.title?.trim() || '',
      type: (data.type as MunicipalLaw['type']) || 'Lei Ordinária',
      category: data.category || 'Finanças e Tributos',
      ementa: data.ementa?.trim() || '',
      publication_date: data.publication_date || new Date().toISOString().split('T')[0],
      status: (data.status as MunicipalLaw['status']) || 'Em Vigor',
      full_text: data.full_text || '',
      compiled_text: data.compiled_text || undefined,
      is_compiled: Boolean(data.is_compiled),
      author: data.author,
      origin_power: data.origin_power || 'executivo',
      materia_numero: data.materia_numero,
      file_url: fileUrl,
      tags: data.tags || [],
      publish_on_site: data.publish_on_site ?? true,
      site_featured: Boolean(data.site_featured),
      institution_id: instId,
      created_at: new Date().toISOString(),
    });
  }

  let syncedRemote = false;
  let finalItems = prepared;

  if (canSyncRemoteLaws(institution, instId) && prepared.length > 0) {
    try {
      const extendedPayloads = prepared.map((law) => {
        const p = buildLawSupabasePayload(law, true);
        p.id = law.id;
        return p;
      });

      let { data: insertedList, error } = await supabase
        .from('municipal_laws')
        .insert(extendedPayloads)
        .select();

      if (error) {
        const basePayloads = prepared.map((law) => {
          const p = buildLawSupabasePayload(law, false);
          p.id = law.id;
          return p;
        });
        const retry = await supabase.from('municipal_laws').insert(basePayloads).select();
        if (!retry.error) {
          insertedList = retry.data;
          error = null;
        }
      }

      if (!error) {
        syncedRemote = true;
        finalItems = prepared.map((orig) => {
          const match = (insertedList || []).find((row: any) => row.id === orig.id);
          return match ? { ...orig, ...(match as MunicipalLaw) } : orig;
        });
      }
    } catch (err) {
      console.warn('[municipalLaws] Erro no lote remoto:', err);
    }
  }

  setLawsClearedFlag(false, instId);
  const existing = readLawsCache(instId);
  writeLawsCache([...finalItems, ...existing], instId);
  dispatchLawsUpdated(instId);

  return { items: finalItems, syncedRemote };
};

/** Applies partial updates (e.g. publish_on_site, site_featured) cleanly and dispatches sync events. */
export const updateInstitutionLawPartial = async (
  id: string,
  patch: Partial<MunicipalLaw>,
  institution?: Institution | string | null
): Promise<boolean> => {
  const instId = resolveInstitutionId(institution);
  let syncedRemote = false;

  if (canSyncRemoteLaws(institution, instId) && isValidUuid(id)) {
    const { error } = await supabase
      .from('municipal_laws')
      .update(patch)
      .eq('id', id)
      .eq('institution_id', instId);
    syncedRemote = !error;
  }

  const current = readLawsCache(instId);
  const updated = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
  writeLawsCache(updated, instId);
  dispatchLawsUpdated(instId);

  return syncedRemote;
};

/** Removes a single law from Supabase (if UUID) and local cache. */
export const deleteInstitutionLawItem = async (
  id: string,
  institution?: Institution | string | null
): Promise<void> => {
  const instId = resolveInstitutionId(institution);
  setLawsClearedFlag(true, instId);

  if (canSyncRemoteLaws(institution, instId) && isValidUuid(id)) {
    try {
      await supabase.from('municipal_laws').delete().eq('id', id).eq('institution_id', instId);
    } catch (err) {
      console.warn('[municipalLaws] Aviso ao remover norma no Supabase:', err);
    }
  }

  const current = readLawsCache(instId);
  writeLawsCache(current.filter((item) => item.id !== id), instId);
  dispatchLawsUpdated(instId);
};

/** Clears all laws for the institution cleanly across Supabase and local cache. */
export const deleteAllInstitutionLaws = async (
  currentLaws: MunicipalLaw[],
  institution?: Institution | string | null
): Promise<void> => {
  const instId = resolveInstitutionId(institution);
  setLawsClearedFlag(true, instId);
  writeLawsCache([], instId);

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('gestao360_demo_laws');
    } catch {
      // ignora
    }
  }

  if (canSyncRemoteLaws(institution, instId)) {
    const idsToDelete = new Set<string>(currentLaws.map((l) => l.id).filter(Boolean));
    try {
      const { data: remoteRows } = await supabase
        .from('municipal_laws')
        .select('id')
        .eq('institution_id', instId);
      if (Array.isArray(remoteRows)) {
        remoteRows.forEach((r: any) => {
          if (r.id) idsToDelete.add(r.id);
        });
      }
    } catch {
      // ignora
    }

    const allIds = Array.from(idsToDelete).filter((id) => isValidUuid(id));
    for (let i = 0; i < allIds.length; i += 50) {
      const chunk = allIds.slice(i, i + 50);
      await supabase.from('municipal_laws').delete().in('id', chunk).eq('institution_id', instId);
    }
  }

  dispatchLawsUpdated(instId);
};
