import React, { useEffect, useState } from 'react';
import { FileCheck2, Mail, MapPin, Phone, Send, ShieldCheck, UserCheck } from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import { fetchLgpdConfig, InstitutionalLgpdConfig } from '../../lib/api/pntpPortal';
import { showToast } from '../../components/ui/Toast';

export type LegalPageKind = 'privacidade' | 'termos' | 'dpo';

export interface LegalPageProps {
  kind: LegalPageKind;
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  kind,
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [config, setConfig] = useState<InstitutionalLgpdConfig | null>(null);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [requestType, setRequestType] = useState('Acesso e confirmação de dados');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLgpdConfig(institution.id).then((row) => {
      if (active) setConfig(row);
    });
    return () => {
      active = false;
    };
  }, [institution.id]);

  const titles: Record<LegalPageKind, { title: string; subtitle: string }> = {
    privacidade: {
      title: 'Política de Privacidade e Proteção de Dados (LGPD)',
      subtitle: `Tratamento de dados pessoais no Portal Oficial de ${institution.name} em conformidade com a Lei Federal nº 13.709/2018 (LGPD).`,
    },
    termos: {
      title: 'Termos de Uso do Portal Institucional',
      subtitle: `Condições gerais de acesso e utilização dos serviços digitais públicos de ${institution.name} (Lei nº 14.129/2021).`,
    },
    dpo: {
      title: 'Encarregado pelo Tratamento de Dados Pessoais (DPO)',
      subtitle: `Canal oficial de comunicação entre os titulares de dados, a Administração Municipal e a Autoridade Nacional de Proteção de Dados (ANPD), nos termos do Art. 41 da LGPD.`,
    },
  };

  const dpoName = config?.dpo_name || 'Controlador(a) Geral do Município (Encarregado Designado)';
  const dpoAct = config?.dpo_appointment_act || 'Portaria Municipal de Nomeação do Encarregado (DPO) — Art. 41 da LGPD';
  const dpoEmail = config?.dpo_email || 'dpo@municipio.gov.br';
  const dpoPhone = config?.dpo_phone || institution.contact_phone || '(00) 0000-0000';
  const dpoAddress = config?.dpo_address || 'Sede Administrativa Municipal';

  const handleDpoContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !message.trim()) return;
    setSent(true);
    setSenderName('');
    setSenderEmail('');
    setMessage('');
    showToast('Solicitação encaminhada ao Encarregado de Dados (DPO)!', 'success');
  };

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="legal"
      pageTitle={titles[kind].title}
      pageSubtitle={titles[kind].subtitle}
    >
      {kind === 'privacidade' && (
        <article className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">
          {config?.privacy_policy_html ? (
            <div dangerouslySetInnerHTML={{ __html: config.privacy_policy_html }} />
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={20} /> 1. Finalidade e Base Legal (Art. 7º e Art. 23 da LGPD)
              </h2>
              <p>
                {institution.name} realiza o tratamento de dados pessoais exclusivamente para o cumprimento de obrigações legais e regulatórias, execução de políticas públicas e prestação de serviços ao cidadão, observando os princípios da finalidade, adequação, necessidade, transparência e segurança.
              </p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                2. Transparência Ativa e Mascaramento de Dados
              </h2>
              <p>
                Em harmonização com a Lei de Acesso à Informação (Lei nº 12.527/2011) e a Matriz PNTP, as consultas públicas aplicam mascaramento automático de CPF (ex.: ***.456.789-**) e bloqueio de publicação de endereços residenciais, dados bancários pessoais e prontuários de saúde.
              </p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                3. Direitos do Titular (Art. 18 da LGPD)
              </h2>
              <p>
                O cidadão pode solicitar confirmação da existência de tratamento, acesso, correção de dados incompletos ou inexatos e informações sobre compartilhamento diretamente pelo canal do Encarregado (DPO).
              </p>
            </>
          )}
        </article>
      )}

      {kind === 'termos' && (
        <article className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">
          {config?.terms_of_use_html ? (
            <div dangerouslySetInnerHTML={{ __html: config.terms_of_use_html }} />
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 size={20} /> 1. Uso dos Serviços Digitais Públicos
              </h2>
              <p>
                Este portal é mantido por {institution.name} em estrita observância ao Art. 37, §1º da Constituição Federal (impessoalidade), à Lei do Governo Digital (Lei nº 14.129/2021) e às diretrizes de acessibilidade eMAG 3.1 / WCAG 2.1 AA.
              </p>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                2. Dados Abertos e Reutilização
              </h2>
              <p>
                Os conjuntos de dados disponibilizados no Portal da Transparência em formatos abertos (CSV, JSON, XML, XLSX/ODS) são de livre consulta e reutilização para controle social, pesquisa e jornalismo de dados, vedada a utilização para fins ilícitos ou descontextualizados.
              </p>
            </>
          )}
        </article>
      )}

      {kind === 'dpo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 text-xs">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={18} /> Identificação Oficial do Encarregado (DPO)
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 space-y-1.5">
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">{dpoName}</p>
              <p className="text-slate-600 dark:text-neutral-300 font-semibold">{dpoAct}</p>
            </div>

            <ul className="space-y-2.5 text-slate-700 dark:text-neutral-300">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-slate-500 shrink-0" />
                <span>{dpoEmail}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-slate-500 shrink-0" />
                <span>{dpoPhone}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-slate-500 shrink-0 mt-0.5" />
                <span>{dpoAddress}</span>
              </li>
            </ul>
          </section>

          <section className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 text-xs">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Formulário Direto de Contato com o DPO (Art. 18 da LGPD)
            </h2>
            {sent && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold">
                Manifestação registrada e encaminhada ao Encarregado pelo Tratamento de Dados Pessoais.
              </div>
            )}
            <form onSubmit={handleDpoContact} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dpo-name" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Seu Nome *
                  </label>
                  <input
                    id="dpo-name"
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="dpo-email" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Seu E-mail *
                  </label>
                  <input
                    id="dpo-email"
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="dpo-type" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Natureza da Solicitação
                </label>
                <select
                  id="dpo-type"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option>Acesso e confirmação de dados</option>
                  <option>Correção de dados incompletos ou inexatos</option>
                  <option>Anonimização / bloqueio / eliminação de dados excessivos</option>
                  <option>Dúvida sobre Política de Privacidade</option>
                </select>
              </div>
              <div>
                <label htmlFor="dpo-msg" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Mensagem *
                </label>
                <textarea
                  id="dpo-msg"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer"
              >
                <Send size={14} /> Enviar ao Encarregado (DPO)
              </button>
            </form>
          </section>
        </div>
      )}
    </PublicInstitutionalLayout>
  );
};

export default LegalPage;
