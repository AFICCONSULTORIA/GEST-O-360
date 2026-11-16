import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Save,
  HardDrive,
  Sliders,
} from 'lucide-react';
import { InstitutionalEmailAccount, InstitutionalEmailDomain } from '../types';
import { Institution } from '../../../types';
import { withInstitutionQuery } from '../../../lib/institutionModules';
import { showToast } from '../../../components/ui/Toast';

interface EnvironmentControlPanelProps {
  institution?: Institution | null;
  primaryDomain: InstitutionalEmailDomain | null;
  accounts: InstitutionalEmailAccount[];
  onSaveDomain: (domain: InstitutionalEmailDomain) => Promise<unknown>;
  onGoToAccounts: () => void;
  accentHex: string;
}

export const EnvironmentControlPanel: React.FC<EnvironmentControlPanelProps> = ({
  institution,
  primaryDomain,
  accounts,
  onSaveDomain,
  onGoToAccounts,
  accentHex,
}) => {
  const [draft, setDraft] = useState<InstitutionalEmailDomain | null>(primaryDomain);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(primaryDomain);
  }, [primaryDomain]);

  if (!draft) return null;

  const cfg = draft.provider_config || {};
  const webmailEnabled = cfg.webmail_enabled !== false;
  const allowSelfPasswordChange = cfg.allow_self_password_change !== false;
  const defaultQuotaMb = cfg.default_quota_mb || 5120;
  const requireOfficialSignature = cfg.require_official_signature !== false;

  const webmailPath = withInstitutionQuery('/webmail', institution);
  const fullWebmailUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${webmailPath}` : webmailPath;

  const accountsWithoutPassword = accounts.filter(
    (a) => a.status === 'active' && !a.password_hash
  );
  const suspendedAccounts = accounts.filter((a) => a.status === 'suspended');
  const recentLogins = accounts
    .filter((a) => a.last_login_at)
    .sort(
      (a, b) =>
        new Date(b.last_login_at || 0).getTime() - new Date(a.last_login_at || 0).getTime()
    )
    .slice(0, 6);

  const totalUsedMb = accounts.reduce((sum, a) => sum + (a.used_mb || 0), 0);
  const totalQuotaMb = accounts.reduce((sum, a) => sum + (a.quota_mb || 0), 0);

  const updateConfig = (patch: Partial<InstitutionalEmailDomain['provider_config']>) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            provider_config: {
              ...(prev.provider_config || {}),
              ...patch,
            },
          }
        : prev
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveDomain(draft);
    } finally {
      setSaving(false);
    }
  };

  const copyWebmailLink = () => {
    navigator.clipboard?.writeText(fullWebmailUrl);
    showToast('Link do Webmail copiado para enviar aos servidores!', 'success');
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Acesso & Link Oficial do Ambiente */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                webmailEnabled
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {webmailEnabled ? <Unlock size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                Controle de Acesso ao Ambiente Webmail (`/webmail`)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Controle se os servidores podem acessar o portal próprio de login com e-mail e senha.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateConfig({ webmail_enabled: !webmailEnabled })}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              webmailEnabled
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
            }`}
          >
            {webmailEnabled ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {webmailEnabled ? 'Portal Liberado' : 'Portal em Manutenção'}
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              URL de Acesso dos Servidores
            </p>
            <p className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-100 truncate mt-0.5">
              {fullWebmailUrl}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyWebmailLink}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={12} /> Copiar Link
            </button>
            <a
              href={webmailPath}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: accentHex }}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-95"
            >
              <ExternalLink size={12} /> Abrir
            </a>
          </div>
        </div>

        {!webmailEnabled && (
          <div className="text-xs">
            <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
              Mensagem exibida aos servidores durante a manutenção
            </label>
            <input
              type="text"
              value={cfg.maintenance_message || ''}
              onChange={(e) => updateConfig({ maintenance_message: e.target.value })}
              placeholder="Ex: Manutenção programada no servidor de e-mails até as 18h."
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none"
            />
          </div>
        )}
      </div>

      {/* Políticas de Segurança & Armazenamento */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-neutral-900 dark:text-white">
              Políticas do Ambiente Institucional
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Padronize cotas, troca de senha e assinatura oficial para todas as secretarias.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <label className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowSelfPasswordChange}
              onChange={(e) => updateConfig({ allow_self_password_change: e.target.checked })}
              className="mt-0.5 rounded accent-emerald-600"
            />
            <div>
              <span className="font-bold text-neutral-900 dark:text-white block">
                Permitir troca de senha pelo servidor
              </span>
              <span className="text-[11px] text-neutral-500">
                Exibe o botão &ldquo;Alterar Senha&rdquo; dentro do portal `/webmail`.
              </span>
            </div>
          </label>

          <label className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireOfficialSignature}
              onChange={(e) => updateConfig({ require_official_signature: e.target.checked })}
              className="mt-0.5 rounded accent-emerald-600"
            />
            <div>
              <span className="font-bold text-neutral-900 dark:text-white block">
                Assinatura institucional padrão
              </span>
              <span className="text-[11px] text-neutral-500">
                Anexa automaticamente nome, prefeitura e e-mail ao escrever mensagens.
              </span>
            </div>
          </label>

          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
            <label className="font-bold text-neutral-900 dark:text-white block mb-1">
              Cota padrão para novas caixas
            </label>
            <select
              value={defaultQuotaMb}
              onChange={(e) => updateConfig({ default_quota_mb: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold outline-none"
            >
              <option value={1024}>1 GB por conta</option>
              <option value={5120}>5 GB por conta (Recomendado)</option>
              <option value={10240}>10 GB por conta</option>
              <option value={20480}>20 GB por conta</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            style={{ backgroundColor: accentHex }}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-95 transition cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar Políticas do Ambiente'}
          </button>
        </div>
      </div>

      {/* Auditoria & Saúde das Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <KeyRound size={14} className="text-amber-500" />
              Pendências de Acesso ({accountsWithoutPassword.length})
            </h4>
            <button
              type="button"
              onClick={onGoToAccounts}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Gerenciar Contas →
            </button>
          </div>

          {accountsWithoutPassword.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck size={16} />
              Todas as caixas ativas já possuem senha configurada para o Webmail.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {accountsWithoutPassword.map((acc) => (
                <div
                  key={acc.id}
                  className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-neutral-900 dark:text-white truncate">
                      {acc.email_address}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">{acc.display_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToAccounts}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Definir Senha
                  </button>
                </div>
              ))}
            </div>
          )}

          {suspendedAccounts.length > 0 && (
            <p className="text-[11px] text-neutral-500 pt-1">
              Contas suspensas no momento: <strong>{suspendedAccounts.length}</strong>
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Clock size={14} className="text-sky-500" />
              Últimos Acessos ao Webmail
            </h4>
            <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1">
              <HardDrive size={12} />
              {totalUsedMb.toFixed(1)} MB / {(totalQuotaMb / 1024).toFixed(0)} GB usados
            </span>
          </div>

          {recentLogins.length === 0 ? (
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 text-xs">
              Nenhum servidor acessou o portal `/webmail` ainda. Defina uma senha na aba Contas & Secretarias e envie o link acima.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentLogins.map((acc) => (
                <div
                  key={acc.id}
                  className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-bold text-neutral-800 dark:text-neutral-100 truncate">
                    {acc.email_address}
                  </span>
                  <span className="text-[11px] text-neutral-500 shrink-0">
                    {acc.last_login_at
                      ? new Date(acc.last_login_at).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
