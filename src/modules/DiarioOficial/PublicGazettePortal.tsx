import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  AlertCircle,
} from 'lucide-react';
import { Institution, OfficialGazetteAct, OfficialGazetteEdition } from '../../types';
import {
  GAZETTE_ACT_CATEGORIES,
  GAZETTE_UPDATED_EVENT,
  fetchGazetteActs,
  fetchGazetteEditions,
} from '../../lib/api/officialGazette';
import { withInstitutionQuery } from '../../lib/institutionModules';
import { resolveSiteAccentHex, useInstitutionalSiteConfig } from '../../lib/api/institutionalSite';
import { AccessibilityBar } from '../../components/AccessibilityBar';
import { LogoCompass } from '../../components/LogoCompass';
import { OfficialGazetteReaderModal } from './components/OfficialGazetteReaderModal';

interface PublicGazettePortalProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  currentInstitution: Institution;
}

const formatDatePtBr = (isoDate?: string) => {
  if (!isoDate) return '';
  const dt = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('pt-BR');
};

export const PublicGazettePortal: React.FC<PublicGazettePortalProps> = ({
  darkMode,
  setDarkMode,
  currentInstitution,
}) => {
  const { config } = useInstitutionalSiteConfig(currentInstitution);
  const accentHex = resolveSiteAccentHex(config);

  const [editions, setEditions] = useState<OfficialGazetteEdition[]>([]);
  const [acts, setActs] = useState<OfficialGazetteAct[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<OfficialGazetteEdition | 'not_found' | null>(
    null
  );
  const [readingEdition, setReadingEdition] = useState<OfficialGazetteEdition | null>(null);

  const loadPublicGazette = useCallback(async () => {
    setLoading(true);
    try {
      const [pubEditions, pubActs] = await Promise.all([
        fetchGazetteEditions(currentInstitution, { onlyPublished: true }),
        fetchGazetteActs(currentInstitution, { onlyPublished: true }),
      ]);
      setEditions(pubEditions);
      setActs(pubActs);
    } finally {
      setLoading(false);
    }
  }, [currentInstitution]);

  useEffect(() => {
    loadPublicGazette();
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === currentInstitution.id) {
        loadPublicGazette();
      }
    };
    window.addEventListener(GAZETTE_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(GAZETTE_UPDATED_EVENT, onUpdated);
  }, [loadPublicGazette, currentInstitution.id]);

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

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    editions.forEach((e) => {
      if (e.year) years.add(String(e.year));
      else if (e.publication_date) years.add(e.publication_date.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [editions]);

  const filteredEditions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return editions.filter((ed) => {
      if (yearFilter !== 'Todos' && String(ed.year) !== yearFilter) return false;
      const edActs = actsByEdition.get(ed.id) || [];

      if (categoryFilter !== 'Todas') {
        const hasCat = edActs.some((a) => a.category === categoryFilter);
        if (!hasCat) return false;
      }

      if (!q) return true;
      const inEdition = [ed.edition_number, ed.title, ed.summary || '', ed.verification_code]
        .join(' ')
        .toLowerCase()
        .includes(q);
      const inActs = edActs.some((a) =>
        [a.title, a.act_number, a.department || '', a.summary || '', a.content || '']
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
      return inEdition || inActs;
    });
  }, [editions, actsByEdition, search, yearFilter, categoryFilter]);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = verifyInput.trim().toUpperCase();
    if (!cleaned) return;
    const match = editions.find(
      (ed) => ed.verification_code.trim().toUpperCase() === cleaned
    );
    setVerifyResult(match || 'not_found');
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
        {config.sections.enableAccessibilityBar !== false && (
          <AccessibilityBar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            enableVLibras={config.sections.enableVLibras !== false}
            contentTargetId="diario-conteudo-principal"
          />
        )}

        <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 border border-neutral-200 shadow-sm flex items-center justify-center shrink-0">
                {currentInstitution.logo_url ? (
                  <img
                    src={currentInstitution.logo_url}
                    alt={`Brasão ${currentInstitution.name}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <LogoCompass size={28} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentHex }}>
                  Imprensa Oficial Eletrônica
                </p>
                <h1 className="text-base sm:text-lg font-black truncate">
                  Diário Oficial — {currentInstitution.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={withInstitutionQuery('/site', currentInstitution)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold"
              >
                <ArrowLeft size={14} />
                <span>Voltar ao Site</span>
              </a>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                aria-label="Alternar tema"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </header>

        <main id="diario-conteudo-principal" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8 flex-1">
          {/* Validador de Autenticidade + Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-neutral-500">
                Pesquisar Edições & Atos Publicados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="relative sm:col-span-6">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar decreto, portaria, licitação, nº..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="sm:col-span-4 px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold"
                >
                  <option value="Todas">Todas as categorias</option>
                  {GAZETTE_ACT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="sm:col-span-2 px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold"
                >
                  <option value="Todos">Ano</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form
              onSubmit={handleVerifyCode}
              className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: accentHex }} />
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-500">
                  Validar Autenticidade da Edição
                </h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => {
                    setVerifyInput(e.target.value);
                    if (verifyResult) setVerifyResult(null);
                  }}
                  placeholder="Ex: DOM-2026-001202-ABCD1234"
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-bold uppercase focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-2xl text-white text-xs font-black cursor-pointer shrink-0"
                  style={{ backgroundColor: accentHex }}
                >
                  Verificar
                </button>
              </div>
              {verifyResult === 'not_found' && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Código não encontrado nas edições publicadas.
                </p>
              )}
              {verifyResult && verifyResult !== 'not_found' && (
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Autêntica: Edição {verifyResult.edition_number} ({formatDatePtBr(verifyResult.publication_date)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setReadingEdition(verifyResult)}
                    className="underline cursor-pointer"
                  >
                    Abrir
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Lista de Edições Publicadas */}
          {loading ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              Carregando edições oficiais...
            </div>
          ) : filteredEditions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-2">
              <BookOpen size={34} className="mx-auto text-neutral-400" />
              <p className="text-base font-black">Nenhuma edição publicada encontrada</p>
              <p className="text-xs text-neutral-500">
                As edições oficiais da Administração Municipal aparecerão aqui assim que forem publicadas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEditions.map((ed) => {
                const edActs = actsByEdition.get(ed.id) || [];
                return (
                  <article
                    key={ed.id}
                    className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className="px-3 py-1 rounded-full text-[11px] font-black uppercase text-white"
                          style={{ backgroundColor: accentHex }}
                        >
                          Edição {ed.edition_type} Nº {ed.edition_number}
                        </span>
                        <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDatePtBr(ed.publication_date)}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black leading-snug">{ed.title}</h3>
                        {ed.summary && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                            {ed.summary}
                          </p>
                        )}
                      </div>

                      {edActs.length > 0 && (
                        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800 space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                            Destaques desta edição ({edActs.length}{' '}
                            {edActs.length === 1 ? 'ato' : 'atos'})
                          </p>
                          {edActs.slice(0, 3).map((act) => (
                            <div key={act.id} className="text-xs font-semibold flex items-center gap-1.5 truncate">
                              <FileText size={12} className="text-emerald-600 shrink-0" />
                              <span className="truncate">
                                [{act.category}] {act.title}
                              </span>
                            </div>
                          ))}
                          {edActs.length > 3 && (
                            <p className="text-[11px] font-bold text-neutral-400">
                              + {edActs.length - 3} outro(s) ato(s)
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] font-mono font-bold text-neutral-400 truncate">
                        {ed.verification_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReadingEdition(ed)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-black cursor-pointer shrink-0"
                        style={{ backgroundColor: accentHex }}
                      >
                        <Eye size={14} />
                        <span>Abrir Edição / PDF</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {readingEdition && (
          <OfficialGazetteReaderModal
            edition={readingEdition}
            acts={actsByEdition.get(readingEdition.id) || []}
            institution={currentInstitution}
            onClose={() => setReadingEdition(null)}
          />
        )}
      </div>
    </div>
  );
};

