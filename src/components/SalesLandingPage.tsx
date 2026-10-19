import React, { useState } from 'react';
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
  Lock, 
  X, 
  Search, 
  ExternalLink, 
  MapPin, 
  Award,
  Sun,
  Moon
} from 'lucide-react';
import { LogoCompass } from './LogoCompass';
import ProposalModal from './ProposalModal';
import { Institution } from '../types';

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
  onOpenNotaFiscal = () => {
    if (window.location.pathname !== '/notafiscal') {
      window.location.href = '/notafiscal';
    }
  },
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

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedModuleForProposal, setSelectedModuleForProposal] = useState<string | undefined>();
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [searchCity, setSearchCity] = useState('');

  const openProposal = (moduleName?: string) => {
    setSelectedModuleForProposal(moduleName);
    setIsProposalModalOpen(true);
  };

  const officialClientInstitutions: Institution[] = [
    { id: 'inst_1', name: 'Prefeitura Municipal de Torixoréu', subdomain: 'torixoreu', logo_url: 'https://www.torixoreu.mt.gov.br/images/logoHeadernovo.png' },
    { id: 'inst_2', name: 'Prefeitura Municipal de Barra do Garças', subdomain: 'barradogarcas', logo_url: '/brasao-municipio.png' },
    { id: 'inst_3', name: 'Prefeitura Municipal de Pontal do Araguaia', subdomain: 'pontaldoaraguaia', logo_url: '/brasao-municipio.png' }
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
    <div className={`min-h-screen ${isDark ? 'dark bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'} flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300`}>
      {/* 1. TOPO INSTITUCIONAL / NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-neutral-950/85 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Logo Oficial do Planeta Gestão 360 */}
            <div className="p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900/90 border border-neutral-200 dark:border-white/10 shadow-md shadow-black/5 dark:shadow-black/40 hover:border-emerald-500/40 transition-all cursor-pointer">
              <LogoCompass size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-1">
                  GESTÃO <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">360</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium tracking-wide">Plataforma Integrada de Gestão Pública</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            <a href="#municipios" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Municípios Atendidos
            </a>
            <a href="#solucoes" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Soluções</a>
            <a href="#conformidade" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Conformidade Legal</a>
            <a href="#reforma" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              Reforma Tributária
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </a>
            <a href="#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Perguntas Frequentes</a>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Alternador de Modo Claro e Escuro */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all hover:scale-105"
              title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
              aria-label="Alternar Tema"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>

            <button
              onClick={onOpenNotaFiscal}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white rounded-xl border border-neutral-300 dark:border-neutral-700/80 transition shadow-sm"
              title="Testar Validador Fiscal Gratuito"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Validador Fiscal
            </button>

            <button
              onClick={() => openProposal()}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white dark:text-neutral-950 bg-emerald-600 hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 dark:hover:from-emerald-300 dark:hover:to-teal-200 rounded-xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Solicitar Apresentação
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Glow cósmico de fundo nas cores oficiais Gestão 360 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[340px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-amber-500/10 blur-[140px] rounded-full pointer-events-none opacity-80 dark:opacity-100" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-neutral-900/90 border border-emerald-200 dark:border-neutral-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-8 shadow-inner shadow-black/5 dark:shadow-black/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Em conformidade com a Reforma Tributária (EC 132/2023) e Radar PNTP 2026
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            A Plataforma Definitiva de Gestão, Transparência e Finanças para <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 dark:from-emerald-400 dark:via-teal-300 dark:to-amber-300">Municípios Inteligentes</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto leading-relaxed">
            Elimine processos físicos, blinde a Fazenda Municipal contra inconsistências fiscais, potencialize o IDEB na Educação e alcance o <strong className="text-amber-600 dark:text-amber-300">Selo Diamante</strong> no Radar Nacional de Transparência Pública.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openProposal()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-black text-white dark:text-neutral-950 bg-emerald-600 hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 dark:hover:from-emerald-300 dark:hover:to-teal-200 shadow-xl shadow-emerald-600/25 dark:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 group hover:scale-[1.02]"
            >
              Agendar Apresentação Guiada
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={onOpenNotaFiscal}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700/80 transition flex items-center justify-center gap-2 shadow-lg hover:border-emerald-500/50"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Testar Validador Fiscal Gratuito (/notafiscal)
            </button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 100% Web (Sem instalação)
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Hospedagem em Nuvem Segura
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Atende à Lei 14.133/2021
            </div>
          </div>
        </div>
      </section>

      {/* 3. VITRINE DE MUNICÍPIOS CLIENTES */}
      <section id="municipios" className="py-16 bg-neutral-100 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300">
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
      <section id="conformidade" className="border-b border-neutral-200 dark:border-neutral-800/90 bg-neutral-50 dark:bg-neutral-950/80 py-8 transition-colors duration-300">
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
      <section id="solucoes" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Soluções Especializadas</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
              Modular e escalável para atender cada secretaria municipal
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mt-4">
              Contrate a suíte completa ou inicie pelos pacotes estratégicos com maior urgência na sua prefeitura ou câmara.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PACOTE 1: FAZENDA & AUDITOR FISCAL */}
            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-emerald-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Fazenda & Finanças
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    Urgência Reforma Tributária
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
                Solicitar Proposta para Finanças
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* PACOTE 2: EDUCAÇÃO MUNICIPAL 360 */}
            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-blue-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    Educação Básica & Creches
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    Foco no IDEB / SAEB
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Educação 360 & Gamificação</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                  Aumente o engajamento estudantil com o Portal do Aluno gamificado (quizzes, trilhas e XP) e estruture a rede com o Diário do Professor por proficiência do SAEB, fila de espera transparente para creches e boletins oficiais.
                </p>
                <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    Portal do Aluno com trilhas de aprendizagem e streaks diários
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    Avaliação por Escala de Proficiência do SAEB e Planos de Intervenção
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    Portal Público de Vagas e Fila de Creches 100% auditável
                  </li>
                </ul>
              </div>
              <button
                onClick={() => openProposal('Educação Municipal 360')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-blue-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-blue-500 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
              >
                Solicitar Proposta para Educação
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* PACOTE 3: CÂMARA MUNICIPAL & PLENÁRIO */}
            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-purple-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
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
                <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Câmara 360 & Painel de Votação</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                  Modernize o plenário legislativo com painel eletrônico para telão em tempo real, votação de projetos e indicações por vereador, além de portal da transparência com checklist PNTP para Câmaras.
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
                    Gabinete dos vereadores e Portal do Cidadão Legislativo
                  </li>
                </ul>
              </div>
              <button
                onClick={() => openProposal('Câmara Municipal 360')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-purple-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-purple-500 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
              >
                Solicitar Proposta para Câmara
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* PACOTE 4: SAÚDE, CIDADANIA & OUVIDORIA */}
            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl p-8 hover:border-teal-500/40 transition-all group flex flex-col justify-between shadow-xl shadow-neutral-200/50 dark:shadow-black/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                    Saúde & Atendimento ao Cidadão
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Saúde, Ouvidoria & Serviços Públicos</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                  Gerenciamento humanizado com fila de atendimento em postos de saúde, dispensação de medicamentos em farmácia básica municipal, ouvidoria integrada (Lei 13.460) e protocolo de processos sem papel.
                </p>
                <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    Agendamento e controle de filas nas UBSs com sigilo de prontuários
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    Dispensação de medicamentos da Farmácia Básica com rastreamento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    Ouvidoria com prazos LAI e Protocolo Digital de documentos
                  </li>
                </ul>
              </div>
              <button
                onClick={() => openProposal('Saúde & Cidadania')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 hover:bg-teal-600 hover:text-white dark:bg-neutral-800 dark:hover:bg-teal-400 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-md border border-neutral-200 dark:border-neutral-700"
              >
                Solicitar Proposta para Saúde e Cidadania
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SEÇÃO DESTAQUE: REFORMA TRIBUTÁRIA & /notafiscal */}
      <section id="reforma" className="py-16 bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-900/60 dark:to-neutral-950 border-t border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-100/70 via-white to-white dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 border border-emerald-300 dark:border-emerald-500/30 rounded-3xl p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/20">
                Inovação Exclusiva Gestão 360
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mt-4">
                Disponibilize o Validador Fiscal Oficial para as Empresas e Contadores da Sua Cidade
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300 text-sm sm:text-base mt-3 leading-relaxed">
                Evite que sua prefeitura pague notas fiscais irregulares ou perca retenções tributárias. As empresas do município acessam uma página pública limpa, anexam o PDF ou XML da nota e recebem o diagnóstico instantâneo se está apta ou o que precisa corrigir.
              </p>
            </div>
            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
              <button
                onClick={onOpenNotaFiscal}
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white dark:text-neutral-950 bg-emerald-600 hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 transition shadow-lg shadow-emerald-500/20 text-center"
              >
                Acessar Portal /notafiscal
              </button>
              <button
                onClick={() => openProposal('Portal de Validação Fiscal')}
                className="px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/80 transition text-center shadow-sm"
              >
                Implantar no Município
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ - PERGUNTAS FREQUENTES DE GESTORES PÚBLICOS */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Dúvidas Frequentes</h2>
          <h3 className="text-3xl font-black text-neutral-900 dark:text-white">Como funciona a contratação pública?</h3>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-2">Como a Prefeitura ou Câmara pode contratar o Gestão 360?</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              O sistema pode ser contratado através da <strong>Lei Federal nº 14.133/2021 (Nova Lei de Licitações)</strong> via Pregão Eletrônico, Adesão a Ata de Registro de Preços ou Contratação Direta (Dispensa de Licitação por valor nos termos do Art. 75), dependendo do porte e dos módulos contratados.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-2">O sistema exige servidores físicos instalados na prefeitura?</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Não. O Gestão 360 opera no modelo <strong>SaaS (Software como Serviço) 100% em nuvem</strong>, dispensando compras de servidores locais caros, manutenção de TI física ou rotinas manuais de backup. Toda a infraestrutura roda com criptografia de ponta e redundância de dados.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white mb-2">Podemos contratar apenas um módulo específico (ex: Educação ou Câmara)?</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Sim! Nossa arquitetura é modular. Uma Câmara Municipal pode contratar unicamente o <strong>Plenário & Telão Legislativo</strong>, assim como a Secretaria de Educação pode contratar apenas a <strong>Suíte Educacional</strong> com o portal gamificado do aluno.
            </p>
          </div>
        </div>
      </section>

      {/* 8. CTA FINAL */}
      <section className="py-16 bg-gradient-to-t from-neutral-100 to-white dark:from-neutral-950 dark:via-neutral-900/80 dark:to-neutral-950 border-t border-neutral-200 dark:border-neutral-800/80 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
            Pronto para transformar a gestão pública da sua cidade?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mt-4 max-w-2xl mx-auto">
            Nossos consultores preparam uma apresentação personalizada com os dados e o brasão do seu município.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openProposal()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-black text-white dark:text-neutral-950 bg-emerald-600 hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400 dark:hover:from-emerald-300 dark:hover:to-teal-200 shadow-xl shadow-emerald-600/25 dark:shadow-emerald-500/25 transition-all hover:scale-[1.02]"
            >
              Falar com um Consultor Especialista
            </button>
            <a
              href="#municipios"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700/80 transition shadow-sm flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              Acessar Portais dos Municípios
            </a>
          </div>
        </div>
      </section>

      {/* 9. RODAPÉ INSTITUCIONAL COM LOGO OFICIAL GESTÃO 360 */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-100 dark:bg-neutral-950 py-12 text-xs text-neutral-500 dark:text-neutral-400 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-sm">
              <LogoCompass size={22} />
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-white tracking-wide">GESTÃO 360</span>
              <span className="text-neutral-500 dark:text-neutral-500 ml-1.5">— Tecnologia para a Gestão Pública Eficiente</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-neutral-600 dark:text-neutral-400 font-medium">
            <span>Segurança LGPD</span>
            <span>Conformidade PNTP</span>
            <span>Reforma Tributária</span>
          </div>
          <div className="text-neutral-500 dark:text-neutral-500">
            © {new Date().getFullYear()} AFIC Consultoria & Tecnologia Pública. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* MODAL DE PROPOSTA COMERCIAL */}
      <ProposalModal 
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        initialModule={selectedModuleForProposal}
      />

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
