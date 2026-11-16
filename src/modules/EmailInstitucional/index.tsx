import React, { useState } from 'react';
import {
  Mail,
  Inbox,
  Users,
  Globe,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import { AdminUser, Institution } from '../../types';
import { withInstitutionQuery } from '../../lib/institutionModules';
import { useInstitutionalEmail } from './hooks/useInstitutionalEmail';
import { WebmailInbox } from './components/WebmailInbox';
import { AccountsManager } from './components/AccountsManager';
import { DomainDnsConfig } from './components/DomainDnsConfig';
import { EnvironmentControlPanel } from './components/EnvironmentControlPanel';

interface EmailInstitucionalModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
}

type EmailAdminTab = 'webmail' | 'accounts' | 'control' | 'domain';

export const EmailInstitucionalModule: React.FC<EmailInstitucionalModuleProps> = ({
  currentUser,
  currentInstitution,
}) => {
  const [activeTab, setActiveTab] = useState<EmailAdminTab>('webmail');
  const {
    loading,
    dataSource,
    siteConfig,
    accentHex,
    secretariatNames,
    primaryDomain,
    accounts,
    activeAccount,
    setSelectedAccountId,
    activeFolder,
    setActiveFolder,
    accountMessages,
    unreadCountByFolder,
    reload,
    handleSaveDomain,
    handleUpsertAccount,
    handleDeleteAccount,
    handleSyncWithSiteSecretariats,
    handleSendEmail,
    handleToggleFlag,
    handleDeleteMessage,
  } = useInstitutionalEmail(currentInstitution, currentUser);

  const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;
  const dnsVerifiedCount = primaryDomain
    ? [
        primaryDomain.mx_verified,
        primaryDomain.spf_verified,
        primaryDomain.dkim_verified,
        primaryDomain.dmarc_verified,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header do Módulo */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: accentHex }}
            >
              <Mail size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                  E-mail Institucional & Webmail
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Integrado ao Site Institucional
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  {dataSource === 'supabase' ? 'Supabase Ativo' : 'Modo Local / MVP'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Gerencie caixas <strong className="text-neutral-700 dark:text-neutral-200">@{primaryDomain?.domain || 'municipio.gov.br'}</strong> por secretaria, opere o Webmail interno e configure DNS/conectores para {currentInstitution?.name || 'o Município'}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href={withInstitutionQuery('/webmail', currentInstitution)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: accentHex }}
              className="px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition"
            >
              <ExternalLink size={13} />
              Abrir Ambiente Webmail
            </a>
            <button
              type="button"
              onClick={reload}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Domínio Oficial
            </p>
            <p className="text-sm font-black text-neutral-900 dark:text-white mt-1 truncate">
              @{primaryDomain?.domain || '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Caixas Ativas
            </p>
            <p className="text-sm font-black text-neutral-900 dark:text-white mt-1">
              {activeAccountsCount} de {accounts.length} contas
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Não Lidas (Caixa Ativa)
            </p>
            <p className="text-sm font-black text-neutral-900 dark:text-white mt-1">
              {unreadCountByFolder.inbox} mensagens
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Conformidade DNS
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {dnsVerifiedCount === 4 ? (
                <CheckCircle2 size={15} className="text-emerald-500" />
              ) : (
                <AlertCircle size={15} className="text-amber-500" />
              )}
              <span className="text-sm font-black text-neutral-900 dark:text-white">
                {dnsVerifiedCount}/4 registros
              </span>
            </div>
          </div>
        </div>

        {/* Navegação em Abas */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('webmail')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'webmail'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Inbox size={14} />
            Webmail Integrado
            {unreadCountByFolder.inbox > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white">
                {unreadCountByFolder.inbox}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'accounts'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Users size={14} />
            Contas & Secretarias ({accounts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'control'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Sliders size={14} />
            Controle do Ambiente
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'domain'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Globe size={14} />
            Domínio, DNS & Provedor
            {primaryDomain?.provider_type !== 'simulated' && (
              <ShieldCheck size={13} className="text-emerald-500" />
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {loading ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-10 flex flex-col items-center justify-center gap-3">
          <Sparkles size={24} className="animate-pulse text-emerald-500" />
          <p className="text-xs font-bold text-neutral-500">
            Carregando caixas postais e integração com o Site Institucional...
          </p>
        </div>
      ) : (
        <>
          {activeTab === 'webmail' && (
            <WebmailInbox
              institution={currentInstitution}
              accounts={accounts}
              activeAccount={activeAccount}
              onSelectAccount={setSelectedAccountId}
              activeFolder={activeFolder}
              onSelectFolder={setActiveFolder}
              messages={accountMessages}
              unreadCountByFolder={unreadCountByFolder}
              onSendEmail={handleSendEmail}
              onToggleFlag={handleToggleFlag}
              onDeleteMessage={handleDeleteMessage}
              accentHex={accentHex}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsManager
              institution={currentInstitution}
              primaryDomain={primaryDomain}
              accounts={accounts}
              secretariatNames={secretariatNames}
              onUpsertAccount={handleUpsertAccount}
              onDeleteAccount={handleDeleteAccount}
              onSyncSecretariats={handleSyncWithSiteSecretariats}
              onOpenWebmailForAccount={(accId) => {
                setSelectedAccountId(accId);
                setActiveTab('webmail');
              }}
              accentHex={accentHex}
            />
          )}

          {activeTab === 'control' && (
            <EnvironmentControlPanel
              institution={currentInstitution}
              primaryDomain={primaryDomain}
              accounts={accounts}
              onSaveDomain={handleSaveDomain}
              onGoToAccounts={() => setActiveTab('accounts')}
              accentHex={accentHex}
            />
          )}

          {activeTab === 'domain' && (
            <DomainDnsConfig
              primaryDomain={primaryDomain}
              siteCustomDomain={siteConfig.customDomain || currentInstitution?.custom_domain}
              onSaveDomain={handleSaveDomain}
              accentHex={accentHex}
            />
          )}
        </>
      )}
    </div>
  );
};
