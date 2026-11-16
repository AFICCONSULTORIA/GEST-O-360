import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Server,
  Save,
  Link2,
} from 'lucide-react';
import {
  EmailProviderType,
  InstitutionalEmailDomain,
} from '../types';
import { getDnsRecordsForDomain } from '../../../lib/api/institutionalEmail';
import { showToast } from '../../../components/ui/Toast';

interface DomainDnsConfigProps {
  primaryDomain: InstitutionalEmailDomain | null;
  siteCustomDomain?: string;
  onSaveDomain: (domain: InstitutionalEmailDomain) => Promise<unknown>;
  accentHex: string;
}

export const DomainDnsConfig: React.FC<DomainDnsConfigProps> = ({
  primaryDomain,
  siteCustomDomain,
  onSaveDomain,
  accentHex,
}) => {
  const [draft, setDraft] = useState<InstitutionalEmailDomain | null>(primaryDomain);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(primaryDomain);
  }, [primaryDomain]);

  if (!draft) return null;

  const dnsRecords = getDnsRecordsForDomain(draft);

  const copyText = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    showToast(`${label} copiado para a área de transferência.`, 'info');
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

  const importSiteDomain = () => {
    if (!siteCustomDomain) {
      showToast('Nenhum domínio próprio configurado ainda no Site Institucional.', 'info');
      return;
    }
    const clean = siteCustomDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
    setDraft((prev) => (prev ? { ...prev, domain: clean } : prev));
    showToast(`Domínio ${clean} importado do Site Institucional.`, 'success');
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Domínio Integrado ao Site Institucional */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                Domínio Oficial da Prefeitura
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sincronizado com o módulo Site Institucional para manter o mesmo endereço `.gov.br`.
              </p>
            </div>
          </div>

          {siteCustomDomain && (
            <button
              type="button"
              onClick={importSiteDomain}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Link2 size={13} />
              Importar do Site ({siteCustomDomain})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
              Domínio de E-mail
            </label>
            <input
              type="text"
              value={draft.domain}
              onChange={(e) => setDraft({ ...draft, domain: e.target.value.trim().toLowerCase() })}
              placeholder="ex: torixoreu.mt.gov.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
              Provedor de Envio & Recebimento
            </label>
            <select
              value={draft.provider_type}
              onChange={(e) =>
                setDraft({ ...draft, provider_type: e.target.value as EmailProviderType })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold outline-none"
            >
              <option value="simulated">MVP Integrado (Rede Interna + Simulação Local)</option>
              <option value="resend">Resend API (via Supabase Edge Function)</option>
              <option value="supabase_edge">Supabase Edge Function Customizada</option>
              <option value="smtp_imap">Servidor Próprio SMTP / IMAP (Bridge Webhook)</option>
            </select>
          </div>
        </div>

        {/* Configurações específicas do conector */}
        {draft.provider_type !== 'simulated' && (
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {(draft.provider_type === 'resend' || draft.provider_type === 'supabase_edge') && (
              <>
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Nome da Edge Function no Supabase
                  </label>
                  <input
                    type="text"
                    value={draft.provider_config.edge_function_name || 'institutional-email-send'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        provider_config: {
                          ...draft.provider_config,
                          edge_function_name: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Identificação da Chave (Secret no Supabase)
                  </label>
                  <input
                    type="text"
                    value={draft.provider_config.resend_api_key_hint || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        provider_config: {
                          ...draft.provider_config,
                          resend_api_key_hint: e.target.value,
                        },
                      })
                    }
                    placeholder="RESEND_API_KEY configurada nos Secrets"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </>
            )}

            {draft.provider_type === 'smtp_imap' && (
              <>
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Servidor SMTP / Host
                  </label>
                  <input
                    type="text"
                    value={draft.provider_config.smtp_host || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        provider_config: {
                          ...draft.provider_config,
                          smtp_host: e.target.value,
                        },
                      })
                    }
                    placeholder={`mail.${draft.domain}`}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    Endpoint Bridge (Webhook de Envio)
                  </label>
                  <input
                    type="url"
                    value={draft.provider_config.webhook_url || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        provider_config: {
                          ...draft.provider_config,
                          webhook_url: e.target.value,
                        },
                      })
                    }
                    placeholder="https://api.prefeitura.gov.br/mail/send"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Checklist DNS (MX, SPF, DKIM, DMARC) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Server size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-neutral-900 dark:text-white">
              Registros DNS Obrigatórios (Registro.br / Cloudflare)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Publique estes registros na zona DNS do domínio <strong>{draft.domain}</strong> para liberar envios externos sem cair em spam.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {dnsRecords.map((rec) => (
            <div
              key={rec.type}
              className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-black">
                    {rec.type}
                  </span>
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Host: <code className="text-emerald-600 dark:text-emerald-400">{rec.host}</code>
                  </span>
                  {rec.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} /> Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={12} /> Pendente no DNS
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{rec.purpose}</p>
                <div className="font-mono text-[11px] bg-white dark:bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 break-all">
                  {rec.value}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyText(rec.value, rec.type)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy size={12} /> Copiar
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, [rec.key]: !rec.verified })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    rec.verified
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <ShieldCheck size={12} />
                  {rec.verified ? 'Validado' : 'Marcar Validado'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            style={{ backgroundColor: accentHex }}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-95 transition cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar Configurações de Domínio'}
          </button>
        </div>
      </div>
    </form>
  );
};
