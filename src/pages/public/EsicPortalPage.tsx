import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  Search,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import { supabase } from '../../lib/supabase';
import { EsicAppealItem, EsicRequestItem } from '../../lib/api/pntpPortal';
import { showToast } from '../../components/ui/Toast';

export interface EsicPortalPageProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

function computeDaysRemaining(dueIso: string, extendedIso?: string | null): number {
  const target = new Date(extendedIso || dueIso).getTime();
  const diff = target - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const EsicPortalPage: React.FC<EsicPortalPageProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterDocument, setRequesterDocument] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdProtocol, setCreatedProtocol] = useState<string | null>(null);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [trackedRequest, setTrackedRequest] = useState<EsicRequestItem | null>(null);
  const [trackedAppeals, setTrackedAppeals] = useState<EsicAppealItem[]>([]);

  const [appealLevel, setAppealLevel] = useState<1 | 2 | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [sendingAppeal, setSendingAppeal] = useState(false);

  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState({
    total: 0,
    respondido: 0,
    em_analise: 0,
    prorrogado: 0,
    indeferido: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await supabase.rpc('get_esic_annual_stats', {
          p_institution_id: institution.id,
          p_year: currentYear,
        });
        if (data) {
          setStats({
            total: Number(data.total || 0),
            respondido: Number(data.respondido || 0),
            em_analise: Number(data.em_analise || 0),
            prorrogado: Number(data.prorrogado || 0),
            indeferido: Number(data.indeferido || 0),
          });
        }
      } catch {
        // Mantém zerado se RPC ainda não foi migrada
      }
    };
    loadStats();
  }, [institution.id, currentYear, createdProtocol]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !subject.trim() || !description.trim()) {
      showToast('Preencha nome, assunto e descrição do pedido.', 'warning');
      return;
    }

    setSubmitting(true);
    const protocol = `ESIC-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`;
    const due = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('esic_requests').insert({
      institution_id: institution.id,
      protocol_number: protocol,
      requester_name: requesterName.trim(),
      requester_email: requesterEmail.trim() || null,
      requester_document: requesterDocument.trim() || null,
      subject: subject.trim(),
      description: description.trim(),
      status: 'aberto',
      due_date: due,
    });

    setSubmitting(false);

    if (error) {
      showToast('Erro ao registrar pedido no e-SIC. Tente novamente.', 'error');
      return;
    }

    setCreatedProtocol(protocol);
    setLookupCode(protocol);
    setRequesterName('');
    setRequesterEmail('');
    setRequesterDocument('');
    setSubject('');
    setDescription('');
    showToast(`Pedido registrado com sucesso! Protocolo: ${protocol}`, 'success');
  };

  const handleLookupProtocol = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = lookupCode.trim();
    if (!code) return;
    setLookupLoading(true);
    setTrackedRequest(null);
    setTrackedAppeals([]);

    const { data, error } = await supabase.rpc('lookup_esic_protocol', {
      p_institution_id: institution.id,
      p_protocol_number: code,
    });

    setLookupLoading(false);

    if (error || !data || !data.request) {
      showToast('Protocolo não encontrado nesta instituição.', 'warning');
      return;
    }

    setTrackedRequest(data.request as EsicRequestItem);
    setTrackedAppeals((data.appeals || []) as EsicAppealItem[]);
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackedRequest || !appealLevel || !appealReason.trim()) return;
    setSendingAppeal(true);
    const { error } = await supabase.from('esic_appeals').insert({
      institution_id: institution.id,
      request_id: trackedRequest.id,
      instance_level: appealLevel,
      reason: appealReason.trim(),
      status: 'aberto',
    });
    setSendingAppeal(false);
    if (error) {
      showToast('Não foi possível protocolar o recurso.', 'error');
      return;
    }
    showToast(`Recurso em ${appealLevel}ª Instância protocolado!`, 'success');
    setAppealLevel(null);
    setAppealReason('');
    handleLookupProtocol();
  };

  const daysRemaining = trackedRequest
    ? computeDaysRemaining(trackedRequest.due_date, trackedRequest.extended_due_date)
    : 20;

  const canAppeal =
    trackedRequest &&
    (trackedRequest.status === 'indeferido' || daysRemaining < 0);

  const chartData = [
    { name: 'Respondidos', quantidade: stats.respondido },
    { name: 'Em Análise', quantidade: stats.em_analise },
    { name: 'Prorrogados', quantidade: stats.prorrogado },
    { name: 'Indeferidos', quantidade: stats.indeferido },
  ];

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="esic"
      pageTitle="e-SIC — Serviço de Informação ao Cidadão"
      pageSubtitle="Solicite informações públicas sem necessidade de justificativa (Art. 10, §8º da Lei nº 12.527/2011 — LAI). Prazo legal de resposta: 20 dias corridos, prorrogáveis por mais 10 dias mediante justificativa."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Novo Pedido + Acompanhamento com Recursos */}
        <div className="lg:col-span-2 space-y-6">
          {createdProtocol && (
            <div
              role="status"
              className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 flex items-start gap-3"
            >
              <CheckCircle2 size={22} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-extrabold text-emerald-950 dark:text-emerald-200 text-sm">
                  Pedido de Informação Protocolado: <span className="font-mono">{createdProtocol}</span>
                </p>
                <p className="text-emerald-900 dark:text-emerald-300">
                  Guarde este número para acompanhar a tramitação, o contador de prazo legal (20 dias + 10 prorrogáveis) e eventual interposição de recurso.
                </p>
              </div>
            </div>
          )}

          {/* Formulário de Novo Pedido e-SIC */}
          <section
            aria-label="Formulário de pedido de acesso à informação"
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Solicitar Informação Pública (LAI)
            </h2>
            <p className="text-xs text-slate-600 dark:text-neutral-400">
              Nos termos da Lei nº 12.527/2011, é vedada qualquer exigência de motivos ou justificativas determinantes para a solicitação.
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="esic-name" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="esic-name"
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="esic-email" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    E-mail para resposta (opcional)
                  </label>
                  <input
                    id="esic-email"
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="cidadao@email.com"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="esic-doc" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    CPF / Documento (opcional)
                  </label>
                  <input
                    id="esic-doc"
                    type="text"
                    value={requesterDocument}
                    onChange={(e) => setRequesterDocument(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="esic-subject" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Assunto / Órgão de Destino *
                  </label>
                  <input
                    id="esic-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex.: Contrato de manutenção escolar 2026"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="esic-desc" className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Especificação da Informação Solicitada *
                </label>
                <textarea
                  id="esic-desc"
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva de forma clara e específica a informação pública desejada..."
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} />
                {submitting ? 'Protocolando...' : 'Protocolar Pedido no e-SIC'}
              </button>
            </form>
          </section>

          {/* Acompanhamento por Protocolo e Fluxo Recursal */}
          <section
            aria-label="Acompanhamento de protocolo e-SIC"
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Acompanhar Protocolo e Recursos
            </h2>
            <form onSubmit={handleLookupProtocol} className="flex flex-col sm:flex-row gap-2 text-xs">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Digite o protocolo (ex.: ESIC-2026-123456)"
                aria-label="Número do protocolo e-SIC"
                className="flex-1 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2.5 font-mono text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer"
              >
                <Search size={14} />
                {lookupLoading ? 'Buscando...' : 'Consultar'}
              </button>
            </form>

            {trackedRequest && (
              <div className="border border-slate-200 dark:border-neutral-700 rounded-2xl p-5 space-y-4 bg-slate-50 dark:bg-neutral-800/40 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                      {trackedRequest.protocol_number}
                    </span>
                    <span className="ml-2 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-700 font-bold uppercase text-[10px]">
                      {trackedRequest.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Contador Regressivo Visual do Prazo Legal (20 dias + 10 prorrogáveis) */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${
                      daysRemaining < 0
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        : 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300'
                    }`}
                  >
                    <Clock size={13} />
                    {trackedRequest.status === 'respondido'
                      ? 'Atendido dentro do prazo legal'
                      : daysRemaining >= 0
                      ? `Prazo legal restante: ${daysRemaining} dias (20d + 10d prorrogáveis)`
                      : `Prazo vencido há ${Math.abs(daysRemaining)} dia(s)`}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{trackedRequest.subject}</p>
                  <p className="text-slate-600 dark:text-neutral-300 mt-1">{trackedRequest.description}</p>
                </div>

                {trackedRequest.extension_justification && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="font-bold text-amber-900 dark:text-amber-300">Prorrogação (+10 dias):</p>
                    <p className="text-amber-800 dark:text-amber-400">{trackedRequest.extension_justification}</p>
                  </div>
                )}

                {trackedRequest.response_text && (
                  <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
                    <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                      <FileCheck2 size={14} className="text-emerald-600" /> Resposta Oficial:
                    </p>
                    <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-line">
                      {trackedRequest.response_text}
                    </p>
                  </div>
                )}

                {/* Botões nativos de Recurso em 1ª e 2ª Instância */}
                <div className="pt-2 border-t border-slate-200 dark:border-neutral-700 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!canAppeal}
                    onClick={() => setAppealLevel(1)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-bold text-slate-800 dark:text-white disabled:opacity-40 cursor-pointer"
                  >
                    <ShieldAlert size={13} />
                    Interpor Recurso em 1ª Instância
                  </button>
                  <button
                    type="button"
                    disabled={!canAppeal && !trackedAppeals.some((a) => a.instance_level === 1)}
                    onClick={() => setAppealLevel(2)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-bold text-slate-800 dark:text-white disabled:opacity-40 cursor-pointer"
                  >
                    <AlertTriangle size={13} />
                    Interpor Recurso em 2ª Instância
                  </button>
                  {!canAppeal && (
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Recursos habilitados em caso de indeferimento ou expiração do prazo legal.
                    </span>
                  )}
                </div>

                {appealLevel && (
                  <form onSubmit={handleSubmitAppeal} className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 space-y-3">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Interpor Recurso — {appealLevel}ª Instância (Art. 15 da LAI)
                    </p>
                    <textarea
                      required
                      rows={3}
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Fundamente as razões do recurso..."
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 p-2.5 text-slate-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={sendingAppeal}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer"
                      >
                        {sendingAppeal ? 'Enviando...' : 'Enviar Recurso'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppealLevel(null)}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {trackedAppeals.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-800 dark:text-neutral-200">Histórico de Recursos:</p>
                    {trackedAppeals.map((ap) => (
                      <div key={ap.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
                        <p className="font-bold">
                          {ap.instance_level}ª Instância — <span className="uppercase">{ap.status}</span>
                        </p>
                        <p className="text-slate-600 dark:text-neutral-400 mt-0.5">{ap.reason}</p>
                        {ap.decision_text && (
                          <p className="mt-1 text-slate-900 dark:text-white font-semibold">Decisão: {ap.decision_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Coluna Lateral: SIC Físico + Painel Estatístico Anual */}
        <aside className="space-y-6">
          <section
            aria-label="Informações do SIC Físico"
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3 text-xs"
          >
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={16} />
              SIC Físico — Atendimento Presencial
            </h2>
            <p className="text-slate-600 dark:text-neutral-400">
              Caso prefira protocolar presencialmente ou obter auxílio na formulação do pedido:
            </p>
            <ul className="space-y-2 text-slate-700 dark:text-neutral-300">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="shrink-0 mt-0.5 text-slate-500" />
                <span>Sede da Prefeitura Municipal — Protocolo Geral / Controladoria</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-slate-500" />
                <span>{institution.contact_phone || '(00) 0000-0000'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="shrink-0 text-slate-500" />
                <span>esic@municipio.gov.br</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="shrink-0 text-slate-500" />
                <span>Segunda a Sexta-feira, das 08h00 às 17h00</span>
              </li>
            </ul>
          </section>

          <section
            aria-label="Painel Estatístico Anual do e-SIC"
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 text-xs"
          >
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Relatório Estatístico Anual ({currentYear})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800">
                <span className="text-[11px] text-slate-500 block">Recebidos</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800">
                <span className="text-[11px] text-slate-500 block">Atendidos</span>
                <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{stats.respondido}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800">
                <span className="text-[11px] text-slate-500 block">Prorrogados</span>
                <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{stats.prorrogado}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800">
                <span className="text-[11px] text-slate-500 block">Indeferidos</span>
                <span className="text-lg font-extrabold text-red-700 dark:text-red-400">{stats.indeferido}</span>
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </aside>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default EsicPortalPage;
