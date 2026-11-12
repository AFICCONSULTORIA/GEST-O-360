import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Accessibility,
  Check,
  Cookie,
  ExternalLink,
  FileText,
  Globe,
  Headphones,
  Lock,
  Mail,
  Map as MapIcon,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { Institution } from '../types';
import { InstitutionalSiteConfig } from '../lib/api/institutionalSite';
import { withInstitutionQuery } from '../lib/institutionModules';

export type ComplianceDialogType = 'privacy' | 'accessibility' | 'sitemap' | null;

export interface CookieConsentRecord {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  consentedAt: string;
  version: string;
}

const COOKIE_CONSENT_VERSION = '2026.1';

export function getCookieConsentKey(institutionId: string): string {
  return `gestao360_cookie_consent_${institutionId}`;
}

export function readCookieConsent(institutionId?: string | null): CookieConsentRecord | null {
  if (!institutionId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getCookieConsentKey(institutionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    return parsed && typeof parsed === 'object' && parsed.version === COOKIE_CONSENT_VERSION
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(
  institutionId: string,
  preferences: boolean,
  analytics: boolean
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    essential: true,
    preferences,
    analytics,
    consentedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  try {
    localStorage.setItem(getCookieConsentKey(institutionId), JSON.stringify(record));
  } catch {
    // ignora restrições de armazenamento privado
  }
  return record;
}

interface CookieBannerProps {
  institution: Institution;
  visible: boolean;
  accentHex: string;
  darkMode: boolean;
  isMourning: boolean;
  onAcceptedOrDismissed: () => void;
  onOpenPrivacy: () => void;
  onRequestOpen?: () => void;
}

export const CookieConsentBanner: React.FC<CookieBannerProps> = ({
  institution,
  visible,
  accentHex,
  darkMode,
  isMourning,
  onAcceptedOrDismissed,
  onOpenPrivacy,
  onRequestOpen,
}) => {
  if (typeof document === 'undefined') return null;

  const handleConsent = (allowOptional: boolean) => {
    saveCookieConsent(institution.id, allowOptional, allowOptional);
    onAcceptedOrDismissed();
  };

  // Se o banner não estiver visível e houver callback para reabrir, exibe o ícone flutuante de cookies no canto inferior direito
  if (!visible) {
    if (!onRequestOpen) return null;
    return createPortal(
      <div className={`${darkMode ? 'dark' : ''} ${isMourning ? 'grayscale' : ''}`}>
        <button
          type="button"
          onClick={onRequestOpen}
          aria-label="Gerenciar Cookies e Privacidade LGPD"
          title="Ver preferências de cookies e privacidade LGPD"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9980] flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md text-neutral-700 dark:text-neutral-200 border border-neutral-200/90 dark:border-neutral-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs group-hover:rotate-12 transition-transform duration-300"
            style={{ backgroundColor: accentHex }}
          >
            <Cookie size={16} />
          </div>
          <span className="hidden sm:inline-block text-xs font-bold text-neutral-800 dark:text-neutral-200 pr-1 select-none">
            Cookies
          </span>
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className={`${darkMode ? 'dark' : ''} ${isMourning ? 'grayscale' : ''}`}>
      <div
        role="region"
        aria-label="Aviso de Cookies e Privacidade LGPD"
        className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 lg:left-auto lg:right-6 lg:max-w-xl z-[9990] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-3xl shadow-2xl p-4 sm:p-5 animate-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-xs"
            style={{ backgroundColor: accentHex }}
          >
            <Cookie size={18} />
          </div>
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                  Privacidade, Cookies & LGPD
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  Este portal oficial da <strong>{institution.name}</strong> utiliza cookies e armazenamento local estritamente necessários para acessibilidade (eMAG/VLibras), tema visual e segurança de navegação, sem rastreadores publicitários de terceiros.
                </p>
              </div>
              <button
                type="button"
                onClick={onAcceptedOrDismissed}
                aria-label="Fechar aviso de cookies"
                title="Fechar e manter preferências atuais"
                className="p-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleConsent(true)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-xs hover:opacity-95 transition cursor-pointer"
                style={{ backgroundColor: accentHex }}
              >
                Aceitar Todos
              </button>
              <button
                type="button"
                onClick={() => handleConsent(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
              >
                Apenas Essenciais
              </button>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:underline cursor-pointer"
              >
                Política & Preferências
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface SiteComplianceModalsProps {
  activeDialog?: ComplianceDialogType;
  openType?: ComplianceDialogType;
  onClose: () => void;
  institution: Institution;
  config: InstitutionalSiteConfig;
  accentHex: string;
  darkMode: boolean;
  isMourning: boolean;
  showOuvidoria?: boolean;
  showNoticias?: boolean;
  onConsentSaved?: () => void;
}

export const SiteComplianceModals: React.FC<SiteComplianceModalsProps> = ({
  activeDialog: propActiveDialog,
  openType,
  onClose,
  institution,
  config,
  accentHex,
  darkMode,
  isMourning,
  showOuvidoria = true,
  showNoticias = true,
  onConsentSaved,
}) => {
  const activeDialog = propActiveDialog !== undefined ? propActiveDialog : (openType ?? null);
  const existingConsent = readCookieConsent(institution.id);
  const [prefCookies, setPrefCookies] = useState<boolean>(
    existingConsent ? existingConsent.preferences : true
  );
  const [analyticsCookies, setAnalyticsCookies] = useState<boolean>(
    existingConsent ? existingConsent.analytics : false
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!activeDialog) return;
    setSavedNotice(false);
    const current = readCookieConsent(institution.id);
    if (current) {
      setPrefCookies(current.preferences);
      setAnalyticsCookies(current.analytics);
    }
  }, [activeDialog, institution.id]);

  useEffect(() => {
    if (!activeDialog) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDialog, onClose]);

  if (!activeDialog || typeof document === 'undefined') return null;

  const handleSavePreferences = (allowOptional?: boolean) => {
    const prefs = allowOptional !== undefined ? allowOptional : prefCookies;
    const stats = allowOptional !== undefined ? allowOptional : analyticsCookies;
    saveCookieConsent(institution.id, prefs, stats);
    setPrefCookies(prefs);
    setAnalyticsCookies(stats);
    setSavedNotice(true);
    onConsentSaved?.();
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return createPortal(
    <div className={`${darkMode ? 'dark' : ''} ${isMourning ? 'grayscale' : ''}`}>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Cabeçalho */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-950/60">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: accentHex }}
              >
                {activeDialog === 'privacy' ? (
                  <ShieldCheck size={18} />
                ) : activeDialog === 'accessibility' ? (
                  <Accessibility size={18} />
                ) : (
                  <MapIcon size={18} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {institution.name}
                </p>
                <h3 className="text-base sm:text-lg font-black truncate">
                  {activeDialog === 'privacy'
                    ? 'Política de Privacidade, Cookies & LGPD'
                    : activeDialog === 'accessibility'
                    ? 'Declaração de Acessibilidade Digital (eMAG / LBI)'
                    : 'Mapa do Site Institucional'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela"
              className="p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {activeDialog === 'privacy' && (
              <>
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700 space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                    1. Finalidade e Base Legal (Lei nº 13.709/2018 — LGPD)
                  </p>
                  <p className="text-xs">
                    O tratamento de dados neste portal oficial atende ao cumprimento de obrigação legal e à execução de políticas públicas pela Administração Pública Municipal (Art. 7º, II e III da LGPD), em conformidade com a Lei de Acesso à Informação (Lei nº 12.527/2011) e a Lei nº 13.460/2017.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                    2. Gerenciamento de Cookies & Armazenamento Local
                  </p>

                  <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-neutral-900 dark:text-white">
                        Cookies Estritamente Necessários (Sempre Ativos)
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Mantêm segurança da navegação, sessão de servidor autenticado, preferência de consentimento e recursos básicos de consulta pública.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black shrink-0">
                      Obrigatório
                    </span>
                  </div>

                  <label className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-xs font-black text-neutral-900 dark:text-white">
                        Preferências de Acessibilidade e Visualização
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Recorda tamanho da fonte, alto contraste, espaçamento de leitura e modo claro/escuro entre visitas.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefCookies}
                      onChange={(e) => setPrefCookies(e.target.checked)}
                      className="w-4 h-4 mt-1 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-xs font-black text-neutral-900 dark:text-white">
                        Métricas Institucionais Anonimizadas
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Contagem agregada sem identificação pessoal para avaliar os serviços mais procurados pela população. Nunca compartilhado para publicidade.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={analyticsCookies}
                      onChange={(e) => setAnalyticsCookies(e.target.checked)}
                      className="w-4 h-4 mt-1 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSavePreferences()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer"
                      style={{ backgroundColor: accentHex }}
                    >
                      {savedNotice ? <Check size={14} /> : null}
                      <span>{savedNotice ? 'Preferências Salvas!' : 'Salvar Preferências'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePreferences(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      Manter Apenas Essenciais
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/50 space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <UserCheck size={14} />
                    <span>3. Encarregado pelo Tratamento de Dados (DPO — Art. 41 LGPD)</span>
                  </p>
                  <p className="text-xs">
                    <strong>Responsável:</strong>{' '}
                    {config.dpoName?.trim() || `Ouvidoria / Encarregado de Dados — ${institution.name}`}
                  </p>
                  {(config.dpoEmail?.trim() || config.email?.trim()) && (
                    <p className="text-xs flex items-center gap-1.5">
                      <Mail size={13} className="shrink-0" />
                      <a
                        href={`mailto:${config.dpoEmail?.trim() || config.email?.trim()}`}
                        className="underline font-semibold"
                      >
                        {config.dpoEmail?.trim() || config.email?.trim()}
                      </a>
                    </p>
                  )}
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    Para exercer direitos de titular (confirmação, acesso, correção ou eliminação quando cabível), utilize o e-mail acima ou abra um protocolo na{' '}
                    <a
                      href={withInstitutionQuery('/ouvidoria', institution)}
                      className="underline font-bold"
                    >
                      Ouvidoria / e-SIC
                    </a>
                    .
                  </p>
                </div>
              </>
            )}

            {activeDialog === 'accessibility' && (
              <>
                <p className="text-xs">
                  Este portal foi desenvolvido em conformidade com as diretrizes da{' '}
                  <strong>Lei Brasileira de Inclusão (Lei nº 13.146/2015)</strong> e com os padrões de governo digital{' '}
                  <strong>eMAG / WCAG</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                    <p className="font-black text-neutral-900 dark:text-white mb-1">Atalhos de Teclado</p>
                    <ul className="space-y-1 text-[11px]">
                      <li><strong>Alt + 1</strong> (ou link inicial): Ir para o conteúdo principal</li>
                      <li><strong>Alt + 2</strong>: Ir para o menu de navegação</li>
                      <li><strong>Alt + 3</strong>: Ir para o rodapé institucional</li>
                      <li><strong>Esc</strong>: Fechar janelas e modais abertos</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                    <p className="font-black text-neutral-900 dark:text-white mb-1">Recursos Integrados</p>
                    <ul className="space-y-1 text-[11px]">
                      <li>Ampliação e redução de fonte (A- / A / A+ / A++)</li>
                      <li>Modo Alto Contraste e Espaçamento Ampliado</li>
                      <li>Leitor de texto por voz (síntese de fala nativa)</li>
                      <li>Tradução automática para LIBRAS (VLibras oficial)</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5">
                  <p className="font-black text-neutral-900 dark:text-white">
                    Encontrou alguma barreira de acessibilidade?
                  </p>
                  <p className="text-[11px]">
                    Caso algum documento antigo ou página apresente dificuldade de leitura em leitor de tela, solicite versão acessível pela Ouvidoria / e-SIC ou pelos canais presenciais da Prefeitura.
                  </p>
                </div>
              </>
            )}

            {activeDialog === 'sitemap' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <p className="font-black uppercase tracking-wider text-[11px] text-neutral-500">
                    Seções do Portal Principal
                  </p>
                  <ul className="space-y-1.5 font-semibold">
                    <li><a href="#inicio" onClick={onClose} className="hover:underline">Início & Brasão Oficial</a></li>
                    {config.sections.showHeroServices && (
                      <li><a href="#servicos" onClick={onClose} className="hover:underline">Carta de Serviços ao Cidadão</a></li>
                    )}
                    {config.sections.showNews && showNoticias && (
                      <li><a href="#noticias" onClick={onClose} className="hover:underline">Notícias & Publicações</a></li>
                    )}
                    {config.sections.showOfficialGazette !== false && (
                      <li><a href="#diario-oficial" onClick={onClose} className="hover:underline">Diário Oficial Eletrônico</a></li>
                    )}
                    {config.sections.showLaws && (
                      <li><a href="#legislacao" onClick={onClose} className="hover:underline">Legislação Municipal & Atos</a></li>
                    )}
                    {config.sections.showDepartments && (
                      <li><a href="#secretarias" onClick={onClose} className="hover:underline">Secretarias & Órgãos</a></li>
                    )}
                    {config.sections.showGovernmentInfo && (
                      <li><a href="#prefeitura" onClick={onClose} className="hover:underline">A Prefeitura & Contato</a></li>
                    )}
                    {config.sections.showUsefulLinks !== false && (
                      <li><a href="#links-uteis" onClick={onClose} className="hover:underline">Links Úteis</a></li>
                    )}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <p className="font-black uppercase tracking-wider text-[11px] text-neutral-500">
                    Serviços & Transparência Pública
                  </p>
                  <ul className="space-y-1.5 font-semibold">
                    {config.transparencyUrl && (
                      <li>
                        <a
                          href={config.transparencyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <Globe size={12} /> Portal da Transparência <ExternalLink size={11} />
                        </a>
                      </li>
                    )}
                    {showOuvidoria && (
                      <li>
                        <a
                          href={withInstitutionQuery('/ouvidoria', institution)}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <Headphones size={12} /> Ouvidoria & e-SIC (LAI)
                        </a>
                      </li>
                    )}
                    <li>
                      <a
                        href={withInstitutionQuery('/diario-oficial', institution)}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <FileText size={12} /> Diário Oficial Completo
                      </a>
                    </li>
                    {showNoticias && (
                      <li>
                        <a
                          href={withInstitutionQuery('/noticias', institution)}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <Globe size={12} /> Portal de Notícias
                        </a>
                      </li>
                    )}
                    <li>
                      <a
                        href={withInstitutionQuery('/validar-documento', institution)}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <ShieldCheck size={12} /> Validar Documento / Certidão
                      </a>
                    </li>
                    <li>
                      <a
                        href={withInstitutionQuery('/servidores', institution)}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Lock size={12} /> Área Restrita do Servidor
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="px-6 py-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-black bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

