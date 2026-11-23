import React, { useEffect, useMemo, useState } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Smartphone,
  Calendar,
  CreditCard,
  AlertCircle,
  Download,
  Share,
  MoreVertical,
  X
} from 'lucide-react';
import { Institution } from '../../types';
import { authenticateFamilyStudentByCpfBirth } from '../../lib/api/education';
import { formatCPF, validateCPF } from '../../lib/masks';
import { FamilyPortalView, FamilyPortalStudentContext } from './components/FamilyPortalView';
import { showToast } from '../../components/ui/Toast';

interface PublicFamilyPortalProps {
  darkMode?: boolean;
  currentInstitution?: Institution | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const LAST_STUDENT_STORAGE_KEY = 'gestao360_family_portal_student';

function onlyDigits(val?: string | null): string {
  return String(val || '').replace(/\D/g, '');
}

function normalizeDateIso(raw?: string | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return '';
}

export const PublicFamilyPortal: React.FC<PublicFamilyPortalProps> = ({
  currentInstitution,
}) => {
  const [cpfInput, setCpfInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<FamilyPortalStudentContext | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_STUDENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showInstallTip, setShowInstallTip] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (window.__deferredInstallPrompt as BeforeInstallPromptEvent | undefined) || null;
  });
  const [isInstalledApp, setIsInstalledApp] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setIsInstalledApp(standalone);
    };
    checkStandalone();

    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt as BeforeInstallPromptEvent);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleGlobalPrompt = () => {
      if (window.__deferredInstallPrompt) {
        setDeferredPrompt(window.__deferredInstallPrompt as BeforeInstallPromptEvent);
      }
    };
    const handleAppInstalled = () => {
      window.__deferredInstallPrompt = undefined;
      setDeferredPrompt(null);
      setIsInstalledApp(true);
      setShowInstallTip(false);
      showToast('App instalado na tela inicial do seu telefone!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-install-available', handleGlobalPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-install-available', handleGlobalPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent =
      deferredPrompt || (window.__deferredInstallPrompt as BeforeInstallPromptEvent | undefined);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          window.__deferredInstallPrompt = undefined;
          setDeferredPrompt(null);
          setIsInstalledApp(true);
          showToast('Instalando o aplicativo...', 'success');
          return;
        }
      } catch {
        // fallback to manual instructions modal
      }
    }
    setShowInstallTip(true);
  };

  const renderInstallModal = () => {
    if (!showInstallTip) return null;

    const androidCard = (
      <div
        key="android"
        className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
          !isIOS
            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
            : 'bg-neutral-50 dark:bg-neutral-800/70 border-neutral-200/70 dark:border-neutral-700'
        }`}
      >
        <MoreVertical size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
            <span>Android (Chrome)</span>
            {!isIOS && (
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] uppercase">
                Seu aparelho
              </span>
            )}
          </div>
          <p className="mt-0.5 leading-relaxed">
            Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito e escolha{' '}
            <strong>&ldquo;Instalar aplicativo&rdquo;</strong> ou{' '}
            <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong>.
          </p>
        </div>
      </div>
    );

    const iosCard = (
      <div
        key="ios"
        className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
          isIOS
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-neutral-50 dark:bg-neutral-800/70 border-neutral-200/70 dark:border-neutral-700'
        }`}
      >
        <Share size={16} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
            <span>iPhone / iPad (Safari)</span>
            {isIOS && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] uppercase">
                Seu aparelho
              </span>
            )}
          </div>
          <p className="mt-0.5 leading-relaxed">
            Toque no botão <strong>Compartilhar</strong> na barra inferior e escolha{' '}
            <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
          </p>
        </div>
      </div>
    );

    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={() => setShowInstallTip(false)}
      >
        <div
          className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700 mx-auto -mt-1 mb-1 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shrink-0">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Instalar App no Telefone
                </h3>
                <p className="text-xs text-neutral-500">
                  Acesse o boletim direto da tela inicial como aplicativo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallTip(false)}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300">
            {isIOS ? [iosCard, androidCard] : [androidCard, iosCard]}
          </div>

          <button
            type="button"
            onClick={() => setShowInstallTip(false)}
            className="w-full min-h-[46px] py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-transform"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  };

  const openStudentSession = (ctx: FamilyPortalStudentContext) => {
    setSelectedStudent(ctx);
    try {
      localStorage.setItem(LAST_STUDENT_STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // ignore
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cpfDigits = onlyDigits(cpfInput);
    if (cpfDigits.length !== 11 || !validateCPF(cpfInput)) {
      setLoginError('Informe um CPF válido do aluno (11 dígitos).');
      return;
    }
    if (!birthDateInput) {
      setLoginError('Informe a data de nascimento do aluno.');
      return;
    }

    setLoadingLogin(true);
    try {
      const targetBirth = normalizeDateIso(birthDateInput);
      const authResult = await authenticateFamilyStudentByCpfBirth(
        currentInstitution?.id || 'inst_1',
        cpfDigits,
        targetBirth
      );

      if (!authResult.found || !authResult.student) {
        setLoginError(
          authResult.error ||
            'Aluno não encontrado. Confira o CPF e a data de nascimento ou procure a secretaria da escola.'
        );
        return;
      }

      const matchedStudent: FamilyPortalStudentContext = {
        id: authResult.student.id,
        name: authResult.student.name,
        className: authResult.student.className,
        avatar: authResult.student.avatar
      };

      openStudentSession(matchedStudent);
      showToast(`Bem-vindo(a)! Acompanhando ${matchedStudent.name}.`, 'success');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    setSelectedStudent(null);
    setCpfInput('');
    setBirthDateInput('');
    setLoginError(null);
    try {
      localStorage.removeItem(LAST_STUDENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (selectedStudent) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-neutral-950 family-app-shell overflow-x-hidden">
        {/* Barra Superior Compacta Estilo App */}
        <header className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 sticky top-0 z-40 safe-pt">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/familia-icon.svg"
                alt="Família e Escola"
                className="w-8 h-8 rounded-xl shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-black text-neutral-900 dark:text-white truncate">
                  Família e Escola
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {selectedStudent.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isInstalledApp && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black shadow-xs transition-all active:scale-95"
                  title="Instalar aplicativo no telefone"
                >
                  <Smartphone size={13} />
                  <span className="sm:hidden">Instalar</span>
                  <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-bold active:scale-95 transition-all"
              >
                <LogOut size={13} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-3 sm:px-6 py-4 sm:py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <FamilyPortalView
            mode="student"
            initialStudentId={selectedStudent.id}
            studentProfile={selectedStudent}
            institutionId={currentInstitution?.id || 'inst_1'}
          />
        </main>
        {renderInstallModal()}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50 via-white to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 family-app-shell overflow-x-hidden flex flex-col justify-center px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2.5">
          <img
            src="/familia-icon.svg"
            alt="Família e Escola"
            className="w-16 h-16 mx-auto rounded-2xl shadow-lg shadow-indigo-500/20"
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck size={13} />
            <span>{currentInstitution?.name || 'Rede Municipal de Ensino'}</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Família e Escola
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Informe o CPF e a data de nascimento do aluno para acompanhar o boletim, frequência e recados.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xl shadow-neutral-200/40 dark:shadow-none space-y-4"
        >
          {loginError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              CPF do Aluno
            </label>
            <div className="relative">
              <CreditCard size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                required
                value={cpfInput}
                onChange={(e) => {
                  setCpfInput(formatCPF(e.target.value));
                  setLoginError(null);
                }}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full min-w-0 min-h-[48px] pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-base font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Data de Nascimento do Aluno
            </label>
            <div className="relative">
              <Calendar size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="date"
                required
                value={birthDateInput}
                onChange={(e) => {
                  setBirthDateInput(e.target.value);
                  setLoginError(null);
                }}
                className="w-full min-w-0 min-h-[48px] appearance-none pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-base font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:opacity-95 text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loadingLogin ? 'Verificando...' : 'Acessar Boletim'}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        {!isInstalledApp && (
          <div className="text-center">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-black shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 active:scale-95 transition-all"
            >
              <Download size={15} />
              <span>Instalar App no Telefone</span>
            </button>
          </div>
        )}
      </div>
      {renderInstallModal()}
    </div>
  );
};
