import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AdminUser,
  Institution,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../../../types';
import {
  GAZETTE_ACT_CATEGORIES,
  GAZETTE_UPDATED_EVENT,
  deleteGazetteAct,
  deleteGazetteEdition,
  fetchGazetteActs,
  fetchGazetteEditions,
  publishGazetteEdition,
  saveGazetteAct,
  saveGazetteEdition,
} from '../../../lib/api/officialGazette';
import { withInstitutionQuery } from '../../../lib/institutionModules';
import { showToast } from '../../../components/ui/Toast';
import { GazetteActModal } from './GazetteActModal';
import { GazetteEditionModal } from './GazetteEditionModal';
import { OfficialGazetteReaderModal } from './OfficialGazetteReaderModal';

interface DiarioOficialManagerContentProps {
  currentInstitution: Institution;
  currentUser?: AdminUser | null;
  compact?: boolean;
  showSectionOnSite?: boolean;
  onToggleShowSectionOnSite?: (enabled: boolean) => void;
  onStatsChange?: (publishedEditionsCount: number) => void;
}

const formatDatePtBr = (isoDate?: string) => {
  if (!isoDate) return '';
  const dt = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('pt-BR');
};

export const DiarioOficialManagerContent: React.FC<DiarioOficialManagerContentProps> = ({
  currentInstitution,
  currentUser,
  compact = false,
  showSectionOnSite,
  onToggleShowSectionOnSite,
  onStatsChange,
}) => {
  const [editions, setEditions] = useState<OfficialGazetteEdition[]>([]);
  const [acts, setActs] = useState<OfficialGazetteAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'editions' | 'acts'>('editions');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  const [actModalOpen, setActModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<OfficialGazetteAct | null>(null);
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [editingEdition, setEditingEdition] = useState<OfficialGazetteEdition | null>(null);
  const [readingEdition, setReadingEdition] = useState<OfficialGazetteEdition | null>(null);

  const onStatsChangeRef = useRef(onStatsChange);
  onStatsChangeRef.current = onStatsChange;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [edList, actList] = await Promise.all([
        fetchGazetteEditions(currentInstitution),
        fetchGazetteActs(currentInstitution),
      ]);
      setEditions(edList);
      setActs(actList);
      const publishedCount = edList.filter((e) => e.status === 'published').length;
      onStatsChangeRef.current?.(publishedCount);
    } finally {
      setLoading(false);
    }
  }, [currentInstitution]);

  useEffect(() => {
    loadData();
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === currentInstitution.id) {
        loadData();
      }
    };
    window.addEventListener(GAZETTE_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(GAZETTE_UPDATED_EVENT, onUpdated);
  }, [loadData, currentInstitution.id]);

  const metrics = useMemo(() => {
    const publishedEditions = editions.filter((e) => e.status === 'published').length;
    const draftEditions = editions.length - publishedEditions;
    const queuedActs = acts.filter((a) => !a.edition_id).length;
    return { publishedEditions, draftEditions, queuedActs, totalActs: acts.length };
  }, [editions, acts]);

  const actsByEdition = useMemo(() => {
    const map = new Map<string, OfficialGazetteAct[]>();
    acts.forEach((act) => {
      if (!act.edition_id) return;
      const list = map.get(act.edition_id) || [];
      list.push(act);
      map.set(act.edition_id, list);
    });
    return map;
  }, [acts]);

  const filteredEditions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return editions;
    return editions.filter((ed) => {
      const edActs = actsByEdition.get(ed.id) || [];
      const inEdition = [ed.edition_number, ed.title, ed.summary || '', ed.verification_code]
        .join(' ')
        .toLowerCase()
        .includes(q);
      const inActs = edActs.some((a) =>
        [a.title, a.act_number, a.department || '', a.summary || ''].join(' ').toLowerCase().includes(q)
      );
      return inEdition || inActs;
    });
  }, [editions, actsByEdition, search]);

  const filteredActs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return acts.filter((act) => {
      if (categoryFilter !== 'Todas' && act.category !== categoryFilter) return false;
      if (!q) return true;
      return [act.title, act.act_number, act.department || '', act.summary || '', act.category]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [acts, search, categoryFilter]);

  const handleSaveAct = async (actData: Partial<OfficialGazetteAct>, pdfFile?: File | null) => {
    const { syncedRemote } = await saveGazetteAct(
      actData,
      currentInstitution,
      pdfFile,
      currentUser?.name
    );
    showToast(
      syncedRemote
        ? 'Matéria oficial salva e sincronizada!'
        : 'Matéria oficial salva localmente!',
      'success'
    );
    setActModalOpen(false);
    setEditingAct(null);
    await loadData();
  };

  const handleSaveEdition = async (
    editionData: Partial<OfficialGazetteEdition>,
    actIdsToLink: string[],
    pdfFile?: File | null
  ) => {
    const { item, syncedRemote } = await saveGazetteEdition(
      editionData,
      actIdsToLink,
      currentInstitution,
      pdfFile,
      currentUser?.name
    );
    showToast(
      item.status === 'published'
        ? `Edição Nº ${item.edition_number} publicada no Diário Oficial${syncedRemote ? '!' : ' (local)!'}`
        : `Rascunho da Edição Nº ${item.edition_number} salvo.`,
      'success'
    );
    setEditionModalOpen(false);
    setEditingEdition(null);
    await loadData();
  };

  const handleQuickPublish = async (edition: OfficialGazetteEdition) => {
    const linked = actsByEdition.get(edition.id) || [];
    if (linked.length === 0 && !edition.pdf_url) {
      showToast('Vincule ao menos 1 matéria ou anexe um PDF antes de publicar.', 'warning');
      setEditingEdition(edition);
      setEditionModalOpen(true);
      return;
    }
    const published = await publishGazetteEdition(edition, currentInstitution, currentUser?.name);
    showToast(`Edição Nº ${published.edition_number} publicada com sucesso!`, 'success');
    await loadData();
  };

  const handleDeleteEdition = async (edition: OfficialGazetteEdition) => {
    if (
      !window.confirm(
        `Deseja excluir a Edição Nº ${edition.edition_number}? Os atos vinculados voltarão para a fila.`
      )
    ) {
      return;
    }
    await deleteGazetteEdition(edition.id, currentInstitution);
    showToast('Edição removida. As matérias retornaram à fila.', 'info');
    await loadData();
  };

  const handleDeleteAct = async (act: OfficialGazetteAct) => {
    if (!window.confirm(`Deseja excluir a matéria "${act.title}"?`)) return;
    await deleteGazetteAct(act.id, currentInstitution);
    showToast('Matéria excluída.', 'info');
    await loadData();
  };

  const publicPortalUrl = withInstitutionQuery('/diario', currentInstitution);

  return (
    <div className="space-y-5">
      {/* Barra superior */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-black flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-600" />
              <span>Diário Oficial Eletrônico do Município (DOM)</span>
            </h3>
            {typeof showSectionOnSite === 'boolean' && onToggleShowSectionOnSite && (
              <label className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSectionOnSite}
                  onChange={(e) => onToggleShowSectionOnSite(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                />
                <span>{showSectionOnSite ? 'Visível no Site Oficial' : 'Oculto no Site'}</span>
              </label>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            Cadastre matérias por secretaria, gere edições numeradas com código verificador e publique com transparência no portal municipal.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
              {publicPortalUrl}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const full = `${window.location.origin}${publicPortalUrl}`;
                  await navigator.clipboard.writeText(full);
                  showToast('Link público do Diário Oficial copiado!', 'success');
                } catch {
                  showToast('Não foi possível copiar o link.', 'warning');
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 text-[11px] font-bold cursor-pointer"
            >
              <Copy size={11} /> Copiar endereço
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={publicPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 text-xs font-bold"
          >
            <ExternalLink size={14} />
            <span>{compact ? 'Portal Público' : 'Abrir Portal do Diário'}</span>
          </a>

          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            title="Atualizar Diário Oficial"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAct(null);
              setActModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black hover:opacity-90 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Nova Matéria / Ato</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEdition(null);
              setEditionModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition cursor-pointer"
          >
            <BookOpen size={15} />
            <span>Nova Edição Oficial</span>
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setSubTab('editions')}
          className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 text-left cursor-pointer hover:border-emerald-400 transition"
        >
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.publishedEditions}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Edições Publicadas</div>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('editions')}
          className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 text-left cursor-pointer hover:border-amber-400 transition"
        >
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">
            {metrics.draftEditions}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Edições em Rascunho</div>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('acts')}
          className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 text-left cursor-pointer hover:border-sky-400 transition"
        >
          <div className="text-xl font-black text-sky-600 dark:text-sky-400">
            {metrics.queuedActs}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Matérias na Fila</div>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('acts')}
          className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 text-left cursor-pointer hover:border-indigo-400 transition"
        >
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
            {metrics.totalActs}
          </div>
          <div className="text-[11px] font-bold text-neutral-500">Total de Atos Registrados</div>
        </button>
      </div>

      {/* Sub-abas + Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 self-start">
          <button
            type="button"
            onClick={() => setSubTab('editions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              subTab === 'editions'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500'
            }`}
          >
            Edições do Diário ({editions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('acts')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              subTab === 'acts'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500'
            }`}
          >
            Matérias & Fila ({acts.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 sm:max-w-lg">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                subTab === 'editions'
                  ? 'Buscar edição, código verificador ou ato...'
                  : 'Buscar matéria por título, número ou secretaria...'
              }
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {subTab === 'acts' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none"
            >
              <option value="Todas">Todas as categorias</option>
              {GAZETTE_ACT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lista de Edições */}
      {subTab === 'editions' && (
        <>
          {loading && editions.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              Carregando edições do Diário Oficial...
            </div>
          ) : filteredEditions.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3">
              <BookOpen size={32} className="mx-auto text-neutral-400" />
              <div className="space-y-1">
                <p className="text-sm font-black">Nenhuma edição do Diário Oficial encontrada</p>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Primeiro cadastre os atos do dia em <strong>Nova Matéria / Ato</strong> (ou anexe um PDF assinado) e depois clique em <strong>Nova Edição Oficial</strong> para publicar.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAct(null);
                    setActModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black cursor-pointer"
                >
                  + Cadastrar Primeira Matéria
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEdition(null);
                    setEditionModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
                >
                  + Criar Edição Nº 001
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEditions.map((ed) => {
                const linkedActs = actsByEdition.get(ed.id) || [];
                const isPublished = ed.status === 'published';
                return (
                  <div
                    key={ed.id}
                    className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}
                        >
                          {isPublished ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {isPublished ? 'Publicada' : 'Rascunho'}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-[10px] font-black font-mono">
                          Edição {ed.edition_type} Nº {ed.edition_number}
                        </span>

                        <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDatePtBr(ed.publication_date)}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                          <Layers size={10} /> {linkedActs.length}{' '}
                          {linkedActs.length === 1 ? 'ato' : 'atos'}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-400">
                          <ShieldCheck size={11} /> {ed.verification_code}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate">
                        {ed.title}
                      </h4>
                      {ed.summary && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                          {ed.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {!isPublished && (
                        <button
                          type="button"
                          onClick={() => handleQuickPublish(ed)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                        >
                          <Send size={12} />
                          <span>Publicar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setReadingEdition(ed)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 text-[11px] font-black cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Ler / PDF A4</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingEdition(ed);
                          setEditionModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:text-blue-600 cursor-pointer"
                        title="Editar edição e matérias"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEdition(ed)}
                        className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:text-rose-600 cursor-pointer"
                        title="Excluir edição"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Lista de Matérias / Atos */}
      {subTab === 'acts' && (
        <>
          {filteredActs.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3">
              <FileText size={30} className="mx-auto text-neutral-400" />
              <p className="text-sm font-black">Nenhuma matéria encontrada</p>
              <button
                type="button"
                onClick={() => {
                  setEditingAct(null);
                  setActModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
              >
                + Cadastrar Matéria Oficial
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredActs.map((act) => {
                const parentEdition = editions.find((e) => e.id === act.edition_id);
                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                          {act.category}
                        </span>
                        {act.act_number && (
                          <span className="text-xs font-black font-mono">Nº {act.act_number}</span>
                        )}
                        {parentEdition ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Edição {parentEdition.edition_number}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            Na Fila (Sem edição)
                          </span>
                        )}
                        {act.department && (
                          <span className="text-[11px] font-semibold text-neutral-500">
                            {act.department}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black truncate">{act.title}</h4>
                      {act.summary && (
                        <p className="text-xs text-neutral-500 line-clamp-1">{act.summary}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAct(act);
                          setActModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:text-blue-600 cursor-pointer"
                        title="Editar matéria"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAct(act)}
                        className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:text-rose-600 cursor-pointer"
                        title="Excluir matéria"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {actModalOpen && (
        <GazetteActModal
          actToEdit={editingAct}
          editions={editions}
          institution={currentInstitution}
          onClose={() => {
            setActModalOpen(false);
            setEditingAct(null);
          }}
          onSave={handleSaveAct}
        />
      )}

      {editionModalOpen && (
        <GazetteEditionModal
          editionToEdit={editingEdition}
          allEditions={editions}
          allActs={acts}
          defaultSignerName={currentUser?.name || ''}
          onClose={() => {
            setEditionModalOpen(false);
            setEditingEdition(null);
          }}
          onSave={handleSaveEdition}
        />
      )}

      {readingEdition && (
        <OfficialGazetteReaderModal
          edition={readingEdition}
          acts={actsByEdition.get(readingEdition.id) || []}
          institution={currentInstitution}
          onClose={() => setReadingEdition(null)}
        />
      )}
    </div>
  );
};

