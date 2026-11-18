import React, { useEffect, useRef, useState } from 'react';
import {
  QrCode,
  Plus,
  Copy,
  ExternalLink,
  Maximize2,
  Printer,
  Power,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  Mail,
  RefreshCw,
  Star,
  ClipboardList,
  FileSpreadsheet,
  Send,
  Award,
  Loader2,
  Sunrise,
  Sunset,
  Upload,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CertificatePresetTheme,
  CertificateTemplate,
  DeclarationCampaign,
  DeclarationSubmission,
  IssuedCertificate,
  ParsedRecipient,
  getActivityTypeLabel
} from '../types/certificates';
import {
  buildTemplateFromCampaign,
  checkDeclarationTablesHealth,
  confirmManualMorningCheckin,
  createDeclarationCampaign,
  deleteDeclarationCampaign,
  fetchDeclarationCampaigns,
  fetchDeclarationSubmissions,
  getDeclarationFormUrl,
  issueParticipationDeclaration,
  markSubmissionAsIssued,
  toggleDeclarationCampaignStatus,
  updateDeclarationCampaign
} from '../services/certificateService';
import {
  CertificateDocumentPDF,
  generateCertificatePdfBlob
} from './CertificateDocumentPDF';
import { generateQrDataUrl } from '../../../utils/qrCodeGenerator';
import { Institution, AdminUser } from '../../../types';
import { showToast } from '../../../components/ui/Toast';

interface DeclarationQrManagerProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
  defaultSecretariatName: string;
  activityTypes: Array<{ value: string; label: string }>;
  onCampaignActivity?: () => void;
  onSendToCertificateWizard?: (campaign: DeclarationCampaign, recipients: ParsedRecipient[]) => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Falha ao converter PDF.'));
    reader.readAsDataURL(blob);
  });
}

export const DeclarationQrManager: React.FC<DeclarationQrManagerProps> = ({
  currentInstitution,
  currentUser,
  defaultSecretariatName,
  activityTypes,
  onCampaignActivity,
  onSendToCertificateWizard
}) => {
  const [campaigns, setCampaigns] = useState<DeclarationCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  // Formulário de criação rápida
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<string>('evento');
  const [workloadHours, setWorkloadHours] = useState<number>(4);
  const [dateStart, setDateStart] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [issuerName, setIssuerName] = useState(currentUser?.name || 'Secretário(a) Municipal');
  const [issuerRole, setIssuerRole] = useState('Secretário(a) Municipal');
  const [secretariatName, setSecretariatName] = useState(defaultSecretariatName);
  const [secretarySignatureUrl, setSecretarySignatureUrl] = useState<string>('');
  const [presetTheme, setPresetTheme] = useState<CertificatePresetTheme>('classico_azul');
  const [senderEmail, setSenderEmail] = useState('');
  const [requireMorningCheckin, setRequireMorningCheckin] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DeclarationCampaign | null>(null);
  const [dbHealth, setDbHealth] = useState<{ ok: boolean; error?: string } | null>(null);

  // Modal de Projeção em Tela Cheia
  const [projectedCampaign, setProjectedCampaign] = useState<DeclarationCampaign | null>(null);

  // Modal de Coletas & Avaliações
  const [inspectCampaign, setInspectCampaign] = useState<DeclarationCampaign | null>(null);
  const [submissions, setSubmissions] = useState<DeclarationSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [emittingPending, setEmittingPending] = useState(false);
  const [emitProgress, setEmitProgress] = useState<string>('');
  const [renderTarget, setRenderTarget] = useState<{
    declaration: IssuedCertificate;
    template: CertificateTemplate;
  } | null>(null);
  const pdfRenderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSecretariatName(defaultSecretariatName);
  }, [defaultSecretariatName]);

  const loadCampaigns = async () => {
    if (!currentInstitution?.id) return;
    setLoading(true);
    try {
      const list = await fetchDeclarationCampaigns(currentInstitution.id);
      setCampaigns(list);

      const entries = await Promise.all(
        list.map(async (c) => {
          const url = getDeclarationFormUrl(c.slug);
          const dataUrl = await generateQrDataUrl(url, 360);
          return [c.id, dataUrl] as const;
        })
      );
      setQrMap(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    checkDeclarationTablesHealth().then(setDbHealth);
  }, [currentInstitution?.id]);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast('A imagem da assinatura deve ter no máximo 1 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSecretarySignatureUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const openSubmissionsModal = async (campaign: DeclarationCampaign) => {
    setInspectCampaign(campaign);
    setLoadingSubmissions(true);
    try {
      const rows = await fetchDeclarationSubmissions(campaign.id);
      setSubmissions(rows);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Atualização automática a cada 10s enquanto o modal de coletas estiver aberto
  useEffect(() => {
    if (!inspectCampaign) return;
    const timer = setInterval(async () => {
      const rows = await fetchDeclarationSubmissions(inspectCampaign.id);
      setSubmissions(rows);
    }, 10000);
    return () => clearInterval(timer);
  }, [inspectCampaign]);

  const handleStartEdit = (camp: DeclarationCampaign) => {
    setEditingCampaign(camp);
    setTitle(camp.title);
    setEventType(camp.event_type || 'evento');
    setWorkloadHours(camp.workload_hours || 4);
    setDateStart(camp.event_date_start);
    setDateEnd(camp.event_date_end || camp.event_date_start);
    setLocation(camp.location || '');
    setIssuerName(camp.issuer_name);
    setIssuerRole(camp.issuer_role);
    setSecretariatName(camp.secretariat_name || defaultSecretariatName);
    setSecretarySignatureUrl(camp.secretary_signature_url || '');
    setPresetTheme(camp.preset_theme || 'classico_azul');
    setRequireMorningCheckin(camp.require_morning_checkin !== false);
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCampaign(null);
    setTitle('');
    setLocation('');
    setSecretarySignatureUrl('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInstitution?.id) {
      showToast('Selecione uma instituição ativa.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('Informe o nome do evento ou atividade.', 'error');
      return;
    }

    setCreating(true);
    try {
      if (editingCampaign) {
        const updRes = await updateDeclarationCampaign(
          editingCampaign.id,
          {
            title: title.trim(),
            event_type: eventType,
            workload_hours: Math.max(1, Number(workloadHours) || 1),
            event_date_start: dateStart,
            event_date_end: dateEnd || dateStart,
            location: location.trim() || null,
            issuer_name: issuerName.trim() || 'Secretário(a) Municipal',
            issuer_role: issuerRole.trim() || 'Secretário(a) Municipal',
            secretariat_name: secretariatName.trim() || defaultSecretariatName,
            secretary_signature_url: secretarySignatureUrl || null,
            preset_theme: presetTheme,
            require_morning_checkin: requireMorningCheckin
          },
          editingCampaign.template_id
        );

        if (!updRes.success) {
          showToast(updRes.error || 'Erro ao atualizar dados do QR Code.', 'error');
          return;
        }

        showToast('Dados do QR Code atualizados com sucesso!', 'success');
        handleCancelEdit();
        setShowCreateForm(false);
        await loadCampaigns();
        return;
      }

      const res = await createDeclarationCampaign({
        institution_id: currentInstitution.id,
        title: title.trim(),
        event_type: eventType,
        workload_hours: Math.max(1, Number(workloadHours) || 1),
        event_date_start: dateStart,
        event_date_end: dateEnd || dateStart,
        location: location.trim() || null,
        issuer_name: issuerName.trim() || 'Secretário(a) Municipal',
        issuer_role: issuerRole.trim() || 'Secretário(a) Municipal',
        secretariat_name: secretariatName.trim() || defaultSecretariatName,
        secretary_signature_url: secretarySignatureUrl || null,
        preset_theme: presetTheme,
        sender_email: senderEmail.trim() || null,
        is_active: true,
        require_morning_checkin: requireMorningCheckin,
        created_by: currentUser?.id || currentUser?.name || null
      });

      if (!res.success || !res.campaign) {
        showToast(res.error || 'Erro ao criar QR Code de coleta.', 'error');
        return;
      }

      showToast('QR Code único (Manhã + Tarde) gerado com sucesso!', 'success');
      setTitle('');
      setLocation('');
      setShowCreateForm(false);
      await loadCampaigns();
      setProjectedCampaign(res.campaign);
      onCampaignActivity?.();
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (slug: string) => {
    const url = getDeclarationFormUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link único do evento copiado!', 'success');
    } catch {
      showToast(url, 'info');
    }
  };

  const handleToggleActive = async (campaign: DeclarationCampaign) => {
    const next = !campaign.is_active;
    const res = await toggleDeclarationCampaignStatus(campaign.id, next);
    if (res.success) {
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, is_active: next } : c)));
      showToast(next ? 'QR Code ativado para coleta.' : 'QR Code pausado.', 'info');
    }
  };

  const handleDelete = async (campaign: DeclarationCampaign) => {
    if (!window.confirm(`Deseja excluir a campanha "${campaign.title}"?`)) {
      return;
    }
    const res = await deleteDeclarationCampaign(campaign.id);
    if (res.success) {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      showToast('Campanha removida.', 'success');
    }
  };

  const handleExportSubmissions = () => {
    if (!inspectCampaign || submissions.length === 0) return;
    const rows = submissions.map((s) => ({
      Nome: s.participant_name,
      CPF: s.participant_cpf,
      Email: s.participant_email,
      Avaliacao_Estrelas: s.rating,
      Comentario: s.feedback || '',
      Status_Emissao: s.emission_status === 'emitido' ? 'Emitido' : 'Pendente',
      Data_Registro: new Date(s.created_at).toLocaleString('pt-BR')
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    XLSX.writeFile(wb, `Coleta_${inspectCampaign.slug}.xlsx`);
    showToast('Planilha exportada com sucesso!', 'success');
  };

  const handleEmitPendingDeclarations = async () => {
    if (!inspectCampaign) return;
    const pending = submissions.filter((s) => s.emission_status !== 'emitido');
    if (pending.length === 0) {
      showToast('Todos os participantes coletados já tiveram a declaração emitida.', 'info');
      return;
    }

    setEmittingPending(true);
    let issuedCount = 0;

    try {
      for (let i = 0; i < pending.length; i++) {
        const sub = pending[i];
        setEmitProgress(`Emitindo ${i + 1} de ${pending.length}: ${sub.participant_name}`);

        const res = await issueParticipationDeclaration({
          campaign: inspectCampaign,
          name: sub.participant_name,
          cpf: sub.participant_cpf,
          email: sub.participant_email
        });

        if (res.success && res.declaration) {
          issuedCount++;
          await markSubmissionAsIssued(sub.id, res.declaration.id);
        }
      }

      const refreshed = await fetchDeclarationSubmissions(inspectCampaign.id);
      setSubmissions(refreshed);
      onCampaignActivity?.();

      showToast(
        `${issuedCount} declarações emitidas e salvas no Banco de Documentos!`,
        issuedCount > 0 ? 'success' : 'error'
      );
    } finally {
      setEmittingPending(false);
      setEmitProgress('');
    }
  };

  const handleSendToWizard = () => {
    if (!inspectCampaign || submissions.length === 0 || !onSendToCertificateWizard) return;
    const recipients: ParsedRecipient[] = submissions.map((s) => ({
      name: s.participant_name,
      document: s.participant_cpf,
      email: s.participant_email,
      role: 'participante'
    }));
    setInspectCampaign(null);
    onSendToCertificateWizard(inspectCampaign, recipients);
  };

  const handlePrintPoster = (campaign: DeclarationCampaign) => {
    const qrSrc = qrMap[campaign.id] || '';
    const formUrl = getDeclarationFormUrl(campaign.slug);
    const instName = currentInstitution?.name || 'Prefeitura Municipal';
    const win = window.open('', '_blank', 'width=850,height=1100');
    if (!win) {
      showToast('Permita pop-ups para imprimir o cartaz.', 'error');
      return;
    }
    win.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Cartaz QR Code - ${campaign.title}</title>
          <style>
            @page { size: A4 portrait; margin: 16mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; text-align: center; margin: 0; padding: 24px; }
            .card { border: 3px solid #0f172a; border-radius: 24px; padding: 36px 28px; max-width: 680px; margin: 0 auto; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 999px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
            h1 { font-size: 28px; margin: 18px 0 8px; line-height: 1.25; }
            .meta { color: #475569; font-size: 14px; margin-bottom: 24px; }
            .qr-box { display: inline-block; padding: 18px; border: 2px dashed #cbd5e1; border-radius: 20px; background: #ffffff; margin: 12px 0 20px; }
            .qr-box img { width: 320px; height: 320px; display: block; }
            .steps { background: #f8fafc; border-radius: 14px; padding: 16px 20px; text-align: left; font-size: 14px; line-height: 1.6; max-width: 500px; margin: 0 auto 18px; }
            .url { font-family: monospace; font-size: 11px; color: #64748b; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; margin: 0 0 8px;">${instName} · ${campaign.secretariat_name || ''}</p>
            <div class="badge">Credenciamento & Declaração de Participação</div>
            <h1>${campaign.title}</h1>
            <p class="meta">Carga Horária: <strong>${campaign.workload_hours}h</strong> · Data: <strong>${new Date(campaign.event_date_start + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></p>
            <div class="qr-box">
              <img src="${qrSrc}" alt="QR Code" />
            </div>
            <div class="steps">
              <strong>Use este mesmo QR Code nas duas etapas:</strong><br/>
              <strong>1. Matutino (Presença):</strong> Escaneie, informe CPF, Nome e E-mail.<br/>
              <strong>2. Vespertino (Declaração):</strong> Escaneie novamente, digite seu CPF, avalie o evento e emita sua Declaração na hora!
            </div>
            <p class="url">${formUrl}</p>
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Estatísticas de avaliação no modal
  const ratedSubmissions = submissions.filter((s) => typeof s.rating === 'number' && s.rating > 0);
  const averageRating =
    ratedSubmissions.length > 0
      ? (ratedSubmissions.reduce((acc, s) => acc + (s.rating || 0), 0) / ratedSubmissions.length).toFixed(1)
      : '0.0';
  const pendingCount = submissions.filter((s) => s.emission_status !== 'emitido').length;

  return (
    <div className="space-y-6">
      {/* Alerta de Saúde do Banco de Dados (Coleta em Tempo Real) */}
      {dbHealth && !dbHealth.ok && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div className="text-xs leading-relaxed">
            <p className="font-black">Atenção: Tabelas de Coleta não localizadas no Supabase</p>
            <p className="mt-0.5 opacity-90">
              Para receber automaticamente os dados e avaliações dos participantes que escaneiam o QR Code, aplique a migração{' '}
              <code className="font-mono font-bold">20261117010000_declaration_campaigns.sql</code> no Supabase. ({dbHealth.error})
            </p>
          </div>
        </div>
      )}

      {/* Barra de Ação Superior */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              Coleta via QR Code & Avaliação do Evento
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              O participante escaneia o QR Code, informa Nome, CPF, E-mail e avalia o evento. Os dados ficam salvos para emissão posterior.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadCampaigns}
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Ocultar Formulário' : 'Novo QR Code de Coleta'}
          </button>
        </div>
      </div>

      {/* Formulário de Criação */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                {editingCampaign
                  ? `Editar Evento do QR Code: ${editingCampaign.title}`
                  : 'Configurar Evento para Coleta de Participantes & Avaliação'}
              </h4>
            </div>
            {editingCampaign && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Nome do Evento / Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Jornada Pedagógica Municipal 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Modalidade
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="evento">Evento</option>
                <option value="audiencia">Audiência Pública</option>
                <option value="reuniao">Reunião Institucional</option>
                {activityTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Carga Horária (horas) *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={workloadHours}
                onChange={(e) => setWorkloadHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Data de Início *
              </label>
              <input
                type="date"
                required
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Data de Término
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Local (opcional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Auditório Municipal"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Nome do Secretário(a) *
              </label>
              <input
                type="text"
                required
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="Ex: Maria da Silva"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Cargo do Secretário(a) *
              </label>
              <input
                type="text"
                required
                value={issuerRole}
                onChange={(e) => setIssuerRole(e.target.value)}
                placeholder="Ex: Secretário(a) Municipal de Educação"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Secretaria Organizadora *
              </label>
              <input
                type="text"
                required
                value={secretariatName}
                onChange={(e) => setSecretariatName(e.target.value)}
                placeholder="Ex: Secretaria Municipal de Educação"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Assinatura do Secretário(a) (PNG/JPG opcional)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3 py-2.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:border-amber-500 cursor-pointer flex items-center justify-center gap-2 truncate">
                  <Upload className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">
                    {secretarySignatureUrl ? 'Assinatura carregada (trocar)' : 'Enviar imagem da assinatura'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </label>
                {secretarySignatureUrl && (
                  <button
                    type="button"
                    onClick={() => setSecretarySignatureUrl('')}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-red-500 hover:bg-red-50 cursor-pointer"
                    title="Remover assinatura"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {secretarySignatureUrl && (
                <div className="mt-2 p-2 rounded-xl bg-white border border-neutral-200 flex items-center justify-center">
                  <img
                    src={secretarySignatureUrl}
                    alt="Prévia da assinatura"
                    className="max-h-12 object-contain"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Cor do Timbre da Declaração
              </label>
              <select
                value={presetTheme}
                onChange={(e) => setPresetTheme(e.target.value as CertificatePresetTheme)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="classico_azul">Azul Institucional</option>
                <option value="verde_institucional">Verde Institucional</option>
                <option value="elegante_dourado">Dourado Institucional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                E-mail Remetente (opcional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="Padrão do sistema"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={requireMorningCheckin}
                onChange={(e) => setRequireMorningCheckin(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
              Exigir confirmação de presença no matutino para liberar emissão no vespertino
            </label>

            <div className="flex items-center gap-2">
              {editingCampaign && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-neutral-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                <QrCode className="w-4 h-4" />
                {creating
                  ? 'Salvando...'
                  : editingCampaign
                  ? 'Salvar Alterações do QR Code'
                  : 'Gerar QR Code Único (Matutino e Vespertino)'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Campanhas com QR Code */}
      {campaigns.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 p-10 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
          <QrCode className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            Nenhuma campanha via QR Code criada ainda.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Preencha o formulário acima para gerar o QR Code de coleta e avaliação para os participantes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaigns.map((camp) => {
            const formUrl = getDeclarationFormUrl(camp.slug);
            const qrSrc = qrMap[camp.id];

            return (
              <div
                key={camp.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row gap-5"
              >
                {/* QR Code Único (Manhã e Tarde) */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div
                    onClick={() => setProjectedCampaign(camp)}
                    className="w-36 h-36 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white p-2 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition shadow-xs"
                    title="Clique para projetar em tela cheia"
                  >
                    {qrSrc ? (
                      <img src={qrSrc} alt={`QR Code ${camp.title}`} className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-10 h-10 text-neutral-300" />
                    )}
                  </div>
                  <span
                    className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      camp.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {camp.is_active ? 'Ativo · 2 Etapas' : 'Pausado'}
                  </span>
                </div>

                {/* Informações e Ações */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {getActivityTypeLabel(camp.event_type)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        {camp.submissions_count || 0} coletados
                      </span>
                    </div>

                    <h4 className="text-base font-black text-neutral-900 dark:text-white mt-0.5 line-clamp-2">
                      {camp.title}
                    </h4>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(camp.event_date_start + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {camp.workload_hours}h
                      </span>
                      {camp.location && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {camp.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => openSubmissionsModal(camp)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Coletas & Avaliações
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectedCampaign(camp)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-amber-500 text-white dark:text-neutral-950 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Projetar
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintPoster(camp)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cartaz A4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(camp.slug)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(camp)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="Editar dados do evento/QR Code"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <a
                      href={formUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir
                    </a>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(camp)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer ml-auto"
                      title={camp.is_active ? 'Pausar Coleta' : 'Ativar Coleta'}
                    >
                      <Power className={`w-4 h-4 ${camp.is_active ? 'text-emerald-500' : 'text-neutral-400'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(camp)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      title="Excluir campanha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Coletas, Avaliações e Emissão Posterior */}
      {inspectCampaign && (
        <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Participantes Coletados & Avaliação do Evento
                </span>
                <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white mt-0.5">
                  {inspectCampaign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectCampaign(null)}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Resumo de Avaliações */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Média do Evento</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-black text-neutral-900 dark:text-white">{averageRating}</span>
                    <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Total Coletado</p>
                  <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{submissions.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Aguardando Emissão</p>
                  <p className="text-3xl font-black text-blue-700 dark:text-blue-400 mt-1">{pendingCount}</p>
                </div>
              </div>

              {/* Ações de Emissão Posterior */}
              {submissions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    disabled={emittingPending || pendingCount === 0}
                    onClick={handleEmitPendingDeclarations}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {emittingPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {emittingPending ? emitProgress || 'Emitindo...' : `Emitir Declarações Pendentes (${pendingCount})`}
                  </button>

                  {onSendToCertificateWizard && (
                    <button
                      type="button"
                      onClick={handleSendToWizard}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-black inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      Emitir Certificados em Lote
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportSubmissions}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 text-xs font-bold inline-flex items-center gap-2 cursor-pointer ml-auto"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Exportar Planilha (.xlsx)
                  </button>
                </div>
              )}

              {/* Tabela de Participantes & Avaliações */}
              {loadingSubmissions ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">Carregando participantes coletados...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl">
                  <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                    Nenhum participante registrou presença ainda.
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Projete o QR Code ou compartilhe o link para iniciar a coleta.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-neutral-900 dark:text-white">
                            {sub.participant_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              sub.morning_checkin_at
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {sub.morning_checkin_at ? 'Matutino ✓' : 'Matutino —'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              sub.afternoon_checkin_at
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {sub.afternoon_checkin_at ? 'Vespertino ✓' : 'Vespertino —'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              sub.emission_status === 'emitido'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {sub.emission_status === 'emitido' ? 'Emitido' : 'Pendente'}
                          </span>
                          {!sub.morning_checkin_at && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await confirmManualMorningCheckin(sub.id);
                                if (res.success) {
                                  setSubmissions((prev) =>
                                    prev.map((item) =>
                                      item.id === sub.id
                                        ? { ...item, morning_checkin_at: new Date().toISOString() }
                                        : item
                                    )
                                  );
                                  showToast('Presença no matutino confirmada manualmente.', 'success');
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirmar Matutino
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                          CPF: {sub.participant_cpf} · {sub.participant_email}
                        </p>
                        {sub.feedback && (
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 rounded-xl mt-1 italic">
                            "{sub.feedback}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {sub.rating ? (
                          Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-4 h-4 ${
                                idx < (sub.rating || 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-neutral-300 dark:text-neutral-700'
                              }`}
                            />
                          ))
                        ) : (
                          <span className="text-[11px] text-neutral-400">Sem avaliação</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Projeção em Tela Cheia para Telão / Projetor */}
      {projectedCampaign && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setProjectedCampaign(null)}
            className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
            title="Fechar projeção"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-10 text-center text-slate-900 shadow-2xl space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              Credenciamento & Declaração de Participação
            </span>

            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              {projectedCampaign.title}
            </h2>

            <div className="inline-block p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-inner">
              {qrMap[projectedCampaign.id] && (
                <img
                  src={qrMap[projectedCampaign.id]}
                  alt="QR Code do Evento"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain mx-auto"
                />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-base sm:text-lg font-extrabold text-slate-800">
                Aponte a câmera do seu celular para o QR Code
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                <strong>Matutino:</strong> Confirme sua presença. <strong>Vespertino:</strong> Escaneie o mesmo QR Code, avalie o evento e emita sua Declaração.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleCopyLink(projectedCampaign.slug)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copiar Link
              </button>
              <button
                type="button"
                onClick={() => handlePrintPoster(projectedCampaign)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Cartaz A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renderização Oculta para Emissão Posterior em Lote */}
      {renderTarget && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none', opacity: 0 }}
        >
          <CertificateDocumentPDF
            ref={pdfRenderRef}
            certificate={renderTarget.declaration}
            template={renderTarget.template}
            institution={currentInstitution}
          />
        </div>
      )}
    </div>
  );
};
