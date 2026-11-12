import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Files,
  Globe,
  Landmark,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { Institution, MunicipalLaw } from '../types';
import {
  LAWS_UPDATED_EVENT,
  deleteInstitutionLawItem,
  fetchInstitutionLaws,
  saveInstitutionLawItem,
  saveInstitutionLawsBatch,
  updateInstitutionLawPartial,
} from '../lib/api/municipalLaws';
import { LawFormModal, LAW_TYPES } from '../modules/Laws/components/LawFormModal';
import { LawBatchImportModal } from '../modules/Laws/components/LawBatchImportModal';
import { LawReaderModal } from '../modules/Laws/components/LawReaderModal';
import { showToast } from './ui/Toast';

interface SiteLawsManagerPanelProps {
  currentInstitution: Institution;
  showLawsSection: boolean;
  onToggleShowLawsSection: (enabled: boolean) => void;
  onStatsChange?: (publishedOnSiteCount: number) => void;
}

const formatDatePtBr = (isoDate?: string) => {
  if (!isoDate) return '';
  const dt = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('pt-BR');
};

export const SiteLawsManagerPanel: React.FC<SiteLawsManagerPanelProps> = ({
  currentInstitution,
  showLawsSection,
  onToggleShowLawsSection,
  onStatsChange,
}) => {
  const [laws, setLaws] = useState<MunicipalLaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [yearFilter, setYearFilter] = useState<string>('Todos');
  const [visibilityFilter, setVisibilityFilter] = useState<
    'all' | 'published' | 'featured' | 'hidden'
  >('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [editingLaw, setEditingLaw] = useState<MunicipalLaw | null>(null);
  const [readingLaw, setReadingLaw] = useState<MunicipalLaw | null>(null);

  const onStatsChangeRef = useRef(onStatsChange);
  onStatsChangeRef.current = onStatsChange;

  const loadLaws = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchInstitutionLaws(currentInstitution, {
        prioritizeFeatured: true,
        seedIfEmpty: true,
      });
      setLaws(list);
      const publishedCount = list.filter((item) => item.publish_on_site !== false).length;
      onStatsChangeRef.current?.(publishedCount);
    } finally {
      setLoading(false);
    }
  }, [currentInstitution]);

  useEffect(() => {
    loadLaws();

    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === currentInstitution.id) {
        loadLaws();
      }
    };

    window.addEventListener(LAWS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(LAWS_UPDATED_EVENT, onUpdated);
  }, [loadLaws, currentInstitution.id]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    laws.forEach((law) => {
      if (law.publication_date) {
        years.add(law.publication_date.slice(0, 4));
      }
      const parts = (law.number || '').split('/');
      if (parts[1] && /^\d{4}$/.test(parts[1])) {
        years.add(parts[1]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [laws]);

  const metrics = useMemo(() => {
    const published = laws.filter((l) => l.publish_on_site !== false).length;
    const featured = laws.filter((l) => l.publish_on_site !== false && l.site_featured).length;
    const withPdf = laws.filter((l) => Boolean(l.file_url || l.external_link)).length;
    const hidden = laws.length - published;
    return { published, featured, withPdf, hidden };
  }, [laws]);

  const filteredLaws = useMemo(() => {
    const q = search.trim().toLowerCase();
    return laws.filter((law) => {
      if (typeFilter !== 'Todos' && law.type !== typeFilter) return false;

      if (yearFilter !== 'Todos') {
        const matchDate = (law.publication_date || '').startsWith(yearFilter);
        const matchNumber = (law.number || '').includes(`/${yearFilter}`);
        if (!matchDate && !matchNumber) return false;
      }

      const isPublished = law.publish_on_site !== false;
      if (visibilityFilter === 'published' && !isPublished) return false;
      if (visibilityFilter === 'hidden' && isPublished) return false;
      if (visibilityFilter === 'featured' && (!isPublished || !law.site_featured)) return false;

      if (q) {
        const hay = [
          law.number,
          law.title,
          law.ementa,
          law.type,
          law.category,
          law.author || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [laws, search, typeFilter, yearFilter, visibilityFilter]);

  const handleSaveLaw = async (lawData: Partial<MunicipalLaw>, pdfFile?: File | null) => {
    const isEditing = Boolean(lawData.id);
    const { syncedRemote } = await saveInstitutionLawItem(lawData, currentInstitution, pdfFile);
    showToast(
      syncedRemote
        ? isEditing
          ? 'Norma atualizada e sincronizada no site oficial!'
          : 'Nova norma publicada no banco e no site oficial!'
        : isEditing
        ? 'Salvo apenas neste computador. Execute a migração SQL no Supabase para publicar para todos.'
        : 'Publicado apenas neste computador. Execute a migração SQL no Supabase para publicar para todos.',
      syncedRemote ? 'success' : 'warning'
    );
    setIsFormOpen(false);
    setEditingLaw(null);
    await loadLaws();
  };

  const handleBatchSaved = async (
    lawsToSave: Array<{ data: Partial<MunicipalLaw>; file?: File }>
  ) => {
    const { items, syncedRemote } = await saveInstitutionLawsBatch(lawsToSave, currentInstitution);
    showToast(
      syncedRemote
        ? `${items.length} normas importadas e publicadas no site!`
        : `${items.length} normas salvas apenas neste computador (sem sincronia com o Supabase).`,
      syncedRemote ? 'success' : 'warning'
    );
    await loadLaws();
  };

  const handleToggleSitePublished = async (law: MunicipalLaw) => {
    const nextPublished = law.publish_on_site === false;
    await updateInstitutionLawPartial(
      law.id,
      {
        publish_on_site: nextPublished,
        ...(nextPublished ? {} : { site_featured: false }),
      },
      currentInstitution
    );
    showToast(
      nextPublished
        ? `${law.type} nº ${law.number} publicada na vitrine do site.`
        : `${law.type} nº ${law.number} ocultada do site público.`,
      'info'
    );
  };

  const handleToggleFeatured = async (law: MunicipalLaw) => {
    const nextFeatured = !law.site_featured;
    await updateInstitutionLawPartial(
      law.id,
      {
        publish_on_site: true,
        site_featured: nextFeatured,
      },
      currentInstitution
    );
    showToast(
      nextFeatured
        ? `${law.type} nº ${law.number} fixada no topo do site.`
        : 'Destaque removido.',
      'info'
    );
  };

  const handleDelete = async (law: MunicipalLaw) => {
    if (!window.confirm(`Deseja excluir "${law.title || `${law.type} nº ${law.number}`}"?`)) {
      return;
    }
    await deleteInstitutionLawItem(law.id, currentInstitution);
    showToast('Norma removida.', 'info');
  };

  return (
    <div className="space-y-5">
      {/* Barra superior com controle de exibição + botões de publicação */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-black flex items-center gap-2">
              <Scale size={18} className="text-emerald-600" />
              <span>Publicação de Leis & Decretos no Site</span>
            </h3>
            <label className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={showLawsSection}
                onChange={(e) => onToggleShowLawsSection(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
              />
              <span>{showLawsSection ? 'Seção ativa no site' : 'Seção oculta no site'}</span>
            </label>
          </div>
          <p className="text-xs text-neutral-500">
            Publique leis individuais ou importe PDFs em lote com leitura automática por IA. Controle o que aparece no portal e fixe normas principais (LOM, LOA, PPA, Código Tributário) no topo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadLaws}
            className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            title="Atualizar lista de leis"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsBatchOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black hover:opacity-90 transition cursor-pointer"
          >
            <Files size={14} />
            <span>Importar PDFs em Lote (IA)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingLaw(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Publicar Nova Lei / Decreto</span>
          </button>
        </div>
      </div>

      {/* Mini cards de status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setVisibilityFilter('published')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            visibilityFilter === 'published'
              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
          }`}
        >
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {metrics.published}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Publicadas no Site</div>
        </button>

        <button
          type="button"
          onClick={() => setVisibilityFilter('featured')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            visibilityFilter === 'featured'
              ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
          }`}
        >
          <div className="text-lg font-black text-amber-600 dark:text-amber-400">
            {metrics.featured}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Fixadas no Topo</div>
        </button>

        <button
          type="button"
          onClick={() => setVisibilityFilter('all')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            visibilityFilter === 'all'
              ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30'
              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
          }`}
        >
          <div className="text-lg font-black text-sky-600 dark:text-sky-400">
            {metrics.withPdf}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Com PDF / Link Oficial</div>
        </button>

        <button
          type="button"
          onClick={() => setVisibilityFilter('hidden')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            visibilityFilter === 'hidden'
              ? 'border-neutral-500 bg-neutral-100 dark:bg-neutral-800'
              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60'
          }`}
        >
          <div className="text-lg font-black text-neutral-700 dark:text-neutral-300">
            {metrics.hidden}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Ocultas do Site</div>
        </button>
      </div>

      {/* Filtros de busca */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
        <div className="relative lg:col-span-5">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, título ou ementa..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="lg:col-span-3 px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none"
        >
          <option value="Todos">Todos os tipos de ato</option>
          {LAW_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="lg:col-span-2 px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none"
        >
          <option value="Todos">Todos os anos</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as any)}
          className="lg:col-span-2 px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none"
        >
          <option value="all">Visibilidade: Todas</option>
          <option value="published">Publicadas no Site</option>
          <option value="featured">Fixadas no Topo</option>
          <option value="hidden">Ocultas do Site</option>
        </select>
      </div>

      {/* Lista de Normas */}
      {loading && laws.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-400">
          Carregando atos normativos do município...
        </div>
      ) : filteredLaws.length === 0 ? (
        <div className="p-10 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3">
          <Scale size={30} className="mx-auto text-neutral-400" />
          <div className="space-y-1">
            <p className="text-sm font-black">Nenhuma norma encontrada para este filtro</p>
            <p className="text-xs text-neutral-500">
              Clique em <strong>Publicar Nova Lei / Decreto</strong> ou importe vários PDFs de uma vez usando a leitura automática por IA.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setEditingLaw(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
            >
              + Publicar Lei Agora
            </button>
            <button
              type="button"
              onClick={() => setIsBatchOpen(true)}
              className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black cursor-pointer"
            >
              Importar PDFs em Lote
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLaws.map((law) => {
            const isOnSite = law.publish_on_site !== false;
            return (
              <div
                key={law.id}
                className={`p-4 rounded-2xl border transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isOnSite
                    ? 'bg-neutral-50/70 dark:bg-neutral-950/70 border-neutral-200/80 dark:border-neutral-800'
                    : 'bg-neutral-100/60 dark:bg-neutral-900/40 border-dashed border-neutral-300 dark:border-neutral-800 opacity-75'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {law.site_featured && isOnSite && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                        <Star size={10} className="fill-current" /> Destaque
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                      {law.type}
                    </span>
                    <span className="text-xs font-black font-mono text-neutral-900 dark:text-white">
                      Nº {law.number}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDatePtBr(law.publication_date)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        law.status === 'Em Vigor'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {law.status}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                      {law.origin_power === 'legislativo' ? (
                        <Landmark size={10} />
                      ) : (
                        <Building2 size={10} />
                      )}
                      {law.origin_power === 'legislativo' ? 'Câmara' : 'Executivo'}
                    </span>
                    {(law.file_url || law.external_link) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                        <FileText size={10} /> PDF
                      </span>
                    )}
                    {law.is_compiled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                        <Sparkles size={10} /> Compilada
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate">
                    {law.title}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {law.ementa}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSitePublished(law)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition cursor-pointer ${
                      isOnSite
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                        : 'bg-white border-neutral-200 text-neutral-500 dark:bg-neutral-900 dark:border-neutral-700'
                    }`}
                    title={isOnSite ? 'Visível no site (clique para ocultar)' : 'Oculta do site (clique para publicar)'}
                  >
                    {isOnSite ? <Globe size={13} /> : <EyeOff size={13} />}
                    <span>{isOnSite ? 'No Site' : 'Oculta'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(law)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      law.site_featured && isOnSite
                        ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-500/15 dark:border-amber-700 dark:text-amber-300'
                        : 'bg-white border-neutral-200 text-neutral-400 hover:text-amber-500 dark:bg-neutral-900 dark:border-neutral-800'
                    }`}
                    title={law.site_featured ? 'Remover destaque do topo' : 'Fixar em destaque no topo do site'}
                  >
                    <Star size={14} className={law.site_featured && isOnSite ? 'fill-current' : ''} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setReadingLaw(law)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 text-[11px] font-bold cursor-pointer"
                    title="Visualizar ato completo"
                  >
                    <Eye size={13} />
                    <span>Ler</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingLaw(law);
                      setIsFormOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:text-blue-600 cursor-pointer"
                    title="Editar norma"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(law)}
                    className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:text-rose-600 cursor-pointer"
                    title="Excluir norma"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais integrados */}
      {isFormOpen && (
        <LawFormModal
          lawToEdit={editingLaw}
          allLaws={laws}
          institution={currentInstitution}
          onClose={() => {
            setIsFormOpen(false);
            setEditingLaw(null);
          }}
          onSave={handleSaveLaw}
        />
      )}

      {isBatchOpen && (
        <LawBatchImportModal
          institution={currentInstitution}
          onClose={() => setIsBatchOpen(false)}
          onBatchSaved={handleBatchSaved}
        />
      )}

      {readingLaw && (
        <LawReaderModal
          law={readingLaw}
          allLaws={laws}
          onClose={() => setReadingLaw(null)}
          onEdit={(law) => {
            setReadingLaw(null);
            setEditingLaw(law);
            setIsFormOpen(true);
          }}
          onDelete={(law) => {
            setReadingLaw(null);
            handleDelete(law);
          }}
          onSelectRelatedLaw={(rel) => setReadingLaw(rel)}
        />
      )}
    </div>
  );
};

