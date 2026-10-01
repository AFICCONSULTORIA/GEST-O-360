import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, MessageSquare, Lightbulb, ThumbsUp, HelpCircle, 
  AlertTriangle, ShieldAlert, CheckCircle2, Copy, Printer, 
  Share2, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, User, 
  Phone, Mail, FileText, MapPin, Sparkles, Volume2, VolumeX, 
  Sun, Moon, Search, Calendar, Clock, ChevronRight, Check,
  AlertCircle, Home, Send, ShieldCheck, Info, Paperclip, 
  Upload, Trash2, ExternalLink, File, ImageIcon, X, Maximize2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Institution, OuvidoriaTipo, OuvidoriaPrivacidade, OuvidoriaManifestacao, OuvidoriaAnexo } from '../../types';

interface PublicPortalProps {
  darkMode: boolean;
  setDarkMode?: (dark: boolean) => void;
  currentInstitution?: Institution | null;
  onNavigateHome?: () => void;
}

const TIPO_CARDS: {
  tipo: OuvidoriaTipo;
  titulo: string;
  subtitulo: string;
  exemplo: string;
  icon: any;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
}[] = [
  {
    tipo: 'Sugestao',
    titulo: 'Sugestão',
    subtitulo: 'Ideia para melhorar a cidade',
    exemplo: 'Ex: Sugerir ciclofaixa na Avenida Central ou horta comunitária no bairro.',
    icon: Lightbulb,
    color: 'text-amber-500 dark:text-amber-400',
    bgLight: 'bg-amber-50/80',
    bgDark: 'dark:bg-amber-950/20',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-800/40'
  },
  {
    tipo: 'Elogio',
    titulo: 'Elogio',
    subtitulo: 'Reconhecimento a um serviço ou equipe',
    exemplo: 'Ex: Elogiar o atendimento rápido e humanizado no posto de saúde ou escola.',
    icon: ThumbsUp,
    color: 'text-emerald-500 dark:text-emerald-400',
    bgLight: 'bg-emerald-50/80',
    bgDark: 'dark:bg-emerald-950/20',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/40'
  },
  {
    tipo: 'Solicitacao',
    titulo: 'Solicitação',
    subtitulo: 'Pedido de serviço ou providência',
    exemplo: 'Ex: Solicitar reparo de lâmpada em poste, poda preventiva ou limpeza de rua.',
    icon: HelpCircle,
    color: 'text-sky-500 dark:text-sky-400',
    bgLight: 'bg-sky-50/80',
    bgDark: 'dark:bg-sky-950/20',
    borderLight: 'border-sky-200',
    borderDark: 'dark:border-sky-800/40'
  },
  {
    tipo: 'Reclamacao',
    titulo: 'Reclamação',
    subtitulo: 'Insatisfação com serviço prestado',
    exemplo: 'Ex: Relatar falta de médico no horário marcado ou demora excessiva no transporte.',
    icon: AlertTriangle,
    color: 'text-orange-500 dark:text-orange-400',
    bgLight: 'bg-orange-50/80',
    bgDark: 'dark:bg-orange-950/20',
    borderLight: 'border-orange-200',
    borderDark: 'dark:border-orange-800/40'
  },
  {
    tipo: 'Denuncia',
    titulo: 'Denúncia',
    subtitulo: 'Irregularidade ou conduta ilícita',
    exemplo: 'Ex: Denunciar desvio de bem público, descarte ilegal de resíduos ou cobrança indevida.',
    icon: ShieldAlert,
    color: 'text-rose-500 dark:text-rose-400',
    bgLight: 'bg-rose-50/80',
    bgDark: 'dark:bg-rose-950/20',
    borderLight: 'border-rose-200',
    borderDark: 'dark:border-rose-800/40'
  }
];

const SECRETARIAS_LISTA = [
  'Administração & Atendimento',
  'Assistência Social & CRAS',
  'Educação & Escolas',
  'Finanças & Tributos',
  'Meio Ambiente & Limpeza',
  'Obras, Pavimentação & Iluminação',
  'Saúde, Postos & Farmácia',
  'Transportes & Estradas Rurais',
  'Não sei informar / Outro'
];

export function PublicOuvidoriaPortal({ 
  darkMode, 
  setDarkMode, 
  currentInstitution,
  onNavigateHome
}: PublicPortalProps) {
  // Acessibilidade: Alto Contraste & Tamanho da Fonte com persistência e aplicação real
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('gestao360_ouvidoria_contrast') === 'true';
  });
  const [fontSizeOffset, setFontSizeOffset] = useState<-2 | 0 | 2 | 4>(() => {
    const saved = localStorage.getItem('gestao360_ouvidoria_font_size');
    return saved !== null ? (Number(saved) as any) : 0;
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Acessibilidade: Atualiza a raiz do documento (rem) e persiste o tamanho da fonte
  useEffect(() => {
    localStorage.setItem('gestao360_ouvidoria_font_size', String(fontSizeOffset));
    const root = document.documentElement;
    const baseSize = 16;
    root.style.fontSize = `${baseSize + fontSizeOffset}px`;
    return () => {
      root.style.fontSize = '';
    };
  }, [fontSizeOffset]);

  // Acessibilidade: Ativa classe de alto contraste no elemento raiz (HTML) e no Body
  useEffect(() => {
    localStorage.setItem('gestao360_ouvidoria_contrast', String(highContrast));
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('ouvidoria-high-contrast');
      document.body.classList.add('ouvidoria-high-contrast');
    } else {
      root.classList.remove('ouvidoria-high-contrast');
      document.body.classList.remove('ouvidoria-high-contrast');
    }
    return () => {
      root.classList.remove('ouvidoria-high-contrast');
      document.body.classList.remove('ouvidoria-high-contrast');
    };
  }, [highContrast]);

  // Navegação do Portal (Nova manifestação vs Consulta)
  const [activeTab, setActiveTab] = useState<'nova' | 'consultar'>('nova');
  const [step, setStep] = useState<1 | 2 | 3 | 'sucesso'>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados do Formulário
  const [formData, setFormData] = useState({
    tipo: '' as OuvidoriaTipo | '',
    assunto: '',
    descricao: '',
    secretaria_sugerida: '',
    bairro: '',
    logradouro: '',
    ponto_referencia: '',
    privacidade: 'identificada' as OuvidoriaPrivacidade,
    cidadao_nome: '',
    cidadao_cpf: '',
    cidadao_email: '',
    cidadao_telefone: '',
    anexos: [] as OuvidoriaAnexo[],
  });

  // Upload e Visualização de Anexos
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Auxiliares de Formatação e Upload
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.anexos.length + files.length > 5) {
      alert('Você pode anexar no máximo 5 arquivos por manifestação.');
      e.target.value = '';
      return;
    }

    setIsUploadingFiles(true);
    const newAnexos: OuvidoriaAnexo[] = [...formData.anexos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Limite de 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" ultrapassa o limite permitido de 10MB.`);
        continue;
      }

      setUploadProgress(`Enviando ${file.name}...`);

      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `ouvidoria-${Date.now()}-${safeName}`;

      let fileUrl = '';

      try {
        const { error: uploadError } = await supabase.storage
          .from('protocolos')
          .upload(filename, file, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from('protocolos').getPublicUrl(filename);
          if (publicData?.publicUrl) {
            fileUrl = publicData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('[Ouvidoria] Upload Supabase Storage não disponível, utilizando fallback seguro local:', err);
      }

      if (!fileUrl) {
        try {
          fileUrl = await readFileAsDataUrl(file);
        } catch (err) {
          console.error('Erro ao ler arquivo localmente:', err);
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

    setFormData(prev => ({ ...prev, anexos: newAnexos }));
    setIsUploadingFiles(false);
    setUploadProgress(null);
    e.target.value = '';
  };

  const handleRemoveAnexo = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      anexos: prev.anexos.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Resultado de Sucesso
  const [generatedProtocol, setGeneratedProtocol] = useState('');
  const [generatedAccessCode, setGeneratedAccessCode] = useState('');
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Consulta de Protocolo
  const [searchProtocol, setSearchProtocol] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [consultationResult, setConsultationResult] = useState<OuvidoriaManifestacao | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(null);

  // Síntese de Voz (Acessibilidade)
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta leitura em voz alta.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const textToRead = activeTab === 'nova' 
      ? `Portal de Ouvidoria Municipal de ${currentInstitution?.name || 'sua Cidade'}. ` +
        `Aqui você pode enviar sugestões, elogios, solicitações, reclamações ou denúncias de forma simples, segura e com direito ao sigilo. ` +
        `Passo atual: ${step === 1 ? 'Escolha o tipo da sua manifestação' : step === 2 ? 'Descreva o que aconteceu' : 'Informe como deseja se identificar'}.`
      : `Consulta de protocolo da Ouvidoria Municipal. Digite o número do protocolo para verificar o andamento da sua manifestação.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Envio da Manifestação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!formData.tipo) {
        alert('Por favor, selecione o tipo da sua manifestação.');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      if (!formData.assunto.trim() || !formData.descricao.trim()) {
        alert('Por favor, preencha o assunto e a descrição da sua manifestação.');
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 3) {
      if (formData.privacidade !== 'anonima') {
        if (!formData.cidadao_nome.trim()) {
          alert('Por favor, informe seu nome ou selecione a opção de manifestação anônima.');
          return;
        }
      }

      setIsSubmitting(true);

      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const newProtocol = `OUV-${year}-${randomNum}`;
      const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();

      // Cálculo do prazo legal: 20 dias corridos conforme Lei 13.460/2017
      const prazoDate = new Date();
      prazoDate.setDate(prazoDate.getDate() + 20);

      const newManifestacao: OuvidoriaManifestacao = {
        id: crypto.randomUUID ? crypto.randomUUID() : `ouvidoria-${Date.now()}`,
        protocolo: newProtocol,
        codigo_acesso: newCode,
        tipo: formData.tipo as OuvidoriaTipo,
        assunto: formData.assunto,
        descricao: formData.descricao,
        secretaria_sugerida: formData.secretaria_sugerida || 'Não especificada',
        bairro: formData.bairro,
        logradouro: formData.logradouro,
        ponto_referencia: formData.ponto_referencia,
        privacidade: formData.privacidade,
        cidadao_nome: formData.privacidade === 'anonima' ? 'Anônimo' : formData.cidadao_nome,
        cidadao_cpf: formData.privacidade === 'anonima' ? undefined : formData.cidadao_cpf,
        cidadao_email: formData.privacidade === 'anonima' ? undefined : formData.cidadao_email,
        cidadao_telefone: formData.privacidade === 'anonima' ? undefined : formData.cidadao_telefone,
        status: 'Nova',
        prioridade: formData.tipo === 'Denuncia' ? 'Alta' : 'Normal',
        data_manifestacao: new Date().toISOString().split('T')[0],
        prazo_limite: prazoDate.toISOString(),
        anexos: formData.anexos,
        institution_id: currentInstitution?.id || undefined,
        created_at: new Date().toISOString(),
      };

      try {
        // Tenta salvar no Supabase
        const { error } = await supabase.from('ouvidoria_manifestacoes').insert({
          protocolo: newManifestacao.protocolo,
          codigo_acesso: newManifestacao.codigo_acesso,
          tipo: newManifestacao.tipo,
          assunto: newManifestacao.assunto,
          descricao: newManifestacao.descricao,
          bairro: newManifestacao.bairro,
          logradouro: newManifestacao.logradouro,
          ponto_referencia: newManifestacao.ponto_referencia,
          privacidade: newManifestacao.privacidade,
          cidadao_nome: newManifestacao.cidadao_nome,
          cidadao_cpf: newManifestacao.cidadao_cpf,
          cidadao_email: newManifestacao.cidadao_email,
          cidadao_telefone: newManifestacao.cidadao_telefone,
          status: newManifestacao.status,
          prioridade: newManifestacao.prioridade,
          secretaria_sugerida: newManifestacao.secretaria_sugerida,
          data_manifestacao: newManifestacao.data_manifestacao,
          prazo_limite: newManifestacao.prazo_limite,
          anexos: newManifestacao.anexos,
          institution_id: newManifestacao.institution_id
        });

        if (error) {
          console.warn('[Ouvidoria] Erro ao gravar no Supabase (usando armazenamento seguro local):', error.message);
        }

        // Salva cópia no localStorage para contingência e consulta offline
        const localList = JSON.parse(localStorage.getItem('gestao360_ouvidoria_manifestacoes') || '[]');
        localList.unshift(newManifestacao);
        localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(localList));

        setGeneratedProtocol(newProtocol);
        setGeneratedAccessCode(newCode);
        setStep('sucesso');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        alert('Ocorreu um erro ao enviar sua manifestação. Por favor, tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Busca de Protocolo
  const handleSearchProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchProtocol.trim()) return;

    setIsSearching(true);
    setConsultationError(null);
    setConsultationResult(null);

    const cleanProto = searchProtocol.trim().toUpperCase();

    try {
      // 1. Tenta no Supabase
      const { data, error } = await supabase
        .from('ouvidoria_manifestacoes')
        .select('*')
        .ilike('protocolo', cleanProto)
        .maybeSingle();

      if (data && !error) {
        setConsultationResult(data as OuvidoriaManifestacao);
        return;
      }

      // 2. Se não encontrar, busca no localStorage
      const localList: OuvidoriaManifestacao[] = JSON.parse(localStorage.getItem('gestao360_ouvidoria_manifestacoes') || '[]');
      const foundLocal = localList.find(m => m.protocolo.toUpperCase() === cleanProto);

      if (foundLocal) {
        setConsultationResult(foundLocal);
      } else {
        setConsultationError('Nenhuma manifestação encontrada com esse número de protocolo. Verifique o código e tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setConsultationError('Erro ao consultar protocolo. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyProtocol = () => {
    navigator.clipboard.writeText(generatedProtocol);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏛️ *Ouvidoria Municipal - Protocolo Registrado*\n\n` +
      `Olá! Meu protocolo na Ouvidoria de ${currentInstitution?.name || 'Prefeitura'} é:\n` +
      `📋 *Protocolo:* ${generatedProtocol}\n` +
      `🔑 *Código de Acesso:* ${generatedAccessCode}\n` +
      `📌 *Tipo:* ${formData.tipo}\n` +
      `📝 *Assunto:* ${formData.assunto}\n\n` +
      `Acompanhe em: ${window.location.origin}/ouvidoria`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const resetForm = () => {
    setFormData({
      tipo: '',
      assunto: '',
      descricao: '',
      secretaria_sugerida: '',
      bairro: '',
      logradouro: '',
      ponto_referencia: '',
      privacidade: 'identificada',
      cidadao_nome: '',
      cidadao_cpf: '',
      cidadao_email: '',
      cidadao_telefone: '',
      anexos: [],
    });
    setStep(1);
    setGeneratedProtocol('');
    setGeneratedAccessCode('');
  };

  return (
    <div 
      className={`ouvidoria-portal-root min-h-[100dvh] flex flex-col font-sans transition-colors relative selection:bg-emerald-500 selection:text-white ${
        darkMode ? 'dark bg-neutral-950 text-neutral-100' : 'bg-[#F8F9FA] text-neutral-900'
      } ${highContrast ? 'ouvidoria-high-contrast' : ''}`}
    >
      {/* ================= BARRA DE ACESSIBILIDADE OFICIAL ================= */}
      <nav 
        aria-label="Barra de Acessibilidade"
        className="bg-neutral-900 text-neutral-200 px-4 py-2 border-b border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider uppercase text-neutral-400 text-[10px] hidden sm:inline">
            Acessibilidade Cidadã:
          </span>
          <span className="text-neutral-400">Tamanho do Texto:</span>
          <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
            <button 
              type="button"
              onClick={() => setFontSizeOffset(-2)}
              aria-label="Diminuir fonte (14px)"
              title="Diminuir texto"
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                fontSizeOffset === -2 
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              A-
            </button>
            <button 
              type="button"
              onClick={() => setFontSizeOffset(0)}
              aria-label="Tamanho de fonte padrão (16px)"
              title="Tamanho padrão"
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                fontSizeOffset === 0 
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              A
            </button>
            <button 
              type="button"
              onClick={() => setFontSizeOffset(2)}
              aria-label="Aumentar fonte (18px)"
              title="Aumentar texto"
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                fontSizeOffset === 2 
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              A+
            </button>
            <button 
              type="button"
              onClick={() => setFontSizeOffset(4)}
              aria-label="Aumentar muito a fonte (20px)"
              title="Texto extragrande"
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                fontSizeOffset === 4 
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400' 
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              A++
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            aria-pressed={highContrast}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-all ${
              highContrast 
                ? 'bg-yellow-400 text-black border-yellow-300 ring-2 ring-yellow-400 font-black shadow-md' 
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <span>🌓 Alto Contraste {highContrast ? '✓' : ''}</span>
          </button>

          <button 
            type="button"
            onClick={handleToggleSpeech}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              isPlayingAudio ? 'bg-rose-600 text-white border-rose-500 animate-pulse' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
            title="Leitor de tela em áudio para pessoas com baixa visão ou deficiência visual"
          >
            {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isPlayingAudio ? 'Parar Áudio' : 'Ouvir Página'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {setDarkMode && (
            <button 
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-sky-300" />}
              <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
          )}

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Home size={14} />
              <span>Portal Principal</span>
            </button>
          )}
        </div>
      </nav>

      {/* ================= HEADER HERO INSTITUCIONAL ================= */}
      <header className="relative bg-gradient-to-b from-white to-neutral-50/50 dark:from-neutral-900 dark:to-neutral-950 border-b border-neutral-200 dark:border-neutral-800 py-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            {currentInstitution?.logo_url ? (
              <img 
                src={currentInstitution.logo_url} 
                alt={`Brasão oficial de ${currentInstitution.name}`} 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl shadow-sm bg-white p-1 border border-neutral-100 dark:border-neutral-800"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Building2 size={36} />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider mb-1">
                <ShieldCheck size={14} />
                <span>Canal Oficial · Lei Federal nº 13.460/2017</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
                Ouvidoria Municipal
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-1">
                {currentInstitution?.name ? `${currentInstitution.name} - Ouvindo você para transformar nossa cidade` : 'Prefeitura Municipal · Espaço de diálogo transparente e acolhedor'}
              </p>
            </div>
          </div>

          {/* Abas Alternadoras: Nova vs Consultar */}
          <div className="flex items-center p-1.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700 w-full sm:w-auto shadow-inner">
            <button
              type="button"
              onClick={() => { setActiveTab('nova'); setConsultationResult(null); }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'nova'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Send size={16} />
              <span>Nova Manifestação</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('consultar')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'consultar'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Search size={16} />
              <span>Consultar Protocolo</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= CONTEÚDO PRINCIPAL ================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8">
        
        {/* ================= ABA 1: NOVA MANIFESTAÇÃO ================= */}
        {activeTab === 'nova' && (
          <div>
            {/* Barra de Progresso em 3 Etapas */}
            {step !== 'sucesso' && (
              <div className="mb-8">
                <div className="flex items-center justify-between max-w-xl mx-auto mb-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                      step >= 1 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      1
                    </div>
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mt-1">Tipo</span>
                  </div>

                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${step >= 2 ? 'bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-800'}`} />

                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                      step >= 2 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      2
                    </div>
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mt-1">Detalhes</span>
                  </div>

                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${step >= 3 ? 'bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-800'}`} />

                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all ${
                      step === 3 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      3
                    </div>
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mt-1">Identificação</span>
                  </div>
                </div>
              </div>
            )}

            {/* FORMULÁRIO */}
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* PASSO 1: ESCOLHA DO TIPO */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="text-center max-w-2xl mx-auto mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                      Qual é o objetivo do seu contato?
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                      Escolha abaixo a opção que melhor descreve o que você deseja manifestar à Prefeitura.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TIPO_CARDS.map((card) => {
                      const Icon = card.icon;
                      const isSelected = formData.tipo === card.tipo;
                      return (
                        <button
                          key={card.tipo}
                          type="button"
                          onClick={() => setFormData({ ...formData, tipo: card.tipo })}
                          className={`relative text-left p-5 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                            isSelected 
                              ? 'border-emerald-600 ring-4 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-lg' 
                              : `border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-700 shadow-sm hover:shadow-md`
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bgLight} ${card.bgDark} ${card.color} group-hover:scale-110 transition-transform`}>
                                <Icon size={24} />
                              </div>
                              {isSelected && (
                                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                  <Check size={16} />
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
                              {card.titulo}
                            </h3>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
                              {card.subtitulo}
                            </p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed italic bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                              {card.exemplo}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={!formData.tipo}
                      className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
                    >
                      <span>Avançar para Detalhes</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* PASSO 2: DETALHES E LOCALIZAÇÃO */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 max-w-3xl mx-auto"
                >
                  <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                          Detalhes da sua manifestação: <span className="text-emerald-600 dark:text-emerald-400">{formData.tipo}</span>
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Seja o mais claro possível para que os fiscais e servidores possam atuar com rapidez.
                        </p>
                      </div>
                    </div>

                    {/* Assunto / Resumo */}
                    <div>
                      <label htmlFor="assunto" className="block text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                        Assunto / Título Resumido *
                      </label>
                      <input
                        id="assunto"
                        type="text"
                        required
                        value={formData.assunto}
                        onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                        placeholder="Ex: Iluminação pública apagada há 3 dias na Rua das Flores"
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                      />
                    </div>

                    {/* Secretaria Sugerida */}
                    <div>
                      <label htmlFor="secretaria" className="block text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                        Qual secretaria ou área você acredita ser responsável?
                      </label>
                      <select
                        id="secretaria"
                        value={formData.secretaria_sugerida}
                        onChange={(e) => setFormData({ ...formData, secretaria_sugerida: e.target.value })}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">Selecione uma área (opcional)</option>
                        {SECRETARIAS_LISTA.map((sec) => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Descrição Detalhada */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="descricao" className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          O que aconteceu? Conte em detalhes *
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          {formData.descricao.length} caracteres
                        </span>
                      </div>
                      <textarea
                        id="descricao"
                        required
                        rows={5}
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Descreva a situação com suas próprias palavras: datas aproximadas, o que foi observado, se já procurou outro setor..."
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all leading-relaxed"
                      />
                    </div>

                    {/* Localização / Bairro */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Onde ocorreu? (Localização)
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="bairro" className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                            Bairro ou Comunidade
                          </label>
                          <input
                            id="bairro"
                            type="text"
                            value={formData.bairro}
                            onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                            placeholder="Ex: Centro, Bairro Novo, Zona Rural"
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label htmlFor="logradouro" className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                            Rua, Avenida ou Estrada
                          </label>
                          <input
                            id="logradouro"
                            type="text"
                            value={formData.logradouro}
                            onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                            placeholder="Ex: Rua São Paulo, próximo ao nº 150"
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label htmlFor="pontoRef" className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                            Ponto de Referência
                          </label>
                          <input
                            id="pontoRef"
                            type="text"
                            value={formData.ponto_referencia}
                            onChange={(e) => setFormData({ ...formData, ponto_referencia: e.target.value })}
                            placeholder="Ex: Em frente à farmácia municipal, perto da praça"
                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Anexos de Comprovantes, Fotos e Documentos */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Paperclip size={18} className="text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Anexar Documentos ou Fotos (Opcional)
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                          {formData.anexos.length} de 5 arquivos
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
                        Envie fotos do local, imagens de comprovantes, laudos ou documentos que ajudem a instruir sua manifestação (PDF, DOC, JPG ou PNG de até 10MB por arquivo).
                      </p>

                      {/* Dropzone / Seletor de Arquivos */}
                      {formData.anexos.length < 5 && (
                        <div className="relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl p-6 text-center transition-all bg-neutral-50/60 dark:bg-neutral-800/40 hover:bg-emerald-50/30 group">
                          <input
                            id="file-upload-input"
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            disabled={isUploadingFiles}
                            aria-label="Selecionar arquivos para anexar"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              {isUploadingFiles ? (
                                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload size={22} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                                {isUploadingFiles ? (uploadProgress || 'Enviando anexo...') : 'Clique ou arraste arquivos para anexar'}
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                Formatos aceitos: PNG, JPG, PDF, DOC (máx. 10MB por arquivo)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lista de Anexos Adicionados */}
                      {formData.anexos.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {formData.anexos.map((anexo, idx) => {
                            const isImg = anexo.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(anexo.name);
                            return (
                              <div 
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/90 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm relative group overflow-hidden"
                              >
                                {isImg ? (
                                  <div 
                                    onClick={() => setSelectedPreviewImage(anexo.url)}
                                    className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-700 overflow-hidden shrink-0 cursor-pointer relative group/thumb"
                                    title="Clique para ampliar imagem"
                                  >
                                    <img 
                                      src={anexo.url} 
                                      alt={anexo.name} 
                                      className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                      <Maximize2 size={14} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <FileText size={22} />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate" title={anexo.name}>
                                    {anexo.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-neutral-400 font-medium">
                                      {typeof anexo.size === 'string' ? anexo.size : 'Arquivo'}
                                    </span>
                                    <a
                                      href={anexo.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                    >
                                      <span>Abrir</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveAnexo(idx)}
                                  className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                                  title="Remover este anexo"
                                  aria-label={`Remover ${anexo.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-bold text-sm rounded-2xl flex items-center gap-2 text-neutral-700 dark:text-neutral-300 transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Voltar</span>
                    </button>

                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center gap-3 transition-all hover:scale-[1.02]"
                    >
                      <span>Avançar para Identificação</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* PASSO 3: PRIVACIDADE E DADOS DO CIDADÃO */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 max-w-3xl mx-auto"
                >
                  <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                          Como você deseja se manifestar?
                        </h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Sua privacidade e segurança são garantidas pela legislação federal.
                        </p>
                      </div>
                    </div>

                    {/* Opções de Privacidade */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, privacidade: 'identificada' })}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                          formData.privacidade === 'identificada'
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <User size={20} className="text-emerald-600 dark:text-emerald-400" />
                            {formData.privacidade === 'identificada' && <Check size={16} className="text-emerald-600" />}
                          </div>
                          <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Identificada</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            Seus dados ajudam na apuração e você recebe retorno direto.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, privacidade: 'sigilosa' })}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                          formData.privacidade === 'sigilosa'
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <EyeOff size={20} className="text-indigo-600 dark:text-indigo-400" />
                            {formData.privacidade === 'sigilosa' && <Check size={16} className="text-emerald-600" />}
                          </div>
                          <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Sigilosa</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            Apenas o Ouvidor vê seus dados. O órgão apurado NÃO terá acesso.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, privacidade: 'anonima' })}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                          formData.privacidade === 'anonima'
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400" />
                            {formData.privacidade === 'anonima' && <Check size={16} className="text-emerald-600" />}
                          </div>
                          <h4 className="font-bold text-sm text-neutral-900 dark:text-white">100% Anônima</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                            Nenhum dado pessoal seu será armazenado. Guarde o protocolo.
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Campos de Identificação (se não anônimo) */}
                    {formData.privacidade !== 'anonima' ? (
                      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="nomeCidadao" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                              Nome Completo *
                            </label>
                            <input
                              id="nomeCidadao"
                              type="text"
                              required
                              value={formData.cidadao_nome}
                              onChange={(e) => setFormData({ ...formData, cidadao_nome: e.target.value })}
                              placeholder="Seu nome completo"
                              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="cpfCidadao" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                              CPF (Opcional)
                            </label>
                            <input
                              id="cpfCidadao"
                              type="text"
                              value={formData.cidadao_cpf}
                              onChange={(e) => setFormData({ ...formData, cidadao_cpf: e.target.value })}
                              placeholder="000.000.000-00"
                              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="telCidadao" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                              Telefone / WhatsApp
                            </label>
                            <input
                              id="telCidadao"
                              type="tel"
                              value={formData.cidadao_telefone}
                              onChange={(e) => setFormData({ ...formData, cidadao_telefone: e.target.value })}
                              placeholder="(00) 00000-0000"
                              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="emailCidadao" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                              E-mail para Notificação
                            </label>
                            <input
                              id="emailCidadao"
                              type="email"
                              value={formData.cidadao_email}
                              onChange={(e) => setFormData({ ...formData, cidadao_email: e.target.value })}
                              placeholder="seu.email@exemplo.com"
                              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {formData.privacidade === 'sigilosa' && (
                          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                            <ShieldCheck size={20} className="shrink-0 text-indigo-600 mt-0.5" />
                            <span>
                              <strong>Garantia de Sigilo Institucional:</strong> Seus dados pessoais serão conhecidos estritamente pelo Ouvidor Geral para averiguação dos fatos, não sendo compartilhados nos despachos internos com secretarias nem com pessoas denunciadas.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
                        <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <strong className="block text-sm mb-1">Atenção ao Modo Anônimo:</strong>
                          Como nenhum dado de contato será salvo, certifique-se de <strong>anotar ou salvar o número de protocolo e o código de acesso</strong> que serão exibidos na próxima tela. Eles serão sua única forma de acompanhar a resposta oficial da Prefeitura.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-3.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-bold text-sm rounded-2xl flex items-center gap-2 text-neutral-700 dark:text-neutral-300 transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Voltar</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center gap-3 transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          <span>Finalizar & Enviar Manifestação</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TELA DE SUCESSO: RECIBO & PROTOCOLO */}
              {step === 'sucesso' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-10 border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={44} />
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                      Manifestação Registrada com Sucesso!
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2 max-w-md mx-auto">
                      Sua manifestação foi recebida pelo sistema de Ouvidoria Municipal e encaminhada para triagem dos ouvidores.
                    </p>
                  </div>

                  {/* Card Destaque do Protocolo */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/80 p-6 rounded-3xl border-2 border-dashed border-emerald-500/50 space-y-3">
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                      Número Oficial do Protocolo
                    </span>
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-emerald-600 dark:text-emerald-400">
                      {generatedProtocol}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <span className="text-xs text-neutral-500">Código de Acesso Seguro:</span>
                      <span className="text-sm font-black font-mono bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded text-neutral-800 dark:text-neutral-200">
                        {generatedAccessCode}
                      </span>
                    </div>

                    <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyProtocol}
                        className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
                      >
                        {copiedProtocol ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedProtocol ? 'Copiado!' : 'Copiar Protocolo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Share2 size={14} />
                        <span>Salvar no WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintVoucher}
                        className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
                      >
                        <Printer size={14} />
                        <span>Imprimir Comprovante</span>
                      </button>
                    </div>
                  </div>

                  {/* Anexos Enviados */}
                  {formData.anexos.length > 0 && (
                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <Paperclip size={14} />
                        <span>{formData.anexos.length} arquivo(s) anexado(s) com sucesso:</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.anexos.map((a, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-neutral-800 rounded-xl border border-emerald-200 dark:border-emerald-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 shadow-sm"
                          >
                            <FileText size={12} className="text-emerald-600" />
                            <span className="truncate max-w-[200px]">{a.name}</span>
                            <span className="text-[10px] text-neutral-400">({a.size})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informação sobre Prazo Legal */}
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-300 text-left flex items-start gap-3">
                    <Clock size={20} className="shrink-0 text-sky-600 mt-0.5" />
                    <div>
                      <strong>Prazo Legal de Resposta:</strong> Em cumprimento à Lei Federal nº 13.460/2017, a administração pública possui até <strong>20 dias corridos</strong> (prorrogáveis justificadamente por mais 10 dias) para responder à sua manifestação.
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setActiveTab('consultar');
                        setSearchProtocol(generatedProtocol);
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all"
                    >
                      Acompanhar Este Protocolo
                    </button>
                    
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full sm:w-auto px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                    >
                      Fazer Outra Manifestação
                    </button>
                  </div>
                </motion.div>
              )}

            </form>
          </div>
        )}

        {/* ================= ABA 2: CONSULTAR PROTOCOLO ================= */}
        {activeTab === 'consultar' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Box de Busca */}
            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Search size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                    Consultar Andamento
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Digite o número de protocolo fornecido no momento do registro.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearchProtocol} className="space-y-4">
                <div>
                  <label htmlFor="searchProto" className="block text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Número do Protocolo *
                  </label>
                  <input
                    id="searchProto"
                    type="text"
                    required
                    value={searchProtocol}
                    onChange={(e) => setSearchProtocol(e.target.value)}
                    placeholder="Ex: OUV-2026-1042"
                    className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !searchProtocol.trim()}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Localizando...</span>
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      <span>Consultar Manifestação</span>
                    </>
                  )}
                </button>
              </form>

              {consultationError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                  <span>{consultationError}</span>
                </div>
              )}
            </div>

            {/* Resultado da Consulta */}
            {consultationResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6"
              >
                {/* Cabeçalho do Resultado */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      Protocolo Oficial
                    </span>
                    <h3 className="text-xl font-black font-mono text-neutral-900 dark:text-white">
                      {consultationResult.protocolo}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      consultationResult.status === 'Respondida'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : consultationResult.status === 'Encaminhada'
                        ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400'
                        : consultationResult.status === 'Em Analise'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {consultationResult.status}
                    </span>
                    
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {consultationResult.tipo}
                    </span>
                  </div>
                </div>

                {/* Resumo do Conteúdo */}
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Assunto:</span>
                    <p className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      {consultationResult.assunto}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Descrição:</span>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 mt-1 whitespace-pre-line leading-relaxed">
                      {consultationResult.descricao}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                      <span className="text-neutral-400 block mb-0.5">Data de Abertura:</span>
                      <strong className="text-neutral-900 dark:text-neutral-200">
                        {new Date(consultationResult.created_at).toLocaleDateString('pt-BR')}
                      </strong>
                    </div>

                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                      <span className="text-neutral-400 block mb-0.5">Bairro / Localidade:</span>
                      <strong className="text-neutral-900 dark:text-neutral-200">
                        {consultationResult.bairro || 'Não informado'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Documentos e Fotos Anexados pelo Cidadão */}
                {consultationResult.anexos && consultationResult.anexos.length > 0 && (
                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <Paperclip size={14} className="text-emerald-600 dark:text-emerald-400" /> 
                      Documentos e Fotos Anexados pelo Munícipe ({consultationResult.anexos.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {consultationResult.anexos.map((rawAnexo, idx) => {
                        const anexo = getNormalizedAnexo(rawAnexo);
                        const isImg = anexo.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(anexo.name);
                        return (
                          <div 
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm overflow-hidden"
                          >
                            {isImg ? (
                              <div 
                                onClick={() => setSelectedPreviewImage(anexo.url)}
                                className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-700 overflow-hidden shrink-0 cursor-pointer relative group/thumb"
                                title="Clique para ampliar"
                              >
                                <img src={anexo.url} alt={anexo.name} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Maximize2 size={14} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <FileText size={22} />
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
                  </div>
                )}

                {/* Resposta Oficial (se houver) */}
                {consultationResult.resposta_oficial ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Resposta Oficial da Prefeitura:</span>
                    </div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line leading-relaxed bg-white/60 dark:bg-neutral-900/60 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      {consultationResult.resposta_oficial}
                    </p>

                    {/* Anexos da Resposta Oficial */}
                    {consultationResult.anexos_resposta && consultationResult.anexos_resposta.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-2 flex items-center gap-1.5">
                          <Paperclip size={12} /> Comprovantes e Documentos da Resposta ({consultationResult.anexos_resposta.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {consultationResult.anexos_resposta.map((rawAnexo, idx) => {
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

                    {consultationResult.respondido_em && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-right">
                        Respondido em {new Date(consultationResult.respondido_em).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-300">
                    <Clock size={18} className="shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong>Manifestação em tramitação:</strong> Sua demanda está sendo analisada pelos setores competentes. O prazo legal estimado para conclusão é de até 20 dias a partir da data de abertura.
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

      </main>

      {/* ================= MODAL LIGHTBOX DE IMAGEM ================= */}
      {selectedPreviewImage && (
        <div 
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
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
              alt="Visualização ampliada do anexo" 
              className="max-w-full max-h-[82vh] object-contain rounded-2xl mx-auto" 
            />
          </div>
        </div>
      )}

      {/* ================= RODAPÉ OFICIAL ================= */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4 text-center text-xs text-neutral-500 dark:text-neutral-400 bg-white/50 dark:bg-neutral-900/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            {currentInstitution?.name || 'Prefeitura Municipal'} · Ouvidoria Geral Integrada
          </span>
          <span className="text-[11px] text-neutral-400">
            Plataforma <strong>GESTÃO 360</strong> · Conforme Lei nº 13.460/2017 e Lei nº 12.527/2011 (LAI)
          </span>
        </div>
      </footer>
    </div>
  );
}
