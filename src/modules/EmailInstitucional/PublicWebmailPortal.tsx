import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  KeyRound,
  ShieldCheck,
  Globe,
  AlertCircle,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Institution } from '../../types';
import {
  useInstitutionalSiteConfig,
  resolveSiteAccentHex,
} from '../../lib/api/institutionalSite';
import { useMunicipalDepartments } from '../../lib/api/departments';
import {
  authenticateWebmailAccount,
  deleteEmailMessagePermanently,
  loadInstitutionalEmailState,
  sendInstitutionalEmail,
  setEmailAccountPassword,
  updateEmailMessageFlags,
} from '../../lib/api/institutionalEmail';
import { withInstitutionQuery } from '../../lib/institutionModules';
import {
  EmailFolder,
  InstitutionalEmailAccount,
  InstitutionalEmailDomain,
  InstitutionalEmailMessage,
  SendEmailPayload,
} from './types';
import { WebmailInbox } from './components/WebmailInbox';
import { showToast } from '../../components/ui/Toast';

interface PublicWebmailPortalProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  currentInstitution: Institution;
}

const WEBMAIL_SESSION_PREFIX = '@gestao360:webmail_session_';

export const PublicWebmailPortal: React.FC<PublicWebmailPortalProps> = ({
  darkMode,
  setDarkMode,
  currentInstitution,
}) => {
  const { config: siteConfig } = useInstitutionalSiteConfig(currentInstitution);
  const { departmentNames } = useMunicipalDepartments(currentInstitution.id);
  const accentHex = resolveSiteAccentHex(siteConfig);

  const secretariatNames = useMemo(() => {
    const fromSite = (siteConfig.secretariats || [])
      .map((s) => s.title || s.slug)
      .filter(Boolean);
    return Array.from(new Set([...fromSite, ...departmentNames]));
  }, [siteConfig.secretariats, departmentNames]);

  const [sessionAccountId, setSessionAccountId] = useState<string>(() => {
    try {
      return localStorage.getItem(`${WEBMAIL_SESSION_PREFIX}${currentInstitution.id}`) || '';
    } catch {
      return '';
    }
  });

  const [domains, setDomains] = useState<InstitutionalEmailDomain[]>([]);
  const [accounts, setAccounts] = useState<InstitutionalEmailAccount[]>([]);
  const [messages, setMessages] = useState<InstitutionalEmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');

  // Login form state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Change password modal
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const state = await loadInstitutionalEmailState(currentInstitution, {
        siteDomain: siteConfig.customDomain || currentInstitution.custom_domain,
        secretariatNames,
        contactEmail: siteConfig.contact?.email,
      });
      setDomains(state.domains);
      setAccounts(state.accounts);
      setMessages(state.messages);
    } finally {
      setLoading(false);
    }
  }, [
    currentInstitution,
    siteConfig.customDomain,
    siteConfig.contact?.email,
    secretariatNames,
  ]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const primaryDomain = useMemo(
    () => domains.find((d) => d.is_primary) || domains[0] || null,
    [domains]
  );

  const webmailEnabled = primaryDomain?.provider_config?.webmail_enabled !== false;
  const allowSelfPasswordChange =
    primaryDomain?.provider_config?.allow_self_password_change !== false;

  const loggedAccount = useMemo(
    () => accounts.find((a) => a.id === sessionAccountId && a.status === 'active') || null,
    [accounts, sessionAccountId]
  );

  const accountMessages = useMemo(() => {
    if (!loggedAccount) return [];
    return messages.filter(
      (m) => m.account_id === loggedAccount.id && m.folder === activeFolder
    );
  }, [messages, loggedAccount, activeFolder]);

  const unreadCountByFolder = useMemo(() => {
    const counts: Record<EmailFolder, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      archive: 0,
      trash: 0,
    };
    if (!loggedAccount) return counts;
    for (const m of messages) {
      if (m.account_id === loggedAccount.id && !m.is_read) {
        counts[m.folder] = (counts[m.folder] || 0) + 1;
      }
    }
    return counts;
  }, [messages, loggedAccount]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthenticating(true);
    try {
      const result = await authenticateWebmailAccount(
        currentInstitution,
        emailInput,
        passwordInput,
        {
          siteDomain: siteConfig.customDomain || currentInstitution.custom_domain,
          secretariatNames,
          contactEmail: siteConfig.contact?.email,
        }
      );

      if (!result.ok || !result.account) {
        setAuthError(result.error || 'Não foi possível autenticar.');
        return;
      }

      try {
        localStorage.setItem(
          `${WEBMAIL_SESSION_PREFIX}${currentInstitution.id}`,
          result.account.id
        );
      } catch {
        // ignore
      }
      setSessionAccountId(result.account.id);
      setPasswordInput('');
      await loadState();
      showToast(`Bem-vindo, ${result.account.display_name}!`, 'success');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(`${WEBMAIL_SESSION_PREFIX}${currentInstitution.id}`);
    } catch {
      // ignore
    }
    setSessionAccountId('');
    setActiveFolder('inbox');
  };

  const handleSendEmail = async (payload: SendEmailPayload) => {
    if (!loggedAccount) return;
    await sendInstitutionalEmail({
      institutionId: currentInstitution.id,
      senderAccount: loggedAccount,
      domain: primaryDomain,
      allAccounts: accounts,
      payload: { ...payload, accountId: loggedAccount.id },
    });
    await loadState();
    showToast(payload.isDraft ? 'Rascunho salvo.' : 'E-mail enviado com sucesso!', 'success');
  };

  const handleToggleFlag = async (
    messageId: string,
    patch: Partial<Pick<InstitutionalEmailMessage, 'is_read' | 'is_starred' | 'folder'>>
  ) => {
    await updateEmailMessageFlags(currentInstitution.id, messageId, patch);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
    );
  };

  const handleDeleteMessage = async (msg: InstitutionalEmailMessage) => {
    if (msg.folder !== 'trash') {
      await handleToggleFlag(msg.id, { folder: 'trash' });
      showToast('Mensagem movida para a lixeira.', 'info');
    } else {
      await deleteEmailMessagePermanently(currentInstitution.id, msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      showToast('Mensagem excluída permanentemente.', 'info');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedAccount) return;
    if (newPassword.length < 6) {
      showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await setEmailAccountPassword(currentInstitution.id, loggedAccount.id, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setChangePassOpen(false);
      showToast('Senha do Webmail atualizada com sucesso!', 'success');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen lg:h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col lg:overflow-hidden">
        {!webmailEnabled ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                Webmail Temporariamente Indisponível
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {primaryDomain?.provider_config?.maintenance_message ||
                  'O acesso externo ao Webmail Institucional foi pausado pela equipe de TI da Prefeitura. Tente novamente mais tarde.'}
              </p>
              <a
                href={withInstitutionQuery('/site', currentInstitution)}
                style={{ backgroundColor: accentHex }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold"
              >
                <ArrowLeft size={14} /> Voltar ao Site Institucional
              </a>
            </div>
          </div>
        ) : !loggedAccount ? (
          /* TELA DE LOGIN DEDICADA DO WEBMAIL */
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-md space-y-5">
              <div className="flex items-center justify-between">
                <a
                  href={withInstitutionQuery('/site', currentInstitution)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
                >
                  <ArrowLeft size={14} />
                  Voltar ao Site Institucional
                </a>
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="Alternar tema"
                >
                  {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    {currentInstitution.logo_url && !logoFailed ? (
                      <img
                        src={currentInstitution.logo_url}
                        alt={currentInstitution.name}
                        onError={() => setLogoFailed(true)}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <Mail size={28} style={{ color: accentHex }} />
                    )}
                  </div>

                  <div>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white mb-2"
                      style={{ backgroundColor: accentHex }}
                    >
                      <ShieldCheck size={11} /> Webmail Oficial
                    </span>
                    <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                      {currentInstitution.name}
                    </h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Acesse sua caixa postal institucional{' '}
                      <strong className="text-neutral-700 dark:text-neutral-200">
                        @{primaryDomain?.domain || 'municipio.gov.br'}
                      </strong>
                    </p>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      E-mail Institucional
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={`seunome@${primaryDomain?.domain || 'municipio.gov.br'}`}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authenticating || loading}
                    style={{ backgroundColor: accentHex }}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-95 transition cursor-pointer disabled:opacity-50"
                  >
                    {authenticating ? 'Autenticando...' : 'Entrar no Webmail'}
                  </button>
                </form>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                  Primeiro acesso ou esqueceu sua senha? Solicite ao setor de TI da Prefeitura no painel Gestão 360.
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* AMBIENTE WEBMAIL AUTENTICADO */
          <>
            <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    {currentInstitution.logo_url && !logoFailed ? (
                      <img
                        src={currentInstitution.logo_url}
                        alt={currentInstitution.name}
                        onError={() => setLogoFailed(true)}
                        className="w-7 h-7 object-contain"
                      />
                    ) : (
                      <Mail size={18} style={{ color: accentHex }} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-neutral-900 dark:text-white">
                        Webmail Institucional
                      </span>
                      <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {currentInstitution.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Conectado como <strong>{loggedAccount.email_address}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={withInstitutionQuery('/site', currentInstitution)}
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                  >
                    <Globe size={13} /> Site Oficial
                  </a>
                  <button
                    type="button"
                    onClick={loadState}
                    className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Atualizar caixa"
                  >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  </button>
                  {allowSelfPasswordChange && (
                    <button
                      type="button"
                      onClick={() => setChangePassOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound size={13} />
                      <span className="hidden sm:inline">Alterar Senha</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                    title="Alternar tema"
                  >
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={13} />
                    Sair
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 w-full p-2 sm:p-4 min-h-0 flex flex-col">
              <WebmailInbox
                institution={currentInstitution}
                accounts={[loggedAccount]}
                directoryAccounts={accounts}
                activeAccount={loggedAccount}
                onSelectAccount={() => {}}
                hideAccountSwitcher={true}
                fullHeight={true}
                activeFolder={activeFolder}
                onSelectFolder={setActiveFolder}
                messages={accountMessages}
                unreadCountByFolder={unreadCountByFolder}
                onSendEmail={handleSendEmail}
                onToggleFlag={handleToggleFlag}
                onDeleteMessage={handleDeleteMessage}
                accentHex={accentHex}
              />
            </main>
          </>
        )}

        {/* Modal Alterar Própria Senha */}
        {changePassOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleChangePassword}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                  Alterar Senha do Webmail
                </h4>
                <button
                  type="button"
                  onClick={() => setChangePassOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Nova Senha (mín. 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </div>
              <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangePassOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  style={{ backgroundColor: accentHex }}
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
