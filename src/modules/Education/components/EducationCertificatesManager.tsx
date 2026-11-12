import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileBadge, Plus, Upload, Download, Search, CheckCircle2, 
  AlertTriangle, Eye, Copy, RefreshCw, Sparkles, FileText, 
  Calendar, Clock, User, ShieldCheck, ChevronRight, ChevronLeft, 
  FileSpreadsheet, Trash2, Check, Award, Layers, ExternalLink, Printer
} from 'lucide-react';
import { 
  CertificateTemplate, 
  IssuedCertificate, 
  ParsedRecipient, 
  CertificatePresetTheme,
  CertificateEventType,
  CertificateBackgroundMode
} from '../types/certificates';
import { 
  parseRecipientsSpreadsheet, 
  generateBatchZip 
} from '../../../utils/certificateBatchProcessor';
import { 
  CertificateDocumentPDF, 
  generateCertificatePdfBlob, 
  downloadCertificatePdf 
} from './CertificateDocumentPDF';
import { 
  createBatchCertificates, 
  fetchIssuedCertificates, 
  registerCertificateDownload,
  deleteIssuedCertificate,
  deleteBatchIssuedCertificates
} from '../services/certificateService';
import { useMunicipalDepartments } from '../../../lib/api/departments';
import { Institution, AdminUser } from '../../../types';
import { showToast } from '../../../components/ui/Toast';
import { supabase } from '../../../lib/supabase';
import { formatCPF } from '../../../lib/masks';
import * as XLSX from 'xlsx';

interface EducationCertificatesManagerProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
}

export const EducationCertificatesManager: React.FC<EducationCertificatesManagerProps> = ({
  currentInstitution,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'bank'>('wizard');

  // Estado do Wizard (Passos 1 a 4)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Passo 1: Modelo
  const [backgroundMode, setBackgroundMode] = useState<CertificateBackgroundMode>('preset');
  const [presetTheme, setPresetTheme] = useState<CertificatePresetTheme>('classico_azul');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string>('');
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  // Passo 2: Participantes
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([]);
  const [spreadsheetErrors, setSpreadsheetErrors] = useState<string[]>([]);
  const [isParsingSpreadsheet, setIsParsingSpreadsheet] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDoc, setManualDoc] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  // Passo 3: Dados do Curso/Palestra
  const { departments } = useMunicipalDepartments(currentInstitution?.id);
  const secretariatName = useMemo(() => {
    const deptRef = (currentUser?.department_id || '').trim();
    if (!deptRef) return 'Secretaria Municipal de Educação';
    const matched = departments.find(
      d => d.id === deptRef || d.name.toLowerCase() === deptRef.toLowerCase()
    );
    return matched?.name || deptRef;
  }, [currentUser?.department_id, departments]);
  const [courseTitle, setCourseTitle] = useState('');
  const [eventType, setEventType] = useState<CertificateEventType>('curso');
  const [workloadHours, setWorkloadHours] = useState<number>(40);
  const [dateStart, setDateStart] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [issuerName, setIssuerName] = useState<string>(currentUser?.name || 'Coordenação Pedagógica Municipal');
  const [issuerRole, setIssuerRole] = useState<string>('Formador(a)');
  const [programContent, setProgramContent] = useState<string>('');

  // Passo 4: Processamento & Lote
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; statusText: string }>({
    current: 0,
    total: 0,
    statusText: ''
  });
  const [generatedBatchResult, setGeneratedBatchResult] = useState<{
    template: CertificateTemplate;
    certificates: IssuedCertificate[];
    blobs: Array<{ filename: string; pdfBlob: Blob }>;
  } | null>(null);

  // Estado do Banco de Certificados
  const [issuedHistory, setIssuedHistory] = useState<IssuedCertificate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankFilterType, setBankFilterType] = useState<string>('all');

  // Permissão de Super Admin para exclusão no Banco de Certificados
  const isSuperAdmin = currentUser?.role === 'Super Admin' || 
    (currentUser?.role as string)?.toLowerCase() === 'super admin' || 
    (currentUser?.role as string)?.toLowerCase() === 'super_admin';

  // Estados de Exclusão (Super Admin)
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);
  const [certToDelete, setCertToDelete] = useState<IssuedCertificate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // Modal de Visualização
  const [previewModalCert, setPreviewModalCert] = useState<IssuedCertificate | null>(null);

  // Ref escondido para renderização assíncrona dos PDFs de lote
  const hiddenRenderContainerRef = useRef<HTMLDivElement>(null);
  const [renderQueueCert, setRenderQueueCert] = useState<{
    cert: IssuedCertificate;
    tmpl: CertificateTemplate;
  } | null>(null);

  // Carrega histórico do banco
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const data = await fetchIssuedCertificates(currentInstitution?.id);
    setIssuedHistory(data);
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
  }, [currentInstitution?.id]);

  // Upload de Imagem de Fundo Personalizada
  const handleCustomBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, envie um arquivo de imagem (PNG ou JPG).', 'error');
      return;
    }

    setIsUploadingBg(true);
    try {
      const fileName = `bg-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { data, error } = await supabase.storage
        .from('education-certificates')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('education-certificates')
          .getPublicUrl(data.path);

        setCustomBackgroundUrl(publicUrlData.publicUrl);
        setBackgroundMode('custom_upload');
        showToast('Fundo do certificado enviado com sucesso!', 'success');
      } else {
        // Fallback Base64 caso o bucket não esteja acessível
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setCustomBackgroundUrl(event.target.result as string);
            setBackgroundMode('custom_upload');
            showToast('Fundo carregado localmente para o lote!', 'success');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      showToast('Erro ao carregar imagem de fundo.', 'error');
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Upload de Planilha de Participantes (.xlsx, .csv)
  const handleSpreadsheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingSpreadsheet(true);
    const result = await parseRecipientsSpreadsheet(file);
    setIsParsingSpreadsheet(false);

    if (result.recipients.length > 0) {
      setRecipients(result.recipients);
      setSpreadsheetErrors(result.errors);
      showToast(`${result.recipients.length} participantes importados com sucesso!`, 'success');
    } else {
      setSpreadsheetErrors(result.errors);
      showToast('Não foi possível identificar participantes na planilha.', 'error');
    }
  };

  // Adição Manual de Participante
  const handleAddManualParticipant = () => {
    if (!manualName.trim()) {
      showToast('Informe o nome do participante.', 'error');
      return;
    }

    setRecipients(prev => [
      ...prev,
      {
        name: manualName.trim(),
        document: manualDoc.trim() || 'Documento não informado',
        email: manualEmail.trim() || undefined,
        role: 'participante'
      }
    ]);

    setManualName('');
    setManualDoc('');
    setManualEmail('');
    showToast('Participante adicionado à lista!', 'success');
  };

  // Formatação automática de CPF ao digitar no cadastro manual
  const handleManualDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Se contiver apenas dígitos e caracteres usuais de máscara, aplica a formatação de CPF
    if (/^[\d.\-\s]*$/.test(rawVal)) {
      setManualDoc(formatCPF(rawVal));
    } else {
      setManualDoc(rawVal);
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  // Baixar Planilha Modelo de Exemplo (.xlsx)
  const handleDownloadSampleSpreadsheet = () => {
    const wsData = [
      ['Nome Completo', 'CPF ou Documento', 'E-mail', 'Função'],
      ['Maria Eduarda Silva', '123.456.789-00', 'maria.silva@escola.gov.br', 'Participante'],
      ['Prof. João Paulo Pereira', '987.654.321-11', 'joao.pereira@escola.gov.br', 'Palestrante'],
      ['Ana Clara Santos', '456.789.123-22', 'ana.santos@escola.gov.br', 'Monitor']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    XLSX.writeFile(wb, 'Modelo_Participantes_Certificados.xlsx');
  };

  // Processamento do Lote de Certificados (Passo 4)
  const handleStartBatchProcessing = async () => {
    if (!courseTitle.trim()) {
      showToast('Informe o título do curso ou evento no Passo 3.', 'error');
      setWizardStep(3);
      return;
    }

    if (recipients.length === 0) {
      showToast('Nenhum participante adicionado no Passo 2.', 'error');
      setWizardStep(2);
      return;
    }

    setIsGeneratingBatch(true);
    setGenerationProgress({
      current: 0,
      total: recipients.length,
      statusText: 'Registrando lote no banco de dados...'
    });

    const instId = currentInstitution?.id || 'inst_default';

    const batchRes = await createBatchCertificates({
      templateData: {
        institution_id: instId,
        title: courseTitle.trim(),
        event_type: eventType,
        workload_hours: Number(workloadHours) || 40,
        event_date_start: dateStart,
        event_date_end: dateEnd || null,
        issuer_name: issuerName.trim(),
        issuer_role: issuerRole.trim(),
        secretariat_name: secretariatName.trim() || null,
        background_mode: backgroundMode,
        preset_theme: presetTheme,
        custom_background_url: customBackgroundUrl || null,
        program_content: programContent.trim() || null
      },
      recipients,
      institutionId: instId
    });

    if (!batchRes.success || batchRes.certificates.length === 0) {
      setIsGeneratingBatch(false);
      showToast('Falha ao registrar certificados: ' + (batchRes.error || 'Erro desconhecido'), 'error');
      return;
    }

    // Geração em PDF de cada certificado para o ZIP
    const blobs: Array<{ filename: string; pdfBlob: Blob }> = [];

    for (let i = 0; i < batchRes.certificates.length; i++) {
      const cert = batchRes.certificates[i];
      setGenerationProgress({
        current: i + 1,
        total: batchRes.certificates.length,
        statusText: `Renderizando PDF ${i + 1} de ${batchRes.certificates.length} (${cert.recipient_name})...`
      });

      // Configura elemento para renderização
      setRenderQueueCert({ cert, tmpl: batchRes.template });

      // Aguarda 100ms para renderizar no DOM virtual
      await new Promise(resolve => setTimeout(resolve, 120));

      const renderEl = document.getElementById(`certificate-render-${cert.id}`);
      if (renderEl) {
        try {
          const blob = await generateCertificatePdfBlob(renderEl);
          const safeName = cert.recipient_name.replace(/[^a-zA-Z0-9]/g, '_');
          blobs.push({
            filename: `Certificado_${safeName}_${cert.validation_hash}.pdf`,
            pdfBlob: blob
          });
        } catch (pdfErr) {
          console.warn(`Erro ao gerar PDF de ${cert.recipient_name}:`, pdfErr);
        }
      }
    }

    setGeneratedBatchResult({
      template: batchRes.template,
      certificates: batchRes.certificates,
      blobs
    });

    setIsGeneratingBatch(false);
    showToast(`Lote concluído! ${blobs.length} certificados prontos para download.`, 'success');
    loadHistory();
  };

  // Disparo do download de todo o lote em arquivo ZIP
  const handleDownloadAllZip = async () => {
    if (!generatedBatchResult || generatedBatchResult.blobs.length === 0) {
      showToast('Nenhum certificado disponível para download.', 'error');
      return;
    }

    await generateBatchZip(generatedBatchResult.blobs, courseTitle || 'Educacao');
    showToast('Download do pacote ZIP iniciado com sucesso!', 'success');
  };

  // Emissão de 2ª via a partir do histórico
  const handleDownloadSecondIssue = async (cert: IssuedCertificate) => {
    // 1. Incrementa contador de 2ª via
    const nextCount = await registerCertificateDownload(cert.id);
    const updatedCert: IssuedCertificate = {
      ...cert,
      download_count: nextCount
    };

    // 2. Abre para renderização
    setRenderQueueCert({
      cert: updatedCert,
      tmpl: cert.template || {
        id: cert.template_id,
        institution_id: cert.institution_id,
        title: 'Curso de Formação',
        event_type: 'curso',
        workload_hours: 40,
        event_date_start: cert.created_at.split('T')[0],
        issuer_name: 'Secretaria Municipal de Educação',
        issuer_role: 'Direção Geral',
        background_mode: 'preset',
        preset_theme: 'classico_azul'
      }
    });

    showToast('Gerando 2ª Via do certificado...', 'info');

    setTimeout(async () => {
      const renderEl = document.getElementById(`certificate-render-${cert.id}`);
      if (renderEl) {
        const safeName = cert.recipient_name.replace(/[^a-zA-Z0-9]/g, '_');
        await downloadCertificatePdf(renderEl, `Certificado_2via_${safeName}_${cert.validation_hash}.pdf`);
        showToast('Segunda via emitida com sucesso!', 'success');
        loadHistory();
      }
    }, 200);
  };

  // Copiar link de conferência do QR Code
  const handleCopyValidationLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link de autenticidade copiado para a área de transferência!', 'success');
  };

  // Filtros do Banco de Certificados
  const filteredHistory = useMemo(() => {
    return issuedHistory.filter(c => {
      const q = bankSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        c.recipient_name.toLowerCase().includes(q) ||
        c.recipient_document.toLowerCase().includes(q) ||
        c.validation_hash.toLowerCase().includes(q) ||
        (c.template?.title && c.template.title.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (bankFilterType !== 'all' && c.template?.event_type !== bankFilterType) {
        return false;
      }

      return true;
    });
  }, [issuedHistory, bankSearch, bankFilterType]);

  // Seleção individual de certificado (Super Admin)
  const handleToggleSelectCert = (id: string) => {
    setSelectedCertIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Selecionar / Desmarcar todos os filtrados (Super Admin)
  const handleToggleSelectAll = () => {
    if (selectedCertIds.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedCertIds([]);
    } else {
      setSelectedCertIds(filteredHistory.map(c => c.id));
    }
  };

  // Executar exclusão individual confirmada (Super Admin)
  const handleConfirmDeleteSingle = async () => {
    if (!certToDelete) return;
    setIsDeleting(true);
    const res = await deleteIssuedCertificate(certToDelete.id);
    setIsDeleting(false);
    if (res.success) {
      showToast(`Certificado de ${certToDelete.recipient_name} excluído com sucesso.`, 'success');
      setSelectedCertIds(prev => prev.filter(id => id !== certToDelete.id));
      if (previewModalCert?.id === certToDelete.id) {
        setPreviewModalCert(null);
      }
      setCertToDelete(null);
      loadHistory();
    } else {
      showToast('Erro ao excluir certificado: ' + (res.error || 'Erro desconhecido'), 'error');
    }
  };

  // Executar exclusão em lote confirmada (Super Admin)
  const handleConfirmDeleteBatch = async () => {
    if (selectedCertIds.length === 0) return;
    setIsDeleting(true);
    const count = selectedCertIds.length;
    const res = await deleteBatchIssuedCertificates(selectedCertIds);
    setIsDeleting(false);
    if (res.success) {
      showToast(`${count} certificado(s) excluído(s) do banco de dados.`, 'success');
      setSelectedCertIds([]);
      setShowBatchDeleteModal(false);
      loadHistory();
    } else {
      showToast('Erro ao excluir certificados: ' + (res.error || 'Erro desconhecido'), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
              Gestão Municipal · Todas as Secretarias · Lei Federal 14.063/2020
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 flex items-center gap-2">
            <FileBadge className="w-6 h-6 text-amber-500" />
            Emissor em Lote & Banco de Certificados
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Gere centenas de certificados oficiais para cursos, palestras, capacitações e eventos municipais, com validação por QR Code e download em lote (ZIP).
          </p>
        </div>

        {/* Abas Principais */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'wizard'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Novo Lote de Certificados</span>
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'bank'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Banco de Certificados ({issuedHistory.length})</span>
          </button>
        </div>
      </div>

      {/* ABA 1: WIZARD EM 4 ETAPAS */}
      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Stepper Visual */}
          <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { step: 1, label: '1. Modelo Visual', icon: Layers },
                { step: 2, label: '2. Participantes', icon: User },
                { step: 3, label: '3. Dados do Curso', icon: Award },
                { step: 4, label: '4. Emissão & ZIP', icon: Download },
              ].map(item => {
                const isCurrent = wizardStep === item.step;
                const isPassed = wizardStep > item.step;
                const Icon = item.icon;

                return (
                  <button
                    key={item.step}
                    onClick={() => setWizardStep(item.step as any)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500 text-neutral-900 dark:text-white font-bold'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-amber-500 text-neutral-950 font-black'
                        : isPassed
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {isPassed ? <Check className="w-4 h-4" /> : item.step}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold truncate block">{item.label}</span>
                      <span className="text-[10px] opacity-75 font-mono truncate block">
                        {item.step === 1 ? 'Design & Molduras' : item.step === 2 ? `${recipients.length} pessoas` : item.step === 3 ? (courseTitle || 'Configuração') : 'Download ZIP'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASSO 1: MODELO VISUAL */}
          {wizardStep === 1 && (
            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  Passo 1: Escolha o Estilo ou Envie a Arte de Fundo
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Selecione uma das molduras institucionais oficiais ou faça o upload de um modelo próprio em PNG/JPG.
                </p>
              </div>

              {/* Modo de Fundo: Preset vs Custom */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBackgroundMode('preset')}
                  className={`flex-1 p-4 rounded-2xl border text-left transition cursor-pointer ${
                    backgroundMode === 'preset'
                      ? 'bg-amber-500/10 border-amber-500 text-neutral-900 dark:text-white'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  <span className="text-xs font-bold block">Modelos Institucionais Pré-definidos</span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">Molduras nobres em A4 Paisagem com Brasão Oficial.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBackgroundMode('custom_upload')}
                  className={`flex-1 p-4 rounded-2xl border text-left transition cursor-pointer ${
                    backgroundMode === 'custom_upload'
                      ? 'bg-amber-500/10 border-amber-500 text-neutral-900 dark:text-white'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  <span className="text-xs font-bold block">Enviar Meu Próprio Fundo / Arte (PNG/JPG)</span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">Suba a arte criada no Canva ou Designer.</span>
                </button>
              </div>

              {/* Seletor de Presets */}
              {backgroundMode === 'preset' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'classico_azul', label: 'Clássico Azul Marinho', color: 'bg-blue-900', border: 'border-blue-900' },
                    { id: 'verde_institucional', label: 'Verde Municipal Oficial', color: 'bg-emerald-800', border: 'border-emerald-800' },
                    { id: 'elegante_dourado', label: 'Elegante Ouro & Âmbar', color: 'bg-amber-700', border: 'border-amber-700' },
                  ].map(theme => (
                    <div
                      key={theme.id}
                      onClick={() => setPresetTheme(theme.id as any)}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer relative overflow-hidden ${
                        presetTheme === theme.id
                          ? 'border-amber-500 bg-amber-500/5 shadow-md'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      <div className="h-24 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between p-3 bg-neutral-50 dark:bg-neutral-950 mb-3">
                        <div className="flex justify-between items-center">
                          <div className={`w-3 h-3 rounded-full ${theme.color}`} />
                          <span className="text-[9px] font-mono font-bold text-neutral-400">A4 PAISAGEM</span>
                        </div>
                        <div className="text-center font-serif text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                          C E R T I F I C A D O
                        </div>
                        <div className="h-1 bg-amber-500/40 w-12 mx-auto rounded" />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          {theme.label}
                        </span>
                        {presetTheme === theme.id && (
                          <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Upload de Arte Personalizada */
                <div className="p-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-center space-y-4">
                  {customBackgroundUrl ? (
                    <div className="space-y-3">
                      <div className="max-w-md mx-auto max-h-48 overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-md">
                        <img
                          src={customBackgroundUrl}
                          alt="Fundo Enviado"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex justify-center gap-2">
                        <label className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold cursor-pointer transition">
                          <span>Trocar Imagem</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleCustomBgUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setCustomBackgroundUrl('')}
                          className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-rose-500 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        Arraste ou selecione a imagem de fundo do Certificado
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 mb-3">
                        Recomendado: 297mm x 210mm (Landscape) em PNG ou JPG de alta resolução.
                      </p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer transition">
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingBg ? 'Enviando...' : 'Selecionar Arquivo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          disabled={isUploadingBg}
                          onChange={handleCustomBgUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Avançar */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow hover:shadow-lg transition"
                >
                  <span>Avançar: Participantes</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: PARTICIPANTES (PLANILHA EXCEL/CSV OU MANUAL) */}
          {wizardStep === 2 && (
            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-500" />
                    Passo 2: Importar Lista de Participantes
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Faça o upload de uma planilha com os nomes ou cadastre manualmente os participantes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSampleSpreadsheet}
                    className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Baixar Planilha Modelo</span>
                  </button>
                </div>
              </div>

              {/* Dropzone de Planilha */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-center">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Arraste ou envie a planilha (.xlsx, .xls, .csv)
                </h4>
                <p className="text-xs text-neutral-400 mt-1 mb-3">
                  O sistema reconhece automaticamente colunas como "Nome", "CPF", "Documento", "E-mail" e "Função".
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>{isParsingSpreadsheet ? 'Lendo planilha...' : 'Selecionar Planilha Excel'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    disabled={isParsingSpreadsheet}
                    onChange={handleSpreadsheetUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Erros da planilha se houver */}
              {spreadsheetErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Avisos na Leitura da Planilha:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {spreadsheetErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabela de Participantes Carregados */}
              {recipients.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {recipients.length} participante(s) pronto(s) para certificação:
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecipients([])}
                      className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
                    >
                      Limpar Lista
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold text-[11px] uppercase sticky top-0">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Nome do Participante</th>
                          <th className="p-3">CPF / Documento</th>
                          <th className="p-3">E-mail</th>
                          <th className="p-3">Papel</th>
                          <th className="p-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {recipients.map((r, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <td className="p-3 font-mono text-neutral-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-neutral-900 dark:text-white">{r.name}</td>
                            <td className="p-3 font-mono text-neutral-600 dark:text-neutral-300">{r.document}</td>
                            <td className="p-3 text-neutral-500">{r.email || '-'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 uppercase">
                                {r.role}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(idx)}
                                className="p-1 text-neutral-400 hover:text-rose-500 transition"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Adição Manual */}
              <div className="pt-2">
                {!showManualAdd ? (
                  <button
                    type="button"
                    onClick={() => setShowManualAdd(true)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Participante Manualmente
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">Cadastro Manual de Participante:</span>
                      <button
                        type="button"
                        onClick={() => setShowManualAdd(false)}
                        className="text-xs text-neutral-400 hover:text-neutral-600"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Nome Completo *"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="CPF (000.000.000-00) ou Matrícula"
                        value={manualDoc}
                        onChange={handleManualDocChange}
                        maxLength={18}
                        className="p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white"
                      />
                      <input
                        type="email"
                        placeholder="E-mail (opcional)"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddManualParticipant}
                      className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Inserir na Lista
                    </button>
                  </div>
                )}
              </div>

              {/* Botões Voltar / Avançar */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={recipients.length === 0}
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span>Avançar: Dados do Curso ({recipients.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 3: DADOS DO CURSO / EVENTO */}
          {wizardStep === 3 && (
            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Passo 3: Configurar Dados da Formação ou Evento
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Estes dados serão grafados em todos os certificados do lote com validação oficial da Lei 14.063/2020.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Título do Curso */}
                <div className="md:col-span-2">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Nome do Curso / Palestra / Formação Continuada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Formação Continuada em Avaliação e Escala de Proficiência SAEB 2026"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Secretaria / Órgão Emissor (Travado pela lotação do usuário) */}
                <div className="md:col-span-2">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Secretaria Responsável pela Formação (Lotação do Usuário)
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={secretariatName}
                    className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-bold cursor-not-allowed"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Preenchida automaticamente pela secretaria em que seu usuário está lotado (alteração bloqueada).
                  </p>
                </div>

                {/* Tipo de Evento */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Tipo de Atividade
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  >
                    <option value="curso">Curso</option>
                    <option value="palestra">Palestra</option>
                    <option value="formacao">Formação Continuada</option>
                    <option value="oficina">Oficina Pedagógica</option>
                  </select>
                </div>

                {/* Carga Horária */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Carga Horária Total (Horas) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={workloadHours}
                    onChange={(e) => setWorkloadHours(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Data Início */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Data Fim */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Data de Término (Opcional)
                  </label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Nome do Assinante */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Nome da Autoridade Emissora (Assinante) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Profª Ana Lúcia Silveira"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Cargo do Assinante */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Cargo / Função do Assinante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Secretária Municipal de Educação"
                    value={issuerRole}
                    onChange={(e) => setIssuerRole(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Conteúdo Programático Opcional */}
                <div className="md:col-span-2">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Conteúdo Programático / Módulos (Opcional para o Verso)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Módulo 1: Introdução à BNCC; Módulo 2: Matriz de Referência do SAEB..."
                    value={programContent}
                    onChange={(e) => setProgramContent(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Botões Voltar / Avançar */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={!courseTitle.trim() || !issuerName.trim()}
                  onClick={() => setWizardStep(4)}
                  className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span>Revisar e Processar Lote</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 4: PROCESSAMENTO EM LOTE & DOWNLOAD DO ZIP */}
          {wizardStep === 4 && (
            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-amber-500" />
                  Passo 4: Processamento & Download em Lote
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Revise o resumo antes de disparar a geração em massa com QR Code de autenticidade individual.
                </p>
              </div>

              {/* Card Resumo do Lote */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
                <div>
                  <span className="text-neutral-400 font-bold uppercase block text-[10px]">Curso / Evento</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm block mt-0.5">{courseTitle}</span>
                  <span className="text-neutral-500 font-mono text-[11px] block">{eventType.toUpperCase()} · {workloadHours} Horas</span>
                </div>

                <div>
                  <span className="text-neutral-400 font-bold uppercase block text-[10px]">Público a Certificar</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm block mt-0.5">
                    {recipients.length} Participantes
                  </span>
                  <span className="text-neutral-500 text-[11px] block">Modelo: {backgroundMode === 'preset' ? presetTheme : 'Fundo Customizado'}</span>
                </div>

                <div>
                  <span className="text-neutral-400 font-bold uppercase block text-[10px]">Autoridade Emissora</span>
                  <span className="font-bold text-neutral-900 dark:text-white block mt-0.5">{issuerName}</span>
                  <span className="text-neutral-500 text-[11px] block">{issuerRole}</span>
                </div>
              </div>

              {/* Barra de Progresso Durante a Geração */}
              {isGeneratingBatch && (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Processando {generationProgress.current} de {generationProgress.total} Certificados em PDF...
                    </h4>
                    <p className="text-xs text-neutral-500 font-mono mt-1">
                      {generationProgress.statusText}
                    </p>
                  </div>
                  {/* Barra */}
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-200"
                      style={{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Resultado Concluído */}
              {generatedBatchResult && !isGeneratingBatch && (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                          Lote Concluído com Sucesso!
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                          {generatedBatchResult.blobs.length} certificados em alta definição foram emitidos e catalogados.
                        </p>
                      </div>
                    </div>

                    {/* Botão de Destaque ZIP */}
                    <button
                      type="button"
                      onClick={handleDownloadAllZip}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>📦 Baixar Todos os Certificados em ZIP</span>
                    </button>
                  </div>

                  {/* Lista com Downloads Individuais */}
                  <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      Downloads Individuais do Lote:
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {generatedBatchResult.certificates.map(cert => (
                        <div
                          key={cert.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                        >
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white block">{cert.recipient_name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">Hash: {cert.validation_hash} · {cert.recipient_document}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewModalCert(cert)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-amber-500 transition cursor-pointer"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const renderEl = document.getElementById(`certificate-render-${cert.id}`);
                                if (renderEl) {
                                  downloadCertificatePdf(renderEl, `Certificado_${cert.recipient_name}.pdf`);
                                }
                              }}
                              className="px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Baixar PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between">
                <button
                  type="button"
                  disabled={isGeneratingBatch}
                  onClick={() => setWizardStep(3)}
                  className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>

                {!generatedBatchResult ? (
                  <button
                    type="button"
                    disabled={isGeneratingBatch}
                    onClick={handleStartBatchProcessing}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Iniciar Emissão em Lote ({recipients.length} Certificados)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedBatchResult(null);
                      setRecipients([]);
                      setCourseTitle('');
                      setWizardStep(1);
                    }}
                    className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Criar Outro Lote
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: BANCO DE CERTIFICADOS (HISTÓRICO & 2ª VIA) */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Nome do Aluno, CPF ou Código Hash (Ex: CERT-2026)..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bankFilterType}
                onChange={(e) => setBankFilterType(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">Todas as Modalidades</option>
                <option value="curso">Cursos</option>
                <option value="palestra">Palestras</option>
                <option value="formacao">Formação Continuada</option>
                <option value="oficina">Oficinas</option>
              </select>

              <a
                href="/validar-documento"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-500 hover:text-white transition cursor-pointer"
                title="Abrir o Portal Público de Validação em nova aba"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Validador Público</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={loadHistory}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                title="Recarregar"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Barra de Ações em Lote para Super Admin */}
          {isSuperAdmin && selectedCertIds.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedCertIds.length}
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-950 dark:text-rose-200 block">
                    {selectedCertIds.length === 1 ? '1 certificado selecionado' : `${selectedCertIds.length} certificados selecionados`}
                  </span>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 block font-medium">
                    Ação administrativa com poderes de Super Admin
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCertIds([])}
                  className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer font-medium"
                >
                  Desmarcar
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir do Banco ({selectedCertIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabela do Banco de Certificados */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800/70 text-neutral-500 dark:text-neutral-400 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    {isSuperAdmin && (
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredHistory.length > 0 && selectedCertIds.length === filteredHistory.length}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                          title="Selecionar Todos"
                        />
                      </th>
                    )}
                    <th className="p-4">Participante / CPF</th>
                    <th className="p-4">Atividade Formativa</th>
                    <th className="p-4">Carga Horária</th>
                    <th className="p-4">Código de Autenticidade</th>
                    <th className="p-4">Vias / Emissões</th>
                    <th className="p-4 text-right">Ações Oficiais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredHistory.map((cert) => {
                    const isSecondIssue = (cert.download_count || 1) > 1;
                    const isSelected = selectedCertIds.includes(cert.id);

                    return (
                      <tr key={cert.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition ${isSelected ? 'bg-rose-500/5 dark:bg-rose-500/10' : ''}`}>
                        {isSuperAdmin && (
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectCert(cert.id)}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-4">
                          <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                            {cert.recipient_name}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 block">
                            Doc: {cert.recipient_document} {cert.recipient_email ? `· ${cert.recipient_email}` : ''}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                            {cert.template?.title || 'Curso de Capacitação'}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mt-1 inline-block">
                            {cert.template?.event_type || 'Curso'}
                          </span>
                        </td>

                        <td className="p-4 font-mono">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {cert.template?.workload_hours || 40}h
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            {new Date(cert.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-mono font-bold text-[11px] bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md text-amber-600 dark:text-amber-400 border border-neutral-200 dark:border-neutral-700 select-all">
                            {cert.validation_hash}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            isSecondIssue
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}>
                            {cert.download_count} {cert.download_count === 1 ? 'via emitida' : 'vias (2ª Via)'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Copiar Link de Validação */}
                            <button
                              type="button"
                              onClick={() => handleCopyValidationLink(cert.qr_code_url)}
                              className="p-2 rounded-xl text-neutral-500 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Copiar Link de Autenticidade"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Abrir no Validador Público */}
                            <a
                              href={`/validar-documento?codigo=${encodeURIComponent(cert.validation_hash)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl text-neutral-500 hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Verificar no Portal Público de Autenticidade"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </a>

                            {/* Visualizar */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalCert(cert)}
                              className="p-2 rounded-xl text-neutral-500 hover:text-sky-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="Visualizar Certificado"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Emitir 2ª Via */}
                            <button
                              type="button"
                              onClick={() => handleDownloadSecondIssue(cert)}
                              className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 hover:shadow cursor-pointer"
                              title="Emitir Segunda Via em PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>2ª Via</span>
                            </button>

                            {/* Excluir (Apenas Super Admin) */}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setCertToDelete(cert)}
                                className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Excluir Certificado do Banco (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredHistory.length === 0 && !isLoadingHistory && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="p-12 text-center text-neutral-400">
                        <Award className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                          Nenhum certificado encontrado
                        </h4>
                        <p className="text-xs text-neutral-500 mt-1">
                          Use a aba "Novo Lote de Certificados" para gerar as primeiras emissões.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prévia do Certificado */}
      {previewModalCert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-5xl w-full shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Visualização do Certificado Oficial
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {previewModalCert.validation_hash} · {previewModalCert.recipient_name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setCertToDelete(previewModalCert);
                    }}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    title="Excluir do Banco de Certificados"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadSecondIssue(previewModalCert)}
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalCert(null)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Container do Certificado com Escala */}
            <div className="overflow-x-auto flex justify-center p-2 bg-neutral-100 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div style={{ width: '840px', height: '595px', overflow: 'hidden' }} className="relative shadow-xl">
                <CertificateDocumentPDF
                  certificate={previewModalCert}
                  template={previewModalCert.template || {
                    id: previewModalCert.template_id,
                    institution_id: previewModalCert.institution_id,
                    title: 'Curso de Formação',
                    event_type: 'curso',
                    workload_hours: 40,
                    event_date_start: previewModalCert.created_at.split('T')[0],
                    issuer_name: 'Secretaria Municipal de Educação',
                    issuer_role: 'Direção Geral',
                    background_mode: 'preset',
                    preset_theme: 'classico_azul'
                  }}
                  institution={currentInstitution}
                  scale={0.75}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Individual (Super Admin) */}
      {certToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Excluir Certificado Oficial?
              </h3>
              <p className="text-xs text-neutral-500">
                Esta ação é definitiva e removerá o certificado do banco e do validador público de autenticidade (QR Code).
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
              <p className="font-bold text-neutral-800 dark:text-neutral-200">
                {certToDelete.recipient_name}
              </p>
              <p className="text-[11px] font-mono text-neutral-500">
                Doc: {certToDelete.recipient_document} · Chave: {certToDelete.validation_hash}
              </p>
              <p className="text-[11px] text-neutral-500">
                Atividade: {certToDelete.template?.title || 'Curso'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCertToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Lote (Super Admin) */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Excluir {selectedCertIds.length} Certificados?
              </h3>
              <p className="text-xs text-neutral-500">
                Você está prestes a excluir permanentemente {selectedCertIds.length} certificados selecionados do banco de dados. Essa ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBatch}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir {selectedCertIds.length} Itens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elemento Escondido no DOM para Renderização Assíncrona dos PDFs de Lote */}
      <div 
        ref={hiddenRenderContainerRef}
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}
      >
        {renderQueueCert && (
          <CertificateDocumentPDF
            certificate={renderQueueCert.cert}
            template={renderQueueCert.tmpl}
            institution={currentInstitution}
            scale={1}
          />
        )}
      </div>
    </div>
  );
};

export default EducationCertificatesManager;

