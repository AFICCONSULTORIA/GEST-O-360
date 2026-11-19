import React, { useEffect, useState } from 'react';
import { Cookie, Lock, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { Institution } from '../types';
import { withInstitutionQuery } from '../lib/institutionModules';

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  functional: boolean;
  consentedAt: string;
  version: string;
}

const CONSENT_VERSION = '2026.1';

export function getLgpdCookieKey(institutionId: string): string {
  return `gestao360_lgpd_cookies_${institutionId}`;
}

export function readLgpdCookiePreferences(institutionId?: string | null): CookiePreferences | null {
  if (!institutionId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getLgpdCookieKey(institutionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    return parsed && parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLgpdCookiePreferences(
  institutionId: string,
  analytics: boolean,
  functional: boolean
): CookiePreferences {
  const record: CookiePreferences = {
    essential: true,
    analytics,
    functional,
    consentedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    localStorage.setItem(getLgpdCookieKey(institutionId), JSON.stringify(record));
  } catch {
    // Ignora caso storage esteja bloqueado
  }
  return record;
}

export interface CookieConsentBannerProps {
  institution: Institution;
  forceOpen?: boolean;
  onClose?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  institution,
  forceOpen = false,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    const existing = readLgpdCookiePreferences(institution.id);
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.analytics);
      setFunctional(existing.functional);
    }
  }, [institution.id]);

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      setShowModal(true);
    }
  }, [forceOpen]);

  const handleSave = (nextAnalytics: boolean, nextFunctional: boolean) => {
    saveLgpdCookiePreferences(institution.id, nextAnalytics, nextFunctional);
    setAnalytics(nextAnalytics);
    setFunctional(nextFunctional);
    setVisible(false);
    setShowModal(false);
    onClose?.();
  };

  if (!visible && !showModal) return null;

  return (
    <>
      {visible && !showModal && (
        <aside
          aria-label="Aviso de Privacidade e Cookies (LGPD)"
          role="dialog"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 z-[90] max-w-5xl mx-auto bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-4 sm:p-5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 shrink-0">
                <Cookie size={20} />
              </div>
              <div className="text-xs sm:text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white mb-0.5">
                  Privacidade e Cookies — Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
                </p>
                <p>
                  Este portal utiliza cookies estritamente necessários para segurança e acessibilidade, além de cookies
                  opcionais de desempenho e preferências. Consulte nossa{' '}
                  <a
                    href={withInstitutionQuery('/privacidade', institution)}
                    className="font-bold underline text-slate-900 dark:text-white hover:text-slate-600"
                  >
                    Política de Privacidade
                  </a>{' '}
                  e o{' '}
                  <a
                    href={withInstitutionQuery('/encarregado-dpo', institution)}
                    className="font-bold underline text-slate-900 dark:text-white hover:text-slate-600"
                  >
                    Contato do Encarregado (DPO)
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <SlidersHorizontal size={14} />
                Personalizar Preferências
              </button>
              <button
                type="button"
                onClick={() => handleSave(false, false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Rejeitar Não Essenciais
              </button>
              <button
                type="button"
                onClick={() => handleSave(true, true)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-neutral-200 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
              >
                Aceitar Todos
              </button>
            </div>
          </div>
        </aside>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
        >
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-slate-800 dark:text-white" />
                <h2 id="cookie-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Preferências de Privacidade e Cookies
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  onClose?.();
                }}
                aria-label="Fechar preferências de cookies"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Lock size={14} />
                    <span>Estritamente Necessários</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                    Essenciais para segurança, sessão, acessibilidade (alto contraste e tamanho de fonte) e funcionamento do portal. Sempre ativos.
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200 shrink-0">
                  Sempre Ativo
                </span>
              </div>

              <label className="p-4 rounded-xl border border-slate-200 dark:border-neutral-700 flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Funcionais</span>
                  <span className="text-xs text-slate-600 dark:text-neutral-400 mt-1 block">
                    Memorizam preferências de exibição, filtros de transparência e idioma/leitura facilitada.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="p-4 rounded-xl border border-slate-200 dark:border-neutral-700 flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Analíticos / Desempenho</span>
                  <span className="text-xs text-slate-600 dark:text-neutral-400 mt-1 block">
                    Coletam estatísticas agregadas e anonimizadas de acesso para melhoria dos serviços digitais públicos.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-slate-900"
                />
              </label>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-neutral-800/50 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleSave(false, false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 cursor-pointer"
              >
                Rejeitar Não Essenciais
              </button>
              <button
                type="button"
                onClick={() => handleSave(analytics, functional)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
