import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, BookText, ShieldAlert, FileBadge, Target, Briefcase, HeartPulse, 
  Wrench, TreePine, Calculator, Tractor, HeartHandshake, Trophy, Map, Landmark, 
  Users2, GraduationCap, HardHat, Sun, Moon, ExternalLink, Lock, Plus, Search, 
  Building2, Sparkles, Menu, X, ChevronRight, Globe, FileCheck, PieChart as PieChartIcon, 
  ArrowRight, Shield, CheckCircle2, AlertTriangle, FileText, Users, Send, Leaf,
  Package, Calendar, BookOpen, LayoutDashboard, TrendingDown, Clock, TrendingUp, Activity
} from 'lucide-react';
import { LogoCompass } from './LogoCompass';
import { showToast } from './ui/Toast';
import { Institution } from '../types';

export const SalesLandingPage = ({ 
  darkMode, 
  setDarkMode, 
  showMunicipalitySelector = false, 
  institutions = [] 
}: { 
  darkMode: boolean, 
  setDarkMode: (v: boolean) => void,
  showMunicipalitySelector?: boolean,
  institutions?: Institution[]
}) => {
  const [activeTab, setActiveTab] = React.useState<'gabinete' | 'administracao' | 'servicos' | 'cidadao'>('gabinete');
  const [citySize, setCitySize] = React.useState<'small' | 'medium' | 'large' | 'huge'>('medium');
  const [isSelectorModalOpen, setIsSelectorModalOpen] = React.useState(false);
  const [searchCity, setSearchCity] = React.useState('');

  const tabContent = {
    gabinete: {
      title: "Gabinete & Governança Preventiva",
      description: "Garanta a blindagem jurídica e administrativa do gabinete municipal. Ferramentas automáticas de auditoria, padronização de leis e monitoramento de riscos fiscais e de controle externo de acordo com o TCE.",
      features: [
        { title: "Controles Internos", desc: "Checklists preventivos baseados nos cronogramas oficiais do TCE para auditoria ágil de todos os atos oficiais municipais.", icon: ClipboardCheck },
        { title: "Normativas & Legislação", desc: "Repositório integrado, catalogado e acessível de leis, decretos, portarias e atos do Poder Executivo.", icon: BookText },
        { title: "Análise de Risco", desc: "Matrizes de riscos operacionais e financeiros para alertar o prefeito e secretários sobre inconformidades prévias.", icon: ShieldAlert },
        { title: "Modelos & Numeração", desc: "Criação de documentos padronizados (ofícios, decretos) com controle central sequencial de numeração anual.", icon: FileBadge }
      ]
    },
    administracao: {
      title: "Administração, Finanças & Compras Públicas",
      description: "Simplifique as licitações e os contratos do município com conformidade automática à Nova Lei 14.133. Centralize e controle a saúde financeira municipal, emissões e relatórios fiscais do município.",
      features: [
        { title: "Licitações & Contratos", desc: "Gestão completa de vigência, reajustes, aditivos contratuais e conformidade nativa e automática com a Lei 14.133.", icon: Target },
        { title: "Radar PNTP", desc: "Integração imediata com envio automatizado de processos homologados para o Portal Nacional de Contratações Públicas.", icon: Globe },
        { title: "Banco de Certidões", desc: "Monitoramento de regularidade em tempo real com alertas automáticos para certidões estaduais e federais municipais.", icon: FileCheck },
        { title: "Gestão Financeira", desc: "Painéis e relatórios consolidados de receitas, despesas e alertas automáticos sobre limites legais da LRF.", icon: PieChartIcon }
      ]
    },
    servicos: {
      title: "Serviços Finalísticos & Saúde Pública",
      description: "Modernize a ponta da prestação de serviços municipais. Gerencie a saúde, educação, frotas e obras públicas garantindo transparência ativa nos pedidos, uso eficiente de maquinários e suprimentos.",
      features: [
        { title: "Saúde Integrada & SUS", desc: "Módulos para controle da frota de ambulâncias, TFD e gerenciamento dinâmico de medicamentos da Farmácia SUS.", icon: HeartPulse },
        { title: "Viação, Obras & Pedidos", desc: "Abertura digital de pedidos de insumos (brita, cimento, asfalto), controle de horas de maquinário e relatórios de vistorias.", icon: HardHat },
        { title: "Transporte & Educação", desc: "Acompanhamento de rotas e frotas de ônibus escolar, distribuição de merendas e controle de estoque de materiais didáticos.", icon: GraduationCap },
        { title: "Patrimônio & Frotas", desc: "Tombamento de bens públicos com QR-code, controle preventivo de manutenção de veículos e diários de bordo digitais.", icon: Package }
      ]
    },
    cidadao: {
      title: "Ouvidoria, Cidadão & Poder Legislativo",
      description: "Conecte o cidadão diretamente à prefeitura e crie uma ponte robusta de transparência com a Câmara de Vereadores. Aumente seus índices oficiais de transparência pública e interatividade social.",
      features: [
        { title: "Portal de Serviços", desc: "Solicitações populares online (iluminação, podas de árvores, melhorias) com acompanhamento digital em tempo real pelo celular.", icon: Users },
        { title: "Portal SUS Cidadão", desc: "Agendamento descentralizado de consultas médicas básicas e acompanhamento da disponibilidade física de remédios do SUS.", icon: Calendar },
        { title: "Integração Câmara 360", desc: "Plataforma de integração e intercâmbio de processos, indicações e atos oficiais legislativos com o Executivo.", icon: Landmark },
        { title: "Protocolo Eletrônico", desc: "Abertura, acompanhamento e despacho de processos de maneira 100% eletrônica, rastreável e sem papel no município.", icon: FileText }
      ]
    }
  };

  const calculatorData = {
    small: {
      label: "Pequeno (até 15 mil hab.)",
      economy: "R$ 45.000",
      paper: "850 resmas",
      time: "De 14 dias para 3 horas",
      efficiency: "+35%"
    },
    medium: {
      label: "Médio (15k a 50k hab.)",
      economy: "R$ 135.000",
      paper: "2.450 resmas",
      time: "De 15 dias para 2 horas",
      efficiency: "+42%"
    },
    large: {
      label: "Grande (50k a 100k hab.)",
      economy: "R$ 380.000",
      paper: "7.200 resmas",
      time: "De 18 dias para 1 hora",
      efficiency: "+50%"
    },
    huge: {
      label: "Metrópole (Mais de 100k hab.)",
      economy: "R$ 820.000",
      paper: "16.500 resmas",
      time: "De 21 dias para 45 min",
      efficiency: "+58%"
    }
  };

  const timelineSteps = [
    {
      step: "01",
      title: "Portal do Cidadão",
      desc: "Um morador identifica um buraco na via pública e abre uma solicitação no Portal do Cidadão pelo celular, anexando foto e geolocalização exata.",
      icon: Globe,
      color: "from-emerald-500 to-teal-500"
    },
    {
      step: "02",
      title: "Protocolo Digital",
      desc: "O chamado entra na prefeitura e gera imediatamente um Protocolo Digital unificado, com numeração automatizada e rastreabilidade total de trâmite.",
      icon: ClipboardCheck,
      color: "from-teal-500 to-cyan-500"
    },
    {
      step: "03",
      title: "Tramitação Imediata",
      desc: "Sem malotes ou trânsito físico, o processo tramita online em 1 segundo para a Secretaria de Viação e Obras. O engenheiro recebe o alerta e faz a vistoria.",
      icon: ArrowRight,
      color: "from-cyan-500 to-sky-500"
    },
    {
      step: "04",
      title: "Pedido de Insumos",
      desc: "O encarregado da secretaria abre um Pedido de Material de Obras integrado (brita/asfalto) através de um modal moderno e fluxo multi-item automatizado.",
      icon: HardHat,
      color: "from-sky-500 to-indigo-500"
    },
    {
      step: "05",
      title: "Conformidade 14.133",
      desc: "O sistema verifica se o fornecedor está regular perante o Banco de Certidões e se a contratação cumpre a Nova Lei de Licitações, enviando ao Radar PNTP.",
      icon: Shield,
      color: "from-indigo-500 to-violet-500"
    },
    {
      step: "06",
      title: "Execução & Feedback",
      desc: "A via é reparada e a retroescavadeira registra a atividade via diário de bordo digital. O cidadão recebe uma mensagem SMS informando a conclusão da obra.",
      icon: Sparkles,
      color: "from-violet-500 to-emerald-500"
    }
  ];

  const scrollToSolutions = () => {
    document.getElementById('solucoes')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`min-h-[100dvh] ${darkMode ? 'dark' : ''} font-sans selection:bg-emerald-500/20`}>
      <div className="bg-[#F8F8F7] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 min-h-[100dvh] flex flex-col relative transition-colors duration-500 overflow-x-hidden">
        {/* Background Decorative Gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-15%] w-[70%] h-[60%] bg-emerald-400/10 dark:bg-emerald-500/8 rounded-full blur-[140px] transition-colors duration-500" />
          <div className="absolute bottom-[-20%] right-[-15%] w-[70%] h-[60%] bg-sky-400/10 dark:bg-sky-500/8 rounded-full blur-[140px] transition-colors duration-500" />
          <div className="absolute top-[30%] right-[10%] w-[50%] h-[50%] bg-violet-300/8 dark:bg-violet-500/5 rounded-full blur-[120px] transition-colors duration-500" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-[#F8F8F7]/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/20 dark:border-neutral-800/30 transition-all">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-12 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-2xl shadow-xl shadow-neutral-200/50 dark:shadow-none border border-neutral-100 dark:border-neutral-800 flex items-center justify-center">
                <LogoCompass size={28} />
              </div>
              <span className="text-xl font-black text-neutral-900 dark:text-white tracking-tight italic">
                Gestão <span className="text-neutral-400 font-normal">360</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-md border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {showMunicipalitySelector && (
                <button
                  type="button"
                  onClick={() => setIsSelectorModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 hover:shadow-lg hover:shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Building2 size={12} />
                  Acessar Prefeitura
                </button>
              )}
              <a
                href="/servidores"
                className="hidden sm:flex items-center gap-2 px-5 py-3 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 hover:shadow-lg hover:shadow-neutral-950/20 dark:hover:shadow-white/20 transition-all text-center"
              >
                <Lock size={12} />
                Acesso Servidor
              </a>
            </div>
          </div>
        </header>

        {/* Hero Section — Full-Screen Premium */}
        <section className="relative min-h-[calc(100dvh-65px)] flex items-center overflow-hidden">
          {/* Rich Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-emerald-950/40 to-sky-950/60 dark:from-neutral-950 dark:via-emerald-950/50 dark:to-sky-950/70" />
          <div className="absolute inset-0 bg-[#050f0a] opacity-60 dark:opacity-80" />
          {/* Floating orbs */}
          <div className="absolute top-[-10%] left-[-5%] w-[55%] h-[70%] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[70%] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-teal-400/8 rounded-full blur-[100px] pointer-events-none" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

          <main className="relative z-10 flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-12 py-16 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left side: Copy and CTAs */}
              <div className="lg:col-span-6 space-y-8 text-left">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="space-y-6"
                >
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Plataforma Completa · Governança, Educação e Serviços Públicos
                  </div>

                  {/* Headline */}
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.95]">
                    Gestão Municipal{" "}
                    <span className="relative inline-block">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400">
                        360°
                      </span>
                    </span>
                    <br />
                    <span className="text-neutral-300 text-4xl sm:text-5xl lg:text-6xl font-bold">de ponta a ponta.</span>
                  </h1>

                  {/* Subtitle */}
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-lg font-medium">
                    Plataforma completa de governança, educação municipal gamificada e transparência pública integrada. O único sistema que cobre cada secretaria, do gabinete ao portal do aluno.
                  </p>
                </motion.div>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <button
                    onClick={scrollToSolutions}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.03] active:scale-[0.97] shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 text-center cursor-pointer flex items-center justify-center gap-2.5 group"
                  >
                    <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                    Ver Soluções
                  </button>
                  <a
                    href="https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20sistema%20Gest%C3%A3o%20360%20para%20o%20meu%20munic%C3%ADpio."
                    target="_blank"
                    rel="noreferrer"
                    className="px-8 py-4 bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white border border-white/15 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    Agendar Demo
                  </a>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10"
                >
                  {[
                    { value: "21+", label: "Módulos Ativos", color: "text-emerald-400" },
                    { value: "0", label: "Apontamentos TCE", color: "text-sky-400" },
                    { value: "100%", label: "Sem Papel", color: "text-teal-400" }
                  ].map((stat, i) => (
                    <div key={i} className="space-y-1">
                      <p className={`text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>

                {/* Social proof */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.55 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex -space-x-2">
                    {['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b'].map((color, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-neutral-900 flex items-center justify-center text-[10px] font-black text-white" style={{ background: color }}>
                        {['VC', 'NV', 'RO', 'MT'][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-400 font-medium">
                    <span className="text-white font-bold">+4 municípios</span> já utilizam o sistema
                  </p>
                </motion.div>
              </div>

              {/* Right side: Floating Dashboard Mockup */}
              <div className="lg:col-span-6 relative">
                {/* Glow behind card */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-sky-500/20 rounded-[48px] blur-3xl scale-95" />
                <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 rounded-[48px] blur-xl" />

                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="relative w-full bg-neutral-900/80 backdrop-blur-2xl rounded-[36px] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-5 overflow-hidden"
                >
                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none rounded-[36px]" />

                  {/* Dashboard top bar */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 bg-rose-500 rounded-full" />
                        <span className="w-3 h-3 bg-amber-500 rounded-full" />
                        <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                      </div>
                      <span className="text-[10px] text-neutral-500 font-medium">gestao360 — Gabinete</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      Centro de Comando 360
                    </span>
                  </div>

                  {/* LRF Card */}
                  <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:bg-white/8 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Gasto com Pessoal (LRF)</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Regular</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">48.2%</span>
                      <span className="text-[9px] text-neutral-500 font-bold">Teto LRF: 54.0%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 left-[51.3%] w-[1px] bg-amber-500/60 z-10" />
                      <div className="absolute top-0 bottom-0 left-[54%] w-[1px] bg-rose-500/60 z-10" />
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[48.2%]" />
                    </div>
                  </div>

                  {/* Two metric cards */}
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-colors">
                      <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Economia Sem Papel</span>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-xl font-black text-white">R$ 14.820</span>
                        <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">mês</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 mt-2.5 rounded-full"><div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[85%]" /></div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-colors">
                      <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Ouvidoria Cidadã</span>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-xl font-black text-white">94.2%</span>
                        <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-1 py-0.5 rounded">aprovação</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 mt-2.5 rounded-full"><div className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full w-[94%]" /></div>
                    </div>
                  </div>

                  {/* Department bars */}
                  <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Eficiência de Secretarias</span>
                      <span className="text-[9px] font-bold text-neutral-500">Gabinete 360</span>
                    </div>
                    {[
                      { name: "Saúde & Ambulâncias", val: 96.8, color: "from-emerald-500 to-teal-400" },
                      { name: "Licitações & Radar PNTP", val: 100, color: "from-sky-500 to-cyan-400" },
                      { name: "Obras, Frota & Insumos", val: 89.2, color: "from-amber-500 to-orange-400" }
                    ].map((dept, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[8px] font-bold">
                          <span className="text-neutral-400">{dept.name}</span>
                          <span className="text-white font-mono">{dept.val}%</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div className={`bg-gradient-to-r ${dept.color} h-full rounded-full`} style={{ width: `${dept.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Alert items */}
                  <div className="space-y-2 relative z-10">
                    {[
                      { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", title: "Certidões Fiscais Sincronizadas", sub: "Regularidade ativa perante Receita/FGTS" },
                      { icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", title: "Contrato de Obra Próximo do Fim (30d)", sub: "Matriz de risco disparou alerta automático" }
                    ].map((notify, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/3 border border-white/8 rounded-xl hover:bg-white/6 transition-all">
                        <div className={`p-2 rounded-lg border ${notify.color} shrink-0`}>
                          <notify.icon size={11} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-neutral-200 truncate">{notify.title}</p>
                          <p className="text-[9px] text-neutral-500 font-medium truncate">{notify.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </main>
        </section>

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-12 py-12 space-y-36 relative z-10">
          {/* NEW: Education Module Spotlight */}
          <section className="relative overflow-hidden rounded-[48px] bg-gradient-to-br from-indigo-950 via-violet-950 to-purple-950 p-8 sm:p-16 border border-indigo-800/30 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Side: Education highlights */}
              <div className="space-y-8">
                <div>
                  <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3.5 py-1.5 rounded-full mb-6">
                    <GraduationCap size={12} /> Módulo de Educação Municipal
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] mt-4">
                    Educação Municipal{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
                      Gamificada
                    </span>
                  </h2>
                  <p className="text-sm text-indigo-200 leading-relaxed font-medium mt-4 max-w-md">
                    O único sistema de gestão municipal com portal educacional completo para alunos e professores. Transforme a experiência de aprendizado e a gestão escolar do seu município com gamificação, trilhas de conhecimento e acompanhamento em tempo real.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: BookOpen, label: "Portal do Aluno", desc: "Trilhas, conquistas e avaliações gamificadas" },
                    { icon: GraduationCap, label: "Portal do Professor", desc: "Dashboard, turmas e planos de intervenção" },
                    { icon: Trophy, label: "Sistema de Conquistas", desc: "XP, níveis e troféus por desempenho" },
                    { icon: Target, label: "Avaliações Digitais", desc: "Missões e desafios com recompensas" },
                  ].map((feat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:bg-violet-500/30 transition-colors">
                        <feat.icon size={18} className="text-white" />
                      </div>
                      <h4 className="font-black text-white text-sm leading-tight">{feat.label}</h4>
                      <p className="text-[11px] text-indigo-300 mt-1 leading-tight">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Student Portal UI Mockup */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 rounded-[40px] blur-xl" />
                <div className="relative bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-4">
                  {/* Mockup header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <span className="font-black text-white text-sm">Gestão 360 Educação</span>
                    </div>
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      Online
                    </span>
                  </div>

                  {/* Student card */}
                  <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-sky-400 flex items-center justify-center font-black text-white text-sm shrink-0">A</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm">Arthur da Silva</p>
                      <p className="text-[10px] text-indigo-300">Explorador Nível 7 ⚡ · 1.850 XP</p>
                    </div>
                    <div className="shrink-0">
                      <div className="w-20 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full" style={{ width: '74%' }}></div>
                      </div>
                      <p className="text-[9px] text-neutral-500 mt-0.5 text-right">Nível 8 (74%)</p>
                    </div>
                  </div>

                  {/* Recommended Trail card */}
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute right-3 bottom-1 text-5xl opacity-10">🚀</div>
                    <span className="text-[9px] font-black uppercase text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded-full">⭐ Trilha Recomendada</span>
                    <h4 className="text-white font-black mt-2 text-sm leading-tight">Os Mistérios do Sistema Solar</h4>
                    <p className="text-white/70 text-[10px] mt-0.5">Ciências · Fase 3 de 5</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[9px] text-white/80 font-bold">
                        <span>Progresso</span><span>65%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/20 rounded-full">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Achievement badges */}
                  <div className="flex gap-2 overflow-x-hidden">
                    {['⭐ Super Estrela', '⚡ Relâmpago', '🔥 Em Chamas'].map((badge, i) => (
                      <div key={i} className="shrink-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white whitespace-nowrap">{badge}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Wall */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "21+", label: "Módulos Integrados", icon: LayoutDashboard, bg: "bg-emerald-50 dark:bg-emerald-500/10", color: "text-emerald-500" },
              { value: "4", label: "Portais Públicos", icon: Globe, bg: "bg-sky-50 dark:bg-sky-500/10", color: "text-sky-500" },
              { value: "100%", label: "Conformidade TCE", icon: Shield, bg: "bg-violet-50 dark:bg-violet-500/10", color: "text-violet-500" },
              { value: "0", label: "Papel no Processo", icon: Leaf, bg: "bg-teal-50 dark:bg-teal-500/10", color: "text-teal-500" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/90 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 rounded-[32px] p-6 sm:p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all group cursor-default">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={22} />
                </div>
                <p className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* Clients Section */}
          {institutions && institutions.length > 0 && (
            <section className="py-12 border-y border-neutral-200/50 dark:border-neutral-800/50 bg-white/30 dark:bg-neutral-900/30 backdrop-blur-sm -mx-6 sm:-mx-12 px-6 sm:px-12 mt-12 mb-24">
              <div className="max-w-5xl mx-auto text-center space-y-8">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  Municípios que já confiam na Gestão 360
                </p>
                <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                  {institutions.filter(inst => !inst.name.toLowerCase().includes('demonstração')).map((inst, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      key={inst.id}
                      className="flex flex-col sm:flex-row items-center gap-4 px-6 py-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[24px] shadow-lg shadow-neutral-200/20 dark:shadow-none hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-800 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {inst.logo_url ? (
                        <div className="relative z-10 p-2 w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
                          <img src={inst.logo_url} alt={`Logo ${inst.name}`} className="max-w-full max-h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <>
                          <div className="relative z-10 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors shrink-0">
                            <Building2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          
                          <div className="relative z-10 flex flex-col sm:items-start text-center sm:text-left">
                            <span className="font-black text-neutral-900 dark:text-neutral-100 text-lg tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {inst.name.replace(/Prefeitura Municipal de |Prefeitura de /i, '')}{!inst.name.includes('/') ? '/MT' : ''}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                              Cliente Gestão 360
                            </span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Interactive Showcase Tabs Section - Mapa de Macro-Áreas da Gestão 360 */}
          <section id="solucoes" className="space-y-12 scroll-mt-24">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full shadow-sm">
                Módulos & Recursos Municipais
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Mapa Interativo de Recursos da Gestão 360
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Navegue pelas quatro macro-áreas da nossa plataforma e conheça os recursos reais desenhados para modernizar cada setor da prefeitura e do legislativo municipal.
              </p>
            </div>

            {/* Pillar Tab Selectors */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 p-2 bg-white/60 dark:bg-neutral-900/40 backdrop-blur border border-neutral-200/50 dark:border-neutral-800/50 rounded-[28px] md:rounded-[36px] max-w-4xl mx-auto shadow-sm">
              {[
                { id: "gabinete", label: "Gabinete & Governança", icon: Shield },
                { id: "administracao", label: "Adm., Finanças & Compras", icon: Landmark },
                { id: "servicos", label: "Serviços & Saúde Pública", icon: HardHat },
                { id: "cidadao", label: "Cidadão & Legislativo", icon: Users2 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/15 font-bold"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-neutral-800/40"
                  }`}
                >
                  <tab.icon size={14} className={activeTab === tab.id ? "text-white animate-pulse" : ""} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents Showcase */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4"
              >
                {/* Left Side: Summary text */}
                <div className="lg:col-span-5 space-y-6 text-left">
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {tabContent[activeTab].title}
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                    {tabContent[activeTab].description}
                  </p>
                  <div className="pt-4">
                    <button 
                      onClick={() => document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:translate-x-1 transition-all cursor-pointer"
                    >
                      Calcular economia da gestão sem papel
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Right Side: Features Grid */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {tabContent[activeTab].features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/60 rounded-[32px] p-7 text-left hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative space-y-4">
                        <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-850 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 text-neutral-600 dark:text-neutral-400 shadow-sm">
                          <feat.icon size={20} />
                        </div>
                        <h4 className="text-lg font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {feat.title}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          {/* New Section: Interactive Impact Calculator (Calculadora de Impacto Gestão Sem Papel) */}
          <section id="calculadora" className="bg-white/90 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-[48px] p-8 sm:p-12 space-y-10 shadow-2xl relative overflow-hidden transition-all duration-500">
            {/* Background glowing gradients */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Side: Description and Selection buttons */}
              <div className="lg:col-span-5 space-y-6 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full inline-block shadow-sm">
                  Simulação de Eficiência
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
                  Calculadora de Retorno e Impacto Digital
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  A eliminação completa de trâmites físicos e malotes gera impacto direto no custeio municipal. Escolha o porte populacional do seu município para simular a economia anual estimada.
                </p>

                {/* Porte Selection Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {(Object.keys(calculatorData) as Array<keyof typeof calculatorData>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setCitySize(key)}
                      className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer ${
                        citySize === key
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20 font-bold"
                          : "bg-white/80 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {key === 'small' && "Até 15k Hab."}
                      {key === 'medium' && "15k a 50k Hab."}
                      {key === 'large' && "50k a 100k Hab."}
                      {key === 'huge' && "100k+ Hab."}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Side: Dynamic Metric Cards */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Economia Financeira",
                    value: calculatorData[citySize].economy,
                    desc: "Estimativa anual de materiais, espaço físico, postagem e mão de obra.",
                    icon: TrendingDown,
                    badge: "Custo Menor",
                    color: "text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                  },
                  {
                    title: "Papel Físico Salvo",
                    value: calculatorData[citySize].paper,
                    desc: "Redução de folhas de papel impressas em protocolos, certidões e memorandos.",
                    icon: Leaf,
                    badge: "Sustentável",
                    color: "text-teal-650 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10"
                  },
                  {
                    title: "Tempo de Tramitação",
                    value: calculatorData[citySize].time,
                    desc: "Tempo médio de trâmite de processos administrativos entre secretarias.",
                    icon: Clock,
                    badge: "Resposta Rápida",
                    color: "text-sky-650 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10"
                  },
                  {
                    title: "Produtividade Interna",
                    value: calculatorData[citySize].efficiency,
                    desc: "Aumento na agilidade operacional das secretarias com processos paralelos.",
                    icon: TrendingUp,
                    badge: "Eficiência",
                    color: "text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                  }
                ].map((metric, i) => (
                  <motion.div
                    key={i}
                    layoutId={`metric-${i}`}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-white dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-850/50 p-6 rounded-[32px] text-left hover:scale-[1.02] hover:shadow-xl hover:border-emerald-500/20 dark:hover:border-emerald-500/10 transition-all duration-350 relative group overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-xl ${metric.color} shrink-0 shadow-sm`}>
                        <metric.icon size={18} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 border border-neutral-200/50 dark:border-neutral-800 px-2 py-0.5 rounded-md">
                        {metric.badge}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-neutral-400 dark:text-neutral-555 tracking-wider">{metric.title}</p>
                      <h4 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{metric.value}</h4>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-normal font-medium pt-1">{metric.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* New Section: Um Dia Sem Papel (Workflow Timeline) */}
          <section className="space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-3.5 py-1.5 rounded-full shadow-sm">
                Fluxo de Trabalho Integrado
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Um Dia Sem Papel na Gestão Pública 360°
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Entenda como a integração entre os módulos do sistema otimiza de ponta a ponta as demandas do município, do portal do cidadão até a finalização do serviço pelo servidor.
              </p>
            </div>

            {/* Path Timeline cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left max-w-6xl mx-auto">
              {timelineSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-white/90 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-7 space-y-5 relative group hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent dark:from-emerald-500/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Step counter and icon badge */}
                  <div className="flex items-center justify-between">
                    <span className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${step.color} text-white flex items-center justify-center font-black shadow-md`}>
                      <step.icon size={18} />
                    </span>
                    <span className="text-xs font-black font-mono text-neutral-200 dark:text-neutral-700 tracking-tighter group-hover:text-emerald-500/20 transition-colors">
                      ETAPA {step.step}
                    </span>
                  </div>

                  {/* Copy */}
                  <div className="space-y-2">
                    <h4 className="text-base font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {step.title}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                  
                  {/* Hover bottom colored indicator line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-350`} />
                </div>
              ))}
            </div>
          </section>

          {/* Benefits Grid (ROI and Legal Security) */}
          <section className="bg-[#10100F] dark:bg-black text-white rounded-[48px] p-8 sm:p-16 relative overflow-hidden shadow-2xl border border-neutral-800">
            {/* Background elements inside cards */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-12">
              <div className="text-center space-y-4 max-w-xl mx-auto">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full shadow-sm">
                  Benefícios Reais
                </span>
                <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  Por que implantar o Gestão 360 na sua Prefeitura?
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Os impactos práticos da modernização digital refletem diretamente no orçamento público e na segurança jurídica do prefeito.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Economia Financeira e de Recursos (ROI)",
                    desc: "Redução drástica nas despesas de custeio administrativo (papel, toner, armazenamento e envio físico) estimando um retorno de investimento de até 40% nas operações diárias.",
                    icon: TrendingDown,
                    badge: "Retorno Rápido"
                  },
                  {
                    title: "Segurança Jurídica Absoluta para o Gestor",
                    desc: "O sistema blinda legalmente a prefeitura e secretários por meio de alertas constantes de prazos do TCE, controle estrito de limites legais da LRF e matriz de risco preventivo.",
                    icon: Shield,
                    badge: "100% Seguro"
                  },
                  {
                    title: "Transparência Pública Ativa",
                    desc: "Cidadãos integrados a portais abertos que geram acompanhamento de chamados públicos em tempo real, melhorando a imagem institucional e a nota nos índices nacionais de transparência.",
                    icon: Globe,
                    badge: "Acesso Cidadão"
                  },
                  {
                    title: "Decisão Estratégica Baseada em Dados",
                    desc: "Centraliza informações fundamentais em gráficos analíticos dinâmicos, permitindo que prefeitos planejem orçamentos com rapidez e segurança e auditem secretarias de forma autônoma.",
                    icon: Activity,
                    badge: "Gestão Ágil"
                  }
                ].map((benefit, i) => (
                  <div key={i} className="bg-neutral-900/60 border border-neutral-800/60 rounded-[32px] p-7 sm:p-8 space-y-4 text-left flex flex-col justify-between hover:bg-neutral-900/90 hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/5">
                          <benefit.icon size={20} />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-450 bg-emerald-500/10 px-2.5 py-1 rounded">
                          {benefit.badge}
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-white">{benefit.title}</h4>
                      <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Citizen Portals Section */}
          <section className="space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-3.5 py-1.5 rounded-full shadow-sm">
                Serviço de Utilidade Pública
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white">
                Portais Oficiais para a População
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Se você é morador do município, utilize os nossos portais integrados públicos para fazer suas solicitações de atendimento, agendar consultas e consultar medicamentos.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Public Portal Servicos */}
              <div className="group bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[36px] p-8 text-left hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden relative flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <Globe size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Portal de Serviços & Ouvidoria</h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                    Solicite reparo de vias públicas, podas de árvores, iluminação, retire certidões e abra chamados gerais de ouvidoria de forma 100% digital. Acompanhe o trâmite pelo celular.
                  </p>
                </div>
                <div className="relative mt-8 border-t border-neutral-100 dark:border-neutral-805 pt-4">
                  <a
                    href="/servicos"
                    className="px-6 py-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all w-full text-center active:scale-[0.98] cursor-pointer"
                  >
                    Acessar Serviços do Cidadão
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Public Portal Saude */}
              <div className="group bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[36px] p-8 text-left hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden relative flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent dark:from-sky-950/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-sky-50 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 text-sky-600 dark:text-sky-400 shadow-sm">
                    <Calendar size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Portal da Saúde & Agendamentos</h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                    Agende suas consultas básicas de saúde nos postos municipais, solicite transporte de pacientes para exames e outros tratamentos e acompanhe o cronograma de exames de forma transparente.
                  </p>
                </div>
                <div className="relative mt-8 border-t border-neutral-100 dark:border-neutral-805 pt-4">
                  <a
                    href="/agendamento"
                    className="px-6 py-4 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all w-full text-center active:scale-[0.98] cursor-pointer"
                  >
                    Agendar Serviços de Saúde
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Public Portal Farmacia SUS */}
              <div className="group bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[36px] p-8 text-left hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden relative flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <HeartPulse size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Portal da Farmácia SUS</h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                    Consulte em tempo real a disponibilidade física de medicamentos gratuitos distribuídos nos postos e na farmácia básica do município, verifique lotes e evite filas ou deslocamentos à toa.
                  </p>
                </div>
                <div className="relative mt-8 border-t border-neutral-100 dark:border-neutral-805 pt-4">
                  <a
                    href="/farmaciasus"
                    className="px-6 py-4 bg-[#eff4ff] hover:bg-[#dbe6ff] dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all w-full text-center active:scale-[0.98] cursor-pointer"
                  >
                    Consultar Remédios SUS
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Institutional Integration CTA Section */}
          <section className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-[48px] p-8 sm:p-16 relative overflow-hidden shadow-2xl border border-emerald-500/25">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: Copy */}
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-white/10 border border-white/20 px-4 py-2 rounded-full">
                  <Sparkles size={10} /> Modernize seu Município
                </span>
                <h3 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Pronto para transformar a gestão do seu município?
                </h3>
                <p className="text-sm text-emerald-100 leading-relaxed font-medium max-w-md">
                  Integre sua prefeitura à plataforma Gestão 360 e comece a ver resultados desde o primeiro dia de uso.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: CheckCircle2, text: "Implantação em até 7 dias" },
                    { icon: CheckCircle2, text: "Treinamento presencial incluído" },
                    { icon: CheckCircle2, text: "Suporte consultivo contínuo" },
                    { icon: CheckCircle2, text: "Conformidade TCE garantida" },
                    { icon: CheckCircle2, text: "Portal educacional gamificado" },
                    { icon: CheckCircle2, text: "Módulos ilimitados no plano" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <item.icon size={14} className="text-emerald-300 shrink-0" />
                      <span className="text-xs font-bold text-emerald-100">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: CTAs */}
              <div className="flex flex-col gap-4">
                <a
                  href="https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20sistema%20Gest%C3%A3o%20360%20para%20o%20meu%20munic%C3%ADpio."
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-5 bg-white text-emerald-800 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] shadow-2xl shadow-emerald-900/30 hover:shadow-xl transition-all text-center flex items-center justify-center gap-3 active:scale-95 group"
                >
                  <Send size={16} className="group-hover:rotate-12 transition-transform" />
                  Agendar Demonstração Gratuita
                </a>
                <a
                  href="https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20o%20sistema%20Gest%C3%A3o%20360."
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all text-center flex items-center justify-center gap-3 active:scale-95 backdrop-blur-sm"
                >
                  Falar no WhatsApp 💬
                </a>
                <p className="text-center text-xs text-emerald-200/60 font-medium">
                  Sem fidelidade mínima · Suporte dedicado · Resultado garantido
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800/80 transition-colors">
          <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-12 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 tracking-widest">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
              <span>Gestão 360 · Governança, Integridade e Compliance</span>
              <span className="hidden sm:inline text-neutral-300">•</span>
              <span className="text-[9px] font-bold text-neutral-400/80">Desenvolvido para Prefeituras Municipais</span>
            </div>
            <a
              href="/servidores"
              className="flex items-center gap-1.5 text-neutral-300 dark:text-neutral-800 hover:text-neutral-500 dark:hover:text-neutral-500 transition-colors duration-300"
              title="Área do servidor"
            >
              <Lock size={10} />
              <span>Acesso Restrito</span>
            </a>
          </div>
        </footer>
        {/* Municipality Selector Modal */}
        <AnimatePresence>
          {isSelectorModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
              onClick={() => setIsSelectorModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6 flex flex-col relative"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Selecionar Município</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Busque sua prefeitura para acessar o painel de serviços ou portal restrito.</p>
                  </div>
                  <button onClick={() => setIsSelectorModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="text"
                    placeholder="Buscar município..."
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800 pl-12 pr-5 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all dark:text-white font-bold"
                  />
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {(() => {
                    const filtered = institutions.filter(inst => 
                      inst.name.toLowerCase().includes(searchCity.toLowerCase()) || 
                      (inst.subdomain && inst.subdomain.toLowerCase().includes(searchCity.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return (
                        <p className="text-center py-6 text-xs text-neutral-400 font-bold uppercase tracking-widest">Nenhum município encontrado</p>
                      );
                    }

                    return filtered.map(inst => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => {
                          if (inst.subdomain) {
                            const protocol = window.location.protocol;
                            const hostname = window.location.hostname;
                            const port = window.location.port ? `:${window.location.port}` : '';
                            
                            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                              window.location.href = `${protocol}//${inst.subdomain}.localhost${port}`;
                            } else {
                              const parts = hostname.split('.');
                              const isComBr = hostname.endsWith('.com.br');
                              const baseDomain = isComBr ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
                              window.location.href = `${protocol}//${inst.subdomain}.${baseDomain}${port}`;
                            }
                          } else {
                            showToast('Subdomínio não configurado para esta instituição.', 'warning');
                          }
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-neutral-50 hover:bg-emerald-50 dark:bg-neutral-850/50 dark:hover:bg-emerald-500/10 text-left border border-neutral-100 dark:border-neutral-800 hover:border-emerald-100 dark:hover:border-emerald-500/20 transition-all group"
                      >
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{inst.name}</p>
                          <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">{inst.subdomain ? `${inst.subdomain}.gestao360sistema.com.br` : 'Subdomínio não ativo'}</p>
                        </div>
                        <ChevronRight size={16} className="text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                      </button>
                    ));
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SalesLandingPage;
