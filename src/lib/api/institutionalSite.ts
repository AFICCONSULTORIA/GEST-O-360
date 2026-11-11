/**
 * Serviço de Configuração e Leitura do Site Institucional Oficial do Município.
 * Persiste preferencialmente em `public.institutions.cert_links.__institutional_site`
 * (garantindo compatibilidade imediata sem dependência de migração prévia) e sincroniza com
 * `custom_domain` / `site_config` quando disponíveis no banco, além de fallback localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Institution } from '../../types';
import { isValidUuid } from './municipalNews';

export type SiteThemeColor = 'emerald' | 'sky' | 'indigo' | 'amber' | 'slate';

export const DEFAULT_CND_MUNICIPAL_URL = 'http://45.161.37.1:8080/servicosweb/home.jsf';
export const MAX_SITE_POPUPS = 10;
export const DEFAULT_POPUP_DURATION_SECONDS = 6;

export interface SitePopupItem {
  id: string;
  enabled: boolean;
  title: string;
  badge: string;
  description: string;
  imageUrl: string;
  actionLabel: string;
  actionUrl: string;
  durationSeconds: number;
  startDate: string;
  endDate: string;
}

export interface PopupCarouselConfig {
  enabled: boolean;
  autoplay: boolean;
  autoCloseSeconds: number;
  items: SitePopupItem[];
}

export interface MourningModeConfig {
  enabled: boolean;
  personName: string;
  titleOrRole: string;
  message: string;
  decreeInfo: string;
}

export interface InstitutionalSiteConfig {
  enabled: boolean;
  customDomain: string;
  tagline: string;
  heroSubtitle: string;
  primaryColor: SiteThemeColor;
  customColor: string;
  mayorName: string;
  viceMayorName: string;
  mayorMessage: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  serviceHours: string;
  cndMunicipalUrl: string;
  transparencyUrl: string;
  officialGazetteUrl: string;
  mourningMode: MourningModeConfig;
  popupCarousel: PopupCarouselConfig;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
  sections: {
    showHeroServices: boolean;
    showNews: boolean;
    showOfficialGazette?: boolean;
    showLaws: boolean;
    showDepartments: boolean;
    showGovernmentInfo: boolean;
    showValidators: boolean;
    enableAccessibilityBar: boolean;
    enableVLibras: boolean;
  };
  updatedAt?: string;
}

export const SITE_CONFIG_UPDATED_EVENT = 'gestao360:site-config-updated';

const storageKey = (institutionId: string) => `gestao360_institutional_site_${institutionId}`;

export const THEME_COLOR_HEX_MAP: Record<SiteThemeColor, string> = {
  emerald: '#059669',
  sky: '#0284c7',
  indigo: '#4f46e5',
  amber: '#d97706',
  slate: '#1e293b',
};

export function resolveSiteAccentHex(config?: Partial<InstitutionalSiteConfig> | null): string {
  const custom = (config?.customColor || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(custom)) return custom;
  const key = (config?.primaryColor || 'emerald') as SiteThemeColor;
  return THEME_COLOR_HEX_MAP[key] || '#059669';
}

export function buildDefaultSiteConfig(institution?: Institution | null): InstitutionalSiteConfig {
  const instName = institution?.name || 'Prefeitura Municipal';
  return {
    enabled: true,
    customDomain: institution?.custom_domain || '',
    tagline: 'Transparência, Eficiência e Compromisso com o Cidadão',
    heroSubtitle: `Portal Oficial da ${instName}. Serviços digitais, legislação municipal, notícias e acesso à informação em um único lugar.`,
    primaryColor: 'emerald',
    customColor: '#059669',
    mayorName: '',
    viceMayorName: '',
    mayorMessage:
      'Trabalhamos diariamente para modernizar a gestão pública, garantir transparência nos gastos e oferecer serviços digitais ágeis para toda a população.',
    cnpj: institution?.cnpj || '',
    address: '',
    phone: institution?.contact_phone || '',
    email: '',
    serviceHours: 'Segunda a Sexta, das 07h00 às 13h00',
    cndMunicipalUrl: DEFAULT_CND_MUNICIPAL_URL,
    transparencyUrl: '',
    officialGazetteUrl: '',
    mourningMode: {
      enabled: false,
      personName: '',
      titleOrRole: '',
      message:
        'A Administração Municipal manifesta profundo pesar pelo falecimento e presta suas sinceras condolências aos familiares e amigos neste momento de dor.',
      decreeInfo: '',
    },
    popupCarousel: {
      enabled: true,
      autoplay: true,
      autoCloseSeconds: 0,
      items: [],
    },
    socialLinks: {
      instagram: '',
      facebook: '',
      youtube: '',
    },
    sections: {
      showHeroServices: true,
      showNews: true,
      showOfficialGazette: true,
      showLaws: true,
      showDepartments: true,
      showGovernmentInfo: true,
      showValidators: true,
      enableAccessibilityBar: true,
      enableVLibras: true,
    },
  };
}

function parseCertLinks(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? { ...(raw as Record<string, any>) } : {};
}

export function clampPopupDuration(seconds: unknown): number {
  const num = Number(seconds);
  if (!Number.isFinite(num)) return DEFAULT_POPUP_DURATION_SECONDS;
  return Math.min(120, Math.max(2, Math.round(num)));
}

export function clampPopupAutoClose(seconds: unknown): number {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(600, Math.max(5, Math.round(num)));
}

export function createEmptySitePopup(index = 0): SitePopupItem {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `popup_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    title: '',
    badge: 'Aviso Oficial',
    description: '',
    imageUrl: '',
    actionLabel: '',
    actionUrl: '',
    durationSeconds: DEFAULT_POPUP_DURATION_SECONDS,
    startDate: '',
    endDate: '',
  };
}

export function normalizePopupItem(raw: Partial<SitePopupItem> | null | undefined, index = 0): SitePopupItem {
  const base = createEmptySitePopup(index);
  if (!raw || typeof raw !== 'object') return base;
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : base.id,
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : true,
    title: typeof raw.title === 'string' ? raw.title : '',
    badge: typeof raw.badge === 'string' ? raw.badge : base.badge,
    description: typeof raw.description === 'string' ? raw.description : '',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    actionLabel: typeof raw.actionLabel === 'string' ? raw.actionLabel : '',
    actionUrl: typeof raw.actionUrl === 'string' ? raw.actionUrl : '',
    durationSeconds: clampPopupDuration(raw.durationSeconds),
    startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
    endDate: typeof raw.endDate === 'string' ? raw.endDate : '',
  };
}

export function normalizePopupCarousel(partial?: Partial<PopupCarouselConfig> | null): PopupCarouselConfig {
  const rawItems = Array.isArray(partial?.items) ? partial.items : [];
  return {
    enabled: partial?.enabled !== undefined ? Boolean(partial.enabled) : true,
    autoplay: partial?.autoplay !== undefined ? Boolean(partial.autoplay) : true,
    autoCloseSeconds: clampPopupAutoClose(partial?.autoCloseSeconds),
    items: rawItems.slice(0, MAX_SITE_POPUPS).map((item, idx) => normalizePopupItem(item, idx)),
  };
}

function getLocalIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPopupScheduleStatus(
  item: SitePopupItem,
  nowDate = new Date()
): 'inactive' | 'scheduled' | 'expired' | 'empty' | 'active' {
  if (!item.enabled) return 'inactive';
  const hasContent = Boolean(item.title.trim() || item.description.trim() || item.imageUrl.trim());
  if (!hasContent) return 'empty';
  const today = getLocalIsoDate(nowDate);
  if (item.startDate && today < item.startDate) return 'scheduled';
  if (item.endDate && today > item.endDate) return 'expired';
  return 'active';
}

export function getActiveSitePopups(
  config?: Partial<InstitutionalSiteConfig> | null,
  nowDate = new Date()
): SitePopupItem[] {
  const carousel = normalizePopupCarousel(config?.popupCarousel);
  if (!carousel.enabled) return [];
  return carousel.items.filter((item) => getPopupScheduleStatus(item, nowDate) === 'active');
}

export function mergeSiteConfig(
  institution: Institution | null | undefined,
  partial?: Partial<InstitutionalSiteConfig> | null
): InstitutionalSiteConfig {
  const defaults = buildDefaultSiteConfig(institution);
  if (!partial) return defaults;

  return {
    ...defaults,
    ...partial,
    customColor: partial.customColor || (partial.primaryColor ? THEME_COLOR_HEX_MAP[partial.primaryColor] : defaults.customColor),
    cndMunicipalUrl: partial.cndMunicipalUrl !== undefined ? partial.cndMunicipalUrl : defaults.cndMunicipalUrl,
    mourningMode: {
      ...defaults.mourningMode,
      ...(partial.mourningMode || {}),
    },
    popupCarousel: normalizePopupCarousel(partial.popupCarousel),
    socialLinks: {
      ...defaults.socialLinks,
      ...(partial.socialLinks || {}),
    },
    sections: {
      ...defaults.sections,
      ...(partial.sections || {}),
    },
  };
}

export function extractSiteConfigFromInstitution(institution?: Institution | null): InstitutionalSiteConfig {
  const certLinks = parseCertLinks(institution?.cert_links);
  const fromCertLinks = certLinks.__institutional_site as Partial<InstitutionalSiteConfig> | undefined;
  const fromColumn = (institution as any)?.site_config as Partial<InstitutionalSiteConfig> | undefined;

  let fromLocal: Partial<InstitutionalSiteConfig> | undefined;
  if (institution?.id && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey(institution.id));
      if (raw) fromLocal = JSON.parse(raw);
    } catch {
      // ignora erro de localStorage
    }
  }

  return mergeSiteConfig(institution, {
    ...(fromColumn || {}),
    ...(fromCertLinks || {}),
    ...(fromLocal && (!fromCertLinks?.updatedAt || (fromLocal.updatedAt && fromLocal.updatedAt > fromCertLinks.updatedAt))
      ? fromLocal
      : {}),
  });
}

export function normalizeCustomDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export async function saveInstitutionalSiteConfig(
  institution: Institution,
  config: InstitutionalSiteConfig
): Promise<{ success: boolean; error?: string; savedConfig: InstitutionalSiteConfig }> {
  const normalizedDomain = normalizeCustomDomain(config.customDomain || '');
  const payload: InstitutionalSiteConfig = {
    ...config,
    customDomain: normalizedDomain,
    popupCarousel: normalizePopupCarousel(config.popupCarousel),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey(institution.id), JSON.stringify(payload));
    } catch {
      // ignora erro de quota
    }
  }

  if (!isValidUuid(institution.id)) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SITE_CONFIG_UPDATED_EVENT, {
          detail: { institutionId: institution.id, config: payload },
        })
      );
    }
    return { success: true, savedConfig: payload };
  }

  const existingCertLinks = parseCertLinks(institution.cert_links);
  const nextCertLinks = {
    ...existingCertLinks,
    __institutional_site: payload,
  };

  try {
    // Primeiro tenta salvar também cnpj/contact_phone/cert_links (colunas existentes em public.institutions)
    const updatePayload: Record<string, any> = {
      cert_links: nextCertLinks,
    };
    if (payload.cnpj) updatePayload.cnpj = payload.cnpj;
    if (payload.phone) updatePayload.contact_phone = payload.phone;

    const { error } = await supabase
      .from('institutions')
      .update(updatePayload)
      .eq('id', institution.id);

    if (error) {
      return { success: false, error: error.message, savedConfig: payload };
    }

    // Tentativa best-effort para colunas opcionais custom_domain e site_config (caso migração aplicada)
    await supabase
      .from('institutions')
      .update({
        custom_domain: normalizedDomain || null,
        site_config: payload,
      })
      .eq('id', institution.id);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SITE_CONFIG_UPDATED_EVENT, {
          detail: { institutionId: institution.id, config: payload },
        })
      );
    }

    return { success: true, savedConfig: payload };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar configurações do site', savedConfig: payload };
  }
}

export function useInstitutionalSiteConfig(institution?: Institution | null) {
  const [config, setConfig] = useState<InstitutionalSiteConfig>(() =>
    extractSiteConfigFromInstitution(institution)
  );
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const initial = extractSiteConfigFromInstitution(institution);
    setConfig(initial);

    if (!institution?.id || !isValidUuid(institution.id)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, subdomain, logo_url, cnpj, contact_phone, cert_links')
        .eq('id', institution.id)
        .maybeSingle();

      if (!error && data) {
        const mergedInst = { ...institution, ...data } as Institution;
        setConfig(extractSiteConfigFromInstitution(mergedInst));
      }
    } catch {
      // mantém estado inicial se offline
    } finally {
      setLoading(false);
    }
  }, [institution?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === institution?.id) {
        if (detail?.config) {
          setConfig(mergeSiteConfig(institution, detail.config));
        } else {
          reload();
        }
      }
    };
    window.addEventListener(SITE_CONFIG_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SITE_CONFIG_UPDATED_EVENT, handler);
  }, [institution, reload]);

  return { config, setConfig, loading, reload };
}

