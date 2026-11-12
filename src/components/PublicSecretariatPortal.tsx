import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  FileText,
  Globe,
  Headphones,
  Layers,
  Lock,
  Mail,
  MapPin,
  Medal,
  Menu,
  Moon,
  Newspaper,
  Phone,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AdminUser,
  Institution,
  MunicipalLaw,
  MunicipalNews,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../types';
import { useMunicipalDepartments } from '../lib/api/departments';
import {
  getGestao360LandingUrl,
  getSuggestedIndicatorsForDepartment,
  normalizeSecretariatSlug,
  resolveSecretariatProfile,
  resolveSiteAccentHex,
  useInstitutionalSiteConfig,
} from '../lib/api/institutionalSite';
import { fetchInstitutionNews, NEWS_UPDATED_EVENT } from '../lib/api/municipalNews';
import { fetchInstitutionLaws, LAWS_UPDATED_EVENT } from '../lib/api/municipalLaws';
import {
  fetchGazetteActs,
  fetchGazetteEditions,
  GAZETTE_UPDATED_EVENT,
} from '../lib/api/officialGazette';
import { isInstitutionModuleActive, withInstitutionQuery } from '../lib/institutionModules';
import { AccessibilityBar } from './AccessibilityBar';
import { LogoCompass } from './LogoCompass';
import {
  ComplianceDialogType,
  CookieConsentBanner,
  SiteComplianceModals,
  readCookieConsent,
} from './SiteComplianceModals';
import { OfficialGazetteReaderModal } from '../modules/DiarioOficial/components/OfficialGazetteReaderModal';
import { LawReaderModal } from '../modules/Laws/components/LawReaderModal';

export interface PublicSecretariatPortalProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  currentInstitution: Institution;
  secretariatSlug?: string | null;
  isAuthenticated?: boolean;
  currentUser?: AdminUser | null;
}

function normalizeMatchText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getSecretariatKeywords(departmentName: string): string[] {
  const norm = normalizeMatchText(departmentName);
  const stopWords = new Set(['secretaria', 'municipal', 'de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'orgao', 'gabinete']);
  const tokens = norm
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !stopWords.has(t));
  return Array.from(new Set(tokens));
}

function formatDatePtBr(raw?: string | null): string {
  if (!raw) return '—';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('pt-BR');
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(5, 150, 105, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveActionHref(rawUrl: string | undefined, institution: Institution): { href: string; external: boolean } | null {
  const clean = (rawUrl || '').trim();
  if (!clean) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('mailto:') || clean.startsWith('tel:')) {
    return { href: clean, external: true };
  }
  if (clean.startsWith('#')) {
    return { href: clean, external: false };
  }
  return {
    href: withInstitutionQuery(clean.startsWith('/') ? clean : `/${clean}`, institution),
    external: false,
  };
}

export const PublicSecretariatPortal: React.FC<PublicSecretariatPortalProps> = ({
  darkMode,
  setDarkMode,
  currentInstitution,
  secretariatSlug,
  isAuthenticated = false,
}) => {
  const { config } = useInstitutionalSiteConfig(currentInstitution);
  const { departmentNames, loading: loadingDepartments } = useMunicipalDepartments(currentInstitution.id);
  const accentHex = resolveSiteAccentHex(config);
  const accentSoftBg = hexToRgba(accentHex, darkMode ? 0.18 : 0.1);
  const accentBorderColor = hexToRgba(accentHex, 0.3);
  const isMourning = Boolean(config.mourningMode?.enabled);
  const isElectoralMode = Boolean(config.electoralMode);

  const [news, setNews] = useState<MunicipalNews[]>([]);
  const [laws, setLaws] = useState<MunicipalLaw[]>([]);
  const [gazetteEditions, setGazetteEditions] = useState<OfficialGazetteEdition[]>([]);
  const [gazetteActs, setGazetteActs] = useState<OfficialGazetteAct[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [actsSearch, setActsSearch] = useState('');
  const [selectedNews, setSelectedNews] = useState<MunicipalNews | null>(null);
  const [selectedLaw, setSelectedLaw] = useState<MunicipalLaw | null>(null);
  const [readingGazetteEdition, setReadingGazetteEdition] = useState<OfficialGazetteEdition | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [complianceDialog, setComplianceDialog] = useState<ComplianceDialogType>(null);
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(
    () => !readCookieConsent(currentInstitution.id)
  );

  useEffect(() => {
    setShowCookieBanner(!readCookieConsent(currentInstitution.id));
  }, [currentInstitution.id]);

  useEffect(() => {
    setLogoFailed(false);
  }, [currentInstitution.logo_url]);

  const showOuvidoria = isInstitutionModuleActive(currentInstitution, 'ouvidoria');
  const showNoticias = isInstitutionModuleActive(currentInstitution, 'noticias');
  const landingPageUrl = getGestao360LandingUrl();

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      setLoadingData(true);
      try {
        const [publishedNews, publishedLaws, publishedEditions, publishedActs] = await Promise.all([
          fetchInstitutionNews(currentInstitution, { onlyPublished: true, limit: 80 }),
          fetchInstitutionLaws(currentInstitution, { onlySitePublished: true, prioritizeFeatured: true }),
          fetchGazetteEditions(currentInstitution, { onlyPublished: true, limit: 30 }),
          fetchGazetteActs(currentInstitution, { onlyPublished: true }),
        ]);
        if (!active) return;
        setNews(publishedNews);
        setLaws(publishedLaws);
        setGazetteEditions(publishedEditions);
        setGazetteActs(publishedActs);
      } finally {
        if (active) setLoadingData(false);
      }
    };

    loadAll();
    const reload = () => loadAll();
    window.addEventListener(NEWS_UPDATED_EVENT, reload);
    window.addEventListener(LAWS_UPDATED_EVENT, reload);
    window.addEventListener(GAZETTE_UPDATED_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(NEWS_UPDATED_EVENT, reload);
      window.removeEventListener(LAWS_UPDATED_EVENT, reload);
      window.removeEventListener(GAZETTE_UPDATED_EVENT, reload);
    };
  }, [currentInstitution.id]);

  // Resolve qual secretaria está sendo visualizada
  const activeDepartmentName = useMemo(() => {
    const target = normalizeSecretariatSlug(secretariatSlug || '');
    if (!secretariatSlug || target === 'secretaria' || target === 'secretarias') {
      return departmentNames[0] || null;
    }
    const exactMatch = departmentNames.find((name) => normalizeSecretariatSlug(name) === target);
    if (exactMatch) return exactMatch;

    const partialMatch = departmentNames.find((name) => {
      const slug = normalizeSecretariatSlug(name);
      return slug.includes(target) || target.includes(slug);
    });
    return partialMatch || null;
  }, [departmentNames, secretariatSlug]);

  const profile = useMemo(() => {
    if (!activeDepartmentName) return null;
    return resolveSecretariatProfile(activeDepartmentName, config, currentInstitution);
  }, [activeDepartmentName, config, currentInstitution]);

  useEffect(() => {
    if (profile?.departmentName) {
      document.title = `${profile.departmentName} — ${currentInstitution.name}`;
    } else {
      document.title = `Secretarias Municipais — ${currentInstitution.name}`;
    }
  }, [profile?.departmentName, currentInstitution.name]);

  const editionsById = useMemo(() => {
    const map = new Map<string, OfficialGazetteEdition>();
    gazetteEditions.forEach((ed) => map.set(ed.id, ed));
    return map;
  }, [gazetteEditions]);

  // Notícias da Secretaria
  const secretariatNews = useMemo(() => {
    if (!activeDepartmentName) return [];
    const targetSlug = normalizeSecretariatSlug(activeDepartmentName);
    const targetNorm = normalizeMatchText(activeDepartmentName);
    const keywords = getSecretariatKeywords(activeDepartmentName);

    const exact = news.filter((item) => {
      const deptNorm = normalizeMatchText(item.department);
      if (!deptNorm) return false;
      return (
        deptNorm === targetNorm ||
        normalizeSecretariatSlug(item.department || '') === targetSlug ||
        deptNorm.includes(targetNorm) ||
        targetNorm.includes(deptNorm)
      );
    });

    if (exact.length > 0) return exact;

    if (keywords.length === 0) return [];
    return news.filter((item) => {
      const haystack = normalizeMatchText(`${item.department || ''} ${item.category || ''} ${item.title} ${item.subtitle || ''}`);
      return keywords.some((kw) => haystack.includes(kw));
    });
  }, [activeDepartmentName, news]);

  // Obras e Projetos públicos vinculados à secretaria para a vitrine automática
  const secretariatProjects = useMemo(() => {
    return secretariatNews.filter(
      (item) =>
        item.category === 'Obras' ||
        item.category === 'Projetos' ||
        Boolean(item.project_status)
    );
  }, [secretariatNews]);

  const suggestedReferenceIndicators = useMemo(
    () => (activeDepartmentName ? getSuggestedIndicatorsForDepartment(activeDepartmentName) : []),
    [activeDepartmentName]
  );

  // Atos Oficiais no Diário Oficial vinculados à Secretaria
  const secretariatActs = useMemo(() => {
    if (!activeDepartmentName) return [];
    const targetSlug = normalizeSecretariatSlug(activeDepartmentName);
    const targetNorm = normalizeMatchText(activeDepartmentName);
    const keywords = getSecretariatKeywords(activeDepartmentName);

    const matched = gazetteActs.filter((act) => {
      const deptNorm = normalizeMatchText(act.department);
      if (deptNorm) {
        if (
          deptNorm === targetNorm ||
          normalizeSecretariatSlug(act.department || '') === targetSlug ||
          deptNorm.includes(targetNorm) ||
          targetNorm.includes(deptNorm)
        ) {
          return true;
        }
      }
      if (keywords.length > 0) {
        const text = normalizeMatchText(`${act.department || ''} ${act.title} ${act.summary || ''}`);
        return keywords.some((kw) => text.includes(kw));
      }
      return false;
    });

    const query = normalizeMatchText(actsSearch);
    if (!query) return matched;
    return matched.filter((act) =>
      normalizeMatchText(`${act.act_number} ${act.category} ${act.title} ${act.summary || ''}`).includes(query)
    );
  }, [activeDepartmentName, gazetteActs, actsSearch]);

  // Normas & Leis correlacionadas à Secretaria
  const secretariatLaws = useMemo(() => {
    if (!activeDepartmentName) return [];
    const targetNorm = normalizeMatchText(activeDepartmentName);
    const keywords = getSecretariatKeywords(activeDepartmentName);

    const matched = laws.filter((law) => {
      const haystack = normalizeMatchText(
        `${law.author || ''} ${law.category || ''} ${law.title} ${law.ementa} ${(law.tags || []).join(' ')}`
      );
      if (haystack.includes(targetNorm)) return true;
      return keywords.some((kw) => haystack.includes(kw));
    });

    const query = normalizeMatchText(actsSearch);
    if (!query) return matched;
    return matched.filter((law) =>
      normalizeMatchText(`${law.number} ${law.type} ${law.title} ${law.ementa}`).includes(query)
    );
  }, [activeDepartmentName, laws, actsSearch]);

  const handleOpenActInGazette = (act: OfficialGazetteAct) => {
    if (act.edition_id && editionsById.has(act.edition_id)) {
      setReadingGazetteEdition(editionsById.get(act.edition_id)!);
      return;
    }
    if (gazetteEditions.length > 0) {
      setReadingGazetteEdition(gazetteEditions[0]);
      return;
    }
    window.location.href = withInstitutionQuery('/diario', currentInstitution);
  };

  return (
    <div
      className={`${darkMode ? 'dark' : ''} ${isMourning ? 'grayscale' : ''}`}
      style={
        {
          '--site-accent': accentHex,
          '--site-accent-soft': accentSoftBg,
          '--site-accent-border': accentBorderColor,
        } as React.CSSProperties
      }
    >
      <style>{`
        .site-accent-text { color: var(--site-accent); }
        .site-accent-bg { background-color: var(--site-accent); }
        .site-accent-soft { background-color: var(--site-accent-soft); color: var(--site-accent); }
        .site-accent-border { border-color: var(--site-accent-border); }
      `}</style>

      <div className="min-h-dvh bg-[#F8FAFC] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
        {config.sections.enableAccessibilityBar !== false && (
          <AccessibilityBar
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            enableVLibras={config.sections.enableVLibras !== false}
            accentHex={accentHex}
          />
        )}

        {isElectoralMode && (
          <div className="bg-amber-950 text-amber-100 border-b border-amber-800 px-4 sm:px-6 py-2 text-xs">
            <div className="max-w-7xl mx-auto">
              <strong className="uppercase tracking-wider">Período Eleitoral (Lei 9.504/97):</strong>{' '}
              Ambiente informativo institucional focado em serviços públicos, atos oficiais e transparência administrativa.
            </div>
          </div>
        )}

        {/* Barra Superior */}
        <div className="bg-neutral-900 text-neutral-200 dark:bg-black border-b border-neutral-800 text-[11px] font-semibold">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={withInstitutionQuery('/site', currentInstitution)}
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold transition"
              >
                <ArrowLeft size={12} />
                <span>Voltar ao Site da Prefeitura</span>
              </a>
              <span className="hidden sm:inline text-neutral-600">|</span>
              <span className="hidden sm:inline text-neutral-400">
                Ambiente Oficial da Secretaria · {currentInstitution.name}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {config.transparencyUrl && (
                <a
                  href={config.transparencyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition inline-flex items-center gap-1"
                >
                  Portal da Transparência <ArrowUpRight size={12} />
                </a>
              )}
              {showOuvidoria && (
                <a href={withInstitutionQuery('/ouvidoria', currentInstitution)} className="hover:text-white transition">
                  Ouvidoria & e-SIC
                </a>
              )}
              <a
                href={withInstitutionQuery('/servidores', currentInstitution)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition"
              >
                <Lock size={11} />
                <span>{isAuthenticated ? 'Acessar Meu Painel' : 'Área do Servidor'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Cabeçalho Sticky */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[78px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <a
                href={withInstitutionQuery('/site', currentInstitution)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm border-2 hover:scale-105 transition"
                style={{ borderColor: accentBorderColor }}
                title={`Voltar para ${currentInstitution.name}`}
              >
                {currentInstitution.logo_url && !logoFailed ? (
                  <img
                    src={currentInstitution.logo_url}
                    alt={`Brasão ${currentInstitution.name}`}
                    className="w-full h-full object-contain"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <LogoCompass size={28} disableExpand />
                )}
              </a>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest truncate" style={{ color: accentHex }}>
                  {currentInstitution.name}
                </p>
                <h1 className="text-sm sm:text-lg font-black tracking-tight truncate">
                  {profile?.departmentName || 'Secretarias Municipais'}
                </h1>
              </div>
            </div>

            {profile && (
              <nav className="hidden lg:flex items-center gap-5 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                <a href="#resultados" className="hover:text-neutral-900 dark:hover:text-white transition">
                  Resultados & Índices
                </a>
                <a href="#carta-servicos" className="hover:text-neutral-900 dark:hover:text-white transition">
                  Carta de Serviços
                </a>
                <a href="#dados-missao" className="hover:text-neutral-900 dark:hover:text-white transition">
                  Dados & Missão
                </a>
                {showNoticias && (
                  <a href="#noticias-pasta" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Notícias
                  </a>
                )}
                <a href="#atos-pasta" className="hover:text-neutral-900 dark:hover:text-white transition">
                  Atos Oficiais
                </a>
              </nav>
            )}

            <div className="flex items-center gap-2">
              <a
                href={withInstitutionQuery('/site', currentInstitution)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition"
              >
                <ArrowLeft size={14} />
                <span>Site Principal</span>
              </a>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:scale-105 transition cursor-pointer"
                aria-label="Alternar tema"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {profile && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="lg:hidden p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                  aria-label="Abrir menu da secretaria"
                >
                  {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && profile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4 space-y-2 text-sm font-bold"
              >
                <a href="#resultados" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                  Vitrine: Resultados, Índices & Prêmios
                </a>
                <a href="#carta-servicos" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                  Carta de Serviços
                </a>
                <a href="#dados-missao" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                  Dados & Missão
                </a>
                {showNoticias && (
                  <a href="#noticias-pasta" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                    Notícias da Secretaria
                  </a>
                )}
                <a href="#atos-pasta" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                  Atos Oficiais & Legislação
                </a>
                <a href="#outras-secretarias" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                  Outras Secretarias
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1">
          {loadingDepartments && !profile ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-neutral-300 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Carregando ambiente da secretaria...
              </p>
            </div>
          ) : !profile ? (
            <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
              <Building2 size={44} className="mx-auto site-accent-text" />
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black">Secretarias e Órgãos Municipais</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Selecione abaixo uma secretaria para acessar seu ambiente oficial, carta de serviços, notícias e atos próprios.
                </p>
              </div>
              {departmentNames.length === 0 ? (
                <div className="p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-sm text-neutral-500">
                  Nenhuma secretaria cadastrada ainda para {currentInstitution.name}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                  {departmentNames.map((deptName) => (
                    <a
                      key={deptName}
                      href={withInstitutionQuery(`/secretaria/${normalizeSecretariatSlug(deptName)}`, currentInstitution)}
                      className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-lg transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h3 className="text-sm font-black truncate">{deptName}</h3>
                        <p className="text-[11px] text-neutral-500 mt-1">Abrir ambiente da pasta</p>
                      </div>
                      <ChevronRight size={16} className="site-accent-text shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Hero Institucional da Secretaria */}
              <section
                className="relative overflow-hidden border-b border-neutral-200/70 dark:border-neutral-800"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(accentHex, 0.14)} 0%, ${hexToRgba(accentHex, 0.03)} 55%, transparent 100%)`,
                }}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8 space-y-4">
                    <div
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border"
                      style={{
                        backgroundColor: accentSoftBg,
                        borderColor: accentBorderColor,
                        color: accentHex,
                      }}
                    >
                      <Building2 size={13} />
                      <span>Ambiente Oficial da Secretaria</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1]">
                      {profile.departmentName}
                    </h2>

                    <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-3xl">
                      {profile.overview}
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <a
                        href="#resultados"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5"
                        style={{ backgroundColor: accentHex }}
                      >
                        <Trophy size={15} />
                        <span>Vitrine de Resultados & Índices</span>
                      </a>
                      <a
                        href="#carta-servicos"
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition shadow-xs"
                      >
                        <span>Carta de Serviços ({profile.services?.length || 0})</span>
                        <ChevronRight size={15} />
                      </a>
                      <a
                        href="#atos-pasta"
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition shadow-xs"
                      >
                        <BookOpen size={15} className="site-accent-text" />
                        <span>Atos & Leis ({secretariatActs.length + secretariatLaws.length})</span>
                      </a>
                    </div>
                  </div>

                  {/* Painel Executivo da Vitrine (Titular + Indicadores de Impacto) */}
                  <div className="lg:col-span-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                    {!isElectoralMode && (profile.secretaryName || profile.secretaryPhotoUrl) ? (
                      <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                        {profile.secretaryPhotoUrl ? (
                          <img
                            src={profile.secretaryPhotoUrl}
                            alt={profile.secretaryName || profile.departmentName}
                            className="w-14 h-14 rounded-2xl object-cover border-2 shrink-0 shadow-sm"
                            style={{ borderColor: accentBorderColor }}
                          />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 site-accent-soft"
                          >
                            <UserCheck size={24} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest site-accent-text truncate">
                            {profile.secretaryRole || 'Secretário(a) da Pasta'}
                          </p>
                          <h3 className="text-sm font-black truncate">
                            {profile.secretaryName}
                          </h3>
                          {profile.secretaryBio && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                              {profile.secretaryBio}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            Vitrine de Gestão Pública
                          </p>
                          <h3 className="text-sm font-black">Resultados & Desempenho</h3>
                        </div>
                        <BarChart3 size={20} className="site-accent-text" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5 text-center">
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-xl font-black">
                          {(profile.indicators?.length || 0) > 0
                            ? profile.indicators!.length
                            : suggestedReferenceIndicators.length}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">
                          Índices Monitorados
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-xl font-black">
                          {(profile.results?.length || 0) + secretariatProjects.length}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">
                          Resultados & Obras
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-xl font-black">{profile.awards?.length || 0}</div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">
                          Prêmios & Selos
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-xl font-black">{secretariatActs.length + secretariatLaws.length}</div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">
                          Atos Publicados
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      {profile.serviceHours && (
                        <div className="flex items-start gap-2">
                          <Clock size={14} className="site-accent-text shrink-0 mt-0.5" />
                          <span>{profile.serviceHours}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-start gap-2">
                          <Phone size={14} className="site-accent-text shrink-0 mt-0.5" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Seção Principal: Vitrine de Resultados, Índices Oficiais & Prêmios */}
              <section
                id="resultados"
                className="bg-white dark:bg-neutral-900/60 border-b border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-16"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                  {/* Cabeçalho da Vitrine */}
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Prestação de Contas · Desempenho & Reconhecimentos
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Vitrine de Resultados, Índices e Prêmios
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
                        {profile.resultsSummary ||
                          `Acompanhe os indicadores oficiais, metas alcançadas, entregas realizadas e certificações da ${profile.departmentName}.`}
                      </p>
                    </div>
                    {isAuthenticated && (
                      <a
                        href={withInstitutionQuery('/servidores', currentInstitution)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-black transition self-start lg:self-auto"
                      >
                        <Sparkles size={13} className="site-accent-text" />
                        <span>Atualizar Resultados no Painel →</span>
                      </a>
                    )}
                  </div>

                  {/* Mensagem de Gestão do Secretário (Ocultada em Modo Eleitoral) */}
                  {!isElectoralMode && profile.secretaryBio && (
                    <div
                      className="p-6 sm:p-7 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center gap-5"
                      style={{
                        backgroundColor: accentSoftBg,
                        borderColor: accentBorderColor,
                      }}
                    >
                      {profile.secretaryPhotoUrl ? (
                        <img
                          src={profile.secretaryPhotoUrl}
                          alt={profile.secretaryName || profile.departmentName}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-white dark:border-neutral-800 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-900 flex items-center justify-center shrink-0 shadow-sm site-accent-text">
                          <UserCheck size={28} />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-black uppercase tracking-widest site-accent-text">
                          Palavra da Gestão · {profile.secretaryName || profile.secretaryRole}
                        </p>
                        <p className="text-sm sm:text-base font-medium text-neutral-800 dark:text-neutral-100 leading-relaxed">
                          “{profile.secretaryBio}”
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bloco A: Índices Oficiais & Metas */}
                  <div id="indices" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-black flex items-center gap-2">
                        <BarChart3 size={19} className="site-accent-text" />
                        <span>Índices Oficiais & Metas de Desempenho</span>
                      </h3>
                      <span className="text-[11px] font-bold text-neutral-400">
                        {(profile.indicators?.length || 0) > 0
                          ? `${profile.indicators!.length} indicador(es) divulgado(s)`
                          : 'Indicadores de referência da área'}
                      </span>
                    </div>

                    {(profile.indicators?.length || 0) > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profile.indicators!.map((ind) => {
                          const hasProgress = typeof ind.progress === 'number' && ind.progress > 0;
                          const clamped = Math.min(100, Math.max(0, Number(ind.progress) || 0));
                          return (
                            <div
                              key={ind.id}
                              className="p-5 sm:p-6 rounded-3xl bg-neutral-50/90 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-between gap-4 shadow-xs"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider site-accent-soft">
                                    {ind.trend === 'highlight'
                                      ? 'Destaque'
                                      : ind.trend === 'stable'
                                      ? 'Monitorado'
                                      : 'Evolução'}
                                  </span>
                                  {ind.period && (
                                    <span className="text-[11px] font-bold text-neutral-400">{ind.period}</span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-neutral-600 dark:text-neutral-300 leading-snug">
                                  {ind.name}
                                </h4>
                                <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: accentHex }}>
                                  {ind.value}
                                </div>
                                {ind.target && (
                                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    {ind.target}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2 pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
                                {hasProgress && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-neutral-400">
                                      <span>Alcance da Meta</span>
                                      <span>{clamped}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${clamped}%`, backgroundColor: accentHex }}
                                      />
                                    </div>
                                  </div>
                                )}
                                {ind.source && (
                                  <p className="text-[11px] font-semibold text-neutral-400 truncate">
                                    Fonte: {ind.source}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suggestedReferenceIndicators.map((ind) => (
                          <div
                            key={ind.id}
                            className="p-5 rounded-3xl bg-neutral-50/70 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                Indicador Oficial da Pasta
                              </span>
                              <span className="text-[10px] font-bold text-neutral-400">{ind.period}</span>
                            </div>
                            <h4 className="text-sm font-black">{ind.name}</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {ind.target} · Fonte: {ind.source}
                            </p>
                            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 pt-1">
                              Aguardando publicação da nota/percentual oficial pela secretaria.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bloco B: Prêmios, Selos & Reconhecimentos */}
                  {(profile.awards?.length || 0) > 0 && (
                    <div id="premios" className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-black flex items-center gap-2">
                          <Trophy size={19} className="text-amber-500" />
                          <span>Prêmios, Selos & Certificações Conquistadas</span>
                        </h3>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {profile.awards!.length} reconhecimento(s) oficial(is)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profile.awards!.map((awd) => (
                          <div
                            key={awd.id}
                            className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/90 via-white to-white dark:from-amber-500/10 dark:via-neutral-900 dark:to-neutral-900 border border-amber-200/80 dark:border-amber-500/25 space-y-3 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                                <Medal size={22} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                {awd.category && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                                    {awd.category}
                                  </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                                  {awd.year}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-base font-black leading-snug">{awd.title}</h4>
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                <Award size={12} />
                                <span>Concedido por: {awd.issuer}</span>
                              </p>
                              {awd.description && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pt-1">
                                  {awd.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bloco C: Resultados, Entregas & Obras Realizadas */}
                  {((profile.results?.length || 0) > 0 || secretariatProjects.length > 0) && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-black flex items-center gap-2">
                          <TrendingUp size={19} className="site-accent-text" />
                          <span>Resultados, Entregas & Obras Realizadas</span>
                        </h3>
                        <span className="text-[11px] font-bold text-neutral-400">
                          {(profile.results?.length || 0) + secretariatProjects.length} entrega(s) registrada(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(profile.results || []).map((res) => (
                          <div
                            key={res.id}
                            className="p-5 sm:p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase site-accent-soft">
                                  {res.category || 'Resultado da Gestão'}
                                </span>
                                {res.year && (
                                  <span className="text-[11px] font-bold text-neutral-400">{res.year}</span>
                                )}
                              </div>
                              <div className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: accentHex }}>
                                {res.metric}
                              </div>
                              <h4 className="text-sm sm:text-base font-black leading-snug">{res.title}</h4>
                              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                {res.description}
                              </p>
                            </div>
                          </div>
                        ))}

                        {secretariatProjects.map((proj) => (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => setSelectedNews(proj)}
                            className="text-left p-5 sm:p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-md transition flex flex-col justify-between gap-3 cursor-pointer"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                  {proj.project_status || proj.category}
                                </span>
                                <span className="text-[11px] font-bold text-neutral-400">
                                  {formatDatePtBr(proj.published_at)}
                                </span>
                              </div>
                              {typeof proj.project_budget === 'number' && proj.project_budget > 0 && (
                                <div className="text-lg font-black" style={{ color: accentHex }}>
                                  {proj.project_budget.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </div>
                              )}
                              <h4 className="text-sm sm:text-base font-black leading-snug line-clamp-2">
                                {proj.title}
                              </h4>
                              {proj.subtitle && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                                  {proj.subtitle}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-black site-accent-text inline-flex items-center gap-1">
                              <span>Ver entrega completa</span>
                              <ChevronRight size={13} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Seção 1: Dados da Secretaria, Missão, Visão e Competências */}
              <section id="dados-missao" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Missão & Visão */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 space-y-3">
                      <div className="w-10 h-10 rounded-2xl site-accent-soft flex items-center justify-center">
                        <Target size={20} />
                      </div>
                      <h3 className="text-base font-black">Missão Institucional</h3>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {profile.mission}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 space-y-3">
                      <div className="w-10 h-10 rounded-2xl site-accent-soft flex items-center justify-center">
                        <Compass size={20} />
                      </div>
                      <h3 className="text-base font-black">Visão de Gestão Pública</h3>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {profile.vision}
                      </p>
                    </div>

                    {profile.competencies && profile.competencies.length > 0 && (
                      <div className="sm:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <Layers size={18} className="site-accent-text" />
                          <h3 className="text-base font-black">Principais Competências & Atribuições</h3>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {profile.competencies.map((comp, idx) => (
                            <li
                              key={`${idx}-${comp.slice(0, 12)}`}
                              className="flex items-start gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-3"
                            >
                              <CheckCircle2 size={15} className="site-accent-text shrink-0 mt-0.5" />
                              <span>{comp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Dados de Atendimento & Titularidade */}
                  <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Dados da Secretaria
                      </p>
                      <h3 className="text-xl font-black mt-1">Atendimento e Localização</h3>
                    </div>

                    {!isElectoralMode && profile.secretaryName && (
                      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          {profile.secretaryRole || 'Responsável pela Pasta'}
                        </p>
                        <p className="text-sm font-black mt-1">{profile.secretaryName}</p>
                      </div>
                    )}

                    <div className="space-y-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="site-accent-text shrink-0 mt-0.5" />
                        <span>{profile.address || config.address || 'Sede Administrativa da Prefeitura Municipal'}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock size={16} className="site-accent-text shrink-0" />
                        <span>{profile.serviceHours || config.serviceHours || 'Segunda a Sexta, 07h às 13h'}</span>
                      </div>
                      {(profile.phone || config.phone) && (
                        <div className="flex items-center gap-2.5">
                          <Phone size={16} className="site-accent-text shrink-0" />
                          <span>{profile.phone || config.phone}</span>
                        </div>
                      )}
                      {(profile.email || config.email) && (
                        <div className="flex items-center gap-2.5">
                          <Mail size={16} className="site-accent-text shrink-0" />
                          <a href={`mailto:${profile.email || config.email}`} className="hover:underline break-all">
                            {profile.email || config.email}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2">
                      {showOuvidoria && (
                        <a
                          href={withInstitutionQuery('/ouvidoria', currentInstitution)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 text-xs font-bold"
                        >
                          <Headphones size={13} className="site-accent-text" />
                          <span>Solicitar Informação (e-SIC)</span>
                        </a>
                      )}
                      <a
                        href={withInstitutionQuery('/diario', currentInstitution)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 text-xs font-bold"
                      >
                        <BookOpen size={13} className="site-accent-text" />
                        <span>Diário Oficial</span>
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* Seção 2: Carta de Serviços da Secretaria */}
              <section
                id="carta-servicos"
                className="bg-white dark:bg-neutral-900/60 border-y border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-14"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-7">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Lei nº 13.460/2017 · Atendimento Público
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Carta de Serviços da Secretaria
                      </h2>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                      Relação oficial dos serviços prestados pela {profile.departmentName}, requisitos, canais de acesso e prazos estimados.
                    </p>
                  </div>

                  {!profile.services || profile.services.length === 0 ? (
                    <div className="p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-sm text-neutral-500">
                      Nenhum serviço detalhado cadastrado ainda para esta pasta no painel de Site Institucional.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {profile.services.map((srv) => {
                        const resolvedAction = resolveActionHref(srv.actionUrl, currentInstitution);
                        return (
                          <div
                            key={srv.id}
                            className="p-6 rounded-3xl bg-neutral-50/80 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-between gap-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-base sm:text-lg font-black leading-snug">{srv.title}</h3>
                                {srv.sla && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider site-accent-soft shrink-0">
                                    {srv.sla}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                {srv.description}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-[11px]">
                                {srv.requirements && (
                                  <div className="p-3 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800">
                                    <p className="font-black uppercase tracking-wider text-neutral-400 text-[10px]">
                                      Documentos / Requisitos
                                    </p>
                                    <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-0.5">
                                      {srv.requirements}
                                    </p>
                                  </div>
                                )}
                                {srv.channel && (
                                  <div className="p-3 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800">
                                    <p className="font-black uppercase tracking-wider text-neutral-400 text-[10px]">
                                      Canal de Atendimento
                                    </p>
                                    <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-0.5">
                                      {srv.channel}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {resolvedAction && (
                              <div className="pt-3 border-t border-neutral-200/70 dark:border-neutral-800">
                                <a
                                  href={resolvedAction.href}
                                  target={resolvedAction.external ? '_blank' : undefined}
                                  rel={resolvedAction.external ? 'noopener noreferrer' : undefined}
                                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider site-accent-text hover:underline"
                                >
                                  <span>{srv.actionLabel || 'Acessar serviço'}</span>
                                  {resolvedAction.external ? <ExternalLink size={13} /> : <ChevronRight size={14} />}
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Seção 3: Notícias da Secretaria */}
              {showNoticias && (
                <section id="noticias-pasta" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Comunicação Pública
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Notícias & Ações da Secretaria
                      </h2>
                    </div>
                    <a
                      href={withInstitutionQuery('/noticias', currentInstitution)}
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider site-accent-text hover:underline"
                    >
                      <span>Portal Completo de Notícias</span>
                      <ChevronRight size={14} />
                    </a>
                  </div>

                  {loadingData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-56 rounded-3xl bg-neutral-200/60 dark:bg-neutral-800 animate-pulse" />
                      ))}
                    </div>
                  ) : secretariatNews.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-2">
                      <Newspaper size={28} className="mx-auto text-neutral-400" />
                      <p className="text-sm font-bold text-neutral-500">
                        Nenhuma notícia vinculada especificamente à {profile.departmentName} publicada até o momento.
                      </p>
                      <a
                        href={withInstitutionQuery('/noticias', currentInstitution)}
                        className="inline-flex items-center gap-1 text-xs font-black site-accent-text hover:underline"
                      >
                        <span>Ver todas as notícias do município</span>
                        <ChevronRight size={13} />
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {secretariatNews.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedNews(item)}
                          className="group text-left bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col hover:shadow-lg transition cursor-pointer"
                        >
                          {item.cover_image_url ? (
                            <div className="aspect-[16/10] overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                              <img
                                src={item.cover_image_url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center site-accent-soft">
                              <Newspaper size={28} className="site-accent-text" />
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                                <span className="site-accent-text">{item.category}</span>
                                <span>{formatDatePtBr(item.published_at)}</span>
                              </div>
                              <h3 className="font-black text-sm sm:text-base leading-snug line-clamp-2 group-hover:underline">
                                {item.title}
                              </h3>
                              {item.subtitle && (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold site-accent-text">
                              <span>Ler matéria completa</span>
                              <ChevronRight size={13} />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Seção 4: Atos Oficiais & Legislação Própria da Secretaria */}
              <section
                id="atos-pasta"
                className="bg-white dark:bg-neutral-900/60 border-y border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-14"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-7">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Diário Oficial & Atos Normativos
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Atos Oficiais e Legislação da Pasta
                      </h2>
                    </div>

                    <div className="relative w-full md:w-80">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        type="text"
                        value={actsSearch}
                        onChange={(e) => setActsSearch(e.target.value)}
                        placeholder="Filtrar portarias, editais, decretos ou leis..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Coluna Diário Oficial da Pasta */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                          <BookOpen size={15} className="site-accent-text" />
                          <span>Atos no Diário Oficial ({secretariatActs.length})</span>
                        </h3>
                        <a
                          href={withInstitutionQuery('/diario', currentInstitution)}
                          className="text-xs font-bold site-accent-text hover:underline"
                        >
                          Ver Diário Oficial →
                        </a>
                      </div>

                      {secretariatActs.length === 0 ? (
                        <div className="p-6 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
                          Nenhuma publicação no Diário Oficial vinculada diretamente à {profile.departmentName} com os filtros atuais.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {secretariatActs.slice(0, 8).map((act) => {
                            const parentEdition = act.edition_id ? editionsById.get(act.edition_id) : undefined;
                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => handleOpenActInGazette(act)}
                                className="w-full text-left p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-md transition space-y-2 cursor-pointer"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase site-accent-soft">
                                      {act.category}
                                    </span>
                                    <span className="text-xs font-black">Nº {act.act_number}</span>
                                  </div>
                                  <span className="text-[11px] text-neutral-400 font-semibold">
                                    {parentEdition
                                      ? `Edição ${parentEdition.edition_number} · ${formatDatePtBr(parentEdition.publication_date)}`
                                      : formatDatePtBr(act.created_at)}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold leading-snug line-clamp-2">{act.title}</h4>
                                {act.summary && (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                    {act.summary}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Coluna Legislação Municipal Correlata */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                          <Scale size={15} className="site-accent-text" />
                          <span>Legislação & Normas Correlatas ({secretariatLaws.length})</span>
                        </h3>
                        <a
                          href={`${withInstitutionQuery('/site', currentInstitution)}#legislacao`}
                          className="text-xs font-bold site-accent-text hover:underline"
                        >
                          Banco de Leis →
                        </a>
                      </div>

                      {secretariatLaws.length === 0 ? (
                        <div className="p-6 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
                          Nenhuma lei ou decreto específico localizado para esta pasta. Consulte o Banco de Leis completo no portal principal.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {secretariatLaws.slice(0, 8).map((law) => (
                            <button
                              key={law.id}
                              type="button"
                              onClick={() => setSelectedLaw(law)}
                              className="w-full text-left p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-md transition space-y-2 cursor-pointer"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase site-accent-soft">
                                    {law.type}
                                  </span>
                                  <span className="text-xs font-black">Nº {law.number}</span>
                                </div>
                                <span className="text-[11px] text-neutral-400 font-semibold">
                                  {formatDatePtBr(law.publication_date)}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold leading-snug line-clamp-1">{law.title}</h4>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                {law.ementa}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Seção 5: Navegação Rápida para Outras Secretarias */}
              {departmentNames.length > 1 && (
                <section id="outras-secretarias" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Estrutura Administrativa
                      </p>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                        Outras Secretarias do Município
                      </h2>
                    </div>
                    <a
                      href={`${withInstitutionQuery('/site', currentInstitution)}#secretarias`}
                      className="text-xs font-bold site-accent-text hover:underline"
                    >
                      Ver no site principal →
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {departmentNames
                      .filter((name) => normalizeSecretariatSlug(name) !== profile.slug)
                      .map((deptName) => (
                        <a
                          key={deptName}
                          href={withInstitutionQuery(
                            `/secretaria/${normalizeSecretariatSlug(deptName)}`,
                            currentInstitution
                          )}
                          className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-md transition flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-bold truncate" title={deptName}>
                            {deptName}
                          </span>
                          <ChevronRight size={14} className="site-accent-text shrink-0" />
                        </a>
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        {/* Rodapé */}
        <footer className="mt-auto bg-neutral-900 text-neutral-300 border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                {currentInstitution.logo_url && !logoFailed ? (
                  <img
                    src={currentInstitution.logo_url}
                    alt={`Brasão ${currentInstitution.name}`}
                    className="w-full h-full object-contain"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <LogoCompass size={22} disableExpand />
                )}
              </div>
              <div>
                <p className="font-black text-white text-sm">{currentInstitution.name}</p>
                <p className="text-neutral-400">
                  {profile?.departmentName || 'Portal das Secretarias Municipais'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
              <a href={withInstitutionQuery('/site', currentInstitution)} className="hover:text-white">
                Site da Prefeitura
              </a>
              <button
                type="button"
                onClick={() => setComplianceDialog('privacy')}
                className="hover:text-white uppercase cursor-pointer"
              >
                Privacidade & Cookies (LGPD)
              </button>
              <button
                type="button"
                onClick={() => setComplianceDialog('accessibility')}
                className="hover:text-white uppercase cursor-pointer"
              >
                Acessibilidade
              </button>
              <button
                type="button"
                onClick={() => setComplianceDialog('sitemap')}
                className="hover:text-white uppercase cursor-pointer"
              >
                Mapa do Site
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-800/90 bg-black/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400">
              <span>Portal oficial integrado às secretarias e serviços públicos do município.</span>
              <a
                href={landingPageUrl}
                className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition group"
                title="Conheça a plataforma Gestão 360"
              >
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200">
                  Tecnologia
                </span>
                <LogoCompass size={18} disableExpand className="rounded-lg" />
                <span className="font-black text-white tracking-tight">Gestão 360</span>
                <ArrowUpRight size={12} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal de Leitura Rápida de Notícia */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-[9995] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedNews(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl"
          >
            {selectedNews.cover_image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <img
                  src={selectedNews.cover_image_url}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                  <span className="px-2.5 py-1 rounded-full site-accent-soft">{selectedNews.category}</span>
                  <span className="text-neutral-400">{formatDatePtBr(selectedNews.published_at)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNews(null)}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  aria-label="Fechar notícia"
                >
                  <X size={18} />
                </button>
              </div>

              <h3 className="text-xl sm:text-2xl font-black leading-tight">{selectedNews.title}</h3>
              {selectedNews.subtitle && (
                <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  {selectedNews.subtitle}
                </p>
              )}
              <div className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-line pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {selectedNews.content}
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={withInstitutionQuery(`/noticias?id=${selectedNews.id}`, currentInstitution)}
                  className="inline-flex items-center gap-1.5 text-xs font-black site-accent-text hover:underline"
                >
                  <span>Abrir no Portal de Notícias</span>
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedNews(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {readingGazetteEdition && (
        <OfficialGazetteReaderModal
          edition={readingGazetteEdition}
          acts={gazetteActs.filter((a) => a.edition_id === readingGazetteEdition.id)}
          institution={currentInstitution}
          onClose={() => setReadingGazetteEdition(null)}
        />
      )}

      {selectedLaw && (
        <LawReaderModal
          law={selectedLaw}
          institution={currentInstitution}
          onClose={() => setSelectedLaw(null)}
        />
      )}

      <SiteComplianceModals
        openType={complianceDialog}
        onClose={() => setComplianceDialog(null)}
        institution={currentInstitution}
        config={config}
        accentHex={accentHex}
        darkMode={darkMode}
        isMourning={isMourning}
      />

      {config.sections.showCookieBanner !== false && (
        <CookieConsentBanner
          institution={currentInstitution}
          visible={showCookieBanner}
          accentHex={accentHex}
          darkMode={darkMode}
          isMourning={isMourning}
          onAcceptedOrDismissed={() => setShowCookieBanner(false)}
          onOpenPrivacy={() => setComplianceDialog('privacy')}
        />
      )}
    </div>
  );
};

