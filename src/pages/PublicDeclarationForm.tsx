import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  AlertCircle,
  Moon,
  Sun,
  Star,
  MessageSquare,
  Sunrise,
  Sunset
} from 'lucide-react';
import { Institution } from '../types';
import { supabase } from '../lib/supabase';
import { formatCPF, validateCPF } from '../lib/masks';
import {
  CertificateTemplate,
  DeclarationCampaign,
  DeclarationSubmission,
  IssuedCertificate,
  getActivityTypeLabel
} from '../modules/Education/types/certificates';
import {
  fetchDeclarationCampaignBySlug,
  lookupSubmissionByCpf,
  submitAfternoonAndIssue,
  submitMorningCheckin
} from '../modules/Education/services/certificateService';
import {
  CertificateDocumentPDF,
  downloadCertificatePdf
} from '../modules/Education/components/CertificateDocumentPDF';

interface PublicDeclarationFormProps {
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  currentInstitution?: Institution | null;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Ruim',
  2: 'Regular',
  3: 'Bom',
  4: 'Muito Bom',
  5: 'Excelente'
};

function formatDatePtBr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const PublicDeclarationForm: React.FC<PublicDeclarationFormProps> = ({
  darkMode = false,
  setDarkMode,
  currentInstitution
}) => {
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [campaign, setCampaign] = useState<DeclarationCampaign | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(currentInstitution || null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [stage, setStage] = useState<'manha' | 'tarde'>('manha');

  // Campos do formulário
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [morningFoundNotice, setMorningFoundNotice] = useState<string | null>(null);
  const [lookingUpCpf, setLookingUpCpf] = useState(false);

  // Estado de envio
  const [submitting, setSubmitting] = useState(false);

  // Resultado Etapa 1 (Manhã)
  const [morningSuccess, setMorningSuccess] = useState<{
    submission: DeclarationSubmission;
    alreadyCheckedIn?: boolean;
  } | null>(null);

  // Resultado Etapa 2 (Tarde - Declaração Emitida)
  const [issuedResult, setIssuedResult] = useState<{
    declaration: IssuedCertificate;
    template: CertificateTemplate;
    alreadyIssued?: boolean;
  } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const pdfRenderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCampaign = async () => {
      setLoadingCampaign(true);
      setCampaignError(null);

      try {
        const params = new URLSearchParams(window.location.search);
        let slug = params.get('evento') || params.get('slug') || params.get('c') || '';
        const etapaParam = (params.get('etapa') || params.get('periodo') || '').toLowerCase();

        const parts = window.location.pathname.split('/').filter(Boolean);
        const declIndex = parts.findIndex(
          (p) => p.toLowerCase() === 'declaracao' || p.toLowerCase() === 'declaracao-participacao'
        );

        if (!slug && declIndex >= 0 && parts[declIndex + 1]) {
          slug = parts[declIndex + 1];
        }

        const lastSeg = (parts[parts.length - 1] || '').toLowerCase();
        if (
          etapaParam === 'tarde' ||
          etapaParam === 'vespertino' ||
          lastSeg === 'tarde' ||
          lastSeg === 'vespertino'
        ) {
          setStage('tarde');
        } else {
          setStage('manha');
        }

        if (!slug) {
          setCampaignError('Link inválido. Escaneie novamente o QR Code do evento.');
          setLoadingCampaign(false);
          return;
        }

        const found = await fetchDeclarationCampaignBySlug(slug);
        if (!found) {
          setCampaignError('Evento ou formulário não encontrado.');
          setLoadingCampaign(false);
          return;
        }

        setCampaign(found);

        if (!currentInstitution || currentInstitution.id !== found.institution_id) {
          const { data: instData } = await supabase
            .from('institutions')
            .select('*')
            .eq('id', found.institution_id)
            .maybeSingle();
          if (instData) {
            setInstitution(instData as Institution);
          }
        }
      } catch (err) {
        console.error('[PublicDeclarationForm] Erro ao carregar campanha:', err);
        setCampaignError('Não foi possível carregar as informações do evento.');
      } finally {
        setLoadingCampaign(false);
      }
    };

    loadCampaign();
  }, [currentInstitution]);

  // Detecta automaticamente a etapa pelo CPF (1 único QR Code para Manhã e Tarde!)
  const handleCpfChange = async (rawValue: string) => {
    const formatted = formatCPF(rawValue);
    setCpf(formatted);
    setMorningFoundNotice(null);
    setFormError(null);

    if (campaign && validateCPF(formatted)) {
      setLookingUpCpf(true);
      try {
        const existing = await lookupSubmissionByCpf(campaign.id, formatted);
        if (existing && existing.morning_checkin_at) {
          // Participante já confirmou presença na 1ª etapa -> avança automaticamente para a 2ª etapa (Avaliação + Emissão)
          setStage('tarde');
          if (!name.trim()) setName(existing.participant_name);
          if (!email.trim()) setEmail(existing.participant_email);
          setMorningFoundNotice(
            existing.emission_status === 'emitido'
              ? 'Sua declaração já foi emitida! Confirme abaixo para baixar o PDF novamente.'
              : 'Presença no matutino confirmada! Avalie o evento abaixo para emitir sua Declaração de Participação.'
          );
        } else {
          // Se não veio explicitamente com ?etapa=tarde ou vespertino, mantém na 1ª etapa (Matutino)
          const params = new URLSearchParams(window.location.search);
          const et = params.get('etapa')?.toLowerCase();
          if (et !== 'tarde' && et !== 'vespertino') {
            setStage('manha');
          }
        }
      } finally {
        setLookingUpCpf(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setFormError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 3) {
      setFormError('Por favor, informe seu nome completo.');
      return;
    }

    if (!validateCPF(cpf)) {
      setFormError('CPF inválido. Verifique os 11 dígitos e tente novamente.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setSubmitting(true);

    try {
      if (stage === 'manha') {
        const res = await submitMorningCheckin({
          campaign,
          name: cleanName,
          cpf,
          email: cleanEmail
        });

        if (!res.success || !res.submission) {
          setFormError(res.error || 'Não foi possível confirmar sua presença.');
          return;
        }

        setMorningSuccess({
          submission: res.submission,
          alreadyCheckedIn: res.alreadyCheckedIn
        });
        return;
      }

      // ETAPA 2: TARDE (Confirmação + Avaliação + Emissão da Declaração)
      if (rating < 1 || rating > 5) {
        setFormError('Por favor, selecione uma nota de 1 a 5 estrelas para o evento.');
        return;
      }

      const res = await submitAfternoonAndIssue({
        campaign,
        name: cleanName,
        cpf,
        email: cleanEmail,
        rating,
        feedback
      });

      if (!res.success || !res.declaration || !res.template) {
        setFormError(res.error || 'Erro ao confirmar participação e emitir declaração.');
        return;
      }

      setIssuedResult({
        declaration: res.declaration,
        template: res.template,
        alreadyIssued: res.alreadyIssued
      });
    } catch (err: any) {
      console.error('[PublicDeclarationForm] Erro ao processar formulário:', err);
      setFormError(err?.message || 'Ocorreu um erro ao enviar seus dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRenderRef.current || !issuedResult) return;
    setDownloadingPdf(true);
    try {
      const safeName = issuedResult.declaration.recipient_name.replace(/[^a-zA-Z0-9]/g, '_');
      await downloadCertificatePdf(pdfRenderRef.current, `Declaracao_${safeName}.pdf`);
    } catch (err) {
      console.error('[PublicDeclarationForm] Erro ao baixar PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const instName = institution?.name || 'Prefeitura Municipal';
  const activeStar = hoverRating || rating;

  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'dark bg-neutral-950 text-neutral-100' : 'bg-gradient-to-b from-slate-50 to-slate-100 text-neutral-800'
      } transition-colors duration-200 flex flex-col`}
    >
      {setDarkMode && (
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            title="Alternar tema"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      )}

      {/* Cabeçalho Institucional Compacto */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {institution?.logo_url ? (
            <img
              src={institution.logo_url}
              alt={instName}
              className="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-neutral-200 dark:border-neutral-700 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Award size={22} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
              {campaign?.secretariat_name || 'Portal de Eventos & Capacitações'}
            </p>
            <h1 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white truncate">
              {instName}
            </h1>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex items-start sm:items-center justify-center p-4 py-8">
        <div className="w-full max-w-xl">
          {loadingCampaign ? (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-10 border border-neutral-200 dark:border-neutral-800 shadow-sm text-center">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                Carregando formulário do evento...
              </p>
            </div>
          ) : campaignError || !campaign ? (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} />
              </div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-2">
                Formulário Indisponível
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {campaignError || 'Não foi possível localizar este evento.'}
              </p>
            </div>
          ) : !campaign.is_active ? (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Clock size={28} />
              </div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-2">
                Registro Encerrado
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                O credenciamento para <strong>{campaign.title}</strong> foi encerrado pela organização.
              </p>
            </div>
          ) : morningSuccess ? (
            /* TELA DE SUCESSO DA ETAPA 1 (MANHÃ) */
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-900/60 shadow-lg space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 mb-2">
                  <Sunrise className="w-3.5 h-3.5" />
                  {morningSuccess.alreadyCheckedIn ? 'Presença do Matutino Já Confirmada' : '1ª Etapa Concluída'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  Presença Confirmada, {morningSuccess.submission.participant_name.split(' ')[0]}!
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Seu credenciamento no período matutino em <strong>{campaign.title}</strong> foi registrado.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <Sunset className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">Próximo Passo (Período Vespertino)</p>
                  <p className="mt-0.5 opacity-90">
                    No período vespertino, escaneie <strong>este mesmo QR Code</strong> e informe seu CPF para avaliar o evento e emitir sua <strong>Declaração de Participação</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Participante:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {morningSuccess.submission.participant_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">CPF:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {morningSuccess.submission.participant_cpf}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">E-mail cadastrado:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {morningSuccess.submission.participant_email}
                  </span>
                </div>
              </div>
            </div>
          ) : issuedResult ? (
            /* TELA DE SUCESSO DA ETAPA 2 (TARDE - DECLARAÇÃO EMITIDA) */
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-900/60 shadow-lg space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 mb-2">
                  {issuedResult.alreadyIssued ? 'Declaração Localizada' : '2ª Etapa Concluída · Declaração Emitida'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  Tudo pronto, {issuedResult.declaration.recipient_name.split(' ')[0]}!
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Presença confirmada e declaração de participação em <strong>{campaign.title}</strong> emitida com sucesso.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full py-4 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-neutral-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer disabled:opacity-60"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Baixar Declaração em PDF Agora
                  </>
                )}
              </button>

              <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Código de Autenticidade
                  </p>
                  <p className="text-sm font-black font-mono text-neutral-900 dark:text-white mt-0.5">
                    {issuedResult.declaration.validation_hash}
                  </p>
                </div>
                <a
                  href={`/validar-documento?codigo=${encodeURIComponent(issuedResult.declaration.validation_hash)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 transition inline-flex items-center gap-1.5 shrink-0"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Validar
                </a>
              </div>
            </div>
          ) : (
            /* FORMULÁRIO DO PARTICIPANTE (ETAPA MANHÃ OU ETAPA TARDE) */
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-7">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                  {stage === 'manha' ? <Sunrise className="w-3.5 h-3.5" /> : <Sunset className="w-3.5 h-3.5" />}
                  {stage === 'manha'
                    ? '1ª Etapa · Matutino · Confirmação de Presença'
                    : '2ª Etapa · Vespertino · Avaliação & Declaração'}
                  {' · '}
                  {getActivityTypeLabel(campaign.event_type)}
                </div>
                <h2 className="text-xl sm:text-2xl font-black leading-snug">
                  {campaign.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {formatDatePtBr(campaign.event_date_start)}
                    {campaign.event_date_end && campaign.event_date_end !== campaign.event_date_start
                      ? ` a ${formatDatePtBr(campaign.event_date_end)}`
                      : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {campaign.workload_hours}h de carga horária
                  </span>
                  {campaign.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {campaign.location}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {stage === 'manha'
                    ? 'Digite seu CPF para iniciar. Se for seu primeiro acesso hoje, confirmaremos sua presença no matutino; se já confirmou no matutino, liberaremos a avaliação e a emissão da declaração.'
                    : 'Confirme seus dados, avalie o evento e emita sua Declaração de Participação na hora.'}
                </p>

                {formError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {morningFoundNotice && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{morningFoundNotice}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      CPF *
                    </label>
                    <div className="relative">
                      <FileCheck2 className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={14}
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full pl-10 pr-10 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                      />
                      {lookingUpCpf && (
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Como deve constar na declaração"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      E-mail *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Avaliação do Evento (exibida na 2ª Etapa - Tarde) */}
                  {stage === 'tarde' && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                          Como você avalia este evento? *
                        </label>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          {RATING_LABELS[activeStar]}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1.5 rounded-xl hover:scale-110 transition cursor-pointer"
                            aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`w-8 h-8 transition ${
                                star <= activeStar
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-neutral-300 dark:text-neutral-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Comentário ou sugestão (opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Conte o que achou ou deixe uma sugestão..."
                          className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {stage === 'manha' ? 'Confirmando presença...' : 'Confirmando e emitindo declaração...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {stage === 'manha'
                        ? 'Confirmar Presença (Matutino)'
                        : 'Confirmar Presença (Vespertino) e Emitir Declaração'}
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {stage === 'manha'
                    ? '1ª Etapa: Credenciamento Matutino'
                    : '2ª Etapa: Documento oficial com QR Code de autenticidade (Lei 14.063/2020)'}
                </p>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Container Oculto para Renderização do PDF na 2ª Etapa (Vespertino) */}
      {issuedResult && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none' }}
        >
          <CertificateDocumentPDF
            ref={pdfRenderRef}
            certificate={issuedResult.declaration}
            template={issuedResult.template}
            institution={institution}
          />
        </div>
      )}
    </div>
  );
};
