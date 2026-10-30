import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileCheck2, 
  GraduationCap, 
  Landmark, 
  HeartPulse, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown,
  Lock, 
  X, 
  Search, 
  ExternalLink, 
  MapPin, 
  Award,
  Sun,
  Moon,
  Stethoscope,
  Pill,
  School,
  TrendingUp,
  Clock,
  ShieldAlert,
  Users,
  Send,
  Mail,
  PhoneCall,
  Menu,
  ArrowUp,
  Check,
  Copy,
  MessageCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { LogoCompass } from './LogoCompass';
import { Institution } from '../types';

const WHATSAPP_NUMBER = '5566996893617';
const CONTACT_EMAIL = 'aficconsultoria@gmail.com';

const getWhatsAppUrl = (msg?: string) => {
  const defaultMsg = 'Olá! Gostaria de agendar uma demonstração da plataforma Gestão 360 para a nossa prefeitura.';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg || defaultMsg)}`;
};

const getMailtoUrl = (subject?: string, body?: string) => {
  const defaultSubj = 'Solicitação de Apresentação e Demonstração - Gestão 360';
  const defaultBody = `Olá, equipe Gestão 360,\n\nGostaria de solicitar uma apresentação técnica e proposta comercial da plataforma para o nosso município.\n\nMunicípio/Órgão: \nResponsável/Cargo: \nTelefone para contato: \n\nObrigado!`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject || defaultSubj)}&body=${encodeURIComponent(body || defaultBody)}`;
};

export interface SalesLandingPageProps {
  onEnterSystem?: () => void;
  onOpenNotaFiscal?: () => void;
  darkMode?: boolean;
  setDarkMode?: (v: boolean) => void;
  showMunicipalitySelector?: boolean;
  institutions?: Institution[];
  onSelectMunicipality?: (inst: Institution) => void;
}

export const SalesLandingPage: React.FC<SalesLandingPageProps> = ({ 
  onEnterSystem,
  darkMode,
  setDarkMode,
  institutions = [],
  onSelectMunicipality
}) => {
  const [internalDarkMode, setInternalDarkMode] = useState(darkMode ?? true);
  const isDark = darkMode !== undefined ? darkMode : internalDarkMode;

  const toggleTheme = () => {
    if (setDarkMode) {
      setDarkMode(!isDark);
    } else {
      setInternalDarkMode(!isDark);
    }
  };

  // Estados de navegação, modais e interações
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactModule, setContactModule] = useState('Demonstração Geral Gestão 360');
  const [contactCity, setContactCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Prefeito / Secretário');
  const [contactPhone, setContactPhone] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'saude' | 'educacao' | 'fazenda' | 'camara'>('all');
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  // Monitorar scroll para botão Voltar ao Topo
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const copyToClipboard = async (text: string, label: string = 'Texto') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(`✓ ${label} copiado com sucesso!`);
    } catch {
      showToast(`E-mail: ${text}`);
    }
  };

  const openProposal = (moduleName?: string) => {
    const text = moduleName 
      ? `Olá! Gostaria de uma demonstração e proposta comercial do Gestão 360 para o módulo de ${moduleName}.`
      : 'Olá! Gostaria de agendar uma demonstração da plataforma Gestão 360 para a nossa prefeitura.';
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendWhatsAppContact = () => {
    const lines = [
      `Olá! Gostaria de agendar uma demonstração oficial do Gestão 360.`,
      contactCity ? `🏛️ Município/Órgão: ${contactCity}` : '',
      contactName ? `👤 Solicitante: ${contactName}` : '',
      contactRole ? `💼 Cargo: ${contactRole}` : '',
      contactModule ? `📦 Módulo de Interesse: ${contactModule}` : '',
      contactPhone ? `📱 Telefone para Contato: ${contactPhone}` : ''
    ].filter(Boolean);
    window.open(getWhatsAppUrl(lines.join('\n')), '_blank');
    setIsContactModalOpen(false);
  };

  const handleSendEmailContact = () => {
    const subj = `Solicitação de Proposta e Demonstração - ${contactCity || 'Município'}`;
    const body = `Olá, equipe Gestão 360,\n\nGostaria de solicitar uma apresentação técnica e proposta comercial da plataforma para o nosso município.\n\nMunicípio/Órgão: ${contactCity}\nResponsável: ${contactName}\nCargo: ${contactRole}\nMódulo de Interesse: ${contactModule}\nTelefone: ${contactPhone}\n\nAguardo contato.`;
    window.location.href = getMailtoUrl(subj, body);
    setIsContactModalOpen(false);
  };

  const officialClientInstitutions: Institution[] = [
    { id: 'inst_1', name: 'Prefeitura Municipal de Torixoréu', subdomain: 'torixoreu', logo_url: 'https://www.torixoreu.mt.gov.br/images/logoHeadernovo.png' }
  ];

  // Filtro de segurança: elimina terminantemente quaisquer dados fictícios ou registros de 'demo'/'demonstração'
  const validInstitutions = (institutions && institutions.length > 0 ? institutions : officialClientInstitutions)
    .filter(inst => {
      const sub = (inst.subdomain || '').toLowerCase().trim();
      const nm = (inst.name || '').toLowerCase().trim();
      return sub !== 'demo' && 
             !nm.includes('demonstração') && 
             !nm.includes('demonstracao') && 
             !nm.includes('modelo');
    });

  const availableInstitutions = validInstitutions.length > 0 ? validInstitutions : officialClientInstitutions;

  const filteredInstitutions = availableInstitutions.filter(inst => 
    inst.name.toLowerCase().includes(searchCity.toLowerCase()) ||
    (inst.subdomain && inst.subdomain.toLowerCase().includes(searchCity.toLowerCase()))
  );

  const handleSelectMunicipality = (inst: Institution) => {
    if (onSelectMunicipality) {
      onSelectMunicipality(inst);
      return;
    }

    const targetParam = inst.subdomain || inst.id;
    if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
      const url = new URL(window.location.href);
      url.searchParams.set('inst', targetParam);
      url.searchParams.delete('sales');
      window.location.href = url.toString();
    } else {
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2 && inst.subdomain && !window.location.hostname.includes('vercel.app')) {
        window.location.href = `${window.location.protocol}//${inst.subdomain}.${parts.slice(-2).join('.')}`;
      } else {
        window.location.href = `/?inst=${targetParam}`;
      }
    }
  };

  const handleEnterSystemAction = () => {
    if (onEnterSystem) {
      onEnterSystem();
    } else {
      setIsSelectorModalOpen(true);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'} flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300 relative`}>
      
      {/* ALERTA TOAST FLUTUANTE DE FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[130] bg-neutral-900/95 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:opacity-70 text-neutral-400 dark:text-neutral-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOPO INSTITUCIONAL / NAVBAR ELEGANTE E ESPAÇOSA */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo Oficial Gestão 360 */}
          <div className="flex items-center gap-3 shrink-0">
            <div 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-sm hover:border-emerald-500/40 hover:scale-105 transition-all cursor-pointer"
              title="Gestão 360 - Início"
            >
              <LogoCompass size={26} />
            </div>
            <div className="cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <span className="text-xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-1">
                GESTÃO <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">360</span>
              </span>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold tracking-wider uppercase">Tecnologia Pública</p>
            </div>
          </div>

          {/* Links de navegação desktop em cápsula moderna (em telas >= 1280px para espaço perfeito) */}
          <nav className="hidden xl:flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100/80 dark:bg-neutral-900/70 p-1.5 rounded-2xl border border-neutral-200/70 dark:border-neutral-800/70 backdrop-blur-md shadow-inner">
            <a 
              href="#municipios" 
              className="px-3.5 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-neutral-800 transition-all"
            >
              Municípios
            </a>
            <a 
              href="#saude-educacao" 
              className="px-3.5 py-1.5 rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-200/70 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Saúde & Educação
            </a>
            <a 
              href="#solucoes" 
              className="px-3.5 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-neutral-800 transition-all"
            >
              Soluções
            </a>
            <a 
              href="#conformidade" 
              className="px-3.5 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-neutral-800 transition-all"
            >
              Conformidade
            </a>
            <a 
              href="#faq" 
              className="px-3.5 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-neutral-800 transition-all"
            >
              FAQ
            </a>
            <a 
              href="/proposta" 
              className="px-3.5 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-neutral-800 transition-all text-neutral-800 dark:text-neutral-200"
            >
              Proposta 2026
            </a>
          </nav>

          {/* Área de Ações do Topo: Clean, Arejada e Sem Aperto */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Alternador de Modo Claro e Escuro */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all hover:scale-105"
              title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
              aria-label="Alternar Tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>

            {/* Ícone Discreto de Solicitação por E-mail */}
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="hidden sm:flex p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all hover:scale-105"
              title="Solicitar Proposta por E-mail"
              aria-label="Solicitar Proposta por E-mail"
            >
              <Mail className="w-4 h-4 text-emerald-500" />
            </button>

            {/* CTA PRINCIPAL QUE CHAMA ATENÇÃO (Sem expor o número de telefone) */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="relative group overflow-hidden px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-black text-white dark:text-neutral-950 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 rounded-xl shadow-lg shadow-emerald-600/25 dark:shadow-emerald-500/25 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 border border-emerald-400/30"
              title="Solicitar Demonstração no WhatsApp"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 dark:bg-emerald-900 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white dark:bg-emerald-950"></span>
              </span>
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Agendar Demonstração Gratuita</span>
              <span className="md:hidden">Demonstração VIP</span>
            </a>

            {/* Botão de Menu Hambúrguer (Para telas < 1280px para garantir total fluidez) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all"
              aria-label="Abrir Menu de Navegação"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MENU MOBILE / TABLET EXPANSÍVEL */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 pt-4 pb-6 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <a 
                href="#municipios" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-emerald-600"
              >
                <MapPin className="w-4 h-4 text-emerald-500" />
                Municípios
              </a>
              <a 
                href="#saude-educacao" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Saúde & Educação
              </a>
              <a 
                href="#solucoes" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-emerald-600"
              >
                <Building2 className="w-4 h-4 text-emerald-500" />
                Soluções
              </a>
              <a 
                href="#conformidade" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-emerald-600"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Conformidade
              </a>
              <a 
                href="#faq" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-emerald-600"
              >
                <HelpCircle className="w-4 h-4 text-emerald-500" />
                Dúvidas FAQ
              </a>
              <a 
                href="/proposta" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:text-emerald-600"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                Proposta 2026
              </a>
            </div>

            {/* CTAs diretos no Menu Mobile com nomes atraentes e sem expor número */}
            <div className="pt-2 space-y-2 border-t border-neutral-200 dark:border-neutral-800">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl text-xs font-black text-white dark:text-neutral-950 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 flex items-center justify-center gap-2 shadow-md transition"
              >
                <Send className="w-4 h-4" />
                <span>Solicitar Demonstração no WhatsApp</span>
              </a>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsContactModalOpen(true);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pedir Proposta</span>
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(CONTACT_EMAIL, 'E-mail oficial');
                    setIsMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copiar E-mail</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION COM CTAS PODEROSOS E CONVERSÃO ALTA */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Glow cósmico de fundo nas cores oficiais Gestão 360 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[340px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-amber-500/10 blur-[140px] rounded-full pointer-events-none opacity-80 dark:opacity-100" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-neutral-900/90 border border-emerald-200 dark:border-neutral-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-8 shadow-inner shadow-black/5 dark:shadow-black/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Tecnologia Governamental de Alto Impacto • Saúde, Educação e Transparência
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            A Plataforma que Resolve as Maiores Dores do Prefeito: <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 dark:from-emerald-400 dark:via-teal-300 dark:to-amber-300">Saúde Humanizada e Educação Nota 10</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto leading-relaxed">
            Zere as filas de espera no SUS, elimine ações judiciais por vagas em creches com transparência auditável pelo Ministério Público, alavanque o IDEB dos seus alunos e blinde as contas municipais com Selo Diamante de Transparência.
          </p>

          {/* ÁREA DE CTAS PRINCIPAIS: BOTÕES ATRAENTES SEM EXPOR O NÚMERO */}
          <div className="mt-10 flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap max-w-5xl mx-auto">
            
            {/* CTA 1: BOTÃO COM NOME QUE CHAMA ATENÇÃO (Sem expor o número de telefone) */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-black text-white dark:text-neutral-950 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 shadow-xl shadow-emerald-600/30 dark:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2.5 group hover:scale-[1.03] active:scale-[0.98] border border-emerald-400/30"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 dark:bg-emerald-900 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white dark:bg-emerald-950"></span>
              </span>
              <Send className="w-4 h-4" />
              <span>Solicitar Demonstração Gratuita</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>

            {/* CTA 2: E-MAIL COM MODAL OU ENVIO DIRETO */}
            <div className="w-full sm:w-auto flex items-center gap-1.5">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="flex-1 sm:flex-none px-6 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700/80 transition flex items-center justify-center gap-2 shadow-lg hover:border-emerald-500/50 hover:scale-[1.02]"
              >
                <Mail className="w-4 h-4 text-emerald-500" />
                <span>Solicitar Proposta por E-mail</span>
              </button>
              <button
                onClick={() => copyToClipboard(CONTACT_EMAIL, 'E-mail comercial')}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition shadow-lg hover:scale-105"
                title="Copiar aficconsultoria@gmail.com"
                aria-label="Copiar e-mail"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {/* CTA 3: NAVEGAÇÃO DIRETA PARA SAÚDE E EDUCAÇÃO */}
            <a
              href="#saude-educacao"
              className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700/80 transition flex items-center justify-center gap-2 shadow-lg hover:border-rose-500/40 hover:scale-[1.02]"
            >
              <HeartPulse className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span>Ver Soluções Saúde & Educação</span>
            </a>
          </div>

          {/* CHIPS INTERATIVOS DE CONTATO RÁPIDO E ATALHOS */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-xs">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium mr-1">Atendimento Rápido:</span>
            
            <button
              onClick={() => openProposal('Saúde e Farmácia SUS')}
              className="px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-semibold hover:scale-105 transition flex items-center gap-1.5"
            >
              <HeartPulse className="w-3 h-3" /> Fila do SUS no WhatsApp
            </button>

            <button
              onClick={() => openProposal('Creches e IDEB na Educação')}
              className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-semibold hover:scale-105 transition flex items-center gap-1.5"
            >
              <GraduationCap className="w-3 h-3" /> Fila Creches / IDEB
            </button>

            <button
              onClick={() => openProposal('Contratação Direta Lei 14.133')}
              className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold hover:scale-105 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3 h-3" /> Dispensa Lei 14.133
            </button>

            <button
              onClick={() => copyToClipboard(CONTACT_EMAIL, 'E-mail institucional')}
              className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700/80 font-semibold hover:scale-105 transition flex items-center gap-1.5"
              title="Clique para copiar o e-mail"
            >
              <Mail className="w-3 h-3 text-emerald-500" /> aficconsultoria@gmail.com
            </button>
          </div>

          {/* Selos de Conformidade e Confiança */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Atende à Lei 14.133/2021 (Dispensa/Adesão Rápida)
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 100% em Nuvem (Sem Instalação em Servidores Locais)
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Implantação Imediata em até 15 Dias
            </div>
          </div>
        </div>
      </section>

      {/* 3. VITRINE DE MUNICÍPIOS CLIENTES */}
      <section id="municipios" className="scroll-mt-24 py-16 bg-neutral-100 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 text-xs font-bold uppercase tracking-wider mb-3">
              <MapPin className="w-3.5 h-3.5" />
              Cidades Conectadas
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
              Municípios Atendidos pelo Gestão 360
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mt-3 leading-relaxed">
              Conheça as prefeituras que utilizam o ecossistema Gestão 360 para garantir transparência, modernizar secretarias e blindar as contas municipais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availableInstitutions.map((inst) => (
              <div 
                key={inst.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-lg shadow-neutral-200/50 dark:shadow-black/40 hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2 flex items-center justify-center shadow-inner">
                      <img 
                        src="/brasao-municipio.png" 
                        alt={`Brasão ${inst.name}`} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback caso a imagem não carregue
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <Landmark className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Portal Oficial Ativo
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {inst.name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-6">
                    Ambiente Oficial de Gestão Integrada, Diário Escolar e Transparência Pública.
                  </p>
                </div>

                <button
                  onClick={() => handleSelectMunicipality(inst)}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-neutral-800 dark:text-white bg-neutral-100 hover:bg-emerald-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-emerald-500 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 border border-neutral-200 dark:border-neutral-700 group/btn"
                >
                  Acessar Portal do Município
                  <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsSelectorModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <Search className="w-3.5 h-3.5" />
              Pesquisar mais prefeituras e câmaras na rede oficial
            </button>
          </div>
        </div>
      </section>

      {/* 4. BARRA DE CONFORMIDADE LEGAL / SELOS */}
      <section id="conformidade" className="scroll-mt-24 border-b border-neutral-200 dark:border-neutral-800/90 bg-neutral-50 dark:bg-neutral-950/80 py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-6">
            Projetado rigorosamente sob os marcos regulatórios da administração pública
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 hover:border-amber-500/30 transition shadow-sm">
              <Award className="w-6 h-6 text-amber-500 dark:text-amber-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Radar PNTP</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Critérios de Transparência dos Tribunais de Contas</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 hover:border-emerald-500/30 transition shadow-sm">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Reforma Tributária</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Conformidade com EC 132/23 e NTs do IBS/CBS</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 hover:border-blue-500/30 transition shadow-sm">
              <Lock className="w-6 h-6 text-blue-500 dark:text-blue-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">LGPD Governamental</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Lei 13.709/2018 com sigilo de prontuários</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 hover:border-purple-500/30 transition shadow-sm">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Lei 14.133/2021</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Nova Lei de Licitações e Contratos Administrativos</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. OS 4 GRANDES PILARES DE VENDA (PACOTES MODULARES) */}
      <section id="solucoes" className="scroll-mt-24 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Soluções Estratégicas</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
              Tecnologia onde o município mais precisa: Saúde, Educação e Gestão
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mt-4">
              Contrate a suíte completa ou inicie pelas secretarias que mais geram cobrança da população e órgãos de fiscalização.
            </p>

            {/* FILTROS INTERATIVOS DE CATEGORIAS DE MÓDULOS */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-neutral-950 shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Todos os Módulos (4)
              </button>
              <button
                onClick={() => setSelectedCategory('saude')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'saude'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-rose-600'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" /> Saúde 360 & Farmácia
              </button>
              <button
                onClick={() => setSelectedCategory('educacao')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'educacao'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-blue-600'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Educação 360 & Creches
              </button>
              <button
                onClick={() => setSelectedCategory('fazenda')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'fazenda'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" /> Fazenda & Fiscal
              </button>
              <button
                onClick={() => setSelectedCategory('camara')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'camara'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-purple-600'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" /> Câmara & Legislativo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PACOTE 1: SAÚDE MUNICIPAL, REGULAÇÃO SUS & FARMÁCIA */}
            {(selectedCategory === 'all' || selectedCategory === 'saude') && (
              <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-rose-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 shadow-inner">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      Saúde Humanizada
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Fim das Filas no Posto
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Saúde 360: Regulação SUS, PEP & Farmácia</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                    Acabe com a humilhação das filas na madrugada e a revolta popular. Regulação inteligente com alerta anti-duplicidade de exames, Prontuário Eletrônico do Paciente (PEP) ágil com triagem rápida SOAP e controle milimétrico de estoque na Farmácia Básica para não faltar medicamentos essenciais.
                  </p>
                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Regulação e agendamento SUS transparente, sem fura-filas ou duplicidades
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Prontuário Eletrônico (PEP) com histórico completo do paciente e sigilo LGPD
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Dispensação rastreada de medicamentos com controle de lotes e validades
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Economia de até 35% do teto financeiro com eliminação de exames repetidos
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => openProposal('Saúde 360')}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-rose-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-rose-600 dark:hover:text-white transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
                >
                  <span>Solicitar Proposta para a Saúde</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PACOTE 2: EDUCAÇÃO MUNICIPAL 360, CRECHES & IDEB */}
            {(selectedCategory === 'all' || selectedCategory === 'educacao') && (
              <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-blue-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-inner">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      Educação Nota 10
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Alavanca de IDEB / SAEB
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Educação 360: Diário, Creches & IDEB</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                    Blindagem jurídica para o prefeito com fila pública de creches 100% transparente e auditável pelo Ministério Público. Alavanque o IDEB com o Portal do Aluno gamificado (quizzes, trilhas e medalhas) e liberte os professores do trabalho braçal com o Diário Eletrônico integrado à matriz SAEB.
                  </p>
                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Fila de Creches pública e auditável (elimina ações e multas do MP)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Portal do Aluno com gamificação que aumenta a frequência e a retenção escolar
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Diário Eletrônico do Professor por matriz de proficiência SAEB
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Controle de rotas do transporte escolar e cardápio nutricional da merenda
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => openProposal('Educação 360')}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-blue-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-blue-500 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
                >
                  <span>Solicitar Proposta para a Educação</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PACOTE 3: FAZENDA & AUDITOR FISCAL */}
            {(selectedCategory === 'all' || selectedCategory === 'fazenda') && (
              <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-emerald-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 shadow-inner">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Fazenda & Finanças
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Radar PNTP Diamante
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Auditor Fiscal & Controles Contábeis (SRC)</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                    Plataforma de pré-validação de notas fiscais de fornecedores, garantindo conformidade nas regras de retenção de ISSQN, cClassTrib e IBS/CBS. Inclui Livro de Alterações Contábeis, conciliação de extratos bancários e remanejamentos.
                  </p>
                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Validador inteligente de PDF e XML conforme NT 2026.010 e NT 008
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Livro de Retificações Contábeis com Dossiê para o Tribunal de Contas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Comparativo automático de extratos bancários e dotações orçamentárias
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => openProposal('Fazenda & Auditor Fiscal')}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-emerald-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-emerald-500 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
                >
                  <span>Solicitar Proposta para Finanças</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PACOTE 4: CÂMARA MUNICIPAL & PLENÁRIO */}
            {(selectedCategory === 'all' || selectedCategory === 'camara') && (
              <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-purple-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 shadow-inner">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-2.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                      Poder Legislativo
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      Sessões Ao Vivo
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Câmara 360 & Painel Telão de Votação</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                    Modernize o plenário legislativo com painel eletrônico para telão em tempo real, votação nominal de projetos e requerimentos por vereador, além de portal da transparência com checklist PNTP para Câmaras.
                  </p>
                  <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 mb-8">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      Painel Telão de Sessão Legislativa com presença e votação instantânea
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      Tramitação completa de Projetos de Lei, Requerimentos e Indicações
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      Gabinete digital dos vereadores e Portal do Cidadão Legislativo
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => openProposal('Câmara Municipal 360')}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-purple-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-purple-500 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
                >
                  <span>Solicitar Proposta para Câmara</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. NOVA SEÇÃO DESTAQUE: ONDE OS MUNICÍPIOS MAIS SOFREM (SAÚDE & EDUCAÇÃO) */}
      <section id="saude-educacao" className="scroll-mt-24 py-20 bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-900/60 dark:to-neutral-950 border-t border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-3.5 py-1 rounded-full border border-rose-200 dark:border-rose-900/80 inline-flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              As 2 Maiores Fontes de Crise e Cobrança Popular
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white mt-4">
              Por que a Saúde e a Educação Definem a Avaliação de Qualquer Gestão?
            </h3>
            <p className="text-neutral-600 dark:text-neutral-300 text-sm sm:text-base mt-3 leading-relaxed">
              Mais de 80% das reclamações da população, mandados do Ministério Público e desgaste político ocorrem nessas duas áreas. Veja o contraste de como o Gestão 360 transforma essa realidade:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CARD COMPARATIVO SAÚDE */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-neutral-900 dark:text-white">Na Saúde Municipal</h4>
                      <p className="text-xs text-neutral-500">Regulação, UBSs e Farmácia Básica</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Fim do Caos
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  {/* Cenário Ruim */}
                  <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                    <div className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span>✕</span> Sem o Gestão 360 (Rotina Comum)
                    </div>
                    <ul className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5">
                      <li>• Pacientes madrugando na fila do posto para conseguir senha;</li>
                      <li>• Remédios vencendo no almoxarifado enquanto falta o básico na ponta;</li>
                      <li>• Médicos sem histórico clínico por falta de prontuário eletrônico;</li>
                      <li>• Pedidos de exames repetidos que estouram o teto orçamentário.</li>
                    </ul>
                  </div>

                  {/* Cenário Gestão 360 */}
                  <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Com o Gestão 360 (Humanizado e Eficiente)
                    </div>
                    <ul className="text-xs text-neutral-800 dark:text-neutral-200 space-y-1.5 font-medium">
                      <li>✓ Fila única de regulação com ordem cronológica e prioridade clínica;</li>
                      <li>✓ Farmácia municipal digitalizada com alerta preventivo de estoque;</li>
                      <li>✓ Prontuário eletrônico (PEP) rápido com histórico completo e triagem;</li>
                      <li>✓ Bloqueio inteligente de duplicidade economizando recursos vitais.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openProposal('Saúde Municipal')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
              >
                <span>Quero Modernizar a Saúde do Município</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* CARD COMPARATIVO EDUCAÇÃO */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                      <School className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-neutral-900 dark:text-white">Na Educação Básica</h4>
                      <p className="text-xs text-neutral-500">Creches, Diário Eletrônico e IDEB</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Blindagem & IDEB
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  {/* Cenário Ruim */}
                  <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                    <div className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span>✕</span> Sem o Gestão 360 (Rotina Comum)
                    </div>
                    <ul className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5">
                      <li>• Notificações e multas do Ministério Público por falta de vagas em creches;</li>
                      <li>• Alunos desmotivados, alta evasão e notas estagnadas no SAEB;</li>
                      <li>• Professores sobrecarregados preenchendo diários de papel nos finais de semana;</li>
                      <li>• Falta de transparência na prestação de contas de merenda e transporte.</li>
                    </ul>
                  </div>

                  {/* Cenário Gestão 360 */}
                  <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Com o Gestão 360 (Nota 10 no IDEB)
                    </div>
                    <ul className="text-xs text-neutral-800 dark:text-neutral-200 space-y-1.5 font-medium">
                      <li>✓ Fila pública de creches com critérios objetivos e auditáveis pelo MP;</li>
                      <li>✓ Portal do Aluno com quizzes, medalhas e streaks que disparam o IDEB;</li>
                      <li>✓ Diário do Professor 100% digital com escala SAEB e boletins em 1 clique;</li>
                      <li>✓ Rastreabilidade total de rotas do transporte escolar e merenda balanceada.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => openProposal('Educação Municipal')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <span>Quero Alavancar a Educação da Minha Cidade</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ - PERGUNTAS FREQUENTES INTERATIVAS (ACCORDION) */}
      <section id="faq" className="scroll-mt-24 py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 text-xs font-bold uppercase tracking-wider mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Tire Suas Dúvidas
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
            Perguntas Frequentes de Prefeitos e Secretários
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-3">
            Entenda como a plataforma pode ser contratada legalmente e operada com segurança jurídica no seu município.
          </p>
        </div>

        <div className="space-y-3.5">
          {[
            {
              q: "Como a Prefeitura ou Câmara pode contratar o Gestão 360 legalmente?",
              a: "O sistema pode ser contratado com total segurança jurídica através da Lei Federal nº 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos). As modalidades mais comuns são a Contratação Direta por Dispensa de Licitação em razão do valor (Art. 75, inciso II), Adesão a Ata de Registro de Preços (Carona) ou Pregão Eletrônico."
            },
            {
              q: "O sistema exige a compra ou instalação de servidores físicos no prédio da prefeitura?",
              a: "Não! O Gestão 360 é uma plataforma SaaS (Software as a Service) 100% nativa em nuvem. Isso elimina qualquer necessidade de compra de servidores caros, manutenção física ou custos com climatização de CPD. Os servidores públicos acessam o sistema via navegador seguro de qualquer computador ou tablet, com backups automáticos e redundância."
            },
            {
              q: "Podemos contratar apenas um módulo específico (ex: Saúde, Educação ou Câmara)?",
              a: "Sim! Toda a nossa arquitetura é 100% modular e interoperável. A Secretaria de Saúde pode contratar apenas o Saúde 360 (Regulação SUS, PEP e Farmácia Básica), a Secretaria de Educação pode contratar apenas a Suíte Educacional (Fila Pública de Creches e Diário Eletrônico), ou o município pode optar pela suíte integrada completa."
            },
            {
              q: "Qual é o tempo médio de implantação e treinamento da equipe de servidores?",
              a: "Nossa metodologia de implantação ágil permite colocar os módulos essenciais em operação em até 15 dias corridos. Oferecemos treinamentos guiados ao vivo com gravação disponibilizada aos servidores, além de canal direto de suporte e plantão para sanar dúvidas operacionais."
            },
            {
              q: "A plataforma atende aos critérios do Radar da Transparência Pública (PNTP)?",
              a: "Sim! Os módulos públicos, Ouvidoria, Serviços Públicos e Transparência foram desenvolvidos respeitando minuciosamente a matriz de critérios da ATRICON e dos Tribunais de Contas, auxiliando a administração municipal a conquistar os Selos Ouro ou Diamante de Transparência Pública."
            }
          ].map((item, index) => {
            const isOpen = faqOpenIndex === index;
            return (
              <div 
                key={index}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-snug">
                    {item.q}
                  </span>
                  <div className={`p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/60 pt-4 animate-in fade-in duration-200">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. CTA FINAL CONVINCENTE E PERSUASIVO */}
      <section className="py-20 bg-gradient-to-t from-neutral-100 to-white dark:from-neutral-950 dark:via-neutral-900/80 dark:to-neutral-950 border-t border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Demonstração Personalizada para o Seu Município
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Prefeito e Secretários: Chega de Apagar Incêndios e Administrar Crises no Papel
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300 text-sm sm:text-base mt-5 max-w-3xl mx-auto leading-relaxed">
            Solicite uma sessão técnica guiada com o brasão e os dados oficiais da sua prefeitura. Implantação 100% em nuvem em menos de 15 dias, dispensando licitação complexa conforme os termos da Lei Federal nº 14.133/2021.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* CTA WHATSAPP DE ALTO IMPACTO (Sem expor o número, nome chamativo) */}
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-9 py-4 rounded-2xl text-sm font-black text-white dark:text-neutral-950 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 shadow-xl shadow-emerald-600/30 dark:shadow-emerald-500/30 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2.5 group"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 dark:bg-emerald-900 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white dark:bg-emerald-950"></span>
              </span>
              <Send className="w-4 h-4" />
              <span>Solicitar Demonstração Exclusiva no WhatsApp</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>

            {/* CTA E-MAIL COM OPÇÃO DE FORMULÁRIO OU CÓPIA */}
            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="flex-1 sm:flex-none px-8 py-4 rounded-2xl text-sm font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/80 transition shadow-sm flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <Mail className="w-4 h-4 text-emerald-500" />
                <span>Solicitar Proposta por E-mail</span>
              </button>
              <button
                onClick={() => copyToClipboard(CONTACT_EMAIL, 'E-mail comercial')}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition shadow-sm hover:scale-105"
                title="Copiar aficconsultoria@gmail.com"
                aria-label="Copiar e-mail comercial"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <span>✓ Atendimento exclusivo para Prefeituras e Câmaras</span>
            <span>✓ Contratação simplificada (Dispensa / Adesão ARP)</span>
            <span>✓ Treinamento e suporte dedicado para servidores</span>
          </div>
        </div>
      </section>

      {/* 9. RODAPÉ INSTITUCIONAL COM LOGO OFICIAL GESTÃO 360 */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-100 dark:bg-neutral-950 py-12 text-xs text-neutral-500 dark:text-neutral-400 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-sm cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <LogoCompass size={22} />
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-white tracking-wide">GESTÃO 360</span>
              <span className="text-neutral-500 dark:text-neutral-500 ml-1.5">— Tecnologia para a Gestão Pública Eficiente</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-neutral-600 dark:text-neutral-400 font-medium">
            <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              <span>Atendimento Oficial via WhatsApp</span>
            </a>
            <button 
              onClick={() => copyToClipboard(CONTACT_EMAIL, 'E-mail')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-500" />
              <span>aficconsultoria@gmail.com</span>
            </button>
            <a href="/proposta" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition">Proposta 2026</a>
            <span>Radar PNTP</span>
          </div>
          <div className="text-neutral-500 dark:text-neutral-500">
            © {new Date().getFullYear()} AFIC Consultoria & Tecnologia Pública. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* WIDGET FLUTUANTE DE ATENDIMENTO WHATSAPP & E-MAIL (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
        
        {/* BOTÃO VOLTAR AO TOPO FLUTUANTE */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-200 shadow-xl hover:scale-110 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
            title="Voltar ao início da página"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}

        {/* POPOVER EXPANSÍVEL DE CONTATO DIRETO */}
        {isFabExpanded && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl p-5 shadow-2xl w-80 mb-1 space-y-3.5 animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                  Atendimento Oficial
                </span>
              </div>
              <button 
                onClick={() => setIsFabExpanded(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
              Fale com um consultor governamental ou solicite uma apresentação técnica:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsFabExpanded(false);
                  openProposal('Demonstração Geral do Gestão 360');
                }}
                className="w-full p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-left text-xs font-bold text-emerald-800 dark:text-emerald-300 transition flex items-center justify-between"
              >
                <span>💬 Agendar Demonstração Geral</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsFabExpanded(false);
                  openProposal('Módulo de Saúde 360 (SUS e Farmácia)');
                }}
                className="w-full p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-left text-xs font-bold text-rose-800 dark:text-rose-300 transition flex items-center justify-between"
              >
                <span>🏥 Dúvidas sobre Saúde & SUS</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsFabExpanded(false);
                  openProposal('Módulo de Educação 360 (Creches e IDEB)');
                }}
                className="w-full p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-left text-xs font-bold text-blue-800 dark:text-blue-300 transition flex items-center justify-between"
              >
                <span>🎓 Creches e IDEB Municipal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsFabExpanded(false);
                  setIsContactModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-left text-xs font-bold text-neutral-800 dark:text-neutral-200 transition flex items-center justify-between"
              >
                <span>✉️ Solicitar Proposta por E-mail</span>
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>
          </div>
        )}

        {/* BOTÃO PRINCIPAL FLUTUANTE DE WHATSAPP COM BADGE */}
        <div className="flex items-center gap-2">
          {!isFabExpanded && (
            <div 
              onClick={() => setIsFabExpanded(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xl cursor-pointer hover:border-emerald-500 transition hover:scale-105"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Atendimento WhatsApp • Online</span>
            </div>
          )}

          <button
            onClick={() => setIsFabExpanded(!isFabExpanded)}
            className="relative p-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/20"
            title="Atendimento WhatsApp e E-mail"
            aria-label="Abrir menu de atendimento"
          >
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border border-white"></span>
            </span>
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* MODAL DE CONTATO RÁPIDO E PROPOSTA OFICIAL */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative transition-all">
            <button 
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white">Solicitar Apresentação e Proposta</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Preencha os dados para receber a minuta oficial ou agendar demonstração</p>
              </div>
            </div>

            <div className="space-y-3.5 mb-6 text-xs font-semibold">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 mb-1">Município ou Órgão Público *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Prefeitura Municipal de Torixoréu - MT" 
                  value={contactCity}
                  onChange={(e) => setContactCity(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 mb-1">Seu Nome *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Carlos Oliveira" 
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 mb-1">Seu Cargo / Função</label>
                  <select 
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Prefeito / Vice-Prefeito">Prefeito / Vice-Prefeito</option>
                    <option value="Secretário(a) de Saúde">Secretário(a) de Saúde</option>
                    <option value="Secretário(a) de Educação">Secretário(a) de Educação</option>
                    <option value="Secretário(a) de Finanças / Fazenda">Secretário(a) de Finanças / Fazenda</option>
                    <option value="Presidente da Câmara / Vereador">Presidente da Câmara / Vereador</option>
                    <option value="Controlador(a) Geral / Procurador(a)">Controlador(a) Geral / Procurador(a)</option>
                    <option value="Servidor Público / Assessor">Servidor Público / Assessor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="(XX) 99999-9999" 
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 mb-1">Módulo Prioritário</label>
                  <select 
                    value={contactModule}
                    onChange={(e) => setContactModule(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Demonstração Geral Gestão 360">Demonstração Geral Gestão 360</option>
                    <option value="Saúde 360: Regulação SUS & Farmácia">Saúde 360: Regulação SUS & Farmácia</option>
                    <option value="Educação 360: Creches, Diário & IDEB">Educação 360: Creches, Diário & IDEB</option>
                    <option value="Fazenda: Auditor Fiscal 2026 & SRC">Fazenda: Auditor Fiscal 2026 & SRC</option>
                    <option value="Câmara 360: Painel Telão de Votação">Câmara 360: Painel Telão de Votação</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleSendWhatsAppContact}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-black text-white dark:text-neutral-950 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:hover:bg-emerald-300 shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Solicitação via WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendEmailContact}
                  className="py-3 px-3 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Enviar por E-mail</span>
                </button>
                <button
                  onClick={() => copyToClipboard(CONTACT_EMAIL, 'E-mail oficial')}
                  className="py-3 px-3 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copiar E-mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE MUNICÍPIOS OFICIAIS */}
      {isSelectorModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative transition-colors duration-300">
            <button 
              onClick={() => setIsSelectorModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Portais Municipais Oficiais</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Selecione o município para acessar o portal público oficial</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
              <input 
                type="text" 
                placeholder="Buscar prefeitura por nome..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="w-full bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-300 dark:border-neutral-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {filteredInstitutions.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => handleSelectMunicipality(inst)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 hover:bg-emerald-50 dark:bg-neutral-950/50 dark:hover:bg-emerald-500/10 border border-neutral-200 hover:border-emerald-300 dark:border-neutral-800 dark:hover:border-emerald-500/40 text-left transition group shadow-sm"
                >
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {inst.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Subdomínio: <span className="font-mono text-emerald-600 dark:text-emerald-300">{inst.subdomain || inst.id}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
                </button>
              ))}
              {filteredInstitutions.length === 0 && (
                <div className="text-center py-6 text-xs text-neutral-500 dark:text-neutral-400">
                  Nenhum município encontrado para &quot;{searchCity}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesLandingPage;
