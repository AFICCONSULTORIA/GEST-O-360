import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Save,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Palette,
  Building2,
  Phone,
  Link2,
  ShieldCheck,
  Copy,
  Newspaper,
  Scale,
  LayoutGrid,
  RotateCcw,
  FileBadge,
  HeartOff,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Landmark,
  BookOpen,
} from 'lucide-react';
import { AdminUser, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { withInstitutionQuery } from '../../lib/institutionModules';
import {
  InstitutionalSiteConfig,
  DEFAULT_CND_MUNICIPAL_URL,
  MAX_SITE_POPUPS,
  getActiveSitePopups,
  resolveSiteAccentHex,
  saveInstitutionalSiteConfig,
  useInstitutionalSiteConfig,
} from '../../lib/api/institutionalSite';
import { ColorWheelPicker } from '../../components/ColorWheelPicker';
import { SitePopupManagerPanel } from '../../components/SitePopupManagerPanel';
import { SiteNewsManagerPanel } from '../../components/SiteNewsManagerPanel';
import { SiteLawsManagerPanel } from '../../components/SiteLawsManagerPanel';
import { DiarioOficialManagerContent } from '../DiarioOficial/components/DiarioOficialManagerContent';
import { useMunicipalDepartments } from '../../lib/api/departments';
import { fetchInstitutionNews, NEWS_UPDATED_EVENT } from '../../lib/api/municipalNews';
import { fetchInstitutionLaws, LAWS_UPDATED_EVENT } from '../../lib/api/municipalLaws';
import { fetchGazetteEditions, GAZETTE_UPDATED_EVENT } from '../../lib/api/officialGazette';
import { LogoCompass } from '../../components/LogoCompass';

interface SiteInstitucionalModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
  onInstitutionUpdated?: (inst: Institution) => void;
}

type SiteAdminTab = 'news' | 'gazette' | 'laws' | 'popups' | 'identity' | 'contact' | 'mourning' | 'domain';

export const SiteInstitucionalModule: React.FC<SiteInstitucionalModuleProps> = ({
  currentUser,
  currentInstitution,
  onInstitutionUpdated,
}) => {
  const { config, setConfig } = useInstitutionalSiteConfig(currentInstitution);
  const { departmentNames } = useMunicipalDepartments(currentInstitution?.id);
  const [activeTab, setActiveTab] = useState<SiteAdminTab>('identity');
  const [saving, setSaving] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [stats, setStats] = useState({ newsCount: 0, lawsCount: 0, gazetteCount: 0 });
  const activePopupsCount = getActiveSitePopups(config).length;
  const accentHex = resolveSiteAccentHex(config);

  useEffect(() => {
    setLogoFailed(false);
  }, [currentInstitution?.logo_url]);

  const handleNewsStatsChange = useCallback((publishedCount: number) => {
    setStats((prev) =>
      prev.newsCount === publishedCount ? prev : { ...prev, newsCount: publishedCount }
    );
  }, []);

  const handleLawsStatsChange = useCallback((publishedLawsCount: number) => {
    setStats((prev) =>
      prev.lawsCount === publishedLawsCount ? prev : { ...prev, lawsCount: publishedLawsCount }
    );
  }, []);

  const handleGazetteStatsChange = useCallback((publishedEditionsCount: number) => {
    setStats((prev) =>
      prev.gazetteCount === publishedEditionsCount
        ? prev
        : { ...prev, gazetteCount: publishedEditionsCount }
    );
  }, []);

  useEffect(() => {
    if (!currentInstitution?.id) return;
    const loadCounts = async () => {
      try {
        const [publishedNews, publishedLaws, publishedGazette] = await Promise.all([
          fetchInstitutionNews(currentInstitution, { onlyPublished: true }),
          fetchInstitutionLaws(currentInstitution, { onlySitePublished: true }),
          fetchGazetteEditions(currentInstitution, { onlyPublished: true }),
        ]);
        setStats({
          newsCount: publishedNews.length,
          lawsCount: publishedLaws.length,
          gazetteCount: publishedGazette.length,
        });
      } catch {
        // ignora se offline
      }
    };
    loadCounts();

    const onNewsUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === currentInstitution.id) {
        loadCounts();
      }
    };
    window.addEventListener(NEWS_UPDATED_EVENT, onNewsUpdated);
    window.addEventListener(LAWS_UPDATED_EVENT, onNewsUpdated);
    window.addEventListener(GAZETTE_UPDATED_EVENT, onNewsUpdated);
    return () => {
      window.removeEventListener(NEWS_UPDATED_EVENT, onNewsUpdated);
      window.removeEventListener(LAWS_UPDATED_EVENT, onNewsUpdated);
      window.removeEventListener(GAZETTE_UPDATED_EVENT, onNewsUpdated);
    };
  }, [currentInstitution?.id]);

  if (!currentInstitution) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-10 text-center space-y-3">
        <Globe size={36} className="mx-auto text-neutral-400" />
        <h3 className="text-lg font-black">Selecione um Município</h3>
        <p className="text-sm text-neutral-500">
          O módulo de Site Institucional é configurado individualmente para cada prefeitura conectada.
        </p>
      </div>
    );
  }

  const publicSiteUrl = withInstitutionQuery('/', currentInstitution);
  const publicGazettePath = withInstitutionQuery('/diario', currentInstitution);
  const originBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://gestao360sistema.com.br';
  const activeSiteFullUrl = config.customDomain
    ? `https://${config.customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    : `${originBase}${publicSiteUrl}`;
  const activeGazetteFullUrl = `${originBase}${publicGazettePath}`;
  const fallbackSubdomainUrl = currentInstitution.subdomain
    ? `https://${currentInstitution.subdomain}.gestao360sistema.com.br`
    : 'https://municipio.gestao360sistema.com.br';
  const futureGazetteSubdomainUrl = currentInstitution.subdomain
    ? `https://diario.${currentInstitution.subdomain}.gestao360sistema.com.br`
    : 'https://diario.municipio.gestao360sistema.com.br';

  const readinessChecklist = [
    {
      label: 'Brasão oficial configurado',
      ok: Boolean(currentInstitution.logo_url),
      targetTab: null as SiteAdminTab | null,
    },
    {
      label: 'CNPJ e endereço oficial informados',
      ok: Boolean(config.cnpj && config.address),
      targetTab: 'contact' as SiteAdminTab,
    },
    {
      label: `Secretarias padronizadas (${departmentNames.length})`,
      ok: departmentNames.length > 0,
      targetTab: null as SiteAdminTab | null,
    },
    {
      label: `Notícias publicadas (${stats.newsCount})`,
      ok: stats.newsCount > 0,
      targetTab: 'news' as SiteAdminTab,
    },
    {
      label: `Leis / Atos publicados (${stats.lawsCount})`,
      ok: stats.lawsCount > 0,
      targetTab: 'laws' as SiteAdminTab,
    },
    {
      label: 'Domínio próprio (.gov.br) definido',
      ok: Boolean(config.customDomain),
      targetTab: 'domain' as SiteAdminTab,
    },
    {
      label: 'Acessibilidade eMAG & VLibras ativa',
      ok: config.sections.enableAccessibilityBar !== false,
      targetTab: 'identity' as SiteAdminTab,
    },
  ];
  const readinessOkCount = readinessChecklist.filter((c) => c.ok).length;
  const readinessPct = Math.round((readinessOkCount / readinessChecklist.length) * 100);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveInstitutionalSiteConfig(currentInstitution, config);
    setSaving(false);

    if (result.success) {
      setConfig(result.savedConfig);
      if (onInstitutionUpdated) {
        const currentCert =
          typeof currentInstitution.cert_links === 'object' && currentInstitution.cert_links
            ? currentInstitution.cert_links
            : {};
        onInstitutionUpdated({
          ...currentInstitution,
          custom_domain: result.savedConfig.customDomain || undefined,
          cnpj: result.savedConfig.cnpj || currentInstitution.cnpj,
          contact_phone: result.savedConfig.phone || currentInstitution.contact_phone,
          cert_links: {
            ...currentCert,
            __institutional_site: result.savedConfig,
          },
        });
      }
      showToast('Configurações do Site Institucional salvas e publicadas!', 'success');
    } else {
      showToast(
        `Salvo localmente (erro ao sincronizar nuvem: ${result.error || 'verifique conexão'})`,
        'warning'
      );
    }
  };

  const updateSection = (key: keyof InstitutionalSiteConfig['sections'], value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: value,
      },
    }));
  };

  const copyText = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    showToast(`${label} copiado para a área de transferência.`, 'success');
  };

  const NAV_TABS: {
    id: SiteAdminTab;
    label: string;
    hint: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string;
    badgeTone?: 'sky' | 'emerald' | 'dark';
  }[] = [
    {
      id: 'identity',
      label: 'Visual & Seções',
      hint: 'Cor, textos e blocos',
      icon: Palette,
    },
    {
      id: 'news',
      label: 'Notícias do Site',
      hint: 'Publicar e gerenciar',
      icon: Newspaper,
      badge: String(stats.newsCount),
      badgeTone: 'sky',
    },
    {
      id: 'gazette',
      label: 'Diário Oficial',
      hint: 'Edições e atos oficiais',
      icon: BookOpen,
      badge: String(stats.gazetteCount),
      badgeTone: 'emerald',
    },
    {
      id: 'laws',
      label: 'Leis no Site',
      hint: 'Publicar leis e decretos',
      icon: Scale,
      badge: String(stats.lawsCount),
      badgeTone: 'emerald',
    },
    {
      id: 'popups',
      label: 'Pop-ups & Avisos',
      hint: 'Carrossel até 10',
      icon: Megaphone,
      badge: `${activePopupsCount}/${MAX_SITE_POPUPS}`,
      badgeTone: 'emerald',
    },
    {
      id: 'contact',
      label: 'Governo & CND',
      hint: 'Prefeito, CND e links',
      icon: Phone,
    },
    {
      id: 'mourning',
      label: 'Modo Luto',
      hint: 'Nota de pesar · P&B',
      icon: HeartOff,
      badge: config.mourningMode?.enabled ? 'ATIVO' : undefined,
      badgeTone: 'dark',
    },
    {
      id: 'domain',
      label: 'Domínio .gov.br',
      hint: 'DNS e endereço',
      icon: Link2,
    },
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* Cabeçalho Principal com Brasão, Status e Ações */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-md border-2"
              style={{ borderColor: `${accentHex}55` }}
            >
              {currentInstitution.logo_url && !logoFailed ? (
                <img
                  src={currentInstitution.logo_url}
                  alt={`Brasão ${currentInstitution.name}`}
                  className="w-full h-full object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <LogoCompass size={34} />
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                  style={{ backgroundColor: accentHex }}
                >
                  <Landmark size={11} />
                  Central do Portal Oficial
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    config.enabled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                    }`}
                  />
                  {config.enabled ? 'Portal No Ar' : 'Portal Pausado'}
                </span>
                {config.mourningMode?.enabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-[10px] font-black uppercase">
                    Luto Oficial Ativo
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                {currentInstitution.name}
              </h2>

              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-mono truncate max-w-xs sm:max-w-md">
                  {activeSiteFullUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(activeSiteFullUrl, 'Endereço do site')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-[10px] font-bold cursor-pointer"
                >
                  <Copy size={10} /> Copiar site
                </button>
                <button
                  type="button"
                  onClick={() => copyText(activeGazetteFullUrl, 'Endereço do Diário Oficial')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-bold cursor-pointer"
                >
                  <Copy size={10} /> Copiar diário ({publicGazettePath})
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={publicSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-black transition"
            >
              <ExternalLink size={15} />
              <span>Abrir Site Público</span>
            </a>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl hover:opacity-95 disabled:opacity-60 text-white text-xs font-black shadow-lg transition cursor-pointer"
              style={{ backgroundColor: accentHex }}
            >
              <Save size={15} />
              <span>{saving ? 'Publicando...' : 'Salvar e Publicar'}</span>
            </button>
          </div>
        </div>

        {/* Faixa de Resumo Interativo (Clicável para navegar direto) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className="text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-sky-50/70 dark:hover:bg-sky-500/10 border border-neutral-200/70 dark:border-neutral-800 transition flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Newspaper size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black leading-none">{stats.newsCount}</div>
              <div className="text-[11px] font-bold text-neutral-500 truncate mt-1">
                Notícias no Site →
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('popups')}
            className="text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-emerald-50/70 dark:hover:bg-emerald-500/10 border border-neutral-200/70 dark:border-neutral-800 transition flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Megaphone size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black leading-none">
                {activePopupsCount}/{MAX_SITE_POPUPS}
              </div>
              <div className="text-[11px] font-bold text-neutral-500 truncate mt-1">
                Pop-ups Ativos →
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('laws')}
            className="text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-indigo-50/70 dark:hover:bg-indigo-500/10 border border-neutral-200/70 dark:border-neutral-800 transition flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Scale size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black leading-none flex items-center gap-2">
                <span>{stats.lawsCount}</span>
                <span className="text-neutral-300 dark:text-neutral-600 text-sm">·</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  <Building2 size={12} /> {departmentNames.length} sec.
                </span>
              </div>
              <div className="text-[11px] font-bold text-neutral-500 truncate mt-1">
                Leis no Site →
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowChecklist((v) => !v)}
            className="text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-800 transition flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span>Prontidão PNTP</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {readinessOkCount}/{readinessChecklist.length}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${readinessPct}%`, backgroundColor: accentHex }}
                />
              </div>
              <div className="text-[10px] font-bold text-neutral-500">
                {showChecklist ? 'Ocultar checklist' : 'Ver checklist completo'}
              </div>
            </div>
            {showChecklist ? (
              <ChevronUp size={16} className="text-neutral-400 shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-neutral-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Checklist PNTP Expansível */}
        {showChecklist && (
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {readinessChecklist.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.ok ? (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-amber-500 shrink-0" />
                  )}
                  <span className={`truncate ${item.ok ? 'font-semibold' : 'text-neutral-500'}`}>
                    {item.label}
                  </span>
                </div>
                {!item.ok && item.targetTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(item.targetTab!);
                      setShowChecklist(false);
                    }}
                    className="text-[10px] font-black text-emerald-600 hover:underline shrink-0 cursor-pointer"
                  >
                    Configurar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navegação por Cartões (Largura Total) + Painel Ativo */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'bg-white dark:bg-neutral-900 shadow-md ring-2'
                    : 'bg-white/70 dark:bg-neutral-900/60 border-neutral-200/80 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-900'
                }`}
                style={
                  isActive
                    ? {
                        borderColor: accentHex,
                        boxShadow: `0 8px 20px -8px ${accentHex}40`,
                        ['--tw-ring-color' as any]: `${accentHex}33`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isActive
                        ? 'text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                    style={isActive ? { backgroundColor: accentHex } : undefined}
                  >
                    <Icon size={16} />
                  </div>
                  {tab.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        tab.badgeTone === 'dark'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                          : tab.badgeTone === 'sky'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-neutral-900 dark:text-white leading-tight">
                    {tab.label}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                    {tab.hint}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba Selecionada (Largura Total 100%) */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-7 shadow-sm space-y-6">
          {activeTab === 'news' && (
            <SiteNewsManagerPanel
              currentInstitution={currentInstitution}
              currentUser={currentUser}
              onStatsChange={handleNewsStatsChange}
            />
          )}

          {activeTab === 'gazette' && (
            <DiarioOficialManagerContent
              currentInstitution={currentInstitution}
              currentUser={currentUser}
              compact
              showSectionOnSite={config.sections.showOfficialGazette !== false}
              onToggleShowSectionOnSite={(checked) => updateSection('showOfficialGazette', checked)}
              onStatsChange={handleGazetteStatsChange}
            />
          )}

          {activeTab === 'laws' && (
            <SiteLawsManagerPanel
              currentInstitution={currentInstitution}
              showLawsSection={config.sections.showLaws}
              onToggleShowLawsSection={(checked) => updateSection('showLaws', checked)}
              onStatsChange={handleLawsStatsChange}
            />
          )}

          {activeTab === 'identity' && (
              <>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/70 dark:border-neutral-700">
                  <div>
                    <h4 className="text-sm font-black">Ativar Site Institucional Completo na Página Inicial</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Quando ativo, quem acessar o endereço oficial do município verá o portal completo (serviços, notícias, leis e secretarias).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Slogan / Faixa Institucional do Município
                    </label>
                    <input
                      type="text"
                      value={config.tagline}
                      onChange={(e) => setConfig((prev) => ({ ...prev, tagline: e.target.value }))}
                      placeholder="Ex: Transparência, Eficiência e Compromisso com o Cidadão"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Texto de Boas-vindas (Topo do Site)
                    </label>
                    <textarea
                      rows={3}
                      value={config.heroSubtitle}
                      onChange={(e) => setConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-2">
                      Círculo Cromático — Cor Principal do Site
                    </label>
                    <ColorWheelPicker
                      value={resolveSiteAccentHex(config)}
                      onChange={(hex) =>
                        setConfig((prev) => ({
                          ...prev,
                          customColor: hex,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                      <LayoutGrid size={13} /> Seções Exibidas Automaticamente
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {[
                        { key: 'showHeroServices' as const, label: 'Carta de Serviços ao Cidadão' },
                        { key: 'showNews' as const, label: 'Feed de Notícias & Obras' },
                        { key: 'showOfficialGazette' as const, label: 'Diário Oficial Eletrônico do Município' },
                        { key: 'showLaws' as const, label: 'Busca Rápida de Leis & Atos' },
                        { key: 'showDepartments' as const, label: 'Secretarias Oficiais do Município' },
                        { key: 'showGovernmentInfo' as const, label: 'Bloco Executivo, Horário & Contato' },
                        { key: 'showValidators' as const, label: 'Validadores Públicos (QR/Certidões)' },
                        { key: 'enableAccessibilityBar' as const, label: 'Barra de Acessibilidade eMAG (Fonte, Contraste, Voz)' },
                        { key: 'enableVLibras' as const, label: 'Widget VLibras Oficial (Tradução em LIBRAS)' },
                      ].map((sec) => (
                        <label
                          key={sec.key}
                          className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                        >
                          <span className="font-bold">{sec.label}</span>
                          <input
                            type="checkbox"
                            checked={config.sections[sec.key]}
                            onChange={(e) => updateSection(sec.key, e.target.checked)}
                            className="w-4 h-4 accent-emerald-600"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Prefeito(a) Municipal
                    </label>
                    <input
                      type="text"
                      value={config.mayorName}
                      onChange={(e) => setConfig((prev) => ({ ...prev, mayorName: e.target.value }))}
                      placeholder="Nome completo do(a) Prefeito(a)"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Vice-Prefeito(a) Municipal
                    </label>
                    <input
                      type="text"
                      value={config.viceMayorName}
                      onChange={(e) => setConfig((prev) => ({ ...prev, viceMayorName: e.target.value }))}
                      placeholder="Nome completo do(a) Vice-Prefeito(a)"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    Mensagem Oficial da Gestão
                  </label>
                  <textarea
                    rows={3}
                    value={config.mayorMessage}
                    onChange={(e) => setConfig((prev) => ({ ...prev, mayorMessage: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      CNPJ da Prefeitura
                    </label>
                    <input
                      type="text"
                      value={config.cnpj}
                      onChange={(e) => setConfig((prev) => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Telefone Oficial
                    </label>
                    <input
                      type="text"
                      value={config.phone}
                      onChange={(e) => setConfig((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(66) 3555-0000"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      E-mail Institucional Oficial
                    </label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={(e) => setConfig((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="gabinete@municipio.mt.gov.br"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Horário de Atendimento Presencial
                    </label>
                    <input
                      type="text"
                      value={config.serviceHours}
                      onChange={(e) => setConfig((prev) => ({ ...prev, serviceHours: e.target.value }))}
                      placeholder="Segunda a Sexta, das 07h00 às 13h00"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    Endereço Completo da Sede Administrativa
                  </label>
                  <input
                    type="text"
                    value={config.address}
                    onChange={(e) => setConfig((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua / Avenida, Nº, Bairro, Cidade - UF, CEP"
                    className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                      <FileBadge size={14} className="text-emerald-600" />
                      <span>Link do Serviço de CND Municipal (Certidão Negativa)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            cndMunicipalUrl: DEFAULT_CND_MUNICIPAL_URL,
                          }))
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Usar link padrão</span>
                      </button>
                      {config.cndMunicipalUrl && (
                        <a
                          href={config.cndMunicipalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                        >
                          <span>Testar</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                  <input
                    type="url"
                    value={config.cndMunicipalUrl}
                    onChange={(e) => setConfig((prev) => ({ ...prev, cndMunicipalUrl: e.target.value }))}
                    placeholder={DEFAULT_CND_MUNICIPAL_URL}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Deixe preenchido para exibir o card e o botão de emissão de CND Municipal no site público. Para ocultar o serviço, basta limpar o campo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Link Portal da Transparência (Opcional)
                    </label>
                    <input
                      type="url"
                      value={config.transparencyUrl}
                      onChange={(e) => setConfig((prev) => ({ ...prev, transparencyUrl: e.target.value }))}
                      placeholder="https://transparencia.municipio.mt.gov.br"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Link Diário Oficial (Opcional)
                    </label>
                    <input
                      type="url"
                      value={config.officialGazetteUrl}
                      onChange={(e) => setConfig((prev) => ({ ...prev, officialGazetteUrl: e.target.value }))}
                      placeholder="https://diariooficial.municipio.mt.gov.br"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="url"
                    value={config.socialLinks.instagram}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, instagram: e.target.value },
                      }))
                    }
                    placeholder="URL Instagram oficial"
                    className="px-3.5 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                  />
                  <input
                    type="url"
                    value={config.socialLinks.facebook}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, facebook: e.target.value },
                      }))
                    }
                    placeholder="URL Facebook oficial"
                    className="px-3.5 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                  />
                  <input
                    type="url"
                    value={config.socialLinks.youtube}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, youtube: e.target.value },
                      }))
                    }
                    placeholder="URL YouTube oficial"
                    className="px-3.5 py-2 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                  />
                </div>
              </div>
            )}

            {activeTab === 'popups' && (
              <SitePopupManagerPanel
                config={config}
                onChange={setConfig}
                accentHex={accentHex}
                institutionName={currentInstitution.name}
              />
            )}

            {activeTab === 'mourning' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800">
                  <div>
                    <h4 className="text-sm font-black">Ativar Modo Luto Oficial no Site</h4>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      Transforma todo o portal público em Preto e Branco e exibe o popup solene de Nota de Pesar ao acessar o site.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.mourningMode?.enabled)}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          mourningMode: {
                            ...prev.mourningMode,
                            enabled: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-700 rounded-full peer peer-checked:bg-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-neutral-900 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Nome Completo da Pessoa Homenageada *
                    </label>
                    <input
                      type="text"
                      value={config.mourningMode.personName}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          mourningMode: { ...prev.mourningMode, personName: e.target.value },
                        }))
                      }
                      placeholder="Ex: João da Silva"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Cargo / Vínculo / Homenagem (Opcional)
                    </label>
                    <input
                      type="text"
                      value={config.mourningMode.titleOrRole}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          mourningMode: { ...prev.mourningMode, titleOrRole: e.target.value },
                        }))
                      }
                      placeholder="Ex: Servidor Público Municipal / Ex-Prefeito"
                      className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    Referência ao Decreto de Luto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={config.mourningMode.decreeInfo}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mourningMode: { ...prev.mourningMode, decreeInfo: e.target.value },
                      }))
                    }
                    placeholder="Ex: Decreto Municipal nº 012/2026 — Luto Oficial de 3 dias"
                    className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    Mensagem Oficial da Prefeitura
                  </label>
                  <textarea
                    rows={4}
                    value={config.mourningMode.message}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mourningMode: { ...prev.mourningMode, message: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm"
                  />
                </div>

                {/* Prévia ao vivo do Popup de Luto */}
                <div className="p-5 rounded-3xl bg-neutral-100 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-400 text-center space-y-2 grayscale">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest">
                    Prévia · Nota de Pesar · Luto Oficial
                  </span>
                  <h5 className="text-lg font-black">
                    {config.mourningMode.personName || 'Nome da Pessoa Homenageada'}
                  </h5>
                  {config.mourningMode.titleOrRole && (
                    <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                      {config.mourningMode.titleOrRole}
                    </p>
                  )}
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 max-w-md mx-auto">
                    {config.mourningMode.message}
                  </p>
                  {config.mourningMode.decreeInfo && (
                    <p className="text-[10px] font-bold uppercase text-neutral-500">
                      {config.mourningMode.decreeInfo}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'domain' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-sky-800 dark:text-sky-300">
                    <ShieldCheck size={16} />
                    <span>Domínio Oficial .gov.br com Titularidade do Município</span>
                  </div>
                  <p className="text-sky-700 dark:text-sky-200 leading-relaxed">
                    A prefeitura mantém o domínio próprio registrado no NIC.br/Registro.br e apenas aponta o DNS para o Gestão 360. O sistema reconhece automaticamente o domínio próprio ao carregar a página.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                    <Globe size={15} />
                    <span>Endereços Públicos Ativos no &ldquo;/&rdquo; (Sem precisar configurar DNS ainda)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      Site Institucional Oficial
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeSiteFullUrl}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-mono text-neutral-700 dark:text-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => copyText(activeSiteFullUrl, 'Link do Site Oficial')}
                        className="p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 cursor-pointer"
                        title="Copiar link do Site"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={publicSiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        title="Abrir Site"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      Diário Oficial Eletrônico do Município
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeGazetteFullUrl}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-mono text-neutral-700 dark:text-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => copyText(activeGazetteFullUrl, 'Link do Diário Oficial')}
                        className="p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 cursor-pointer"
                        title="Copiar link do Diário Oficial"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={publicGazettePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        title="Abrir Diário Oficial"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Subdomínio Futuro do Site
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={fallbackSubdomainUrl}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-300"
                      />
                      <button
                        type="button"
                        onClick={() => copyText(fallbackSubdomainUrl, 'Subdomínio do Site')}
                        className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 cursor-pointer"
                        title="Copiar URL"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Subdomínio Futuro do Diário Oficial
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={futureGazetteSubdomainUrl}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-600 dark:text-neutral-300"
                      />
                      <button
                        type="button"
                        onClick={() => copyText(futureGazetteSubdomainUrl, 'Subdomínio do Diário Oficial')}
                        className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 cursor-pointer"
                        title="Copiar URL"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    Domínio Próprio da Prefeitura (.gov.br)
                  </label>
                  <input
                    type="text"
                    value={config.customDomain}
                    onChange={(e) => setConfig((prev) => ({ ...prev, customDomain: e.target.value }))}
                    placeholder="Ex: www.torixoreu.mt.gov.br"
                    className="w-full px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-xs">
                  <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 font-black uppercase tracking-wider text-neutral-500">
                    Apontamento DNS Recomendado (Registro.br / Cloudflare)
                  </div>
                  <div className="p-4 space-y-2 font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-neutral-100 dark:border-neutral-800">
                      <span><strong>Tipo:</strong> CNAME · <strong>Nome:</strong> www</span>
                      <span className="text-emerald-700 dark:text-emerald-400">cname.vercel-dns.com</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                      <span><strong>Tipo:</strong> A · <strong>Nome:</strong> @ (raiz)</span>
                      <span className="text-emerald-700 dark:text-emerald-400">76.76.21.21</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {activeTab !== 'news' && (
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                Lembre-se de salvar após alterar identidade, contatos, pop-ups, modo luto ou domínio.
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-black shadow-md transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: accentHex }}
              >
                <Save size={15} />
                <span>{saving ? 'Publicando...' : 'Salvar e Publicar Alterações'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteInstitucionalModule;
