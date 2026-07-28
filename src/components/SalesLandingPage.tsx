import React from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import {
  ClipboardCheck, BookText, ShieldAlert, FileBadge, Target, HeartPulse,
  GraduationCap, HardHat, Landmark, Users2, Sun, Moon, Lock,
  Building2, Sparkles, Menu, X, ChevronRight, Globe, FileCheck, PieChart as PieChartIcon,
  ArrowRight, Shield, CheckCircle2, FileText, Users, Send, Leaf,
  Package, Calendar, BookOpen, LayoutDashboard, TrendingDown, Activity, Phone, Scale,
  Award, Clock, Check, XCircle, FileCode, CheckSquare, Zap, ShieldCheck, Calculator, MessageSquare
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
    { label: 'Comparativo', id: 'comparativo' },
    { label: 'Benefícios & ROI', id: 'beneficios' },
    { label: 'Amparo Legal', id: 'contratacao' },
    { label: 'Portais Cidadão', id: 'portais' },
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
            <div className={`rounded-xl border transition-all duration-300 group-hover:scale-105 overflow-hidden shadow-lg shadow-black/20 ${
              scrolled
                ? 'border-neutral-200 dark:border-neutral-800'
                : 'border-white/15'
            }`}>
              <LogoCompass size={44} />
            </div>
            <span className="text-xl font-black tracking-tight italic text-white">
              Gestão <span className="text-emerald-400 font-normal">360</span>
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
              Proposta Comercial (PDF)
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

            {/* CTA: Agendar Demo */}
            <a
              href={WA_DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm rounded-xl hover:scale-[1.04] active:scale-95 shadow-xl shadow-emerald-500/35 hover:shadow-emerald-500/55 transition-all duration-200 tracking-wide"
            >
              <Send size={14} />
              Agendar Demonstração
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
              Demonstração
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
                <button onClick={onOpenProposal} className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-bold">
                  <FileText size={14} /> Proposta Comercial (PDF)
                </button>
                <button onClick={onSelectMunicipality} className="w-full flex items-center justify-center gap-2 py-3.5 border border-white/20 rounded-xl text-sm font-bold text-white/80 hover:bg-white/10 transition-all">
                  <Building2 size={14} /> Acessar Prefeitura
                </button>
                <a href="/servidores" className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-neutral-950 rounded-xl text-sm font-black hover:bg-white/90 transition-all">
                  <Lock size={13} /> Acesso Servidor
                </a>
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
      title: "Gabinete & Governança Preventiva do Gestor",
      description: "Blindagem jurídica e administrativa com controle interno do TCE, gestão de riscos municipais e acompanhamento de metas pelo Prefeito.",
      features: [
        { title: "Visão do Prefeito", desc: "Painel exclusivo com indicadores estratégicos, relatórios consolidados e alertas em tempo real.", icon: LayoutDashboard },
        { title: "Controles Internos TCE", desc: "Checklists preventivos baseados nos prazos e diretrizes do Tribunal de Contas.", icon: ClipboardCheck },
        { title: "Banco de Leis & Atos", desc: "Consulta oficial de leis municipais, decretos e publicação com padrão ICP-Brasil.", icon: Scale },
        { title: "Matriz de Riscos Fiscais", desc: "Monitoramento preventivo para evitar improbidade e sanções da LRF.", icon: ShieldAlert }
      ]
    },
    administracao: {
      title: "Administração, Compras Públicas & PNTP",
      description: "Conformidade total com a Nova Lei de Licitações (Lei 14.133/21), gestão de contratos e nota máxima no Radar PNTP.",
      features: [
        { title: "Licitações & Contratos", desc: "Gestão de vigências, aditivos, reajustes e fluxo completo conforme a Lei 14.133/21.", icon: Target },
        { title: "Radar PNTP Selo Ouro/Diamante", desc: "Envio automatizado de evidências para elevar o índice de transparência pública do município.", icon: Globe },
        { title: "Banco de Certidões (CND)", desc: "Verificação automática da regularidade fiscal de fornecedores antes de qualquer pagamento.", icon: FileCheck },
        { title: "Controle de Numeração", desc: "Eliminação total de numeração duplicada ou pulada em decretos e portarias.", icon: Calculator }
      ]
    },
    servicos: {
      title: "Saúde, Educação, Obras & Zeladoria Urbana",
      description: "Gerencie secretarias operacionais com rastreabilidade, economia de insumos e transparência total de estoques.",
      features: [
        { title: "Saúde Pública & Farmácia SUS", desc: "Transparência de medicamentos em estoque, controle de TFD e ambulâncias.", icon: HeartPulse },
        { title: "Viação, Obras & Frota", desc: "Controle de maquinário agrícola, vistorias de obras e pedidos digitais de materiais.", icon: HardHat },
        { title: "Educação & Transporte Escolar", desc: "Acompanhamento de rotas escolares, merenda e relatórios de aplicação do SIOPE.", icon: GraduationCap },
        { title: "Tombamento Patrimonial", desc: "Inventário de bens móveis e imóveis via QR Code com diário de bordo digital.", icon: Package }
      ]
    },
    cidadao: {
      title: "Ouvidoria, Central WhatsApp & Cidadania",
      description: "Aproximação direta da prefeitura com o cidadão e canal de integração com a Câmara de Vereadores.",
      features: [
        { title: "Central WhatsApp Automatizada", desc: "Envio automático de certidões, avisos e notificações ao cidadão pelo WhatsApp.", icon: MessageSquare },
        { title: "Portal da Transparência Ativa", desc: "Atendimento de solicitações da população com acompanhamento por protocolo celular.", icon: Users },
        { title: "Módulo Câmara 360", desc: "Integração ágil de matérias legislativas, indicações de vereadores e atos do Executivo.", icon: Landmark },
        { title: "Protocolo 100% Digital", desc: "Processos sem papel, assinados digitalmente com rastreabilidade total.", icon: FileText }
      ]
    }
  };

  const benefits = [
    { title: "Blindagem Jurídica do Gestor", desc: "Alertas automáticos de prazos do TCE, cumprimento da LRF e controle de certidões para evitar rejeição de contas.", icon: Shield, badge: "Segurança Total" },
    { title: "Economia Real de Recursos (ROI)", desc: "Redução de até 45% nas despesas de custeio administrativo, combustível e impressão com processos 100% digitais.", icon: TrendingDown, badge: "Economia Comprovada" },
    { title: "Radar PNTP Selo Ouro/Diamante", desc: "Portal da transparência de alto desempenho que atende integralmente aos critérios dos Tribunais de Contas.", icon: Globe, badge: "Transparência Ativa" },
    { title: "Implantação Turnkey em 7 Dias", desc: "Sistema em nuvem sem necessidade de servidores locais, com migração de dados e treinamento presencial inclusos.", icon: Zap, badge: "Rápido & Sem TI" }
  ];

  const publicPortals = [
    {
      icon: Globe, color: 'emerald', title: 'Portal de Serviços & Ouvidoria',
      desc: 'Solicite reparos, podas, iluminação e acompanhe chamados 100% digitais no celular.',
      link: '/servicos', cta: 'Acessar Serviços'
    },
    {
      icon: Calendar, color: 'sky', title: 'Portal da Saúde & Agendamentos',
      desc: 'Consulte postos de atendimento municipais, ambulâncias e exames de forma transparente.',
      link: '/agendamento', cta: 'Agendar Saúde'
    },
    {
      icon: HeartPulse, color: 'indigo', title: 'Portal da Farmácia SUS',
      desc: 'Consulte a disponibilidade de remédios gratuitos em tempo real em cada posto de saúde.',
      link: '/farmaciasus', cta: 'Consultar Remédios'
    },
    {
      icon: BookOpen, color: 'amber', title: 'Portal da Educação',
      desc: 'Acompanhe boletins escolares, frequências, rotas do transporte e informes oficiais.',
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
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-emerald-950/40 to-sky-950/50" />
          <div className="absolute inset-0 bg-neutral-950/60" />
          <FloatingOrb className="top-[-10%] left-[-5%] w-[55%] h-[65%] bg-emerald-500/18" />
          <FloatingOrb className="bottom-[-15%] right-[-8%] w-[55%] h-[60%] bg-sky-500/12" />
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
                {/* Badges */}
                <div className="flex flex-wrap justify-center items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-sm rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Plataforma SaaS 100% Integrada para Prefeituras & Câmaras
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/15 border border-sky-500/30 backdrop-blur-sm rounded-full text-sky-300 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck size={12} /> Padrão ICP-Brasil (Lei 14.063/20)
                  </div>
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.94]">
                  Governança Pública{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400">
                    360°
                  </span>
                  <br />
                  <span className="text-neutral-300 text-3xl sm:text-5xl lg:text-6xl font-bold">Blindagem Jurídica & Compliance TCE.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-medium max-w-2xl mx-auto">
                  Proteja a gestão do Prefeito contra rejeição de contas, automatize secretarias com processos 100% digitais e garanta nota máxima no Radar PNTP com conformidade à Nova Lei de Licitações (14.133/21).
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
                    Agendar Demonstração Executiva
                  </a>
                  <button
                    onClick={() => setIsProposalModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-7 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-black text-sm uppercase tracking-wider rounded-2xl hover:scale-[1.02] active:scale-[0.97] transition-all"
                  >
                    <FileText size={16} />
                    Ver Proposta Comercial (PDF)
                  </button>
                </div>

                {/* Key Metrics Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10 max-w-2xl mx-auto w-full">
                  {[
                    { value: '-45%', label: 'Custos Administrativos', color: 'text-emerald-400' },
                    { value: '100%', label: 'Conformidade TCE & LRF', color: 'text-sky-400' },
                    { value: 'Selo Ouro', label: 'Radar PNTP Garantido', color: 'text-teal-400' },
                    { value: '7 Dias', label: 'Implantação Turnkey', color: 'text-emerald-300' }
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                      className="space-y-1 bg-white/5 p-3 rounded-2xl border border-white/10"
                    >
                      <p className={`text-2xl sm:text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">{s.label}</p>
                    </motion.div>
                  ))}
                </div>

              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-5 sm:px-10 py-16 space-y-32 relative z-10">

          {/* ── MATRIZ DE VALOR: ANTES VS DEPOIS ────────────────── */}
          <section id="comparativo" className="space-y-10 scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 max-w-3xl mx-auto"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full">
                Transformação Prática na Gestão
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Antes vs. Depois do Gestão 360
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Veja o impacto direto da substituição de controles manuais e planilhas por uma plataforma governamental integrada.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Sem Gestão 360 */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-[32px] p-8 space-y-6">
                <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400 font-black text-lg">
                  <XCircle size={24} />
                  Modelo Tradicional Sem Gestão 360
                </div>
                <div className="space-y-4 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  <div className="p-4 bg-white/70 dark:bg-neutral-900/60 rounded-2xl border border-rose-200/50 dark:border-rose-900/30">
                    <strong className="text-rose-800 dark:text-rose-300 block mb-1">✕ Riscos Fiscais no TCE & TCU</strong>
                    Processos físicos acumulados, prazos da LRF perdidos e falta de alertas prévios para o ordenador de despesas.
                  </div>
                  <div className="p-4 bg-white/70 dark:bg-neutral-900/60 rounded-2xl border border-rose-200/50 dark:border-rose-900/30">
                    <strong className="text-rose-800 dark:text-rose-300 block mb-1">✕ Erros de Numeração de Leis e Decretos</strong>
                    Documentos oficiais expedidos com numeração duplicada, rasuras ou puladas por falta de controle central.
                  </div>
                  <div className="p-4 bg-white/70 dark:bg-neutral-900/60 rounded-2xl border border-rose-200/50 dark:border-rose-900/30">
                    <strong className="text-rose-800 dark:text-rose-300 block mb-1">✕ Fornecedores com CND Vencida</strong>
                    Falta de monitoramento contínuo das certidões negativas de débito antes de contratações ou pagamentos.
                  </div>
                </div>
              </div>

              {/* Com Gestão 360 */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-[32px] p-8 space-y-6 shadow-xl shadow-emerald-500/5">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 font-black text-lg">
                  <CheckCircle2 size={24} />
                  Prefeitura Protegida com o Gestão 360
                </div>
                <div className="space-y-4 text-xs text-neutral-800 dark:text-neutral-200 font-medium">
                  <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-sm">
                    <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">✓ Compliance Preventivo Automatizado</strong>
                    Checklists do TCE, acompanhamento de prazos da LRF e relatórios de controle interno gerados com antecedência.
                  </div>
                  <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-sm">
                    <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">✓ Diário Oficial & Assinatura ICP-Brasil</strong>
                    Publicação oficial imediata de decretos, leis e portarias com numeração sequencial automática e rastreável.
                  </div>
                  <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50 shadow-sm">
                    <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">✓ Monitoramento 24/7 de Certidões (CND)</strong>
                    Auditoria automática da regularidade fiscal de empresas e fornecedores no Banco de Certidões.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── CLIENTES MUNICIPAIS ───────────────────────────── */}
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
                  Municípios que já modernizaram a gestão pública com o Gestão 360
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

          {/* ── SOLUÇÕES / TABS MUNICIPAIS ────────────────────── */}
          <section id="solucoes" className="space-y-12 scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 max-w-3xl mx-auto"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full">
                Módulos Governamentais Integrados
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Soluções Específicas por Área
              </h2>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                Conheça os módulos desenhados para atender aos desafios específicos de cada secretaria e ao gabinete do Prefeito.
              </p>
            </motion.div>

            {/* Tab pills */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 p-2 bg-white/60 dark:bg-neutral-900/40 backdrop-blur border border-neutral-200/50 dark:border-neutral-800/50 rounded-[28px] max-w-4xl mx-auto shadow-sm">
              {[
                { id: 'gabinete', label: 'Gabinete & Governança', icon: Shield },
                { id: 'administracao', label: 'Adm., Licitações & PNTP', icon: Landmark },
                { id: 'servicos', label: 'Saúde, Educação & Obras', icon: HardHat },
                { id: 'cidadao', label: 'WhatsApp & Cidadão', icon: Users2 }
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

          {/* ── SEÇÃO AMPARO LEGAL PARA CONTRATAÇÃO MUNICIPAL ──── */}
          <section id="contratacao" className="scroll-mt-24 bg-gradient-to-br from-neutral-900 via-neutral-950 to-emerald-950 text-white rounded-[48px] p-8 sm:p-16 border border-neutral-800 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                  Amparo Legal & Facilidade Licitatória
                </span>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  Como Contratar o Gestão 360?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
                  A plataforma atende a todas as exigências legais para instrução de processo de contratação direta ou licitação pública.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl w-fit border border-emerald-500/30">
                    <Award size={22} />
                  </div>
                  <h3 className="font-black text-lg text-white">1. Inexigibilidade / Dispensa</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    Fundamentado nos Arts. 74 e 75 da Lei nº 14.133/2021 para aquisição direta de software especializado em governança e compliance.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                  <div className="p-3 bg-sky-500/20 text-sky-300 rounded-2xl w-fit border border-sky-500/30">
                    <FileCheck size={22} />
                  </div>
                  <h3 className="font-black text-lg text-white">2. Adesão à Ata (Carona)</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    Possibilidade de adesão facilitada a Atas de Registro de Preços vigentes para agilizar o início dos serviços.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                  <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl w-fit border border-purple-500/30">
                    <Globe size={22} />
                  </div>
                  <h3 className="font-black text-lg text-white">3. Pregão Eletrônico</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    Disponibilizamos o Termo de Referência (TR) padronizado para instrução célere do setor de compras do seu município.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setIsProposalModalOpen(true)}
                  className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
                >
                  <FileText size={16} />
                  Solicitar Minuta de Termo de Referência / Proposta
                </button>
              </div>
            </div>
          </section>

          {/* ── BENEFÍCIOS & ROI ──────────────────────────────── */}
          <section id="beneficios" className="scroll-mt-24 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 max-w-xl mx-auto"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full">
                Benefícios Estratégicos
              </span>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Impacto Real no Município
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Resultados diretos no orçamento, na segurança jurídica do prefeito e no atendimento ao munícipe.
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
                  className="bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-[28px] p-8 space-y-4 text-left hover:border-emerald-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                      <b.icon size={22} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 rounded-full">
                      {b.badge}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white">{b.title}</h4>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">{b.desc}</p>
                </motion.div>
              ))}
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
                  Agende uma demonstração técnica com nossos consultores de tecnologia governamental.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Implantação em até 7 dias',
                    'Treinamento presencial incluído',
                    'Suporte consultivo contínuo',
                    'Conformidade TCE garantida',
                    'Padrão ICP-Brasil (Lei 14.063)',
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
                  Agendar Demonstração Executiva
                </a>
                <button
                  onClick={() => setIsProposalModalOpen(true)}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all text-center active:scale-95 backdrop-blur-sm"
                >
                  <FileText size={16} />
                  Baixar Proposta Comercial (PDF)
                </button>
                <p className="text-center text-xs text-emerald-200/70 font-medium">
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
                Gestão 360 · Governança, Integridade e Compliance Público
              </div>
            </div>
            <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-neutral-300 dark:text-neutral-700">
              <a href={WA_DEMO_URL} target="_blank" rel="noreferrer" className="hover:text-emerald-500 transition-colors">Contato Comercial</a>
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
