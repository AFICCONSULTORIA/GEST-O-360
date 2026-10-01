import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, MessageSquare, Lightbulb, ThumbsUp, HelpCircle, 
  AlertTriangle, ShieldAlert, CheckCircle2, Clock, Search, 
  Filter, ArrowRight, ArrowUpRight, Send, Check, AlertCircle, 
  Printer, Download, ShieldCheck, Eye, EyeOff, User, Phone, 
  Mail, MapPin, Calendar, FileText, ChevronRight, X, ExternalLink,
  RefreshCw, CornerDownRight, PlusCircle, CheckCircle, Tag,
  Paperclip, Upload, Trash2, Maximize2, File
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OuvidoriaManifestacao, OuvidoriaStatus, OuvidoriaTipo, AdminUser, Institution, OuvidoriaAnexo } from '../../types';
import { DEMO_OUVIDORIA_MANIFESTACOES } from './demoData';
import { showToast } from '../../components/ui/Toast';
import { DemoFillButton } from '../../components/DemoFillButton';

interface OuvidoriaModuleProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
}

const SECRETARIAS_OPCOES = [
  'Secretaria de Obras e Serviços Urbanos',
  'Secretaria Municipal de Saúde',
  'Secretaria de Educação e Cultura',
  'Secretaria de Meio Ambiente e Posturas',
  'Secretaria de Assistência Social',
  'Secretaria de Finanças e Tributação',
  'Secretaria de Trânsito e Mobilidade',
  'Gabinete do Prefeito',
  'Procuradoria Geral do Município'
];

const MODELOS_RESPOSTA = [
  {
    titulo: 'Providência Adotada (Obras/Serviços)',
    texto: 'Prezado(a) cidadão(ã), informamos que a equipe técnica realizou a vistoria e executou o serviço solicitado na localidade indicada. Agradecemos sua colaboração na melhoria dos serviços públicos do nosso município.'
  },
  {
    titulo: 'Em Cronograma de Execução',
    texto: 'Prezado(a) cidadão(ã), sua demanda foi analisada e incluída no cronograma de obras e manutenção do setor responsável, com previsão de atendimento nos próximos dias. Você pode acompanhar a atualização por este protocolo.'
  },
  {
    titulo: 'Agradecimento por Elogio',
    texto: 'Prezado(a) cidadão(ã), a Administração Municipal agradece imensamente seu reconhecimento. Seu elogio foi registrado formalmente e encaminhado à chefia e à equipe elogiada para anotação em elogio funcional.'
  },
  {
    titulo: 'Denúncia em Apuração pela Fiscalização',
    texto: 'Informamos que a denúncia foi acolhida sob protocolo sigiloso e encaminhada ao corpo de fiscais competentes para realização de diligência in loco e lavratura das medidas legais pertinentes.'
  }
];

export function OuvidoriaModule({ currentInstitution, currentUser }: OuvidoriaModuleProps) {
  const isSuperAdmin = currentUser?.role === 'Super Admin' || (currentUser?.role as string)?.toLowerCase() === 'super admin' || (currentUser?.role as string)?.toLowerCase() === 'super_admin';
  const [manifestacoes, setManifestacoes] = useState<OuvidoriaManifestacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSecretaria, setFilterSecretaria] = useState<string>('Todas');
  const [filterPrazo, setFilterPrazo] = useState<'Todos' | 'No Prazo' | 'Vencendo' | 'Vencidos'>('Todos');

  // Modal de Detalhes / Despacho
  const [selectedItem, setSelectedItem] = useState<OuvidoriaManifestacao | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<'resposta' | 'encaminhar' | 'prorrogar'>('resposta');

  // Formulário de Resposta / Encaminhamento
  const [respostaTexto, setRespostaTexto] = useState('');
  const [novaSecretariaDestino, setNovaSecretariaDestino] = useState('');
  const [despachoNota, setDespachoNota] = useState('');
  const [justificativaProrrogacao, setJustificativaProrrogacao] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Anexos da Resposta Oficial
  const [anexosResposta, setAnexosResposta] = useState<OuvidoriaAnexo[]>([]);
  const [isUploadingRespostaAnexo, setIsUploadingRespostaAnexo] = useState(false);
  const [uploadRespostaProgress, setUploadRespostaProgress] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getNormalizedAnexo = (anexo: string | OuvidoriaAnexo): OuvidoriaAnexo => {
    if (typeof anexo === 'string') {
      const filename = anexo.split('/').pop()?.split('?')[0] || 'documento';
      const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename);
      return {
        name: filename,
        url: anexo,
        type: isImg ? 'image/jpeg' : 'application/pdf',
        size: 'Arquivo'
      };
    }
    return anexo;
  };

  const handleUploadRespostaAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (anexosResposta.length + files.length > 5) {
      showToast('Limite de 5 anexos atingido na resposta.', 'warning');
      e.target.value = '';
      return;
    }

    setIsUploadingRespostaAnexo(true);
    const newAnexos: OuvidoriaAnexo[] = [...anexosResposta];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        showToast(`O arquivo ${file.name} ultrapassa o limite de 10MB.`, 'warning');
        continue;
      }
      setUploadRespostaProgress(`Enviando ${file.name}...`);

      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `ouvidoria-resp-${Date.now()}-${safeName}`;

      let fileUrl = '';
      try {
        const { error: uploadError } = await supabase.storage
          .from('protocolos')
          .upload(filename, file, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('protocolos').getPublicUrl(filename);
          if (data?.publicUrl) fileUrl = data.publicUrl;
        }
      } catch (err) {
        console.warn('Storage indisponível, usando fallback seguro:', err);
      }

      if (!fileUrl) {
        try {
          fileUrl = await readFileAsDataUrl(file);
        } catch (err) {
          continue;
        }
      }

      newAnexos.push({
        name: file.name,
        size: formatBytes(file.size),
        type: file.type || 'application/octet-stream',
        url: fileUrl,
      });
    }

    setAnexosResposta(newAnexos);
    setIsUploadingRespostaAnexo(false);
    setUploadRespostaProgress(null);
    e.target.value = '';
  };

  const handleRemoveRespostaAnexo = (index: number) => {
    setAnexosResposta(prev => prev.filter((_, idx) => idx !== index));
  };

  // Busca dados
  const fetchManifestacoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ouvidoria_manifestacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback para localStorage ou dados de demonstração
        const local = localStorage.getItem('gestao360_ouvidoria_manifestacoes');
        if (local) {
          try {
            setManifestacoes(JSON.parse(local));
            return;
          } catch (e) {
            console.error('Erro ao ler ouvidoria local:', e);
          }
        }
        // Se ainda não tiver nada, carrega mock demo inicial
        setManifestacoes(DEMO_OUVIDORIA_MANIFESTACOES);
        localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(DEMO_OUVIDORIA_MANIFESTACOES));
        return;
      }

      setManifestacoes(data as OuvidoriaManifestacao[]);
    } catch (err) {
      console.error(err);
      setManifestacoes(DEMO_OUVIDORIA_MANIFESTACOES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifestacoes();
  }, [currentInstitution?.id]);

  // Cálculos do Semáforo de Prazos (SLA)
  const getSlaStatus = (prazoIso: string, status: OuvidoriaStatus) => {
    if (status === 'Respondida' || status === 'Arquivada') {
      return { label: 'Concluído', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', days: 0 };
    }
    const now = new Date().getTime();
    const deadline = new Date(prazoIso).getTime();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Atrasada (${Math.abs(diffDays)}d)`, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', days: diffDays };
    }
    if (diffDays <= 5) {
      return { label: `Vence em ${diffDays}d`, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', days: diffDays };
    }
    return { label: `${diffDays} dias restantes`, color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', days: diffDays };
  };

  // KPIs
  const totalManifestacoes = manifestacoes.length;
  const totalNovas = manifestacoes.filter(m => m.status === 'Nova').length;
  const totalEmAnalise = manifestacoes.filter(m => m.status === 'Em Analise' || m.status === 'Encaminhada' || m.status === 'Prorrogada').length;
  const totalRespondidas = manifestacoes.filter(m => m.status === 'Respondida').length;
  const totalAtrasadas = manifestacoes.filter(m => {
    if (m.status === 'Respondida' || m.status === 'Arquivada') return false;
    return new Date(m.prazo_limite).getTime() < Date.now();
  }).length;

  // Filtragem da Lista
  const manifestacoesFiltradas = manifestacoes.filter((item) => {
    // Busca textual
    const matchesSearch = 
      item.protocolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.bairro && item.bairro.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.cidadao_nome && item.cidadao_nome.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filtro por Tipo
    if (filterTipo !== 'Todos' && item.tipo !== filterTipo) return false;

    // Filtro por Status
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;

    // Filtro por Secretaria
    if (filterSecretaria !== 'Todas' && item.secretaria_destino !== filterSecretaria && item.secretaria_sugerida !== filterSecretaria) {
      return false;
    }

    // Filtro por Prazo SLA
    if (filterPrazo !== 'Todos') {
      const isConcluido = item.status === 'Respondida' || item.status === 'Arquivada';
      const diffDays = Math.ceil((new Date(item.prazo_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (filterPrazo === 'Vencidos') {
        if (isConcluido || diffDays >= 0) return false;
      } else if (filterPrazo === 'Vencendo') {
        if (isConcluido || diffDays < 0 || diffDays > 5) return false;
      } else if (filterPrazo === 'No Prazo') {
        if (!isConcluido && diffDays < 0) return false;
      }
    }

    return true;
  });

  // Ação: Responder Manifestação
  const handleSaveResposta = async () => {
    if (!selectedItem || !respostaTexto.trim()) {
      showToast('Por favor, escreva a resposta oficial antes de salvar.', 'warning');
      return;
    }

    setIsProcessing(true);
    const nowIso = new Date().toISOString();
    const updatedItem: OuvidoriaManifestacao = {
      ...selectedItem,
      resposta_oficial: respostaTexto.trim(),
      respondido_por: currentUser?.name || 'Ouvidoria Geral',
      respondido_em: nowIso,
      status: 'Respondida',
      anexos_resposta: [...(selectedItem.anexos_resposta || []), ...anexosResposta],
      updated_at: nowIso
    };

    try {
      await supabase
        .from('ouvidoria_manifestacoes')
        .update({
          resposta_oficial: updatedItem.resposta_oficial,
          respondido_por: updatedItem.respondido_por,
          respondido_em: updatedItem.respondido_em,
          status: 'Respondida',
          anexos_resposta: updatedItem.anexos_resposta,
          updated_at: nowIso
        })
        .eq('id', selectedItem.id);

      // Atualiza lista local
      const updatedList = manifestacoes.map(m => m.id === selectedItem.id ? updatedItem : m);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      setSelectedItem(updatedItem);
      setAnexosResposta([]);
      showToast('Resposta oficial registrada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gravar resposta. Verifique a conexão.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Ação: Encaminhar para Secretaria
  const handleEncaminhar = async () => {
    if (!selectedItem || !novaSecretariaDestino) {
      showToast('Selecione a secretaria de destino.', 'warning');
      return;
    }

    setIsProcessing(true);
    const nowIso = new Date().toISOString();
    const updatedItem: OuvidoriaManifestacao = {
      ...selectedItem,
      secretaria_destino: novaSecretariaDestino,
      status: 'Encaminhada',
      updated_at: nowIso
    };

    try {
      await supabase
        .from('ouvidoria_manifestacoes')
        .update({
          secretaria_destino: novaSecretariaDestino,
          status: 'Encaminhada',
          updated_at: nowIso
        })
        .eq('id', selectedItem.id);

      const updatedList = manifestacoes.map(m => m.id === selectedItem.id ? updatedItem : m);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      setSelectedItem(updatedItem);
      showToast(`Manifestação encaminhada com sucesso para ${novaSecretariaDestino}!`, 'success');
      setNovaSecretariaDestino('');
      setDespachoNota('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao encaminhar.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Ação: Prorrogar Prazo (+10 dias)
  const handleProrrogarPrazo = async () => {
    if (!selectedItem || !justificativaProrrogacao.trim()) {
      showToast('Informe a justificativa legal para prorrogação do prazo.', 'warning');
      return;
    }

    setIsProcessing(true);
    const prazoAtual = new Date(selectedItem.prazo_limite);
    prazoAtual.setDate(prazoAtual.getDate() + 10);
    const novoPrazoIso = prazoAtual.toISOString();
    const nowIso = new Date().toISOString();

    const updatedItem: OuvidoriaManifestacao = {
      ...selectedItem,
      prazo_limite: novoPrazoIso,
      prorrogado: true,
      justificativa_prorrogacao: justificativaProrrogacao.trim(),
      status: 'Prorrogada',
      updated_at: nowIso
    };

    try {
      await supabase
        .from('ouvidoria_manifestacoes')
        .update({
          prazo_limite: novoPrazoIso,
          prorrogado: true,
          justificativa_prorrogacao: justificativaProrrogacao.trim(),
          status: 'Prorrogada',
          updated_at: nowIso
        })
        .eq('id', selectedItem.id);

      const updatedList = manifestacoes.map(m => m.id === selectedItem.id ? updatedItem : m);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      setSelectedItem(updatedItem);
      showToast('Prazo prorrogado por +10 dias conforme Lei 13.460/2017.', 'success');
      setJustificativaProrrogacao('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao prorrogar prazo.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Ação: Exclusão Exclusiva para Super Admin
  const handleDeleteManifestacao = async (item: OuvidoriaManifestacao) => {
    if (!isSuperAdmin) {
      showToast('Apenas o Super Admin tem permissão para excluir manifestações.', 'error');
      return;
    }

    const confirmMsg = `Tem certeza que deseja excluir permanentemente a manifestação "${item.protocolo}" (${item.assunto})?\n\nEsta ação é irreversível e removerá todos os registros.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Tenta excluir no Supabase
      const { error } = await supabase
        .from('ouvidoria_manifestacoes')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.warn('Erro ao deletar no Supabase:', error.message);
      }

      // 2. Atualiza estado e localStorage
      const updatedList = manifestacoes.filter(m => m.id !== item.id);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }

      showToast(`Manifestação ${item.protocolo} excluída com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir manifestação.', 'error');
    }
  };

  // Funções de Proteção e Anonimização LGPD (Lei Federal nº 13.709/2018)
  const maskNameForLgpd = (name?: string, privacidade?: string): string => {
    if (!name || privacidade === 'anonima') return '[MANIFESTAÇÃO ANÔNIMA]';
    if (privacidade === 'sigilosa') {
      return '[IDENTIDADE EM SIGILO LEGAL - ART. 10 §2º LEI 13.460/2017]';
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return `${parts[0].slice(0, 3)}*** [Protegido LGPD]`;
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first} ${'*'.repeat(5)} ${last.slice(0, 1)}*** (Identificado na Ouvidoria)`;
  };

  const maskCpfForLgpd = (cpf?: string): string => {
    if (!cpf) return '[Não informado]';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.***-** (Anonimizado - Lei 13.709/2018)`;
    }
    return '***.***.***-** (Anonimizado - LGPD)';
  };

  const maskPhoneForLgpd = (phone?: string): string => {
    if (!phone) return '[Não informado]';
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      const ddd = clean.slice(0, 2);
      const lastDigits = clean.slice(-2);
      return `(${ddd}) *****-**${lastDigits} (Protegido por Sigilo)`;
    }
    return '(**) *****-**** (Protegido por Sigilo)';
  };

  const maskEmailForLgpd = (email?: string): string => {
    if (!email) return '[Não informado]';
    const [user, domain] = email.split('@');
    if (!domain) return '[Protegido pela LGPD]';
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : `${user[0]}***`;
    return `${maskedUser}@${domain} (Protegido pela LGPD)`;
  };

  // Impressão com Aplicação Rígida da LGPD
  const handlePrintWithLgpd = (item: OuvidoriaManifestacao) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para gerar a impressão do relatório.');
      return;
    }

    const maskedNome = maskNameForLgpd(item.cidadao_nome, item.privacidade);
    const maskedCpf = maskCpfForLgpd(item.cidadao_cpf);
    const maskedPhone = maskPhoneForLgpd(item.cidadao_telefone);
    const maskedEmail = maskEmailForLgpd(item.cidadao_email);
    const instName = currentInstitution?.name || 'Prefeitura Municipal';
    const dataAbertura = new Date(item.created_at).toLocaleDateString('pt-BR');
    const horaAbertura = new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const prazoLimite = new Date(item.prazo_limite).toLocaleDateString('pt-BR');
    const anexosCount = item.anexos ? item.anexos.length : 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Ouvidoria Municipal - Protocolo ${item.protocolo} (LGPD)</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111827;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .inst-title {
            font-size: 18px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
            text-transform: uppercase;
          }
          .sub-title {
            font-size: 13px;
            color: #4b5563;
            margin: 2px 0 0 0;
            font-weight: bold;
          }
          .lgpd-badge {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            color: #166534;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
            text-align: right;
          }
          .alert-lgpd {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 10px 14px;
            margin-bottom: 16px;
            font-size: 11px;
            color: #1e40af;
            border-radius: 0 6px 6px 0;
          }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #1f2937;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
            margin: 16px 0 8px 0;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
          }
          .field {
            margin-bottom: 6px;
          }
          .field-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #6b7280;
            font-weight: bold;
            display: block;
          }
          .field-value {
            font-size: 13px;
            font-weight: 600;
            color: #111827;
          }
          .text-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            white-space: pre-wrap;
            margin-top: 4px;
            font-size: 12px;
          }
          .footer-signatures {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sig-line {
            width: 45%;
            border-top: 1px solid #111827;
            text-align: center;
            padding-top: 6px;
            font-size: 11px;
            font-weight: bold;
          }
          .footer-note {
            margin-top: 25px;
            font-size: 10px;
            color: #6b7280;
            text-align: center;
            border-top: 1px solid #f3f4f6;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="inst-title">${instName}</h1>
            <p class="sub-title">OUVIDORIA MUNICIPAL · RELATÓRIO DE TRAMITAÇÃO</p>
          </div>
          <div class="lgpd-badge">
            PROCESSO COM PROTEÇÃO LGPD<br>
            <span style="font-size: 9px; font-weight: normal;">Lei Federal nº 13.709/2018</span>
          </div>
        </div>

        <div class="alert-lgpd">
          <strong>Aviso de Confidencialidade e LGPD:</strong> Os dados de identificação e contato do manifestante foram anonimizados/mascarados neste documento impresso em estrita observância aos Arts. 7º, 14 e 46 da Lei Geral de Proteção de Dados (Lei 13.709/2018) e ao Art. 10, §2º da Lei 13.460/2017. A identidade completa permanece sob guarda sigilosa exclusiva do Ouvidor Geral.
        </div>

        <div class="section-title">1. Dados do Registro & Protocolo</div>
        <div class="grid">
          <div class="field">
            <span class="field-label">Protocolo Oficial</span>
            <span class="field-value" style="font-size: 15px; color: #059669; font-family: monospace;">${item.protocolo}</span>
          </div>
          <div class="field">
            <span class="field-label">Tipo de Manifestação</span>
            <span class="field-value">${item.tipo}</span>
          </div>
          <div class="field">
            <span class="field-label">Data e Hora de Registro</span>
            <span class="field-value">${dataAbertura} às ${horaAbertura}</span>
          </div>
          <div class="field">
            <span class="field-label">Prazo Legal Limite (Lei 13.460/2017)</span>
            <span class="field-value">${prazoLimite} (${item.prorrogado ? 'Prorrogado por +10 dias' : 'Prazo ordinário 20 dias'})</span>
          </div>
          <div class="field">
            <span class="field-label">Status da Demanda</span>
            <span class="field-value">${item.status}</span>
          </div>
          <div class="field">
            <span class="field-label">Secretaria / Destino</span>
            <span class="field-value">${item.secretaria_destino || item.secretaria_sugerida || 'Triagem da Ouvidoria'}</span>
          </div>
        </div>

        <div class="section-title">2. Identificação do Manifestante (Protegido por LGPD)</div>
        <div class="grid">
          <div class="field">
            <span class="field-label">Nome do Munícipe</span>
            <span class="field-value">${maskedNome}</span>
          </div>
          <div class="field">
            <span class="field-label">CPF (Mascarado)</span>
            <span class="field-value">${maskedCpf}</span>
          </div>
          <div class="field">
            <span class="field-label">Telefone de Contato</span>
            <span class="field-value">${maskedPhone}</span>
          </div>
          <div class="field">
            <span class="field-label">E-mail Cadastrado</span>
            <span class="field-value">${maskedEmail}</span>
          </div>
        </div>

        <div class="section-title">3. Localização do Fato</div>
        <div class="grid">
          <div class="field">
            <span class="field-label">Bairro / Comunidade</span>
            <span class="field-value">${item.bairro || 'Não informado'}</span>
          </div>
          <div class="field">
            <span class="field-label">Logradouro / Rua</span>
            <span class="field-value">${item.logradouro || 'Não informado'}</span>
          </div>
          <div class="field" style="grid-column: span 2;">
            <span class="field-label">Ponto de Referência</span>
            <span class="field-value">${item.ponto_referencia || 'Não informado'}</span>
          </div>
        </div>

        <div class="section-title">4. Teor da Manifestação</div>
        <div class="field">
          <span class="field-label">Assunto</span>
          <span class="field-value" style="font-size: 14px;">${item.assunto}</span>
        </div>
        <div class="field">
          <span class="field-label">Descrição dos Fatos</span>
          <div class="text-box">${item.descricao}</div>
        </div>

        <div class="section-title">5. Anexos e Evidências (${anexosCount} arquivo(s))</div>
        <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">
          ${anexosCount > 0 
            ? item.anexos!.map((a: any) => `• ${typeof a === 'string' ? a : a.name} (${typeof a === 'string' ? 'Anexo' : a.size || 'Arquivo'})`).join('<br>')
            : 'Nenhum documento ou foto anexado pelo munícipe.'}
        </div>

        ${item.resposta_oficial ? `
          <div class="section-title">6. Parecer / Resposta Oficial Emitida</div>
          <div class="text-box" style="background: #f0fdf4; border-color: #a7f3d0;">
            ${item.resposta_oficial}
          </div>
          <div style="font-size: 11px; color: #047857; margin-top: 4px;">
            Emitido por: <strong>${item.respondido_por || 'Ouvidoria Geral'}</strong> em ${item.respondido_em ? new Date(item.respondido_em).toLocaleDateString('pt-BR') : dataAbertura}
          </div>
        ` : ''}

        <div class="footer-signatures">
          <div class="sig-line">
            Ouvidoria Geral do Município<br>
            <span style="font-size: 9px; font-weight: normal; color: #6b7280;">Responsável pela Triagem & Sigilo</span>
          </div>
          <div class="sig-line">
            Recebido na Secretaria Competente<br>
            <span style="font-size: 9px; font-weight: normal; color: #6b7280;">Data: ____/____/________ · Rubrica</span>
          </div>
        </div>

        <div class="footer-note">
          Plataforma GESTÃO 360 · Conforme Lei nº 13.460/2017 e Lei nº 13.709/2018 (LGPD). Este documento possui validade administrativa interna.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getTipoBadge = (tipo: OuvidoriaTipo) => {
    switch (tipo) {
      case 'Elogio':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"><ThumbsUp size={12} /> Elogio</span>;
      case 'Sugestao':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"><Lightbulb size={12} /> Sugestão</span>;
      case 'Solicitacao':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400"><HelpCircle size={12} /> Solicitação</span>;
      case 'Reclamacao':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400"><AlertTriangle size={12} /> Reclamação</span>;
      case 'Denuncia':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"><ShieldAlert size={12} /> Denúncia</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">{tipo}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* ================= HEADER DO MÓDULO ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck size={14} />
            <span>Gestão das Secretarias · Lei Federal nº 13.460/2017</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Ouvidoria Municipal Geral
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Painel unificado para triagem, tramitação entre secretarias, controle de prazos legais e resposta aos cidadãos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DemoFillButton moduleKey="ouvidoria" onSuccess={fetchManifestacoes} />

          <a
            href="/ouvidoria"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            title="Acessar o portal como o munícipe vê"
          >
            <ExternalLink size={14} />
            <span>Abrir Portal do Cidadão (/ouvidoria)</span>
          </a>

          <button
            onClick={() => window.print()}
            className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl transition-all shadow-sm"
            title="Imprimir Relatório Geral"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ================= CARDS DE INDICADORES (KPIS) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Recebidas
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">
              {totalManifestacoes}
            </span>
            <MessageSquare size={20} className="text-neutral-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Novas / Triagem
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {totalNovas}
            </span>
            <AlertCircle size={20} className="text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Em Análise Setorial
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-sky-600 dark:text-sky-400">
              {totalEmAnalise}
            </span>
            <Clock size={20} className="text-sky-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Respondidas
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {totalRespondidas}
            </span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Atrasadas (SLA)
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {totalAtrasadas}
            </span>
            <ShieldAlert size={20} className="text-rose-500" />
          </div>
        </div>
      </div>

      {/* ================= BARRA DE FILTROS PRÁTICOS ================= */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por protocolo, cidadão, assunto ou bairro..."
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro Tipo */}
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Reclamacao">Reclamações</option>
            <option value="Solicitacao">Solicitações</option>
            <option value="Denuncia">Denúncias</option>
            <option value="Sugestao">Sugestões</option>
            <option value="Elogio">Elogios</option>
          </select>

          {/* Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Nova">Novas</option>
            <option value="Em Analise">Em Análise</option>
            <option value="Encaminhada">Encaminhadas</option>
            <option value="Prorrogada">Prorrogadas</option>
            <option value="Respondida">Respondidas</option>
          </select>

          {/* Filtro Prazo SLA */}
          <select
            value={filterPrazo}
            onChange={(e) => setFilterPrazo(e.target.value as any)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Todos os Prazos</option>
            <option value="No Prazo">No Prazo Legal</option>
            <option value="Vencendo">Vencendo (&le; 5 dias)</option>
            <option value="Vencidos">Vencidos (Atrasados)</option>
          </select>
        </div>
      </div>

      {/* ================= TABELA / LISTA DE MANIFESTAÇÕES ================= */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-neutral-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-wider">Carregando Ouvidoria...</p>
          </div>
        ) : manifestacoesFiltradas.length === 0 ? (
          <div className="p-16 text-center text-neutral-400">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <h4 className="text-base font-bold text-neutral-700 dark:text-neutral-300">Nenhuma manifestação encontrada</h4>
            <p className="text-xs text-neutral-400 mt-1">Tente ajustar os filtros ou a busca acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-6 py-4">Protocolo / Data</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Assunto & Local</th>
                  <th className="px-6 py-4">Cidadão / Sigilo</th>
                  <th className="px-6 py-4">Status & Secretaria</th>
                  <th className="px-6 py-4">SLA Prazo</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {manifestacoesFiltradas.map((item) => {
                  const sla = getSlaStatus(item.prazo_limite, item.status);
                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedItem(item);
                        setRespostaTexto(item.resposta_oficial || '');
                        setAnexosResposta([]);
                        setActiveActionTab('resposta');
                      }}
                    >
                      {/* Protocolo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-neutral-900 dark:text-white block group-hover:text-emerald-600 transition-colors">
                            {item.protocolo}
                          </span>
                          {item.anexos && item.anexos.length > 0 && (
                            <span 
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md"
                              title={`${item.anexos.length} documento(s) ou foto(s) anexado(s)`}
                            >
                              <Paperclip size={10} />
                              <span>{item.anexos.length}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4">
                        {getTipoBadge(item.tipo)}
                      </td>

                      {/* Assunto & Local */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-neutral-900 dark:text-white truncate">
                          {item.assunto}
                        </div>
                        <div className="text-xs text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={12} />
                          <span>{item.bairro ? `${item.bairro}${item.logradouro ? ` - ${item.logradouro}` : ''}` : 'Local não especificado'}</span>
                        </div>
                      </td>

                      {/* Cidadão & Sigilo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.privacidade === 'anonima' ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <EyeOff size={13} /> Anônimo
                            </span>
                          ) : item.privacidade === 'sigilosa' ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold" title="Identidade protegida">
                              <ShieldCheck size={13} /> {item.cidadao_nome} (Sigiloso)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-neutral-800 dark:text-neutral-200">
                              <User size={13} /> {item.cidadao_nome}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status & Secretaria */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.status === 'Respondida' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          item.status === 'Nova' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse' :
                          item.status === 'Encaminhada' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' :
                          'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {item.status}
                        </span>
                        <span className="block text-[11px] text-neutral-400 mt-1 truncate max-w-[160px]">
                          {item.secretaria_destino || item.secretaria_sugerida || 'Triagem geral'}
                        </span>
                      </td>

                      {/* SLA Prazo */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${sla.color}`}>
                          <Clock size={12} />
                          <span>{sla.label}</span>
                        </span>
                      </td>

                      {/* Botão Ação */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 ml-auto">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteManifestacao(item);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="Excluir Manifestação (Exclusivo Super Admin)"
                              aria-label={`Excluir manifestação ${item.protocolo}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <span>Atender</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL / DRAWER DE GESTÃO DA MANIFESTAÇÃO ================= */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8"
            >
              {/* Header do Modal */}
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-neutral-900 dark:text-white">
                        {selectedItem.protocolo}
                      </span>
                      {getTipoBadge(selectedItem.tipo)}
                    </div>
                    <span className="text-xs text-neutral-400">
                      Aberta em {new Date(selectedItem.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedItem.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintWithLgpd(selectedItem)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-emerald-500 text-xs font-bold transition-all shadow-sm"
                    title="Imprimir relatório administrativo com dados protegidos pela LGPD"
                  >
                    <Printer size={14} className="text-emerald-600" />
                    <span>Imprimir (LGPD)</span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteManifestacao(selectedItem)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition-all shadow-sm"
                      title="Excluir manifestação permanentemente (Exclusivo Super Admin)"
                    >
                      <Trash2 size={14} />
                      <span>Excluir</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Fechar janela"
                    className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Corpo com Rolagem */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                
                {/* Banner de Sigilo (se aplicável) */}
                {selectedItem.privacidade === 'sigilosa' && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                    <ShieldCheck size={20} className="shrink-0 text-indigo-600 mt-0.5" />
                    <div>
                      <strong>Manifestação com Sigilo Requerido (Art. 10 §2º Lei 13.460/2017):</strong> Os dados do manifestante são de acesso restrito ao Ouvidor Geral e <strong>NÃO</strong> devem ser divulgados em despachos externos ou para os servidores e órgãos denunciados.
                    </div>
                  </div>
                )}

                {/* Conteúdo da Manifestação */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Assunto:</span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      {selectedItem.assunto}
                    </h3>
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Relato do Cidadão:</span>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 whitespace-pre-line leading-relaxed">
                      {selectedItem.descricao}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Localidade:</span>
                      <strong className="text-neutral-800 dark:text-neutral-200">
                        {selectedItem.bairro ? `${selectedItem.bairro} - ${selectedItem.logradouro || ''}` : 'Não especificado'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-neutral-400 block">Secretaria Competente:</span>
                      <strong className="text-neutral-800 dark:text-neutral-200">
                        {selectedItem.secretaria_destino || selectedItem.secretaria_sugerida || 'A definir'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Identificação do Manifestante (Acesso Exclusivo da Ouvidoria) */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-700/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Identificação do Manifestante (Exclusivo Ouvidoria)
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                          Acesso reservado ao Ouvidor para apuração e contato direto
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      selectedItem.privacidade === 'anonima' 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                        : selectedItem.privacidade === 'sigilosa'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {selectedItem.privacidade === 'anonima' ? 'Anônima' : selectedItem.privacidade === 'sigilosa' ? 'Sigilosa (Art. 10)' : 'Identificada'}
                    </span>
                  </div>

                  {selectedItem.privacidade === 'anonima' ? (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <EyeOff size={16} className="shrink-0" />
                      <span>O munícipe optou pelo anonimato. Nenhum dado pessoal (nome, CPF, telefone ou e-mail) foi coletado pelo sistema.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
                        <span className="text-neutral-400 block mb-0.5">Nome Completo:</span>
                        <strong className="text-neutral-900 dark:text-neutral-100 text-sm">
                          {selectedItem.cidadao_nome || 'Não informado'}
                        </strong>
                      </div>

                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/80">
                        <span className="text-neutral-400 block mb-0.5">CPF:</span>
                        <strong className="text-neutral-900 dark:text-neutral-100 font-mono text-sm">
                          {selectedItem.cidadao_cpf || 'Não informado'}
                        </strong>
                      </div>

                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between">
                        <div>
                          <span className="text-neutral-400 block mb-0.5">Telefone / Celular:</span>
                          <strong className="text-neutral-900 dark:text-neutral-100 text-sm">
                            {selectedItem.cidadao_telefone || 'Não informado'}
                          </strong>
                        </div>
                        {selectedItem.cidadao_telefone && (
                          <a
                            href={`https://api.whatsapp.com/send?phone=55${selectedItem.cidadao_telefone.replace(/\D/g, '')}&text=Olá%20${encodeURIComponent(selectedItem.cidadao_nome || '')},%20aqui%20é%20da%20Ouvidoria%20Municipal%20referente%20ao%20protocolo%20${selectedItem.protocolo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                            title="Conversar no WhatsApp"
                          >
                            <Phone size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between">
                        <div className="min-w-0 flex-1 mr-2">
                          <span className="text-neutral-400 block mb-0.5">E-mail:</span>
                          <strong className="text-neutral-900 dark:text-neutral-100 text-sm truncate block" title={selectedItem.cidadao_email}>
                            {selectedItem.cidadao_email || 'Não informado'}
                          </strong>
                        </div>
                        {selectedItem.cidadao_email && (
                          <a
                            href={`mailto:${selectedItem.cidadao_email}?subject=Ouvidoria%20Municipal%20-%20Protocolo%20${selectedItem.protocolo}`}
                            className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg font-bold text-[11px] flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 transition-all shrink-0"
                            title="Enviar e-mail para o munícipe"
                          >
                            <Mail size={12} />
                            <span>E-mail</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Anexos e Evidências do Cidadão */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <Paperclip size={14} className="text-emerald-600 dark:text-emerald-400" />
                      Documentos e Fotos Anexados pelo Munícipe:
                    </span>
                    <span className="text-[11px] font-bold text-neutral-400">
                      {selectedItem.anexos && selectedItem.anexos.length > 0 ? `${selectedItem.anexos.length} anexo(s)` : 'Nenhum anexo'}
                    </span>
                  </div>

                  {selectedItem.anexos && selectedItem.anexos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {selectedItem.anexos.map((rawAnexo, idx) => {
                        const anexo = getNormalizedAnexo(rawAnexo);
                        const isImg = anexo.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(anexo.name);
                        return (
                          <div 
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden"
                          >
                            {isImg ? (
                              <div 
                                onClick={() => setSelectedPreviewImage(anexo.url)}
                                className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 cursor-pointer relative group/thumb"
                                title="Clique para ampliar"
                              >
                                <img src={anexo.url} alt={anexo.name} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Maximize2 size={13} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate" title={anexo.name}>
                                {anexo.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-neutral-400 font-medium">{typeof anexo.size === 'string' ? anexo.size : 'Arquivo'}</span>
                                <a
                                  href={anexo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                >
                                  <span>Visualizar</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic">
                      O cidadão não anexou imagens ou documentos a esta manifestação.
                    </p>
                  )}
                </div>

                {/* Resposta Atual (se já existir) */}
                {selectedItem.resposta_oficial && (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> Resposta Oficial Emitida
                      </span>
                      {selectedItem.respondido_em && (
                        <span className="text-[11px] text-neutral-400">
                          {new Date(selectedItem.respondido_em).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line leading-relaxed bg-white/60 dark:bg-neutral-900/60 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      {selectedItem.resposta_oficial}
                    </p>

                    {/* Anexos da Resposta Oficial Emitida */}
                    {selectedItem.anexos_resposta && selectedItem.anexos_resposta.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-2 flex items-center gap-1.5">
                          <Paperclip size={12} /> Documentos e Laudos da Resposta ({selectedItem.anexos_resposta.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedItem.anexos_resposta.map((rawAnexo, idx) => {
                            const anexo = getNormalizedAnexo(rawAnexo);
                            const isImg = anexo.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(anexo.name);
                            return (
                              <div 
                                key={idx}
                                className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm"
                              >
                                {isImg ? (
                                  <div 
                                    onClick={() => setSelectedPreviewImage(anexo.url)}
                                    className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 cursor-pointer"
                                    title="Clique para ampliar"
                                  >
                                    <img src={anexo.url} alt={anexo.name} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <FileText size={18} />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{anexo.name}</p>
                                  <a
                                    href={anexo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                  >
                                    <span>Baixar / Visualizar</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Abas de Ação Interna */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 mb-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('resposta')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeActionTab === 'resposta'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Responder ao Munícipe
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveActionTab('encaminhar')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeActionTab === 'encaminhar'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Encaminhar para Secretaria
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveActionTab('prorrogar')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeActionTab === 'prorrogar'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Prorrogar Prazo (+10 dias)
                    </button>
                  </div>

                  {/* ABA: RESPONDER */}
                  {activeActionTab === 'resposta' && (
                    <div className="space-y-4">
                      {/* Modelos Prontos */}
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-2">
                          Inserir Modelo de Resposta Rápida:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {MODELOS_RESPOSTA.map((mod, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setRespostaTexto(mod.texto)}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-all border border-neutral-200 dark:border-neutral-700"
                            >
                              + {mod.titulo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Texto da Resposta Oficial (Visível para o Cidadão no Portal e Protocolo):
                        </label>
                        <textarea
                          rows={4}
                          value={respostaTexto}
                          onChange={(e) => setRespostaTexto(e.target.value)}
                          placeholder="Digite o parecer, despacho final ou esclarecimento para o munícipe..."
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      {/* Anexos da Resposta Oficial */}
                      <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                            <Paperclip size={14} className="text-emerald-600" />
                            Anexar Documentos ou Fotos à Resposta Oficial (Opcional):
                          </label>
                          <span className="text-[11px] font-bold text-neutral-400">
                            {anexosResposta.length} de 5 arquivos
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 cursor-pointer flex items-center gap-2 transition-all shadow-sm">
                            <Upload size={14} />
                            <span>{isUploadingRespostaAnexo ? (uploadRespostaProgress || 'Enviando anexo...') : 'Adicionar Documento / Foto'}</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.txt"
                              onChange={handleUploadRespostaAnexo}
                              disabled={isUploadingRespostaAnexo}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[11px] text-neutral-400">
                            Laudos, pareceres, ordens de serviço, comprovantes ou fotos de obra (PNG, JPG, PDF, DOC até 10MB)
                          </span>
                        </div>

                        {anexosResposta.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {anexosResposta.map((anexo, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                                <FileText size={16} className="text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{anexo.name}</p>
                                  <span className="text-[10px] text-neutral-400">{anexo.size}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRespostaAnexo(idx)}
                                  className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                  title="Remover anexo da resposta"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveResposta}
                          disabled={isProcessing || !respostaTexto.trim()}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                        >
                          <Send size={15} />
                          <span>{isProcessing ? 'Publicando...' : 'Publicar Resposta ao Cidadão'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: ENCAMINHAR */}
                  {activeActionTab === 'encaminhar' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Secretaria Responsável pelo Atendimento:
                        </label>
                        <select
                          value={novaSecretariaDestino}
                          onChange={(e) => setNovaSecretariaDestino(e.target.value)}
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium"
                        >
                          <option value="">Selecione a Secretaria...</option>
                          {SECRETARIAS_OPCOES.map((sec) => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Despacho / Instrução Interna para a Secretaria:
                        </label>
                        <textarea
                          rows={3}
                          value={despachoNota}
                          onChange={(e) => setDespachoNota(e.target.value)}
                          placeholder="Instrua a secretaria quanto às providências necessárias, prazos e laudos técnicos requeridos..."
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleEncaminhar}
                          disabled={isProcessing || !novaSecretariaDestino}
                          className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all"
                        >
                          <CornerDownRight size={15} />
                          <span>{isProcessing ? 'Encaminhando...' : 'Despachar para Secretaria'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: PRORROGAR */}
                  {activeActionTab === 'prorrogar' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <strong>Previsão da Lei nº 13.460/2017 (Art. 10):</strong> O prazo inicial de 20 dias pode ser prorrogado de forma justificada por mais 10 dias quando a complexidade da matéria exigir diligências aprofundadas.
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Justificativa Formal da Prorrogação *
                        </label>
                        <textarea
                          rows={3}
                          value={justificativaProrrogacao}
                          onChange={(e) => setJustificativaProrrogacao(e.target.value)}
                          placeholder="Ex: Prorrogação de 10 dias necessária para conclusão de laudo de vistoria pela equipe de engenharia..."
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleProrrogarPrazo}
                          disabled={isProcessing || !justificativaProrrogacao.trim()}
                          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all"
                        >
                          <Clock size={15} />
                          <span>{isProcessing ? 'Prorrogando...' : 'Confirmar Prorrogação (+10 dias)'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Lightbox de Imagem */}
      {selectedPreviewImage && (
        <div 
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-3xl p-3 overflow-hidden shadow-2xl border border-neutral-700" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedPreviewImage(null)}
              aria-label="Fechar ampliação"
              className="absolute top-5 right-5 z-10 p-2 rounded-full bg-black/70 hover:bg-black text-white transition-all shadow-lg"
            >
              <X size={20} />
            </button>
            <img 
              src={selectedPreviewImage} 
              alt="Visualização do anexo ampliado" 
              className="max-w-full max-h-[82vh] object-contain rounded-2xl mx-auto" 
            />
          </div>
        </div>
      )}

    </div>
  );
}
