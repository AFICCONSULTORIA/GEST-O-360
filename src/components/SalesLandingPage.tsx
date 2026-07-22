import React from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  ClipboardCheck, BookText, ShieldAlert, FileBadge, Target, HeartPulse,
  GraduationCap, HardHat, Landmark, Users2, Sun, Moon, Lock,
  Building2, Sparkles, Menu, X, ChevronRight, Globe, FileCheck, PieChart as PieChartIcon,
  ArrowRight, Shield, CheckCircle2, FileText, Users, Send, Leaf,
  Package, Calendar, BookOpen, LayoutDashboard, TrendingDown, Activity, Phone
} from 'lucide-react';
import { LogoCompass } from './LogoCompass';
import { showToast } from './ui/Toast';
import { Institution } from '../types';
import { ProposalModal } from './ProposalModal';

const WA_DEMO_URL = "https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20sistema%20Gest%C3%A3o%20360%20para%20o%20meu%20munic%C3%ADpio.";
const WA_CHAT_URL = "https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20o%20sistema%20Gest%C3%A3o%20360.";

/* ── Navbar ─────────────────────────────────────────────── */
const Navbar = ({
  darkMode, setDarkMode, onSelectMunicipality, onOpenProposal
}: {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  onSelectMunicipality: () => void;
  onOpenProposal: () => void;
}) => {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navLinks = [
    { label: 'Soluções', id: 'solucoes' },
    { label: 'Clientes', id: 'clientes' },
    { label: 'Benefícios', id: 'beneficios' },
    { label: 'Portais', id: 'portais' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white dark:bg-neutral-950 shadow-xl shadow-neutral-900/8 border-b border-neutral-200 dark:border-neutral-800/80'
          : 'bg-neutral-950/70 backdrop-blur-2xl border-b border-white/8'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className={`p-2 rounded-xl border transition-all duration-300 group-hover:scale-105 ${
              scrolled
                ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm'
                : 'bg-white/10 border-white/15'
            }`}>
              <LogoCompass size={24} />
            </div>
            <span className="text-xl font-black tracking-tight italic text-white">
              Gestão <span className="text-white/50 font-normal">360</span>
            </span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.03] ${
                  scrolled
                    ? 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl transition-all duration-200 hover:scale-110 ${
                scrolled
                  ? 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Baixar Apresentação PDF */}
            <button
              onClick={onOpenProposal}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] border ${
                scrolled
                  ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                  : 'border-emerald-400/40 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25'
              }`}
            >
              <FileText size={14} />
              Apresentação PDF
            </button>

            {/* Municipality selector */}
            <button
              onClick={onSelectMunicipality}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 border ${
                scrolled
                  ? 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              <Building2 size={15} />
              Acessar Prefeitura
            </button>

            {/* CTA: Agendar Demo — most prominent */}
            <a
              href={WA_DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm rounded-xl hover:scale-[1.04] active:scale-95 shadow-xl shadow-emerald-500/35 hover:shadow-emerald-500/55 transition-all duration-200 tracking-wide"
            >
              <Send size={14} />
              Agendar Demo Grátis
            </a>

            {/* Server access */}
            <a
              href="/servidores"
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-black transition-all duration-200 hover:scale-[1.02] active:scale-95 border ${
                scrolled
                  ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-950 dark:border-white hover:bg-neutral-800 dark:hover:bg-neutral-100'
                  : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
              }`}
            >
              <Lock size={13} />
              Servidor
            </a>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href={WA_DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.03]"
            >
              <Send size={11} />
              Demo Grátis
            </a>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2.5 rounded-xl text-white hover:bg-white/10 transition-all"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden bg-neutral-950 border-t border-white/10"
          >
            <div className="px-5 py-5 space-y-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-bold text-white/70 hover:bg-white/8 hover:text-white transition-all"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 flex flex-col gap-2.5">
                <button onClick={onSelectMunicipality} className="w-full flex items-center justify-center gap-2 py-3.5 border border-white/20 rounded-xl text-sm font-bold text-white/80 hover:bg-white/10 transition-all">
                  <Building2 size={14} /> Acessar Prefeitura
                </button>
                <a href="/servidores" className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-neutral-950 rounded-xl text-sm font-black hover:bg-white/90 transition-all">
                  <Lock size={13} /> Acesso Servidor
                </a>
                <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white/40 hover:text-white/70 transition-all">
                  {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                  {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

/* ── Floating particle orb ──────────────────────────────── */
const FloatingOrb = ({ className }: { className: string }) => (
  <div className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`} />
);

/* ── Main Component ─────────────────────────────────────── */
export const SalesLandingPage = ({
  darkMode,
  setDarkMode,
  showMunicipalitySelector = false,
  institutions = []
}: {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  showMunicipalitySelector?: boolean;
  institutions?: Institution[];
}) => {
  const [activeTab, setActiveTab] = React.useState<'gabinete' | 'administracao' | 'servicos' | 'cidadao'>('gabinete');
  const [isSelectorModalOpen, setIsSelectorModalOpen] = React.useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = React.useState(false);
  const [searchCity, setSearchCity] = React.useState('');

  const heroRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const tabContent = {
    gabinete: {
      title: "Gabinete & Governança Preventiva",
      description: "Blindagem jurídica e administrativa com auditoria automática, controles internos do TCE e monitoramento de riscos fiscais.",
      features: [
        { title: "Controles Internos", desc: "Checklists preventivos baseados nos cronogramas oficiais do TCE.", icon: ClipboardCheck },
        { title: "Normativas & Leis", desc: "Repositório catalogado de leis, decretos, portarias e atos municipais.", icon: BookText },
        { title: "Análise de Risco", desc: "Matrizes de riscos operacionais e financeiros com alertas automáticos.", icon: ShieldAlert },
        { title: "Modelos & Numeração", desc: "Documentos padronizados com controle sequencial de numeração anual.", icon: FileBadge }
      ]
    },
    administracao: {
      title: "Administração, Finanças & Compras Públicas",
      description: "Licitações conformes à Lei 14.133, gestão financeira centralizada e integração automática com o PNTP.",
      features: [
        { title: "Licitações & Contratos", desc: "Gestão de vigências, reajustes e conformidade nativa com a Lei 14.133.", icon: Target },
        { title: "Radar PNTP", desc: "Envio automatizado de processos homologados ao Portal Nacional de Contratações.", icon: Globe },
        { title: "Banco de Certidões", desc: "Monitoramento de regularidade em tempo real com alertas automáticos.", icon: FileCheck },
        { title: "Gestão Financeira", desc: "Painéis consolidados de receitas, despesas e limites legais da LRF.", icon: PieChartIcon }
      ]
    },
    servicos: {
      title: "Serviços Finalísticos & Saúde Pública",
      description: "Gerencie saúde, educação, frotas e obras públicas garantindo transparência ativa e uso eficiente de recursos.",
      features: [
        { title: "Saúde Integrada & SUS", desc: "Frota de ambulâncias, TFD e gerenciamento de medicamentos da Farmácia SUS.", icon: HeartPulse },
        { title: "Viação, Obras & Pedidos", desc: "Pedidos digitais de insumos, controle de maquinário e relatórios de vistorias.", icon: HardHat },
        { title: "Transporte & Educação", desc: "Frotas de ônibus escolar, merendas e estoque de materiais didáticos.", icon: GraduationCap },
        { title: "Patrimônio & Frotas", desc: "Tombamento por QR-code, manutenção preventiva e diários de bordo digitais.", icon: Package }
      ]
    },
    cidadao: {
      title: "Ouvidoria, Cidadão & Poder Legislativo",
      description: "Transparência ativa com a população e ponte robusta com a Câmara de Vereadores.",
      features: [
        { title: "Portal de Serviços", desc: "Solicitações online com acompanhamento digital em tempo real pelo celular.", icon: Users },
        { title: "Portal SUS Cidadão", desc: "Agendamento de consultas e disponibilidade de remédios do SUS.", icon: Calendar },
        { title: "Integração Câmara 360", desc: "Intercâmbio de processos, indicações e atos oficiais com o Executivo.", icon: Landmark },
        { title: "Protocolo Eletrônico", desc: "Processos 100% eletrônicos, rastreáveis e sem papel.", icon: FileText }
      ]
    }
  };

  const benefits = [
    { title: "Economia Financeira (ROI)", desc: "Redução nas despesas de custeio administrativo com retorno de investimento de até 40%.", icon: TrendingDown, badge: "Retorno Rápido" },
    { title: "Segurança Jurídica Total", desc: "Alertas de prazos do TCE, controle da LRF e matriz de risco preventivo para blindar o gestor.", icon: Shield, badge: "100% Seguro" },
    { title: "Transparência Pública Ativa", desc: "Portais abertos que geram acompanhamento de chamados em tempo real e melhoram índices nacionais.", icon: Globe, badge: "Acesso Cidadão" },
    { title: "Decisão Baseada em Dados", desc: "Gráficos analíticos dinâmicos para planejar orçamentos e auditar secretarias de forma autônoma.", icon: Activity, badge: "Gestão Ágil" }
  ];

  const publicPortals = [
    {
      icon: Globe, color: 'emerald', title: 'Portal de Serviços & Ouvidoria',
      desc: 'Solicite reparos, podas, iluminação e abra chamados 100% digital. Acompanhe pelo celular.',
      link: '/servicos', cta: 'Acessar Serviços'
    },
    {
      icon: Calendar, color: 'sky', title: 'Portal da Saúde & Agendamentos',
      desc: 'Agende consultas nos postos municipais e acompanhe exames de forma transparente.',
      link: '/agendamento', cta: 'Agendar Saúde'
    },
    {
      icon: HeartPulse, color: 'indigo', title: 'Portal da Farmácia SUS',
      desc: 'Consulte disponibilidade de medicamentos gratuitos em tempo real e evite deslocamentos.',
      link: '/farmaciasus', cta: 'Consultar Remédios'
    },
    {
      icon: BookOpen, color: 'amber', title: 'Portal da Educação',
      desc: 'Acompanhe boletins, histórico de faltas, calendário escolar e recados da coordenação.',
      link: '/educacao', cta: 'Acessar Educação'
    }
  ];

  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 border-sky-200 dark:border-sky-500/20',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
  };

  const iconBgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
    sky: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white'
  };

  const filteredInstitutions = institutions.filter(
    inst => !inst.name.toLowerCase().includes('demonstração')
  );

  return (
    <div className={`min-h-[100dvh] ${darkMode ? 'dark' : ''} font-sans`}>
      <div className="bg-[#F8F8F7] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 min-h-[100dvh] flex flex-col relative transition-colors duration-500 overflow-x-hidden">

        {/* Background ambient glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <FloatingOrb className="top-[-15%] left-[-10%] w-[60%] h-[55%] bg-emerald-400/8 dark:bg-emerald-500/6" />
          <FloatingOrb className="bottom-[-20%] right-[-10%] w-[65%] h-[60%] bg-sky-400/8 dark:bg-sky-500/6" />
          <FloatingOrb className="top-[40%] right-[5%] w-[45%] h-[45%] bg-violet-300/6 dark:bg-violet-500/4" />
        </div>

        <Navbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSelectMunicipality={() => setIsSelectorModalOpen(true)}
          onOpenProposal={() => setIsProposalModalOpen(true)}
        />

        {/* ── HERO ───────────────────────────────────────────── */}
        <section ref={heroRef} className="relative min-h-[100dvh] flex items-center overflow-hidden">
          {/* Hero dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-emerald-950/40 to-sky-950/50" />
          <div className="absolute inset-0 bg-neutral-950/55" />
          {/* Orbs */}
          <FloatingOrb className="top-[-10%] left-[-5%] w-[55%] h-[65%] bg-emerald-500/18" />
          <FloatingOrb className="bottom-[-15%] right-[-8%] w-[55%] h-[60%] bg-sky-500/12" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-10 pt-24 pb-16 lg:py-0"
          >
            <div className="flex flex-col items-center text-center min-h-[100dvh] justify-center lg:py-24 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8 w-full"
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-emerald-500/12 border border-emerald-500/25 backdrop-blur-sm rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Plataforma Completa · Governança Municipal 360°
                </div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.92]">
                  Gestão Municipal{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400">
                    360°
                  </span>
                  <br />
                  <span className="text-neutral-300 text-4xl sm:text-5xl lg:text-6xl font-bold">de ponta a ponta.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-neutral-400 leading-relaxed font-medium max-w-lg mx-auto">
                  A única plataforma que cobre cada secretaria — do gabinete ao portal do aluno —, com conformidade TCE automática e educação gamificada.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
                  <a
                    href={WA_DEMO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.03] active:scale-[0.97] shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 group"
                  >
                    <Send size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    Agendar Demonstração Gratuita
                  </a>
                  <button
                    onClick={() => setIsProposalModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-7 py-4 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 font-black text-sm uppercase tracking-wider rounded-2xl hover:scale-[1.02] active:scale-[0.97] transition-all"
                  >
                    <FileText size={16} />
                    Baixar Apresentação PDF
                  </button>
                  <button
                    onClick={() => document.getElementById('solucoes')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/16 backdrop-blur-sm text-white border border-white/15 font-bold text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.97] transition-all"
                  >
                    Ver Soluções
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 pt-6 border-t border-white/10 max-w-md mx-auto w-full">
                  {[
                    { value: '21+', label: 'Módulos Ativos', color: 'text-emerald-400' },
                    { value: '0', label: 'Apontamentos TCE', color: 'text-sky-400' },
                    { value: '100%', label: 'Sem Papel', color: 'text-teal-400' }
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                      className="space-y-1"
                    >
                      <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">{s.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Social proof */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="flex -space-x-2">
                    {['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b'].map((color, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-neutral-900 flex items-center justify-center text-[10px] font-black text-white" style={{ background: color }}>
                        {['VC', 'NV', 'RO', 'MT'][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-400 font-medium">
                    <span className="text-white font-bold">+4 municípios</span> já confiam no sistema
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="w-5 h-8 border-2 border-white/20 rounded-full flex items-start justify-center pt-1.5"
            >
              <div className="w-1 h-2 bg-white/40 rounded-full" />
            </motion.div>
          </motion.div>
        </section>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-5 sm:px-10 py-16 space-y-32 relative z-10">

          {/* Stats wall */}
          <section>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '21+', label: 'Módulos Integrados', icon: LayoutDashboard, bg: 'bg-emerald-50 dark:bg-emerald-500/10', color: 'text-emerald-500' },
                { value: '4', label: 'Portais Públicos', icon: Globe, bg: 'bg-sky-50 dark:bg-sky-500/10', color: 'text-sky-500' },
                { value: '100%', label: 'Conformidade TCE', icon: Shield, bg: 'bg-violet-50 dark:bg-violet-500/10', color: 'text-violet-500' },
                { value: '0', label: 'Papel no Processo', icon: Leaf, bg: 'bg-teal-50 dark:bg-teal-500/10', color: 'text-teal-500' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.55 }}
                  className="bg-white/90 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50 rounded-[28px] p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all group cursor-default"
                >
                  <div className={`w-11 h-11 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── CLIENTES ──────────────────────────────────────── */}
          {filteredInstitutions.length > 0 && (
            <section id="clientes" className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  Municípios que já confiam na Gestão 360
                </span>
                <div className="mt-3 h-px w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mx-auto" />
              </motion.div>

              <div className="flex flex-wrap justify-center items-stretch gap-5">
                {filteredInstitutions.map((inst, i) => (
                  <motion.div
                    key={inst.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center gap-4 px-6 py-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[24px] shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-800 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden cursor-default"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    {inst.logo_url ? (
                      <div className="relative z-10 w-28 h-28 flex items-center justify-center shrink-0">
                        <img src={inst.logo_url} alt={`Logo ${inst.name}`} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <>
                        <div className="relative z-10 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors shrink-0">
                          <Building2 size={22} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left">
                          <span className="font-black text-neutral-900 dark:text-neutral-100 text-base tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {inst.name.replace(/Prefeitura Municipal de |Prefeitura de /i, '')}{!inst.name.includes('/') ? '/MT' : ''}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-0.5">
                            Cliente Gestão 360
                          </span>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* ── SOLUÇÕES / TABS ───────────────────────────────── */}
          <section id="solucoes" className="space-y-12 scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 max-w-3xl mx-auto"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full">
                Módulos & Recursos Municipais
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Mapa Interativo de Recursos
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Navegue pelas quatro macro-áreas da plataforma e descubra os recursos criados para modernizar cada setor da sua prefeitura.
              </p>
            </motion.div>

            {/* Tab pills */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 p-2 bg-white/60 dark:bg-neutral-900/40 backdrop-blur border border-neutral-200/50 dark:border-neutral-800/50 rounded-[28px] max-w-4xl mx-auto shadow-sm">
              {[
                { id: 'gabinete', label: 'Gabinete & Governança', icon: Shield },
                { id: 'administracao', label: 'Adm. & Finanças', icon: Landmark },
                { id: 'servicos', label: 'Serviços & Saúde', icon: HardHat },
                { id: 'cidadao', label: 'Cidadão & Legislativo', icon: Users2 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <tab.icon size={13} className={activeTab === tab.id ? 'text-white' : ''} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 space-y-5">
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {tabContent[activeTab].title}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                    {tabContent[activeTab].description}
                  </p>
                  <a
                    href={WA_DEMO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:translate-x-1 transition-all"
                  >
                    Agendar demonstração deste módulo
                    <ChevronRight size={14} />
                  </a>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tabContent[activeTab].features.map((feat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/60 rounded-[28px] p-6 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <div className="relative space-y-3">
                        <div className="w-11 h-11 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 text-neutral-600 dark:text-neutral-400 shadow-sm">
                          <feat.icon size={18} />
                        </div>
                        <h4 className="text-base font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {feat.title}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                          {feat.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          {/* ── BENEFÍCIOS ────────────────────────────────────── */}
          <section id="beneficios" className="scroll-mt-24 bg-[#10100F] dark:bg-black text-white rounded-[48px] p-8 sm:p-16 relative overflow-hidden shadow-2xl border border-neutral-800">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center space-y-4 max-w-xl mx-auto"
              >
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full">
                  Benefícios Reais
                </span>
                <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  Por que implantar o Gestão 360?
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Os impactos práticos da modernização refletem diretamente no orçamento e na segurança jurídica do prefeito.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {benefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.55 }}
                    className="bg-neutral-900/60 border border-neutral-800/60 rounded-[28px] p-7 space-y-4 text-left hover:bg-neutral-900/90 hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/10">
                        <b.icon size={20} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded">
                        {b.badge}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-white">{b.title}</h4>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">{b.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PORTAIS PÚBLICOS ──────────────────────────────── */}
          <section id="portais" className="space-y-12 scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 max-w-2xl mx-auto"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-3.5 py-1.5 rounded-full">
                Serviço de Utilidade Pública
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white">
                Portais Oficiais para a População
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Se você é morador do município, acesse os portais integrados para fazer solicitações, agendar consultas e consultar medicamentos.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {publicPortals.map((portal, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.55 }}
                  className="group bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden relative flex flex-col justify-between"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-${portal.color}-50/50 to-transparent dark:from-${portal.color}-950/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                  <div className="relative space-y-5">
                    <div className={`w-13 h-13 rounded-2xl p-3 flex items-center justify-center transition-all duration-300 shadow-sm ${iconBgMap[portal.color]}`}>
                      <portal.icon size={22} />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{portal.title}</h3>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">{portal.desc}</p>
                  </div>
                  <div className="relative mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <a
                      href={portal.link}
                      className={`px-5 py-4 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all w-full text-center active:scale-[0.98] border ${colorMap[portal.color]}`}
                    >
                      {portal.cta}
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── CTA FINAL ─────────────────────────────────────── */}
          <section className="relative rounded-[48px] overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-300/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 p-8 sm:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="space-y-6 text-white"
              >
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-white/10 border border-white/20 px-4 py-2 rounded-full">
                  <Sparkles size={10} /> Modernize seu Município
                </span>
                <h3 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Pronto para transformar a gestão do seu município?
                </h3>
                <p className="text-sm text-emerald-100 leading-relaxed font-medium max-w-md">
                  Integre sua prefeitura à plataforma Gestão 360 e comece a ver resultados desde o primeiro dia.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Implantação em até 7 dias',
                    'Treinamento presencial incluído',
                    'Suporte consultivo contínuo',
                    'Conformidade TCE garantida',
                    'Portal educacional gamificado',
                    'Módulos ilimitados no plano'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-300 shrink-0" />
                      <span className="text-xs font-bold text-emerald-100">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="flex flex-col gap-4"
              >
                <a
                  href={WA_DEMO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-white text-emerald-800 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] shadow-2xl shadow-emerald-900/30 transition-all text-center active:scale-95 group"
                >
                  <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  Agendar Demonstração Gratuita
                </a>
                <a
                  href={WA_CHAT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all text-center active:scale-95 backdrop-blur-sm"
                >
                  <Phone size={16} />
                  Falar no WhatsApp 💬
                </a>
                <p className="text-center text-xs text-emerald-200/60 font-medium">
                  Sem fidelidade mínima · Suporte dedicado · Resultado garantido
                </p>
              </motion.div>
            </div>
          </section>
        </main>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="relative z-10 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 transition-colors">
          <div className="max-w-[1280px] w-full mx-auto px-5 sm:px-10 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <LogoCompass size={18} />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Gestão 360 · Governança, Integridade e Compliance
              </div>
            </div>
            <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-neutral-300 dark:text-neutral-700">
              <a href={WA_DEMO_URL} target="_blank" rel="noreferrer" className="hover:text-emerald-500 transition-colors">Contato</a>
              <span>•</span>
              <a href="/servidores" className="flex items-center gap-1.5 hover:text-neutral-500 dark:hover:text-neutral-500 transition-colors">
                <Lock size={10} /> Acesso Restrito
              </a>
            </div>
          </div>
        </footer>

        {/* ── MUNICIPALITY SELECTOR MODAL ───────────────────── */}
        <AnimatePresence>
          {isSelectorModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
              onClick={() => setIsSelectorModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[36px] p-8 shadow-2xl space-y-5 flex flex-col relative"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Selecionar Município</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Busque sua prefeitura para acessar o painel.</p>
                  </div>
                  <button onClick={() => setIsSelectorModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar município..."
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-5 pr-5 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white font-bold placeholder:font-normal"
                    autoFocus
                  />
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                  {(() => {
                    const filtered = institutions.filter(inst =>
                      inst.name.toLowerCase().includes(searchCity.toLowerCase()) ||
                      (inst.subdomain && inst.subdomain.toLowerCase().includes(searchCity.toLowerCase()))
                    );
                    if (filtered.length === 0) {
                      return <p className="text-center py-6 text-xs text-neutral-400 font-bold uppercase tracking-widest">Nenhum município encontrado</p>;
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
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-neutral-50 hover:bg-emerald-50 dark:bg-neutral-800/50 dark:hover:bg-emerald-500/10 text-left border border-neutral-100 dark:border-neutral-700 hover:border-emerald-100 dark:hover:border-emerald-500/20 transition-all group"
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

        {/* Modal de Apresentação Institucional e PDF */}
        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default SalesLandingPage;
