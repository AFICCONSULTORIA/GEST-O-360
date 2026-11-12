import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Lock,
  Globe,
  Newspaper,
  Calendar,
  HeartPulse,
  GraduationCap,
  Headphones,
  Scale,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Search,
  ExternalLink,
  FileText,
  ShieldCheck,
  QrCode,
  Fuel,
  ArrowUpRight,
  Landmark,
  X,
  Menu,
  Users,
  BookOpen,
  FileBadge,
  Megaphone,
  Star,
  Sparkles,
  Link2,
} from 'lucide-react';
import {
  Institution,
  AdminUser,
  MunicipalNews,
  MunicipalLaw,
  OfficialGazetteEdition,
  OfficialGazetteAct,
} from '../types';
import { LogoCompass } from './LogoCompass';
import { isInstitutionModuleActive, withInstitutionQuery } from '../lib/institutionModules';
import { useMunicipalDepartments } from '../lib/api/departments';
import {
  useInstitutionalSiteConfig,
  SiteThemeColor,
  resolveSiteAccentHex,
  getActiveSitePopups,
  normalizeSecretariatSlug,
  resolveSecretariatProfile,
  resolveEffectiveUsefulLinks,
  getGestao360LandingUrl,
} from '../lib/api/institutionalSite';
import { AccessibilityBar } from './AccessibilityBar';
import { SitePopupCarouselModal } from './SitePopupCarouselModal';
import { fetchInstitutionNews, NEWS_UPDATED_EVENT } from '../lib/api/municipalNews';
import { fetchInstitutionLaws, LAWS_UPDATED_EVENT } from '../lib/api/municipalLaws';
import {
  fetchGazetteEditions,
  fetchGazetteActs,
  GAZETTE_UPDATED_EVENT,
} from '../lib/api/officialGazette';
import { OfficialGazetteReaderModal } from '../modules/DiarioOficial/components/OfficialGazetteReaderModal';
import { LawReaderModal } from '../modules/Laws/components/LawReaderModal';
import {
  ComplianceDialogType,
  CookieConsentBanner,
  SiteComplianceModals,
  readCookieConsent,
} from './SiteComplianceModals';

export interface InstitutionalSiteProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  currentInstitution: Institution;
  onReturnToHome?: () => void;
  isAuthenticated?: boolean;
  currentUser?: AdminUser | null;
}

const THEME_PALETTES: Record<
  SiteThemeColor,
  {
    accentText: string;
    accentBg: string;
    accentBgHover: string;
    accentSoft: string;
    accentBorder: string;
    heroGlow: string;
  }
> = {
  emerald: {
    accentText: 'text-emerald-700 dark:text-emerald-400',
    accentBg: 'bg-emerald-600 dark:bg-emerald-500',
    accentBgHover: 'hover:bg-emerald-700 dark:hover:bg-emerald-400',
    accentSoft: 'bg-emerald-50 dark:bg-emerald-500/10',
    accentBorder: 'border-emerald-200 dark:border-emerald-500/20',
    heroGlow: 'from-emerald-600/15 via-teal-500/5 to-transparent',
  },
  sky: {
    accentText: 'text-sky-700 dark:text-sky-400',
    accentBg: 'bg-sky-600 dark:bg-sky-500',
    accentBgHover: 'hover:bg-sky-700 dark:hover:bg-sky-400',
    accentSoft: 'bg-sky-50 dark:bg-sky-500/10',
    accentBorder: 'border-sky-200 dark:border-sky-500/20',
    heroGlow: 'from-sky-600/15 via-blue-500/5 to-transparent',
  },
  indigo: {
    accentText: 'text-indigo-700 dark:text-indigo-400',
    accentBg: 'bg-indigo-600 dark:bg-indigo-500',
    accentBgHover: 'hover:bg-indigo-700 dark:hover:bg-indigo-400',
    accentSoft: 'bg-indigo-50 dark:bg-indigo-500/10',
    accentBorder: 'border-indigo-200 dark:border-indigo-500/20',
    heroGlow: 'from-indigo-600/15 via-violet-500/5 to-transparent',
  },
  amber: {
    accentText: 'text-amber-700 dark:text-amber-400',
    accentBg: 'bg-amber-600 dark:bg-amber-500',
    accentBgHover: 'hover:bg-amber-700 dark:hover:bg-amber-400',
    accentSoft: 'bg-amber-50 dark:bg-amber-500/10',
    accentBorder: 'border-amber-200 dark:border-amber-500/20',
    heroGlow: 'from-amber-600/15 via-orange-500/5 to-transparent',
  },
  slate: {
    accentText: 'text-slate-800 dark:text-slate-300',
    accentBg: 'bg-slate-800 dark:bg-slate-200 dark:text-slate-950',
    accentBgHover: 'hover:bg-slate-900 dark:hover:bg-white',
    accentSoft: 'bg-slate-100 dark:bg-slate-800',
    accentBorder: 'border-slate-300 dark:border-slate-700',
    heroGlow: 'from-slate-600/15 via-neutral-500/5 to-transparent',
  },
};

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

export const InstitutionalSite: React.FC<InstitutionalSiteProps> = ({
  darkMode,
  setDarkMode,
  currentInstitution,
  isAuthenticated = false,
}) => {
  const { config } = useInstitutionalSiteConfig(currentInstitution);
  const { departmentNames } = useMunicipalDepartments(currentInstitution.id);
  const palette = THEME_PALETTES[config.primaryColor || 'emerald'];
  const accentHex = resolveSiteAccentHex(config);
  const accentSoftBg = hexToRgba(accentHex, darkMode ? 0.18 : 0.1);
  const accentBorderColor = hexToRgba(accentHex, 0.3);
  const accentGlowBg = `linear-gradient(135deg, ${hexToRgba(accentHex, 0.18)} 0%, ${hexToRgba(accentHex, 0.04)} 50%, transparent 100%)`;

  const [news, setNews] = useState<MunicipalNews[]>([]);
  const [laws, setLaws] = useState<MunicipalLaw[]>([]);
  const [gazetteEditions, setGazetteEditions] = useState<OfficialGazetteEdition[]>([]);
  const [gazetteActs, setGazetteActs] = useState<OfficialGazetteAct[]>([]);
  const [gazetteSearch, setGazetteSearch] = useState('');
  const [readingGazetteEdition, setReadingGazetteEdition] =
    useState<OfficialGazetteEdition | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [lawSearch, setLawSearch] = useState('');
  const [lawTypeFilter, setLawTypeFilter] = useState<string>('Todas');
  const [lawYearFilter, setLawYearFilter] = useState<string>('Todos');
  const [showAllLaws, setShowAllLaws] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<MunicipalLaw | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMourningModal, setShowMourningModal] = useState<boolean>(() =>
    Boolean(config.mourningMode?.enabled)
  );
  const activePopups = useMemo(() => getActiveSitePopups(config), [config]);
  const [popupCarouselOpen, setPopupCarouselOpen] = useState<boolean>(() => activePopups.length > 0);
  const [popupDismissed, setPopupDismissed] = useState<boolean>(false);
  const [complianceDialog, setComplianceDialog] = useState<ComplianceDialogType>(null);
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(
    () => !readCookieConsent(currentInstitution.id)
  );

  useEffect(() => {
    setShowCookieBanner(!readCookieConsent(currentInstitution.id));
  }, [currentInstitution.id]);
  const [logoFailed, setLogoFailed] = useState(false);
  const [newsSlideIndex, setNewsSlideIndex] = useState(0);
  const [newsCarouselPaused, setNewsCarouselPaused] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [currentInstitution.logo_url]);

  useEffect(() => {
    setShowMourningModal(Boolean(config.mourningMode?.enabled));
    setPopupDismissed(false);
  }, [config.mourningMode?.enabled, currentInstitution.id]);

  useEffect(() => {
    if (!popupDismissed && activePopups.length > 0) {
      setPopupCarouselOpen(true);
    } else if (activePopups.length === 0) {
      setPopupCarouselOpen(false);
    }
  }, [activePopups.length, popupDismissed]);

  const showNoticias = isInstitutionModuleActive(currentInstitution, 'noticias');
  const showServicos = isInstitutionModuleActive(currentInstitution, 'servicos_publicos');
  const showSaude = isInstitutionModuleActive(currentInstitution, 'saude');
  const showEducacao = isInstitutionModuleActive(currentInstitution, 'education');
  const showOuvidoria = isInstitutionModuleActive(currentInstitution, 'ouvidoria');
  const showNotaFiscal = isInstitutionModuleActive(currentInstitution, 'notafiscal');
  const usefulLinks = useMemo(() => resolveEffectiveUsefulLinks(config), [config]);
  const landingPageUrl = getGestao360LandingUrl();

  useEffect(() => {
    let active = true;
    const loadPublicData = async () => {
      setLoadingFeed(true);
      try {
        const [publishedNews, publishedLaws, publishedGazetteEditions, publishedGazetteActs] =
          await Promise.all([
            fetchInstitutionNews(currentInstitution, { onlyPublished: true, limit: 10 }),
            fetchInstitutionLaws(currentInstitution, {
              onlySitePublished: true,
              prioritizeFeatured: true,
            }),
            fetchGazetteEditions(currentInstitution, { onlyPublished: true, limit: 12 }),
            fetchGazetteActs(currentInstitution, { onlyPublished: true }),
          ]);

        if (!active) return;

        setNews(publishedNews);
        setLaws(publishedLaws);
        setGazetteEditions(publishedGazetteEditions);
        setGazetteActs(publishedGazetteActs);
      } catch (err) {
        console.warn('[InstitutionalSite] Erro ao carregar feed público:', err);
      } finally {
        if (active) setLoadingFeed(false);
      }
    };

    loadPublicData();

    const onFeedUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === currentInstitution.id) {
        loadPublicData();
      }
    };
    window.addEventListener(NEWS_UPDATED_EVENT, onFeedUpdated);
    window.addEventListener(LAWS_UPDATED_EVENT, onFeedUpdated);
    window.addEventListener(GAZETTE_UPDATED_EVENT, onFeedUpdated);

    return () => {
      active = false;
      window.removeEventListener(NEWS_UPDATED_EVENT, onFeedUpdated);
      window.removeEventListener(LAWS_UPDATED_EVENT, onFeedUpdated);
      window.removeEventListener(GAZETTE_UPDATED_EVENT, onFeedUpdated);
    };
  }, [currentInstitution.id]);

  const gazetteActsByEdition = useMemo(() => {
    const map = new Map<string, OfficialGazetteAct[]>();
    gazetteActs.forEach((act) => {
      if (!act.edition_id) return;
      const list = map.get(act.edition_id) || [];
      list.push(act);
      map.set(act.edition_id, list);
    });
    return map;
  }, [gazetteActs]);

  const filteredGazetteEditions = useMemo(() => {
    const q = gazetteSearch.trim().toLowerCase();
    if (!q) return gazetteEditions.slice(0, 4);
    return gazetteEditions
      .filter((ed) => {
        const edActs = gazetteActsByEdition.get(ed.id) || [];
        const inEd = [ed.edition_number, ed.title, ed.summary || '', ed.verification_code]
          .join(' ')
          .toLowerCase()
          .includes(q);
        const inActs = edActs.some((a) =>
          [a.title, a.act_number, a.department || '', a.summary || '']
            .join(' ')
            .toLowerCase()
            .includes(q)
        );
        return inEd || inActs;
      })
      .slice(0, 6);
  }, [gazetteEditions, gazetteActsByEdition, gazetteSearch]);

  const lawAvailableTypes = useMemo(() => {
    const counts = new Map<string, number>();
    laws.forEach((l) => {
      const typeLabel = l.type || 'Outros';
      counts.set(typeLabel, (counts.get(typeLabel) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [laws]);

  const lawAvailableYears = useMemo(() => {
    const years = new Set<string>();
    laws.forEach((l) => {
      if (l.publication_date) years.add(l.publication_date.slice(0, 4));
      const parts = (l.number || '').split('/');
      if (parts[1] && /^\d{4}$/.test(parts[1])) years.add(parts[1]);
    });
    return Array.from(years).sort().reverse();
  }, [laws]);

  const matchedLaws = useMemo(() => {
    const q = lawSearch.trim().toLowerCase();
    return laws.filter((l) => {
      if (lawTypeFilter !== 'Todas' && l.type !== lawTypeFilter) return false;
      if (lawYearFilter !== 'Todos') {
        const matchDate = (l.publication_date || '').startsWith(lawYearFilter);
        const matchNum = (l.number || '').includes(`/${lawYearFilter}`);
        if (!matchDate && !matchNum) return false;
      }
      if (!q) return true;
      return (
        (l.number || '').toLowerCase().includes(q) ||
        (l.title || '').toLowerCase().includes(q) ||
        (l.ementa || '').toLowerCase().includes(q) ||
        (l.type || '').toLowerCase().includes(q) ||
        (l.category || '').toLowerCase().includes(q) ||
        (l.full_text || '').toLowerCase().includes(q)
      );
    });
  }, [laws, lawSearch, lawTypeFilter, lawYearFilter]);

  const visibleLaws = useMemo(
    () => (showAllLaws ? matchedLaws : matchedLaws.slice(0, 6)),
    [matchedLaws, showAllLaws]
  );

  const carouselNews = useMemo(() => {
    const withImage = news.filter((item) => Boolean(item.cover_image_url?.trim()));
    return (withImage.length > 0 ? withImage : news).slice(0, 10);
  }, [news]);

  const fixedLatestNews = useMemo(() => news.slice(0, 3), [news]);

  const safeNewsSlideIndex =
    carouselNews.length > 0 ? newsSlideIndex % carouselNews.length : 0;

  useEffect(() => {
    setNewsSlideIndex(0);
  }, [carouselNews.length, currentInstitution.id]);

  useEffect(() => {
    if (newsCarouselPaused || carouselNews.length <= 1) return;
    const timer = window.setInterval(() => {
      setNewsSlideIndex((prev) => (prev + 1) % carouselNews.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [newsCarouselPaused, carouselNews.length]);

  const citizenServices = useMemo(() => {
    const cndUrl = (config.cndMunicipalUrl || '').trim();
    const cards: {
      id: string;
      title: string;
      description: string;
      href: string;
      icon: React.ComponentType<{ size?: number; className?: string }>;
      badge: string;
      visible: boolean;
      external?: boolean;
    }[] = [
        {
          id: 'cnd-municipal',
          title: 'CND Municipal (Certidão Negativa)',
          description: 'Emissão e consulta online de Certidão Negativa de Débitos Municipais (tributos e contribuintes).',
          href: cndUrl,
          icon: FileBadge,
          badge: 'Tributos / CND',
          visible: Boolean(cndUrl),
          external: true,
        },
        {
          id: 'ouvidoria',
          title: 'Ouvidoria & e-SIC',
          description: 'Envie solicitações, reclamações, denúncias, elogios e pedidos de acesso à informação (LAI).',
          href: withInstitutionQuery('/ouvidoria', currentInstitution),
          icon: Headphones,
          badge: 'Lei 12.527/LAI',
          visible: showOuvidoria,
        },
        {
          id: 'noticias',
          title: 'Notícias & Obras',
          description: 'Acompanhe comunicados oficiais, entrega de obras, eventos e projetos da administração.',
          href: withInstitutionQuery('/noticias', currentInstitution),
          icon: Newspaper,
          badge: 'Comunicação',
          visible: showNoticias,
        },
        {
          id: 'servicos',
          title: 'Serviços Públicos',
          description: 'Abra chamados urbanos (iluminação, limpeza, vias) e acompanhe em tempo real.',
          href: withInstitutionQuery('/servicos', currentInstitution),
          icon: Globe,
          badge: 'Zeladoria',
          visible: showServicos,
        },
        {
          id: 'agendamento',
          title: 'Agendamento SUS',
          description: 'Agende consultas na atenção básica, exames e transporte sanitário.',
          href: withInstitutionQuery('/agendamento', currentInstitution),
          icon: Calendar,
          badge: 'Saúde Digital',
          visible: showSaude,
        },
        {
          id: 'farmacia',
          title: 'Farmácia SUS',
          description: 'Consulte estoque em tempo real dos medicamentos disponíveis na rede municipal.',
          href: withInstitutionQuery('/farmaciasus', currentInstitution),
          icon: HeartPulse,
          badge: 'Estoque Online',
          visible: showSaude,
        },
        {
          id: 'educacao',
          title: 'Educação & Creche',
          description: 'Portal educacional municipal, avaliações e acompanhamento da fila da creche.',
          href: withInstitutionQuery('/educacao', currentInstitution),
          icon: GraduationCap,
          badge: 'Ensino Público',
          visible: showEducacao,
        },
        {
          id: 'notafiscal',
          title: 'Auditor Fiscal 2026',
          description: 'Pré-validação de NF-e e NFS-e conforme Reforma Tributária (IBS/CBS).',
          href: withInstitutionQuery('/notafiscal', currentInstitution),
          icon: Scale,
          badge: 'Fiscal',
          visible: showNotaFiscal,
        },
        {
          id: 'validar-doc',
          title: 'Validar Certidão / Ato',
          description: 'Conferência pública de autenticidade de documentos e certidões emitidas.',
          href: withInstitutionQuery('/validar-documento', currentInstitution),
          icon: QrCode,
          badge: 'Autenticidade',
          visible: config.sections.showValidators,
        },
        {
          id: 'validar-combustivel',
          title: 'Conferir Abastecimento',
          description: 'Consulta pública de requisições e canhotos da frota oficial municipal.',
          href: withInstitutionQuery('/validar-abastecimento', currentInstitution),
          icon: Fuel,
          badge: 'Transparência',
          visible: config.sections.showValidators,
        },
      ];

    return cards.filter((c) => c.visible);
  }, [
    currentInstitution,
    config.cndMunicipalUrl,
    showOuvidoria,
    showNoticias,
    showServicos,
    showSaude,
    showEducacao,
    showNotaFiscal,
    config.sections.showValidators,
  ]);

  const shortMunicipalityName = currentInstitution.name.replace(
    /^Prefeitura Municipal de\s+/i,
    'Prefeitura de '
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedLaw(null);
        setMobileMenuOpen(false);
        setShowMourningModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isMourning = Boolean(config.mourningMode?.enabled);
  const isElectoralMode = Boolean(config.electoralMode);
  const shouldShowInfoCarousel =
    !isElectoralMode &&
    popupCarouselOpen &&
    activePopups.length > 0 &&
    !(isMourning && showMourningModal);

  const getReadAloudText = () => {
    if (showMourningModal && isMourning) {
      return `Nota de Pesar e Luto Oficial da ${currentInstitution.name}. Em memória de ${config.mourningMode.personName || 'ilustre cidadão'}. ${config.mourningMode.message}`;
    }
    if (shouldShowInfoCarousel) {
      const first = activePopups[0];
      return `Comunicado oficial da ${currentInstitution.name}. ${first.title}. ${first.description}`;
    }
    if (selectedLaw) {
      return `${selectedLaw.type} número ${selectedLaw.number}. ${selectedLaw.title}. Ementa: ${selectedLaw.ementa}`;
    }
    return `${currentInstitution.name}. ${config.tagline}. ${config.heroSubtitle}`;
  };

  return (
    <div className={`min-h-[100dvh] ${darkMode ? 'dark' : ''}`}>
      <div
        className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors duration-300"
        style={
          {
            '--site-accent': accentHex,
            '--site-accent-soft': accentSoftBg,
            '--site-accent-border': accentBorderColor,
          } as React.CSSProperties
        }
      >
        <div className={`flex-1 flex flex-col ${isMourning ? 'grayscale' : ''}`}>
          {/* Barra Oficial de Acessibilidade eMAG (Fonte, Alto Contraste, Leitura em Voz, VLibras) */}
          {config.sections.enableAccessibilityBar !== false && (
            <AccessibilityBar
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              enableVLibras={config.sections.enableVLibras !== false}
              getReadAloudText={getReadAloudText}
            />
          )}

          {/* Faixa Oficial de Luto (visível quando Modo Luto está ativo) */}
          {isMourning && (
            <div className="bg-black text-white border-b border-neutral-800 px-4 sm:px-6 py-2.5 text-xs">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-black font-black text-[10px]">
                    ✝
                  </span>
                  <span>
                    <strong className="uppercase tracking-wider">Luto Oficial:</strong>{' '}
                    {config.mourningMode.personName
                      ? `Em memória de ${config.mourningMode.personName}`
                      : 'Comunicado oficial de pesar da Prefeitura Municipal'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMourningModal(true)}
                  className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition cursor-pointer"
                >
                  Ler Nota de Pesar
                </button>
              </div>
            </div>
          )}

          {/* Faixa Oficial de Período Eleitoral (Lei nº 9.504/1997 & Art. 37 §1º CF) */}
          {isElectoralMode && (
            <div className="bg-amber-950 text-amber-100 border-b border-amber-800 px-4 sm:px-6 py-2 text-xs">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong className="uppercase tracking-wider">Período Eleitoral (Lei 9.504/97):</strong>{' '}
                  Publicidade institucional suspensa. Mantidos apenas serviços públicos essenciais, atos oficiais, Diário Oficial e Transparência.
                </span>
              </div>
            </div>
          )}

          {/* Barra Superior Oficial (GovTech / Transparência / Acesso Restrito) */}
          <div className="bg-neutral-900 text-neutral-200 dark:bg-black border-b border-neutral-800 text-[11px] font-semibold">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Portal Institucional Oficial
                </span>
                {config.cnpj && (
                  <span className="hidden sm:inline text-neutral-400">CNPJ: {config.cnpj}</span>
                )}
                {currentInstitution.uf && (
                  <span className="hidden md:inline text-neutral-400">Estado: {currentInstitution.uf}</span>
                )}
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                {!isElectoralMode && activePopups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPopupDismissed(false);
                      setPopupCarouselOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold transition cursor-pointer"
                  >
                    <Megaphone size={11} />
                    <span>Avisos ({activePopups.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setComplianceDialog('sitemap')}
                  className="hidden sm:inline hover:text-white transition cursor-pointer"
                >
                  Mapa do Site
                </button>
                <a
                  href={withInstitutionQuery('/', currentInstitution)}
                  className="hover:text-white transition"
                >
                  Portal do Cidadão
                </a>
                {config.transparencyUrl ? (
                  <a
                    href={config.transparencyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition inline-flex items-center gap-1"
                  >
                    Portal da Transparência <ArrowUpRight size={12} />
                  </a>
                ) : (
                  <a
                    href="#legislacao"
                    className="hover:text-white transition inline-flex items-center gap-1"
                  >
                    Transparência & Atos <ArrowUpRight size={12} />
                  </a>
                )}
                {showOuvidoria && (
                  <a
                    href={withInstitutionQuery('/ouvidoria', currentInstitution)}
                    className="hover:text-white transition"
                  >
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

          {/* Cabeçalho Principal + Navegação */}
          <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[84px] sm:h-24 flex items-center justify-between gap-4">
              <a href="#inicio" className="flex items-center gap-3.5 sm:gap-4 min-w-0 group">
                <div
                  className="w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-2xl bg-white p-1.5 sm:p-2 flex items-center justify-center shrink-0 shadow-md border-2 transition-transform group-hover:scale-105"
                  style={{ borderColor: accentBorderColor }}
                >
                  {currentInstitution.logo_url && !logoFailed ? (
                    <img
                      src={currentInstitution.logo_url}
                      alt={`Brasão ${currentInstitution.name}`}
                      className="w-full h-full object-contain drop-shadow-sm"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <LogoCompass size={34} />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: accentHex }}
                  >
                    Brasão & Portal Oficial
                  </p>
                  <h1 className="text-base sm:text-xl font-black tracking-tight truncate">
                    {shortMunicipalityName}
                  </h1>
                </div>
              </a>

              {/* Links de Navegação Desktop */}
              <nav id="menu-principal" aria-label="Navegação Principal" className="hidden lg:flex items-center gap-6 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                {config.sections.showHeroServices && (
                  <a href="#servicos" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Serviços ao Cidadão
                  </a>
                )}
                {config.sections.showNews && showNoticias && (
                  <a href="#noticias" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Notícias
                  </a>
                )}
                {config.sections.showOfficialGazette !== false && (
                  <a href="#diario-oficial" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Diário Oficial
                  </a>
                )}
                {config.sections.showLaws && (
                  <a href="#legislacao" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Leis & Atos
                  </a>
                )}
                {config.sections.showDepartments && (
                  <a href="#secretarias" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Secretarias
                  </a>
                )}
                {config.sections.showGovernmentInfo && (
                  <a href="#prefeitura" className="hover:text-neutral-900 dark:hover:text-white transition">
                    A Prefeitura
                  </a>
                )}
                {config.sections.showUsefulLinks !== false && usefulLinks.length > 0 && (
                  <a href="#links-uteis" className="hover:text-neutral-900 dark:hover:text-white transition">
                    Links Úteis
                  </a>
                )}
              </nav>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:scale-105 transition cursor-pointer"
                  aria-label="Alternar tema"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="menu-mobile-institucional"
                  className="lg:hidden p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                  aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                >
                  {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            </div>

            {/* Menu Mobile */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  id="menu-mobile-institucional"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4 space-y-2 text-sm font-bold"
                >
                  <a href="#servicos" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                    Serviços ao Cidadão
                  </a>
                  {showNoticias && (
                    <a href="#noticias" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                      Notícias & Obras
                    </a>
                  )}
                  {config.sections.showOfficialGazette !== false && (
                    <a href="#diario-oficial" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                      Diário Oficial Eletrônico
                    </a>
                  )}
                  <a href="#legislacao" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                    Leis & Atos Oficiais
                  </a>
                  <a href="#secretarias" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                    Secretarias Municipais
                  </a>
                  <a href="#prefeitura" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                    A Prefeitura & Contato
                  </a>
                  {config.sections.showUsefulLinks !== false && usefulLinks.length > 0 && (
                    <a href="#links-uteis" onClick={() => setMobileMenuOpen(false)} className="block py-2">
                      Links Úteis
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Conteúdo Principal */}
          <main id="conteudo-principal" tabIndex={-1} className="focus:outline-none">
            {/* Hero Institucional */}
            <section id="inicio" className="relative overflow-hidden border-b border-neutral-200/70 dark:border-neutral-800/80">
              <div className="absolute inset-0 pointer-events-none" style={{ background: accentGlowBg }} />
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-5">
                  <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${palette.accentSoft} ${palette.accentBorder} ${palette.accentText}`}
                    style={{
                      backgroundColor: accentSoftBg,
                      borderColor: accentBorderColor,
                      color: accentHex,
                    }}
                  >
                    <Landmark size={13} />
                    {isElectoralMode ? 'Portal Oficial de Serviços e Transparência' : config.tagline}
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.08]">
                    {currentInstitution.name}
                  </h2>

                  <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                    {config.heroSubtitle}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href="#servicos"
                      className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 ${palette.accentBg} ${palette.accentBgHover}`}
                      style={{ backgroundColor: accentHex }}
                    >
                      <span>Carta de Serviços Digitais</span>
                      <ChevronRight size={16} />
                    </a>

                    {config.cndMunicipalUrl && (
                      <a
                        href={config.cndMunicipalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition shadow-sm"
                      >
                        <span style={{ color: accentHex }}><FileBadge size={16} /></span>
                        <span>Emitir CND Municipal</span>
                        <ExternalLink size={13} />
                      </a>
                    )}

                    {showOuvidoria && (
                      <a
                        href={withInstitutionQuery('/ouvidoria', currentInstitution)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition shadow-sm"
                      >
                        <span style={{ color: accentHex }}><Headphones size={16} /></span>
                        <span>Ouvidoria & e-SIC</span>
                      </a>
                    )}

                    {config.officialGazetteUrl ? (
                      <a
                        href={config.officialGazetteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition shadow-sm"
                      >
                        <BookOpen size={16} />
                        <span>Diário Oficial</span>
                        <ExternalLink size={13} />
                      </a>
                    ) : (
                      config.sections.showOfficialGazette !== false && (
                        <a
                          href="#diario-oficial"
                          className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition shadow-sm"
                        >
                          <span style={{ color: accentHex }}><BookOpen size={16} /></span>
                          <span>Diário Oficial</span>
                        </a>
                      )
                    )}
                  </div>
                </div>

                {/* Painel Destaque do Brasão Oficial & Transparência */}
                <div className="lg:col-span-5">
                  <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                    {/* Brasão em Grande Destaque */}
                    <div
                      className="flex flex-col sm:flex-row items-center gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <div
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-3 flex items-center justify-center shrink-0 shadow-lg border-2"
                        style={{
                          borderColor: accentBorderColor,
                          boxShadow: `0 12px 30px -10px ${hexToRgba(accentHex, 0.28)}`,
                        }}
                      >
                        {currentInstitution.logo_url && !logoFailed ? (
                          <img
                            src={currentInstitution.logo_url}
                            alt={`Brasão Oficial de ${currentInstitution.name}`}
                            className="w-full h-full object-contain drop-shadow"
                            onError={() => setLogoFailed(true)}
                          />
                        ) : (
                          <LogoCompass size={56} />
                        )}
                      </div>
                      <div className="text-center sm:text-left min-w-0 space-y-1">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            backgroundColor: accentSoftBg,
                            color: accentHex,
                          }}
                        >
                          Brasão Oficial
                        </span>
                        <h3 className="text-base sm:text-lg font-black leading-snug text-neutral-900 dark:text-white">
                          {currentInstitution.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                          Portal Oficial de Serviços & Transparência Pública
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                          Transparência & Cidadania
                        </p>
                        <h4 className="text-sm font-black">Indicadores Públicos ao Vivo</h4>
                      </div>
                      <ShieldCheck size={20} className="site-accent-text" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-2xl font-black">{citizenServices.length}</div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">Serviços</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-2xl font-black">{laws.length}</div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">Leis Recentes</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70">
                        <div className="text-2xl font-black">{news.length}</div>
                        <div className="text-[10px] font-bold uppercase text-neutral-500 mt-0.5">Publicações</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 pt-1">
                      {!isElectoralMode && config.mayorName && (
                        <div className="flex items-center gap-2">
                          <Users size={14} className="site-accent-text" />
                          <span><strong>Prefeito(a):</strong> {config.mayorName}</span>
                        </div>
                      )}
                      {config.serviceHours && (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="site-accent-text" />
                          <span><strong>Atendimento:</strong> {config.serviceHours}</span>
                        </div>
                      )}
                      {config.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="site-accent-text" />
                          <span><strong>Telefone:</strong> {config.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 1: Carta de Serviços ao Cidadão */}
            {config.sections.showHeroServices && citizenServices.length > 0 && (
              <section id="servicos" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                      Autoatendimento Digital
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                      Carta de Serviços ao Cidadão
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
                    Acesse os serviços públicos municipais habilitados sem precisar ir presencialmente à Prefeitura.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {citizenServices.map((srv) => {
                    const Icon = srv.icon;
                    return (
                      <a
                        key={srv.id}
                        href={srv.href}
                        target={srv.external ? '_blank' : undefined}
                        rel={srv.external ? 'noopener noreferrer' : undefined}
                        className="group bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${palette.accentSoft} ${palette.accentText} group-hover:scale-110 transition-transform`}
                              style={{ backgroundColor: accentSoftBg, color: accentHex }}
                            >
                              <Icon size={22} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                              {srv.badge}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-black group-hover:opacity-80 transition">{srv.title}</h3>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                              {srv.description}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${palette.accentText}`}
                          style={{ color: accentHex }}
                        >
                          <span>{srv.external ? 'Emitir / Acessar Portal' : 'Acessar serviço'}</span>
                          {srv.external ? <ExternalLink size={13} /> : <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Seção 2: Últimas Notícias & Entregas da Gestão */}
            {config.sections.showNews && showNoticias && (
              <section id="noticias" className="bg-white dark:bg-neutral-900/60 border-y border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Imprensa & Transparência Ativa
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Últimas Notícias e Obras
                      </h2>
                    </div>
                    <a
                      href={withInstitutionQuery('/noticias', currentInstitution)}
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider site-accent-text hover:underline"
                    >
                      <span>Ver todas as matérias</span>
                      <ChevronRight size={14} />
                    </a>
                  </div>

                  {loadingFeed ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[1, 2, 3].map((idx) => (
                        <div key={idx} className="h-64 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                      ))}
                    </div>
                  ) : news.length === 0 ? (
                    <div className="p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-sm text-neutral-500">
                      Nenhuma notícia publicada ainda para este município. As publicações criadas no módulo <strong>Notícias & Projetos</strong> aparecerão aqui automaticamente.
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* Carrossel de Imagens das Notícias em Destaque */}
                      {carouselNews.length > 0 && (() => {
                        const activeSlide = carouselNews[safeNewsSlideIndex];
                        return (
                          <div
                            className="relative rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 shadow-xl group"
                            onMouseEnter={() => setNewsCarouselPaused(true)}
                            onMouseLeave={() => setNewsCarouselPaused(false)}
                          >
                            <div className="relative w-full aspect-[5/3] min-h-[260px] max-h-[720px]">
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={activeSlide.id}
                                  initial={{ opacity: 0.25, scale: 1.01 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0.25 }}
                                  transition={{ duration: 0.35 }}
                                  className="absolute inset-0"
                                >
                                  {activeSlide.cover_image_url ? (
                                    <img
                                      src={activeSlide.cover_image_url}
                                      alt={activeSlide.title}
                                      className="w-full h-full object-cover object-center"
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full flex items-center justify-center"
                                      style={{ background: accentGlowBg }}
                                    >
                                      <Newspaper size={64} className="text-white/40" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-35% to-transparent pointer-events-none" />
                                </motion.div>
                              </AnimatePresence>

                              {/* Topo do Carrossel: Etiqueta + Contador + Pausa */}
                              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow-md"
                                    style={{ backgroundColor: accentHex }}
                                  >
                                    {activeSlide.category || 'Destaque Oficial'}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-[11px] font-bold text-white/90">
                                    {formatDatePtBr(activeSlide.published_at)}
                                  </span>
                                </div>

                                {carouselNews.length > 1 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-[11px] font-black text-white">
                                      {safeNewsSlideIndex + 1} / {carouselNews.length}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setNewsCarouselPaused((p) => !p)}
                                      aria-label={newsCarouselPaused ? 'Retomar carrossel de notícias' : 'Pausar carrossel de notícias'}
                                      className="p-2 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-sm transition cursor-pointer"
                                    >
                                      {newsCarouselPaused ? <Play size={13} /> : <Pause size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Setas Laterais do Carrossel */}
                              {carouselNews.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewsSlideIndex(
                                        (prev) => (prev - 1 + carouselNews.length) % carouselNews.length
                                      )
                                    }
                                    aria-label="Notícia anterior"
                                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-sm flex items-center justify-center transition cursor-pointer"
                                  >
                                    <ChevronLeft size={20} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewsSlideIndex((prev) => (prev + 1) % carouselNews.length)
                                    }
                                    aria-label="Próxima notícia"
                                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white backdrop-blur-sm flex items-center justify-center transition cursor-pointer"
                                  >
                                    <ChevronRight size={20} />
                                  </button>
                                </>
                              )}

                              {/* Conteúdo sobreposto na base + Indicadores */}
                              <div className="absolute bottom-0 inset-x-0 z-10 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <a
                                  href={withInstitutionQuery(`/noticias?id=${activeSlide.id}`, currentInstitution)}
                                  className="space-y-2 max-w-3xl group/link"
                                >
                                  <h3 className="text-xl sm:text-3xl font-black text-white leading-tight line-clamp-2 group-hover/link:underline">
                                    {activeSlide.title}
                                  </h3>
                                  {activeSlide.subtitle && (
                                    <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 max-w-2xl">
                                      {activeSlide.subtitle}
                                    </p>
                                  )}
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white/95 pt-1">
                                    <span>Ler matéria completa</span>
                                    <ChevronRight size={14} />
                                  </span>
                                </a>

                                {carouselNews.length > 1 && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {carouselNews.map((slideItem, idx) => {
                                      const isCurrent = idx === safeNewsSlideIndex;
                                      return (
                                        <button
                                          key={slideItem.id}
                                          type="button"
                                          onClick={() => setNewsSlideIndex(idx)}
                                          aria-label={`Ir para notícia ${idx + 1}: ${slideItem.title}`}
                                          className={`h-2.5 rounded-full transition-all cursor-pointer ${isCurrent
                                              ? 'w-7'
                                              : 'w-2.5 bg-white/45 hover:bg-white/80'
                                            }`}
                                          style={isCurrent ? { backgroundColor: accentHex } : undefined}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 3 Últimas Notícias Fixas */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                            Últimas 3 Notícias Fixas
                          </h3>
                          <span className="text-[11px] font-bold text-neutral-400">
                            Publicações mais recentes do município
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {fixedLatestNews.map((item) => (
                            <a
                              key={item.id}
                              href={withInstitutionQuery(`/noticias?id=${item.id}`, currentInstitution)}
                              className="group bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-3xl overflow-hidden flex flex-col hover:shadow-lg transition-all"
                            >
                              {item.cover_image_url ? (
                                <div className="aspect-[5/3] overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                                  <img
                                    src={item.cover_image_url}
                                    alt={item.title}
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>
                              ) : (
                                <div className="h-36 flex items-center justify-center site-accent-soft">
                                  <Newspaper size={32} className="site-accent-text" />
                                </div>
                              )}
                              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                                    <span className="site-accent-text">{item.category || 'Institucional'}</span>
                                    <span>{formatDatePtBr(item.published_at)}</span>
                                  </div>
                                  <h4 className="font-black text-base leading-snug group-hover:opacity-80 line-clamp-2">
                                    {item.title}
                                  </h4>
                                  {item.subtitle && (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                      {item.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="text-xs font-bold flex items-center gap-1 site-accent-text">
                                  <span>Ler matéria completa</span>
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Seção 2.5: Diário Oficial Eletrônico do Município */}
            {config.sections.showOfficialGazette !== false && (
              <section
                id="diario-oficial"
                className="bg-white dark:bg-neutral-900/60 border-b border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-16"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Imprensa Oficial Eletrônica · Transparência Pública
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Diário Oficial do Município
                      </h2>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative w-full sm:w-72">
                        <Search
                          size={16}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                        />
                        <input
                          type="text"
                          value={gazetteSearch}
                          onChange={(e) => setGazetteSearch(e.target.value)}
                          placeholder="Buscar edição, decreto, licitação ou nº..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>
                      <a
                        href={withInstitutionQuery('/diario', currentInstitution)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black text-white site-accent-bg shrink-0 shadow-sm hover:opacity-95 transition"
                      >
                        <BookOpen size={14} />
                        <span>Portal Completo do Diário</span>
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </div>

                  {filteredGazetteEditions.length === 0 ? (
                    <div className="p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-2">
                      <BookOpen size={28} className="mx-auto text-neutral-400" />
                      <p className="text-sm font-bold text-neutral-500">
                        {gazetteSearch
                          ? 'Nenhuma edição ou ato encontrado no Diário Oficial para este termo.'
                          : 'As próximas edições do Diário Oficial do Município aparecerão aqui assim que publicadas.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredGazetteEditions.map((ed, idx) => {
                        const edActs = gazetteActsByEdition.get(ed.id) || [];
                        return (
                          <div
                            key={ed.id}
                            className="p-5 rounded-3xl bg-neutral-50/70 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-between gap-4 hover:shadow-md transition"
                          >
                            <div className="space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {idx === 0 && !gazetteSearch && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white site-accent-bg">
                                      Última Edição
                                    </span>
                                  )}
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase site-accent-soft">
                                    Edição {ed.edition_type} Nº {ed.edition_number}
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-neutral-400">
                                  {formatDatePtBr(ed.publication_date)}
                                </span>
                              </div>

                              <div>
                                <h3 className="font-black text-base leading-snug line-clamp-1">
                                  {ed.title}
                                </h3>
                                {ed.summary && (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                                    {ed.summary}
                                  </p>
                                )}
                              </div>

                              {edActs.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  {edActs.slice(0, 2).map((act) => (
                                    <div
                                      key={act.id}
                                      className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 truncate"
                                    >
                                      <FileText size={12} className="site-accent-text shrink-0" />
                                      <span className="truncate">
                                        <strong>[{act.category}]</strong> {act.title}
                                      </span>
                                    </div>
                                  ))}
                                  {edActs.length > 2 && (
                                    <p className="text-[11px] font-bold text-neutral-400">
                                      + {edActs.length - 2} ato(s) nesta edição
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-200/70 dark:border-neutral-800">
                              <span className="text-[10px] font-mono font-bold text-neutral-400 truncate">
                                Cód: {ed.verification_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => setReadingGazetteEdition(ed)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white site-accent-bg cursor-pointer shrink-0"
                              >
                                <BookOpen size={13} />
                                <span>Ler Edição / PDF</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Seção 3: Legislação Municipal & Atos Oficiais */}
            {config.sections.showLaws && (
              <section id="legislacao" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                      Banco de Leis & Atos Oficiais
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                      Legislação Municipal Recente
                    </h2>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        value={lawSearch}
                        onChange={(e) => {
                          setLawSearch(e.target.value);
                          setShowAllLaws(false);
                        }}
                        placeholder="Buscar lei, decreto ou assunto..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    {lawAvailableYears.length > 0 && (
                      <select
                        value={lawYearFilter}
                        onChange={(e) => {
                          setLawYearFilter(e.target.value);
                          setShowAllLaws(false);
                        }}
                        aria-label="Filtrar leis por ano"
                        className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Todos">Todos os anos</option>
                        {lawAvailableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Ano {yr}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {lawAvailableTypes.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        setLawTypeFilter('Todas');
                        setShowAllLaws(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${lawTypeFilter === 'Todas'
                          ? 'text-white border-transparent site-accent-bg'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300'
                        }`}
                    >
                      Todas ({laws.length})
                    </button>
                    {lawAvailableTypes.map(([typeName, count]) => (
                      <button
                        key={typeName}
                        type="button"
                        onClick={() => {
                          setLawTypeFilter(typeName);
                          setShowAllLaws(false);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${lawTypeFilter === typeName
                            ? 'text-white border-transparent site-accent-bg'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300'
                          }`}
                      >
                        {typeName} ({count})
                      </button>
                    ))}
                  </div>
                )}

                {visibleLaws.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-sm text-neutral-500">
                    {lawSearch || lawTypeFilter !== 'Todas' || lawYearFilter !== 'Todos'
                      ? 'Nenhuma norma encontrada para os filtros selecionados.'
                      : 'Nenhuma lei ou decreto cadastrado ainda no Banco de Leis deste município.'}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleLaws.map((law) => (
                        <button
                          key={law.id}
                          type="button"
                          onClick={() => setSelectedLaw(law)}
                          className="group text-left p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition flex flex-col justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {law.site_featured && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                  <Star size={10} className="fill-current" /> Destaque
                                </span>
                              )}
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider site-accent-soft">
                                {law.type}
                              </span>
                              <span className="text-xs font-black text-neutral-900 dark:text-white">
                                Nº {law.number}
                              </span>
                              {law.status && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${law.status === 'Em Vigor'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}
                                >
                                  {law.status}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-neutral-400 shrink-0">
                              {formatDatePtBr(law.publication_date)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm leading-snug line-clamp-1 group-hover:underline">{law.title}</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                              {law.ementa}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80">
                            <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 site-accent-text">
                              <BookOpen size={13} />
                              <span>Ler norma completa</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {law.is_compiled && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                  <Sparkles size={10} /> Compilada
                                </span>
                              )}
                              {(law.file_url || law.external_link) && (
                                <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                                  PDF
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {matchedLaws.length > 6 && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllLaws((v) => !v)}
                          className="px-5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-xs font-black transition cursor-pointer shadow-xs"
                        >
                          {showAllLaws
                            ? 'Mostrar apenas as 6 principais'
                            : `Ver todas as ${matchedLaws.length} normas publicadas`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Seção 4: Secretarias Municipais (Conectada às Secretarias Oficiais) */}
            {config.sections.showDepartments && (
              <section id="secretarias" className="bg-white dark:bg-neutral-900/60 border-y border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                  <div className="mb-8">
                    <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                      Estrutura Administrativa
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                      Secretarias e Órgãos Municipais
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Organograma oficial integrado automaticamente às secretarias cadastradas no município.
                    </p>
                  </div>

                  {departmentNames.length === 0 ? (
                    <div className="p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-sm text-neutral-500">
                      Cadastre as secretarias oficiais do município no painel administrativo para exibi-las aqui.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {departmentNames.map((deptName) => {
                        const secSlug = normalizeSecretariatSlug(deptName);
                        const secProfile = resolveSecretariatProfile(deptName, config, currentInstitution);
                        const secUrl = withInstitutionQuery(`/secretaria/${secSlug}`, currentInstitution);
                        return (
                          <a
                            key={deptName}
                            href={secUrl}
                            className="group p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3.5"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 site-accent-soft group-hover:scale-105 transition-transform">
                                <Building2 size={19} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black leading-snug truncate group-hover:underline" title={deptName}>
                                  {deptName}
                                </h3>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                  {(secProfile.results?.length || 0) > 0 || (secProfile.awards?.length || 0) > 0 || (secProfile.indicators?.length || 0) > 0
                                    ? `${secProfile.indicators?.length || 0} índice(s) · ${secProfile.results?.length || 0} resultado(s) · ${secProfile.awards?.length || 0} prêmio(s)`
                                    : `Vitrine: Resultados, Índices & ${secProfile.services?.length || 0} serviço(s)`}
                                </p>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider site-accent-text shrink-0">
                              <span className="hidden sm:inline">Acessar</span>
                              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Seção 5: A Prefeitura, Gestão Executiva & Contato */}
            {config.sections.showGovernmentInfo && (
              <section id="prefeitura" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                      Poder Executivo Municipal
                    </p>
                    <h2 className="text-2xl font-black tracking-tight">
                      {isElectoralMode ? 'Informações Institucionais da Sede' : 'Gestão e Compromisso Institucional'}
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {isElectoralMode
                        ? `Canal oficial de serviços administrativos, atos normativos e acesso à informação da ${currentInstitution.name}, em observância às restrições de publicidade institucional do período eleitoral (Lei nº 9.504/1997).`
                        : config.mayorMessage}
                    </p>
                    {!isElectoralMode && (config.mayorName || config.viceMayorName) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {config.mayorName && (
                          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
                            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                              Prefeito(a) Municipal
                            </p>
                            <p className="text-sm font-black mt-1">{config.mayorName}</p>
                          </div>
                        )}
                        {config.viceMayorName && (
                          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
                            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                              Vice-Prefeito(a) Municipal
                            </p>
                            <p className="text-sm font-black mt-1">{config.viceMayorName}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                      Atendimento ao Cidadão
                    </p>
                    <h3 className="text-xl font-black tracking-tight">Canais Oficiais e Endereço</h3>

                    <div className="space-y-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="site-accent-text shrink-0 mt-0.5" />
                        <span>{config.address || 'Sede Administrativa da Prefeitura Municipal'}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock size={16} className="site-accent-text shrink-0" />
                        <span>{config.serviceHours || 'Segunda a Sexta, 07h às 13h'}</span>
                      </div>
                      {config.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone size={16} className="site-accent-text shrink-0" />
                          <span>{config.phone}</span>
                        </div>
                      )}
                      {config.email && (
                        <div className="flex items-center gap-2.5">
                          <Mail size={16} className="site-accent-text shrink-0" />
                          <a href={`mailto:${config.email}`} className="hover:underline">
                            {config.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {(config.socialLinks.instagram || config.socialLinks.facebook || config.socialLinks.youtube) && (
                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2">
                        {config.socialLinks.instagram && (
                          <a
                            href={config.socialLinks.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold hover:opacity-80"
                          >
                            Instagram
                          </a>
                        )}
                        {config.socialLinks.facebook && (
                          <a
                            href={config.socialLinks.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold hover:opacity-80"
                          >
                            Facebook
                          </a>
                        )}
                        {config.socialLinks.youtube && (
                          <a
                            href={config.socialLinks.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold hover:opacity-80"
                          >
                            YouTube
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Seção 6: Links Úteis */}
            {config.sections.showUsefulLinks !== false && usefulLinks.length > 0 && (
              <section
                id="links-uteis"
                className="bg-white dark:bg-neutral-900/60 border-t border-neutral-200/70 dark:border-neutral-800 py-12 sm:py-16"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest site-accent-text">
                        Utilidade Pública & Acesso Direto
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                        Links Úteis
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
                      Portais oficiais de controle, transparência pública, emissão de documentos e serviços governamentais integrados.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {usefulLinks.map((item) => {
                      const categoryLabel =
                        item.category === 'transparencia'
                          ? 'Transparência'
                          : item.category === 'controle'
                            ? 'Controle & Leis'
                            : item.category === 'governo'
                              ? 'Governo Digital'
                              : 'Cidadão';
                      return (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group p-5 rounded-3xl bg-neutral-50/80 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider site-accent-soft">
                                <Link2 size={11} />
                                <span>{categoryLabel}</span>
                              </span>
                              <ExternalLink size={14} className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition" />
                            </div>
                            <h3 className="text-sm sm:text-base font-black leading-snug group-hover:underline">
                              {item.label}
                            </h3>
                            {item.description && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] font-bold site-accent-text inline-flex items-center gap-1">
                            <span>Acessar portal externo</span>
                            <ArrowUpRight size={12} />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

          </main>

          {/* Rodapé Institucional */}
          <footer id="rodape" role="contentinfo" className="mt-auto bg-neutral-900 text-neutral-300 border-t border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow">
                  {currentInstitution.logo_url && !logoFailed ? (
                    <img
                      src={currentInstitution.logo_url}
                      alt={`Brasão ${currentInstitution.name}`}
                      className="w-full h-full object-contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <LogoCompass size={24} disableExpand />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-black text-white text-sm">{currentInstitution.name}</p>
                  <p className="text-neutral-400">
                    {config.cnpj ? `CNPJ: ${config.cnpj} · ` : ''}
                    {config.address || 'Portal Institucional Integrado ao Gestão 360'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
                {showOuvidoria && (
                  <a href={withInstitutionQuery('/ouvidoria', currentInstitution)} className="hover:text-white">
                    Ouvidoria / e-SIC
                  </a>
                )}
                <a href={withInstitutionQuery('/validar-documento', currentInstitution)} className="hover:text-white">
                  Validar Documento
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
                <a
                  href={withInstitutionQuery('/servidores', currentInstitution)}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                >
                  <Lock size={11} />
                  <span>Área do Servidor</span>
                </a>
              </div>
            </div>

            <div className="border-t border-neutral-800/90 bg-black/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400">
                <span>
                  © {new Date().getFullYear()} {currentInstitution.name} — Portal Público Oficial.
                </span>
                <a
                  href={landingPageUrl}
                  className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition group"
                  title="Conheça a plataforma Gestão 360"
                >
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200">
                    Desenvolvido por
                  </span>
                  <LogoCompass size={20} disableExpand className="rounded-lg" />
                  <span className="font-black text-white tracking-tight text-xs">Gestão 360</span>
                  <ArrowUpRight size={13} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </footer>
        </div>

        {typeof document !== 'undefined' &&
          createPortal(
            <div
              className={darkMode ? 'dark' : ''}
              style={
                {
                  '--site-accent': accentHex,
                  '--site-accent-soft': accentSoftBg,
                  '--site-accent-border': accentBorderColor,
                } as React.CSSProperties
              }
            >
              {/* Popup Solene de Luto Oficial */}
              <AnimatePresence>
                {isMourning && showMourningModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isMourning ? 'grayscale' : ''}`}
                    onClick={() => setShowMourningModal(false)}
                  >
                    <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="modal-luto-titulo"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 border-4 border-neutral-900 dark:border-neutral-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-5 relative"
                    >
                      <button
                        type="button"
                        onClick={() => setShowMourningModal(false)}
                        aria-label="Fechar nota de pesar"
                        className="absolute top-4 right-4 p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        <X size={18} />
                      </button>

                      {/* Laço simbólico de Luto */}
                      <div className="flex flex-col items-center gap-3 pt-2">
                        <div className="w-16 h-16 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden="true">
                            <path d="M12 2C9.24 2 7 4.24 7 7c0 2.02 1.25 4.02 2.91 5.83L6 21l3.5-1.5L12 16l2.5 3.5L18 21l-3.91-8.17C15.75 11.02 17 9.02 17 7c0-2.76-2.24-5-5-5zm0 2.5c1.38 0 2.5 1.12 2.5 2.5 0 1.23-.89 2.72-2.5 4.35C10.39 9.72 9.5 8.23 9.5 7c0-1.38 1.12-2.5 2.5-2.5z" />
                          </svg>
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-200 text-[10px] font-black uppercase tracking-[0.2em]">
                          Nota de Pesar · Luto Oficial
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                          Em memória de
                        </p>
                        <h3 id="modal-luto-titulo" className="text-2xl sm:text-3xl font-black tracking-tight">
                          {config.mourningMode.personName || 'Comunidade Municipal em Luto'}
                        </h3>
                        {config.mourningMode.titleOrRole && (
                          <p className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-400">
                            {config.mourningMode.titleOrRole}
                          </p>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                        {config.mourningMode.message}
                      </div>

                      {config.mourningMode.decreeInfo && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          {config.mourningMode.decreeInfo}
                        </p>
                      )}

                      <div className="pt-2 flex flex-col items-center gap-3 border-t border-neutral-200 dark:border-neutral-800">
                        <p className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                          {currentInstitution.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowMourningModal(false)}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-xs font-black uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
                        >
                          Continuar para o Portal
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>,
            document.body
          )}

        {/* Leitor Completo de Legislação Municipal (Leitura Interativa, Folha A4 Oficial & PDF) */}
        <AnimatePresence>
          {selectedLaw && (
            <LawReaderModal
              law={selectedLaw}
              allLaws={laws}
              institution={currentInstitution}
              darkMode={darkMode}
              isMourning={isMourning}
              defaultDisplayStyle="lexml"
              onClose={() => setSelectedLaw(null)}
              onSelectRelatedLaw={(related) => setSelectedLaw(related)}
            />
          )}
        </AnimatePresence>

        {/* Carrossel de Pop-ups Informativos à População (até 10 slides) */}
        <SitePopupCarouselModal
          open={shouldShowInfoCarousel}
          items={activePopups}
          autoplay={config.popupCarousel?.autoplay !== false}
          autoCloseSeconds={config.popupCarousel?.autoCloseSeconds || 0}
          darkMode={darkMode}
          isMourning={isMourning}
          accentHex={accentHex}
          institutionName={currentInstitution.name}
          onClose={() => {
            setPopupCarouselOpen(false);
            setPopupDismissed(true);
          }}
        />

        {readingGazetteEdition && (
          <OfficialGazetteReaderModal
            edition={readingGazetteEdition}
            acts={gazetteActsByEdition.get(readingGazetteEdition.id) || []}
            institution={currentInstitution}
            onClose={() => setReadingGazetteEdition(null)}
          />
        )}

        {config.sections.showCookieBanner !== false && (
          <CookieConsentBanner
            institution={currentInstitution}
            visible={showCookieBanner}
            accentHex={accentHex}
            darkMode={darkMode}
            isMourning={isMourning}
            onAcceptedOrDismissed={() => setShowCookieBanner(false)}
            onOpenPrivacy={() => setComplianceDialog('privacy')}
            onRequestOpen={() => setShowCookieBanner(true)}
          />
        )}

        <SiteComplianceModals
          activeDialog={complianceDialog}
          onClose={() => setComplianceDialog(null)}
          institution={currentInstitution}
          config={config}
          accentHex={accentHex}
          darkMode={darkMode}
          isMourning={isMourning}
          showOuvidoria={showOuvidoria}
          showNoticias={showNoticias}
          onConsentSaved={() => setShowCookieBanner(false)}
        />
      </div>
    </div>
  );
};

export default InstitutionalSite;

