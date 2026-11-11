import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Newspaper,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  Building2,
  Star,
  Globe,
  EyeOff,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminUser, Institution, MunicipalNews } from '../types';
import { NewsEditor } from '../modules/Noticias/NewsEditor';
import { withInstitutionQuery } from '../lib/institutionModules';
import { showToast } from './ui/Toast';
import {
  fetchInstitutionNews,
  saveInstitutionNewsItem,
  deleteInstitutionNewsItem,
  updateInstitutionNewsPartial,
  getNextNewsStatus,
  NEWS_UPDATED_EVENT,
} from '../lib/api/municipalNews';

interface SiteNewsManagerPanelProps {
  currentInstitution: Institution;
  currentUser?: AdminUser | null;
  onStatsChange?: (publishedCount: number) => void;
}

export const SiteNewsManagerPanel: React.FC<SiteNewsManagerPanelProps> = ({
  currentInstitution,
  currentUser,
  onStatsChange,
}) => {
  const [items, setItems] = useState<MunicipalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MunicipalNews | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const onStatsChangeRef = useRef(onStatsChange);
  onStatsChangeRef.current = onStatsChange;

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchInstitutionNews(currentInstitution);
      setItems(list);
      if (onStatsChangeRef.current) {
        onStatsChangeRef.current(list.filter((n) => n.status === 'published').length);
      }
    } finally {
      setLoading(false);
    }
  }, [currentInstitution.id]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === currentInstitution.id) {
        loadNews();
      }
    };
    window.addEventListener(NEWS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(NEWS_UPDATED_EVENT, onUpdated);
  }, [currentInstitution.id, loadNews]);

  const publishedRankMap = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 1;
    for (const item of items) {
      if (item.status === 'published') {
        map.set(item.id, rank);
        rank += 1;
      }
    }
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const publishedCount = items.filter((n) => n.status === 'published').length;
  const draftCount = items.filter((n) => n.status === 'draft').length;

  const handleSave = async (payload: Partial<MunicipalNews>) => {
    const res = await saveInstitutionNewsItem(currentInstitution, payload, editingItem);
    setEditorOpen(false);
    setEditingItem(null);
    await loadNews();

    if (res.syncedToCloud) {
      showToast(
        editingItem ? 'Notícia atualizada e sincronizada no site!' : 'Notícia publicada no site com sucesso!',
        'success'
      );
    } else {
      showToast(
        `Notícia salva localmente${res.error ? ` (aviso nuvem: ${res.error})` : ''}.`,
        'warning'
      );
    }
  };

  const handleToggleStatus = async (item: MunicipalNews) => {
    const nextStatus = getNextNewsStatus(item.status);
    await updateInstitutionNewsPartial(currentInstitution, item, { status: nextStatus });
    await loadNews();
    showToast(
      nextStatus === 'published'
        ? 'Notícia publicada no site institucional!'
        : 'Notícia movida para rascunho.',
      'success'
    );
  };

  const handleToggleFeatured = async (item: MunicipalNews) => {
    const nextFeatured = !item.is_featured;
    await updateInstitutionNewsPartial(currentInstitution, item, { is_featured: nextFeatured });
    await loadNews();
    showToast(
      nextFeatured ? 'Notícia marcada como destaque!' : 'Destaque removido.',
      'success'
    );
  };

  const handleDelete = async (id: string) => {
    const res = await deleteInstitutionNewsItem(currentInstitution, id);
    setConfirmDeleteId(null);
    await loadNews();
    if (res.syncedToCloud) {
      showToast('Notícia excluída do portal.', 'success');
    } else {
      showToast('Notícia removida da listagem local.', 'info');
    }
  };

  const formatDate = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-5">
      {/* Banner explicativo do fluxo automático Carrossel + 3 Fixas */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
            <Newspaper size={16} />
            <span>Painel Editorial de Notícias do Site</span>
          </div>
          <p className="text-xs text-emerald-700/90 dark:text-emerald-200/80 leading-relaxed">
            Publique e gerencie as matérias da prefeitura. As notícias com status <strong>Publicada</strong> alimentam automaticamente o <strong>Carrossel de Imagens</strong> (até 10 recentes) e o bloco das <strong>3 Últimas Notícias Fixas</strong> na página inicial.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setEditorOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition shrink-0 cursor-pointer"
        >
          <Plus size={15} />
          <span>Publicar Notícia</span>
        </button>
      </div>

      {/* Filtros e Métricas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            Todas ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            Publicadas ({publishedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            Rascunhos ({draftCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notícias..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={loadNews}
            title="Atualizar lista"
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Lista de Notícias */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-3">
          <Newspaper size={30} className="mx-auto text-neutral-400" />
          <div className="space-y-1">
            <h5 className="text-sm font-black">Nenhuma notícia encontrada</h5>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              {items.length === 0
                ? 'Clique em "Publicar Notícia" para criar a primeira matéria oficial deste município e exibir no site.'
                : 'Tente alterar os filtros ou o termo de busca.'}
            </p>
          </div>
          {items.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Criar Primeira Notícia</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const pubRank = publishedRankMap.get(item.id);
            const isDraft = item.status !== 'published';
            const isDeleting = confirmDeleteId === item.id;

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center shrink-0">
                      <ImageIcon size={20} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isDraft
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        }`}
                      >
                        {isDraft ? <EyeOff size={10} /> : <CheckCircle2 size={10} />}
                        {isDraft ? 'Rascunho' : 'Publicada'}
                      </span>

                      {pubRank !== undefined && pubRank <= 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 text-[10px] font-black uppercase">
                          Fixa #{pubRank} + Carrossel
                        </span>
                      )}

                      {pubRank !== undefined && pubRank > 3 && pubRank <= 10 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase">
                          No Carrossel
                        </span>
                      )}

                      {item.is_featured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] font-black uppercase">
                          <Star size={10} className="fill-current" /> Destaque
                        </span>
                      )}

                      <span className="text-[10px] font-bold text-neutral-400 uppercase">
                        · {item.category}
                      </span>
                    </div>

                    <h5 className="text-sm font-black text-neutral-900 dark:text-white truncate">
                      {item.title}
                    </h5>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(item.published_at)}
                      </span>
                      {item.department && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                          <Building2 size={11} />
                          {item.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas */}
                {isDeleting ? (
                  <div className="flex items-center gap-2 shrink-0 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-500/20">
                    <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      Excluir?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[11px] font-bold cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      title={isDraft ? 'Publicar no site' : 'Mover para rascunho'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer ${
                        isDraft
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      {isDraft ? <Globe size={12} /> : <EyeOff size={12} />}
                      <span>{isDraft ? 'Publicar' : 'Ocultar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(item)}
                      title={item.is_featured ? 'Remover destaque' : 'Marcar como destaque'}
                      className={`p-1.5 rounded-xl transition cursor-pointer ${
                        item.is_featured
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200'
                      }`}
                    >
                      <Star size={14} className={item.is_featured ? 'fill-current' : ''} />
                    </button>

                    {!isDraft && (
                      <a
                        href={withInstitutionQuery(`/noticias?id=${item.id}`, currentInstitution)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Visualizar matéria no site público"
                        className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setEditorOpen(true);
                      }}
                      title="Editar notícia"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      title="Excluir notícia"
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Completo de Matéria */}
      {editorOpen && (
        <NewsEditor
          initialNews={editingItem}
          onSave={handleSave}
          onClose={() => {
            setEditorOpen(false);
            setEditingItem(null);
          }}
          currentUserName={currentUser?.name}
          institutionId={currentInstitution.id}
        />
      )}
    </div>
  );
};

export default SiteNewsManagerPanel;

