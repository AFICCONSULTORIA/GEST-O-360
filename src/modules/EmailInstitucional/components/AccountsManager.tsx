import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Mail,
  Building2,
  Copy,
  Edit2,
  Trash2,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  X,
  ArrowRightLeft,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  EmailAccountStatus,
  EmailAccountType,
  InstitutionalEmailAccount,
  InstitutionalEmailDomain,
} from '../types';
import { Institution } from '../../../types';
import { hashEmailPassword } from '../../../lib/api/institutionalEmail';
import { withInstitutionQuery } from '../../../lib/institutionModules';
import { showToast } from '../../../components/ui/Toast';

interface AccountsManagerProps {
  institution?: Institution | null;
  primaryDomain: InstitutionalEmailDomain | null;
  accounts: InstitutionalEmailAccount[];
  secretariatNames: string[];
  onUpsertAccount: (
    account: Omit<InstitutionalEmailAccount, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
    }
  ) => Promise<unknown>;
  onDeleteAccount: (id: string) => Promise<void>;
  onSyncSecretariats: () => Promise<number>;
  onOpenWebmailForAccount: (accountId: string) => void;
  accentHex: string;
}

export const AccountsManager: React.FC<AccountsManagerProps> = ({
  institution,
  primaryDomain,
  accounts,
  secretariatNames,
  onUpsertAccount,
  onDeleteAccount,
  onSyncSecretariats,
  onOpenWebmailForAccount,
  accentHex,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | EmailAccountType>('all');
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstitutionalEmailAccount | null>(null);

  const [localPart, setLocalPart] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountType, setAccountType] = useState<EmailAccountType>('mailbox');
  const [departmentName, setDepartmentName] = useState('');
  const [assignedUserName, setAssignedUserName] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [quotaMb, setQuotaMb] = useState(5120);
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const domainSuffix = primaryDomain?.domain || 'municipio.gov.br';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (filterType !== 'all' && acc.account_type !== filterType) return false;
      if (!q) return true;
      return (
        acc.email_address.toLowerCase().includes(q) ||
        acc.display_name.toLowerCase().includes(q) ||
        (acc.department_name || '').toLowerCase().includes(q) ||
        (acc.assigned_user_name || '').toLowerCase().includes(q)
      );
    });
  }, [accounts, search, filterType]);

  const openNew = () => {
    setEditing(null);
    setLocalPart('');
    setDisplayName('');
    setAccountType('mailbox');
    setDepartmentName(secretariatNames[0] || '');
    setAssignedUserName('');
    setForwardTo('');
    setQuotaMb(5120);
    setAccountPassword('');
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (acc: InstitutionalEmailAccount) => {
    setEditing(acc);
    setLocalPart(acc.email_address.split('@')[0] || '');
    setDisplayName(acc.display_name);
    setAccountType(acc.account_type);
    setDepartmentName(acc.department_name || '');
    setAssignedUserName(acc.assigned_user_name || '');
    setForwardTo(acc.forward_to || '');
    setQuotaMb(acc.quota_mb || 5120);
    setAccountPassword('');
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id || !localPart.trim() || !displayName.trim()) return;

    const sanitizedLocal = localPart
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');

    let passwordHash = editing?.password_hash || null;
    if (accountPassword.trim()) {
      passwordHash = await hashEmailPassword(accountPassword.trim());
    }

    await onUpsertAccount({
      id: editing?.id,
      institution_id: institution.id,
      domain_id: primaryDomain?.id || null,
      email_address: `${sanitizedLocal}@${domainSuffix}`,
      display_name: displayName.trim(),
      account_type: accountType,
      department_name: departmentName.trim() || null,
      assigned_user_name: assignedUserName.trim() || null,
      forward_to: accountType === 'alias' ? forwardTo.trim() || null : null,
      quota_mb: Number(quotaMb) || 5120,
      used_mb: editing?.used_mb || 0,
      signature_html:
        editing?.signature_html ||
        `<p><strong>${displayName.trim()}</strong><br/>${institution.name}</p>`,
      password_hash: passwordHash,
      last_login_at: editing?.last_login_at || null,
      status: editing?.status || 'active',
    });
    setModalOpen(false);
  };

  const handleToggleStatus = async (acc: InstitutionalEmailAccount) => {
    const nextStatus: EmailAccountStatus = acc.status === 'active' ? 'suspended' : 'active';
    await onUpsertAccount({
      ...acc,
      status: nextStatus,
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSyncSecretariats();
    } finally {
      setSyncing(false);
    }
  };

  const copyAddress = (email: string) => {
    navigator.clipboard?.writeText(email);
    showToast(`Endereço ${email} copiado!`, 'info');
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações e Filtros */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conta, secretaria ou servidor..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | EmailAccountType)}
            className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 outline-none"
          >
            <option value="all">Todos os tipos</option>
            <option value="secretariat">Caixas de Secretaria</option>
            <option value="mailbox">Contas de Servidores</option>
            <option value="alias">Aliases / Redirecionamentos</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            Sincronizar Secretarias do Site
          </button>

          <button
            type="button"
            onClick={openNew}
            style={{ backgroundColor: accentHex }}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition cursor-pointer"
          >
            <Plus size={14} />
            Nova Caixa Postal
          </button>
        </div>
      </div>

      {/* Tabela Responsiva */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                <th className="py-3.5 px-4">Endereço Institucional</th>
                <th className="py-3.5 px-4">Tipo & Lotação</th>
                <th className="py-3.5 px-4">Responsável / Destino</th>
                <th className="py-3.5 px-4">Cota</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    Nenhuma conta encontrada para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => {
                  const quotaPct = Math.min(100, Math.round((acc.used_mb / acc.quota_mb) * 100));
                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            {acc.account_type === 'alias' ? (
                              <ArrowRightLeft size={14} />
                            ) : acc.account_type === 'secretariat' ? (
                              <Building2 size={14} />
                            ) : (
                              <Mail size={14} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-900 dark:text-white truncate">
                                {acc.email_address}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyAddress(acc.email_address)}
                                title="Copiar e-mail"
                                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            <p className="text-[11px] text-neutral-500 truncate">
                              {acc.display_name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {acc.account_type === 'secretariat'
                            ? 'Secretaria'
                            : acc.account_type === 'alias'
                              ? 'Alias / Encaminhamento'
                              : 'Servidor'}
                        </span>
                        {acc.department_name && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {acc.department_name}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                        {acc.account_type === 'alias' && acc.forward_to ? (
                          <span className="text-[11px]">
                            Encaminha para: <strong>{acc.forward_to}</strong>
                          </span>
                        ) : acc.assigned_user_name ? (
                          <span>{acc.assigned_user_name}</span>
                        ) : (
                          <span className="text-neutral-400">Caixa compartilhada</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="w-28">
                          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                            <span>{acc.used_mb.toFixed(0)} MB</span>
                            <span>{(acc.quota_mb / 1024).toFixed(0)} GB</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(4, quotaPct)}%`,
                                backgroundColor: accentHex,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              acc.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            <ShieldCheck size={10} />
                            {acc.status === 'active' ? 'Ativa' : 'Suspensa'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                              acc.password_hash
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            <KeyRound size={10} />
                            {acc.password_hash ? 'Senha definida' : 'Sem senha'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenWebmailForAccount(acc.id)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-bold text-neutral-800 dark:text-neutral-100 transition cursor-pointer"
                          >
                            Abrir Webmail
                          </button>
                          <button
                            type="button"
                            title={acc.status === 'active' ? 'Suspender' : 'Reativar'}
                            onClick={() => handleToggleStatus(acc)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                          >
                            {acc.status === 'active' ? (
                              <PauseCircle size={14} />
                            ) : (
                              <PlayCircle size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => openEdit(acc)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            onClick={() => onDeleteAccount(acc.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Conta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                {editing ? 'Editar Conta Institucional' : 'Nova Caixa Postal Institucional'}
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                  Endereço de E-mail
                </label>
                <div className="flex items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 overflow-hidden">
                  <input
                    type="text"
                    required
                    disabled={Boolean(editing)}
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value)}
                    placeholder="ex: licitacoes"
                    className="flex-1 px-3 py-2 bg-transparent text-neutral-900 dark:text-white outline-none disabled:opacity-60"
                  />
                  <span className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300 font-bold">
                    @{domainSuffix}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Setor de Licitações"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Tipo de Conta
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as EmailAccountType)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                  >
                    <option value="secretariat">Caixa de Secretaria / Setor</option>
                    <option value="mailbox">Conta Individual de Servidor</option>
                    <option value="alias">Alias / Redirecionamento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Secretaria / Lotação
                  </label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Secretaria de Administração"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    {accountType === 'alias' ? 'Encaminhar para' : 'Servidor Responsável'}
                  </label>
                  {accountType === 'alias' ? (
                    <input
                      type="email"
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder={`gabinete@${domainSuffix}`}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={assignedUserName}
                      onChange={(e) => setAssignedUserName(e.target.value)}
                      placeholder="Nome do servidor"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                  Cota de Armazenamento (MB)
                </label>
                <input
                  type="number"
                  min={512}
                  step={512}
                  value={quotaMb}
                  onChange={(e) => setQuotaMb(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300">
                    {editing?.password_hash
                      ? 'Nova Senha de Acesso ao Webmail (opcional)'
                      : 'Senha de Acesso ao Webmail'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
                      let generated = '';
                      for (let i = 0; i < 10; i++) {
                        generated += chars[Math.floor(Math.random() * chars.length)];
                      }
                      setAccountPassword(generated);
                      setShowPassword(true);
                      const webmailUrl =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}${withInstitutionQuery('/webmail', institution)}`
                          : '/webmail';
                      const fullEmail = `${localPart.trim().toLowerCase() || 'conta'}@${domainSuffix}`;
                      navigator.clipboard?.writeText(
                        `Webmail: ${webmailUrl}\nE-mail: ${fullEmail}\nSenha: ${generated}`
                      );
                      showToast('Senha gerada e credenciais copiadas!', 'success');
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Gerar e Copiar Credenciais
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder={
                      editing?.password_hash
                        ? '•••••••• (opcional)'
                        : 'Defina a senha para login em /webmail'
                    }
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ backgroundColor: accentHex }}
                className="px-5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-95 transition cursor-pointer"
              >
                Salvar Conta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
