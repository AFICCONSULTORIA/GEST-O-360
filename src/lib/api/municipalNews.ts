/**
 * Serviço compartilhado de Leitura, Publicação e Gerenciamento de Notícias Municipais.
 * Integra `public.municipal_news` (Supabase) ao cache local isolado por município e ao Site Institucional.
 */
import { Institution, MunicipalNews, NewsStatus } from '../../types';
import { supabase } from '../supabase';
import { isDemoEnvironment } from '../demoManager';
import { MOCK_MUNICIPAL_NEWS } from '../../modules/Noticias/mockNews';

export const NEWS_UPDATED_EVENT = 'gestao360:news-updated';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

const newsStorageKey = (institutionId?: string | null) =>
  institutionId ? `gestao360_municipal_news_${institutionId}` : 'gestao360_municipal_news';

function readLocalNewsCache(institution?: Institution | null): MunicipalNews[] {
  if (typeof window === 'undefined') return [];
  try {
    const scopedRaw = localStorage.getItem(newsStorageKey(institution?.id));
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw);
      if (Array.isArray(parsed)) return parsed;
    }
    if (isDemoEnvironment(institution)) {
      const legacyRaw = localStorage.getItem('gestao360_municipal_news');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) return parsed;
      }
      return MOCK_MUNICIPAL_NEWS;
    }
  } catch {
    // ignora erro de localStorage
  }
  return [];
}

function writeLocalNewsCache(institutionId: string | undefined, items: MunicipalNews[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(newsStorageKey(institutionId), JSON.stringify(items));
    if (!institutionId) {
      localStorage.setItem('gestao360_municipal_news', JSON.stringify(items));
    }
  } catch {
    // ignora erro de quota
  }
}

function emitNewsUpdated(institutionId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NEWS_UPDATED_EVENT, { detail: { institutionId } })
    );
  }
}

function sortNewsDescending(items: MunicipalNews[]): MunicipalNews[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.published_at || a.created_at || 0).getTime();
    const db = new Date(b.published_at || b.created_at || 0).getTime();
    return db - da;
  });
}

export async function fetchInstitutionNews(
  institution?: Institution | null,
  options?: { onlyPublished?: boolean; limit?: number }
): Promise<MunicipalNews[]> {
  const onlyPublished = Boolean(options?.onlyPublished);
  const isDemo = isDemoEnvironment(institution);
  const canQueryRemote = !institution?.id || isValidUuid(institution.id);

  if (canQueryRemote) {
    try {
      let query = supabase
        .from('municipal_news')
        .select('*')
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (institution?.id && isValidUuid(institution.id)) {
        query = query.eq('institution_id', institution.id);
      }
      if (onlyPublished) {
        query = query.eq('status', 'published');
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error && data) {
        const list = data as MunicipalNews[];
        if (list.length > 0) {
          if (!onlyPublished) writeLocalNewsCache(institution?.id, list);
          return list;
        }
        const localCached = readLocalNewsCache(institution);
        const filtered = onlyPublished
          ? localCached.filter((n) => n.status === 'published')
          : localCached;
        if (filtered.length > 0) {
          return options?.limit ? sortNewsDescending(filtered).slice(0, options.limit) : sortNewsDescending(filtered);
        }
        return isDemo
          ? (options?.limit ? MOCK_MUNICIPAL_NEWS.slice(0, options.limit) : MOCK_MUNICIPAL_NEWS)
          : [];
      }
    } catch (err) {
      console.warn('[municipalNews] Falha ao consultar Supabase, usando cache local:', err);
    }
  }

  const localCached = readLocalNewsCache(institution);
  const filtered = onlyPublished
    ? localCached.filter((n) => n.status === 'published')
    : localCached;
  const sorted = sortNewsDescending(filtered);
  return options?.limit ? sorted.slice(0, options.limit) : sorted;
}

export async function saveInstitutionNewsItem(
  institution: Institution | null | undefined,
  newsData: Partial<MunicipalNews>,
  editingNews?: MunicipalNews | null
): Promise<{ success: boolean; syncedToCloud: boolean; error?: string; item: MunicipalNews }> {
  const nowIso = new Date().toISOString();
  const institutionId = editingNews?.institution_id || institution?.id;

  const fullItem: MunicipalNews = editingNews
    ? {
        ...editingNews,
        ...newsData,
        institution_id: institutionId,
        updated_at: nowIso,
      }
    : {
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: newsData.title || '',
        subtitle: newsData.subtitle,
        content: newsData.content || '',
        category: newsData.category || 'Nota Oficial',
        department: newsData.department,
        author_name: newsData.author_name || 'Assessoria de Comunicação',
        published_at: newsData.published_at || nowIso,
        status: newsData.status || 'published',
        is_featured: Boolean(newsData.is_featured),
        badge: newsData.badge,
        cover_image_url: newsData.cover_image_url,
        gallery_urls: newsData.gallery_urls || [],
        project_status: newsData.project_status,
        project_budget: newsData.project_budget,
        institution_id: institutionId,
        views_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
      };

  const dbRecord = {
    id: fullItem.id,
    institution_id: fullItem.institution_id || null,
    title: fullItem.title,
    subtitle: fullItem.subtitle || null,
    content: fullItem.content,
    category: fullItem.category,
    department: fullItem.department || null,
    author_name: fullItem.author_name || null,
    published_at: fullItem.published_at,
    status: fullItem.status,
    is_featured: Boolean(fullItem.is_featured),
    badge: fullItem.badge || null,
    cover_image_url: fullItem.cover_image_url || null,
    gallery_urls: fullItem.gallery_urls || [],
    project_status: fullItem.project_status || null,
    project_budget: fullItem.project_budget ?? null,
    views_count: fullItem.views_count || 0,
    updated_at: nowIso,
  };

  let syncedToCloud = false;
  let cloudError: string | undefined;

  if (isValidUuid(fullItem.institution_id)) {
    try {
      const { error } = editingNews
        ? await supabase.from('municipal_news').update(dbRecord).eq('id', fullItem.id)
        : await supabase.from('municipal_news').insert(dbRecord);

      if (!error) {
        syncedToCloud = true;
      } else {
        cloudError = error.message;
        console.warn('[municipalNews] Erro ao sincronizar com Supabase:', error.message);
      }
    } catch (err: any) {
      cloudError = err?.message || 'Erro de conexão com o banco de dados';
    }
  } else {
    syncedToCloud = true;
  }

  const existingLocal = readLocalNewsCache(institution);
  const nextLocal = editingNews
    ? existingLocal.map((n) => (n.id === fullItem.id ? fullItem : n))
    : [fullItem, ...existingLocal.filter((n) => n.id !== fullItem.id)];
  writeLocalNewsCache(institutionId, sortNewsDescending(nextLocal));
  emitNewsUpdated(institutionId);

  return {
    success: true,
    syncedToCloud,
    error: cloudError,
    item: fullItem,
  };
}

export async function deleteInstitutionNewsItem(
  institution: Institution | null | undefined,
  newsId: string
): Promise<{ syncedToCloud: boolean; error?: string }> {
  let syncedToCloud = false;
  let cloudError: string | undefined;

  if (isValidUuid(institution?.id) && isValidUuid(newsId)) {
    try {
      const { error } = await supabase.from('municipal_news').delete().eq('id', newsId);
      if (!error) syncedToCloud = true;
      else cloudError = error.message;
    } catch (err: any) {
      cloudError = err?.message;
    }
  } else {
    syncedToCloud = true;
  }

  const nextLocal = readLocalNewsCache(institution).filter((n) => n.id !== newsId);
  writeLocalNewsCache(institution?.id, nextLocal);
  emitNewsUpdated(institution?.id);

  return { syncedToCloud, error: cloudError };
}

export async function updateInstitutionNewsPartial(
  institution: Institution | null | undefined,
  item: MunicipalNews,
  patch: Partial<MunicipalNews>
): Promise<{ syncedToCloud: boolean; item: MunicipalNews }> {
  const updated: MunicipalNews = {
    ...item,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  let syncedToCloud = false;
  if (isValidUuid(institution?.id) && isValidUuid(item.id)) {
    try {
      const { error } = await supabase
        .from('municipal_news')
        .update({
          ...patch,
          updated_at: updated.updated_at,
        })
        .eq('id', item.id);
      if (!error) syncedToCloud = true;
    } catch {
      // mantém atualização local
    }
  } else {
    syncedToCloud = true;
  }

  const existingLocal = readLocalNewsCache(institution);
  const nextLocal = existingLocal.map((n) => (n.id === item.id ? updated : n));
  writeLocalNewsCache(institution?.id, nextLocal);
  emitNewsUpdated(institution?.id);

  return { syncedToCloud, item: updated };
}

export function getNextNewsStatus(current: NewsStatus): NewsStatus {
  return current === 'published' ? 'draft' : 'published';
}

