import React, { useState } from 'react';
import { 
  ArrowLeft,
  LayoutDashboard,
  BookOpen,
  Award,
  Target,
  Bell,
  Search,
  MessageSquare,
  Settings,
  HelpCircle,
  Menu,
  X,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Send,
  Paperclip,
  User,
  Sparkles,
  Palette,
  Image as ImageIcon,
  ToggleRight,
  ToggleLeft,
  Trophy,
  Star,
  Zap,
  Shield,
  Swords,
  Timer,
  Map,
  Compass,
  FlaskConical,
  Calculator,
  Lock,
  Unlock,
  Flame,
  Crown,
  PlayCircle
} from 'lucide-react';

export const StudentPortal = ({ onBack }: { onBack: () => void }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'courses' | 'assessments' | 'achievements' | 'settings' | 'support'>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col md:flex-row selection:bg-emerald-500/20">
      
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-emerald-600 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shadow-sm">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-black text-base bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-sky-600">
              EduMunicipa
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-emerald-600 transition-all relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse"></span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-[100dvh] z-50 flex flex-col transition-all duration-300 ${isMobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'}`}
        style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfeff 50%, #f0f9ff 100%)' }}>
        {/* Dark mode overlay */}
        <div className="absolute inset-0 bg-neutral-900/95 dark:opacity-100 opacity-0 transition-opacity duration-300 pointer-events-none"></div>
        <div className="absolute inset-0 border-r border-neutral-200/80 dark:border-neutral-800/50 pointer-events-none"></div>

        {/* Sidebar Brand Header */}
        <div className="relative z-10 px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-sm text-neutral-900 dark:text-white leading-none">EduMunicipa</h2>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Portal do Aluno</p>
              </div>
            </div>
            <button className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {/* Student Profile Card */}
          <div className="bg-white/70 dark:bg-neutral-800/60 backdrop-blur-sm rounded-2xl p-4 border border-neutral-200/60 dark:border-neutral-700/40 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 to-sky-400 shadow-md shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-900">
                  <img alt="Arthur" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-neutral-900 dark:text-white leading-none truncate">Arthur da Silva</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">Explorador Nível 7 ⚡</p>
              </div>
            </div>
            {/* XP Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">XP: 1.850 / 2.500</span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">74%</span>
              </div>
              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full relative" style={{ width: '74%' }}>
                  <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="relative z-10 flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <p className="text-[9px] font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.15em] px-3 pb-2 pt-1">Minha Jornada</p>
          {[
            { view: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Portal do Aluno', emoji: '🏠', color: 'emerald' },
            { view: 'courses', icon: <BookOpen size={18} />, label: 'Meus Cursos', emoji: '📚', color: 'sky' },
            { view: 'assessments', icon: <Target size={18} />, label: 'Avaliações', emoji: '🎯', color: 'orange' },
            { view: 'achievements', icon: <Award size={18} />, label: 'Conquistas', emoji: '🏆', color: 'amber' },
          ].map(({ view, icon, label, emoji, color }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view as any); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 group relative overflow-hidden ${
                activeView === view
                  ? `bg-gradient-to-r from-${color}-500 to-${color === 'emerald' ? 'sky' : color === 'sky' ? 'indigo' : color === 'orange' ? 'amber' : 'orange'}-500 text-white shadow-lg shadow-${color}-500/20`
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/80 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {activeView === view && <div className="absolute inset-0 bg-white/10 rounded-xl"></div>}
              <span className={`relative z-10 transition-transform duration-200 ${activeView !== view ? 'group-hover:scale-110' : ''}`}>{icon}</span>
              <span className="relative z-10 flex-1 text-left">{label}</span>
              <span className="relative z-10 text-base">{emoji}</span>
              {activeView === view && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/60 rounded-l-full"></div>}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="relative z-10 px-4 pb-5 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/40 space-y-1">
          <p className="text-[9px] font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.15em] px-3 pb-2 pt-1">Sistema</p>
          {[
            { view: 'settings', icon: <Settings size={18} />, label: 'Configurações', emoji: '⚙️' },
            { view: 'support', icon: <HelpCircle size={18} />, label: 'Suporte', emoji: '💬' },
          ].map(({ view, icon, label, emoji }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view as any); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 group relative overflow-hidden ${
                activeView === view
                  ? 'bg-neutral-900/10 dark:bg-white/10 text-neutral-900 dark:text-white'
                  : 'text-neutral-500 dark:text-neutral-500 hover:bg-white/80 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span className={`transition-transform duration-200 ${activeView !== view ? 'group-hover:scale-110 group-hover:rotate-12' : ''}`}>{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              <span className="text-base">{emoji}</span>
            </button>
          ))}
          {/* Back to Main */}
          <button onClick={onBack} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-neutral-500 dark:text-neutral-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all group mt-2">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="flex-1 text-left">Voltar ao Menu</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-x-hidden">
        
        {/* Desktop Top Header */}
        <header className="hidden md:flex sticky top-0 z-30 w-full px-8 py-4 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl justify-between items-center border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
          {/* Breadcrumb / Page title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="font-medium">EduMunicipa</span>
              <span>/</span>
              <span className="font-black text-neutral-900 dark:text-white capitalize">
                {activeView === 'dashboard' ? '🏠 Portal do Aluno' 
                  : activeView === 'courses' ? '📚 Meus Cursos'
                  : activeView === 'assessments' ? '🎯 Avaliações'
                  : activeView === 'achievements' ? '🏆 Conquistas'
                  : activeView === 'settings' ? '⚙️ Configurações'
                  : '💬 Suporte'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* XP Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full">
              <Zap size={14} className="text-amber-500" fill="currentColor" />
              <span className="text-xs font-black">1.850 XP</span>
              <span className="text-[10px] font-bold text-amber-500/70">Nível 7</span>
            </div>

            {/* Streak Pill */}
            <div className="hidden lg:flex items-center gap-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full">
              <Flame size={14} fill="currentColor" />
              <span className="text-xs font-black">12 dias 🔥</span>
            </div>

            {/* Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={15} className="text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="pl-9 pr-4 py-2 w-52 bg-neutral-100 dark:bg-neutral-800/80 border border-transparent focus:border-emerald-400 dark:focus:border-emerald-500 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-neutral-900 transition-all text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400"
              />
            </div>
            
            {/* Notification */}
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all relative">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-neutral-100 dark:border-neutral-800 animate-pulse"></span>
            </button>
            
            {/* Profile avatar */}
            <button className="flex items-center gap-2.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 rounded-xl px-2.5 py-1.5 transition-all group">
              <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 to-sky-400 shadow-sm">
                <div className="w-full h-full rounded-full overflow-hidden border border-white dark:border-neutral-900">
                  <img alt="Arthur" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v" className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 hidden lg:block group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">Arthur</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeView === 'dashboard' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          
          {/* Hero Premium Section */}
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-8 md:p-10 text-white shadow-xl shadow-emerald-500/20 group">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none rounded-[32px]">
              <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-white/10 blur-[80px] rounded-full group-hover:scale-110 transition-transform duration-1000"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[60%] bg-sky-500/20 blur-[60px] rounded-full"></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                  <Sparkles size={12} className="text-emerald-200" />
                  Jornada de Aprendizado
                </span>
                <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">Continue sua Jornada!</h2>
                <p className="text-emerald-50 text-lg mb-6 opacity-90 max-w-md">Você está a apenas 3 diagnósticos de conquistar a Insígnia de Mestre de Matemática.</p>
                <button className="px-6 py-3 bg-white text-emerald-700 font-bold text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 transition-all">
                  Continuar Avaliação
                  <ArrowRight size={16} />
                </button>
              </div>
              
              {/* Circular Progress */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/20" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset="70.6" className="text-white drop-shadow-md" strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl md:text-4xl font-black tracking-tighter">75%</span>
                  </div>
                </div>
                <p className="mt-3 font-bold text-emerald-50 tracking-wide text-sm">Progresso Semanal</p>
              </div>
            </div>
          </section>

          {/* Bento Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: My Assessments & Tests */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Minhas Avaliações */}
              <section>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <Target className="text-emerald-500" size={24} />
                      Minhas Avaliações
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">Acompanhe seu desempenho nas disciplinas.</p>
                  </div>
                  <a href="#" className="text-emerald-600 font-bold text-sm hover:underline">Ver todas</a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assessment Card 1 */}
                  <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-5 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 hover:border-emerald-200 transition-all group">
                    <div className="flex gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-lg leading-tight mb-1">Matemática III</h4>
                        <p className="text-xs text-neutral-500">4 de 5 tarefas concluídas</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 w-[80%] rounded-full"></div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Quase lá!</span>
                        <span className="font-medium text-neutral-400">80%</span>
                      </div>
                    </div>
                  </div>

                  {/* Assessment Card 2 */}
                  <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-5 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-1 hover:border-sky-200 transition-all group">
                    <div className="flex gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center shrink-0">
                        <BookOpen className="text-sky-600 dark:text-sky-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-lg leading-tight mb-1">Português: Leitura</h4>
                        <p className="text-xs text-neutral-500">2 de 5 tarefas concluídas</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 w-[40%] rounded-full"></div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-sky-600 dark:text-sky-400">Em andamento</span>
                        <span className="font-medium text-neutral-400">40%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Testes Disponíveis */}
              <section className="pt-2">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                  <Clock className="text-teal-500" size={24} />
                  Testes Disponíveis
                </h3>
                
                <div className="space-y-3">
                  {/* Test Row 1 */}
                  <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-[20px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-teal-600 font-black text-lg">C</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-neutral-900 dark:text-white group-hover:text-teal-600 transition-colors">Diagnóstico de Ciências Naturais</h5>
                        <p className="text-xs text-neutral-500 mt-0.5">Duração: 45 min • 15 questões</p>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-teal-500 group-hover:text-white transition-all">
                      <Play size={16} className="ml-1" />
                    </button>
                  </div>

                  {/* Test Row 2 */}
                  <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-[20px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <span className="text-sky-600 font-black text-lg">G</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-neutral-900 dark:text-white group-hover:text-sky-600 transition-colors">Geografia: Mapa Mundi</h5>
                        <p className="text-xs text-neutral-500 mt-0.5">Duração: 30 min • 10 questões</p>
                      </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-sky-500 group-hover:text-white transition-all">
                      <Play size={16} className="ml-1" />
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Achievements & Social */}
            <aside className="lg:col-span-4 space-y-6">
              
              {/* Daily Challenge */}
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-[24px] shadow-lg relative overflow-hidden text-white group">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-white/10 blur-[40px] rounded-full group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col h-full min-h-[160px] justify-between">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                      <Award size={12} />
                      Desafio do Dia
                    </span>
                    <span className="text-2xl">🧩</span>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-xl font-black leading-tight mb-2">O Mistério da Equação Perdida</h4>
                    <p className="text-indigo-100 text-sm opacity-90 mb-4">Resolva e ganhe 50 moedas!</p>
                    <button className="w-full py-2.5 bg-white text-indigo-700 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-colors shadow-md">
                      Jogar Agora
                    </button>
                  </div>
                </div>
              </div>

              {/* Últimas Conquistas */}
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                <h3 className="font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="text-amber-500" size={20} />
                  Últimas Conquistas
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-200/50 transition-transform group-hover:scale-110 group-hover:shadow-md">
                      <span className="text-2xl">⭐</span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 text-center uppercase tracking-wide">Super<br/>Estrela</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center border border-sky-200/50 transition-transform group-hover:scale-110 group-hover:shadow-md">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 text-center uppercase tracking-wide">Relâmpago</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 opacity-50 grayscale group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200/50 transition-transform group-hover:scale-110">
                      <span className="text-2xl">🚀</span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 text-center uppercase tracking-wide">Explorador</span>
                  </div>
                </div>
              </div>

              {/* Amigos Online */}
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                <h3 className="font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="text-sky-500" size={20} />
                  Amigos Online
                </h3>
                <div className="flex -space-x-3 overflow-hidden mb-3 p-1">
                  <img alt="Friend 1" className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD67XhB0DJ40aaTrcWE9Iu_CcFYker9wsK8fJp4A7tzRdu9BapL31HGEWE1YNiLn0vGagwV83hToRXj61oJHwqa90jNR9WsRsmG3nfD2pkzQbohLj66VPCTSk5ZgEEIr7s-KDWO0w3dGS9shn0V2SiFXd5iEDWQqlK76AiiDEsS5dkMZO5pxzNAt30M4FdnuuDXFNVVg797dlHMBDUiIpllNfDj8CTg1sGQSelXwDbN03csF-YcHbv5tjK3HL8OvXoSpjanR_rgKewT" />
                  <img alt="Friend 2" className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDllRObvU5JxFTVh5peqsNKPqwOqP1l8lebIwbcOdWvzvHUyxWhDg43f0OcCFOnycftt_-hr-wNyLYuGKNAh6GHqpMby3k04-V7DZlITdVNLGB21dKL50vmm7l20NHjDpfO5mVgsqP9p8WskMxObv699qRM9aApARfS64JeVrxkhH7WIu9ioZMXSFXdgNd0A1K0Yd64IhHTrIQeSneQl-04iEuBW5ABmM_Va3_iVbWnsrdHQ1jMh8T7vzz8r_4inEwnTz4gQyLMte8j" />
                  <img alt="Friend 3" className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDo0IL9p_Y9Mj9wmvRO8KmKUHwshNw8UEloqwmyKnzot8sffi7PYbE1E5zqtuYOkmxtL6IzO4FpE_OhmvAQ4lh2FGNIfGf25TeVpqrdttCCIYPOEDj-cxlMiYj3NsekfPLGjRYkFvL3sBtz541gu01UvLdC0OaGcEYOOdk6tbnoOj06DQQ_Go_41ng-Sr_j8SUedGt0w4ohI9oFlK2dQIwxMcrz5KW1CvGNBnfWNvE1sCInRc8D1EllM0C2GFssg5OEWMPAQXhPVBWj" />
                  <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold shadow-sm">+5</div>
                </div>
                <p className="text-xs text-neutral-500 font-medium">Gael e outros 4 estão estudando agora.</p>
              </div>

            </aside>
          </div>
        </div>
        )}

        {/* Trilhas (Cursos) UI */}
        {activeView === 'courses' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Mágico */}
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Map className="text-sky-500" size={32} />
                Mapas de Exploração
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Escolha uma trilha e embarque em uma nova aventura de conhecimento!</p>
            </div>

            {/* Trilha Recomendada (Hero Card) */}
            <div className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-[32px] p-1 shadow-xl shadow-indigo-500/20 relative group overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1200&auto=format&fit=crop')] opacity-20 mix-blend-overlay bg-cover bg-center"></div>
              <div className="bg-neutral-900/40 backdrop-blur-md w-full h-full rounded-[28px] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-yellow-400 text-yellow-950 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-yellow-400/20">
                      <Star size={12} fill="currentColor" /> Trilha Recomendada
                    </span>
                  </div>
                  <div>
                    <h3 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">Os Mistérios do Sistema Solar</h3>
                    <p className="text-white/80 font-medium">Trilha de Ciências • Fase 3 de 5</p>
                  </div>
                  
                  <div className="max-w-md w-full space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-bold text-white/90">
                      <span>Progresso da Trilha</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full h-3 bg-neutral-900/50 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full relative" style={{ width: '65%' }}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button className="bg-white text-indigo-600 hover:bg-neutral-50 font-black px-8 py-5 rounded-[20px] shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all flex items-center gap-3 w-full md:w-auto justify-center group/btn">
                  <PlayCircle size={28} className="group-hover/btn:scale-110 transition-transform" />
                  Continuar Aventura
                </button>
              </div>
            </div>

            {/* Grid de Trilhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Matemática */}
              <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform rotate-3">
                    <Calculator size={28} />
                  </div>
                  <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                    12 Fases
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-1">Matemática</h4>
                  <p className="text-xs text-neutral-500 font-medium">Reino dos Números e Lógica</p>
                </div>
                
                <div className="space-y-1.5 mt-auto">
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 text-right">40% Concluído</p>
                </div>

                <button className="w-full mt-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-sky-50 dark:hover:bg-sky-500/10 text-neutral-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 font-bold py-3 rounded-xl transition-colors border border-transparent hover:border-sky-200 dark:hover:border-sky-500/30 flex items-center justify-center gap-2">
                  <Compass size={18} /> Acessar Trilha
                </button>
              </div>

              {/* Português */}
              <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform -rotate-3">
                    <BookOpen size={28} />
                  </div>
                  <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                    15 Fases
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-1">Língua Portuguesa</h4>
                  <p className="text-xs text-neutral-500 font-medium">Caverna das Palavras e Rimas</p>
                </div>
                
                <div className="space-y-1.5 mt-auto">
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                  <p className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400 text-right">80% Concluído</p>
                </div>

                <button className="w-full mt-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 text-neutral-900 dark:text-white hover:text-fuchsia-600 dark:hover:text-fuchsia-400 font-bold py-3 rounded-xl transition-colors border border-transparent hover:border-fuchsia-200 dark:hover:border-fuchsia-500/30 flex items-center justify-center gap-2">
                  <Compass size={18} /> Acessar Trilha
                </button>
              </div>

              {/* História */}
              <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform rotate-6">
                    <Map size={28} />
                  </div>
                  <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                    10 Fases
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-1">História</h4>
                  <p className="text-xs text-neutral-500 font-medium">Viagem no Tempo</p>
                </div>
                
                <div className="space-y-1.5 mt-auto">
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-right">15% Concluído</p>
                </div>

                <button className="w-full mt-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-neutral-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 font-bold py-3 rounded-xl transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 flex items-center justify-center gap-2">
                  <Compass size={18} /> Acessar Trilha
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Avaliações Placeholder */}
        {activeView === 'assessments' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-sky-100 dark:bg-sky-900/30 text-sky-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Target size={48} />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Avaliações</h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Você não tem avaliações pendentes. Aproveite para revisar a matéria!</p>
          </div>
        )}

        {/* Conquistas Placeholder */}
        {activeView === 'achievements' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Award size={48} />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Mural de Conquistas</h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Continue estudando e jogando os desafios para colecionar mais troféus!</p>
          </div>
        )}

        {/* Configurações UI */}
        {activeView === 'settings' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 mb-8">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Settings className="text-emerald-500" size={32} />
                Meu Perfil e Opções
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Personalize sua experiência no EduMunicipa e deixe tudo com a sua cara!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Meu Perfil Mágico */}
              <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="text-sky-500" size={24} />
                  Avatar e Perfil
                </h3>

                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-sky-500 p-1 shadow-lg shadow-sky-500/20">
                      <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-white dark:bg-neutral-800 flex items-center justify-center">
                        <img alt="Seu Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 hover:scale-110 transition-transform">
                      <ImageIcon size={14} />
                    </button>
                  </div>
                  
                  <div className="w-full space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Seu Nome Mágico</label>
                      <input type="text" defaultValue="Arthur da Silva" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-bold text-neutral-900 dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                {/* Personalização */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Palette className="text-fuchsia-500" size={24} />
                    Suas Cores Favoritas
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 p-1 group-hover:scale-110 transition-transform ring-4 ring-emerald-500/20">
                        <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-full border border-emerald-200 dark:border-emerald-800"></div>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500 group-hover:text-emerald-600">Esmeralda</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-400 p-1 group-hover:scale-110 transition-transform">
                        <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-full border border-sky-200 dark:border-sky-800"></div>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500 group-hover:text-sky-600">Safira</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 p-1 group-hover:scale-110 transition-transform">
                        <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-full border border-amber-200 dark:border-amber-800"></div>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500 group-hover:text-amber-600">Crepúsculo</span>
                    </button>
                  </div>
                </div>

                {/* Notificações */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Bell className="text-amber-500" size={24} />
                    Avisos Mágicos
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Novos Desafios Diários</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Me avise quando tiver jogo novo!</p>
                      </div>
                      <ToggleRight size={32} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Mensagens dos Professores</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Sons divertidos ao receber dicas.</p>
                      </div>
                      <ToggleRight size={32} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer opacity-75">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Lembrete de Estudos</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Aviso gentil no fim de semana.</p>
                      </div>
                      <ToggleLeft size={32} className="text-neutral-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button className="bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center gap-2">
                Salvar Minhas Escolhas <Sparkles size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Avaliações (Desafios Mágicos) UI */}
        {activeView === 'assessments' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Level: Hero & Stats */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Hero Banner */}
              <div className="flex-1 rounded-[32px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden flex flex-col justify-center min-h-[200px]">
                <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-[-20%] right-[20%] w-[30%] h-[80%] bg-yellow-300/30 blur-[40px] rounded-full rotate-45"></div>
                </div>
                <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none translate-y-1/4">
                  <Target size={240} />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight flex items-center gap-3">
                    Desafios Mágicos <Sparkles className="text-yellow-200" size={32} />
                  </h2>
                  <p className="text-white/90 max-w-xl text-sm md:text-base leading-relaxed">Mostre todo o seu poder e conhecimento! Cumpra as missões deixadas pelos seus professores para ganhar recompensas incríveis e evoluir seu nível.</p>
                </div>
              </div>

              {/* Accuracy/Stats Card */}
              <div className="w-full lg:w-80 bg-white dark:bg-neutral-900 rounded-[32px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-6 text-sm uppercase tracking-wider">
                  <Zap className="text-yellow-500" size={18} fill="currentColor" />
                  Sua Acurácia Mágica
                </h3>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="stroke-neutral-100 dark:stroke-neutral-800" strokeWidth="12" fill="none" />
                      <circle cx="50" cy="50" r="40" className="stroke-amber-500 transition-all duration-1000 ease-out" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset="37.68" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-black text-neutral-900 dark:text-white">85%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Poder Concentrado!</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-tight">Você acertou quase todas as perguntas nas últimas 3 missões. Continue assim!</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Missões Pendentes */}
              <div className="space-y-6">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Swords className="text-rose-500" size={24} />
                  Missões Abertas
                </h3>
                
                <div className="space-y-4">
                  {/* Missão 1 */}
                  <div className="bg-white dark:bg-neutral-900 rounded-[28px] border-2 border-rose-100 dark:border-rose-900/30 p-6 shadow-xl shadow-rose-500/5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 rotate-3 group-hover:rotate-6 transition-transform">
                        <Target size={32} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Matemática</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500"><Timer size={12}/> 40 min</span>
                        </div>
                        <h4 className="font-black text-lg text-neutral-900 dark:text-white mb-2 leading-tight">O Mistério das Frações Perdidas</h4>
                        
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-500 shrink-0">
                            <Trophy size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase">Recompensa da Missão</p>
                            <p className="text-xs font-black text-amber-600 dark:text-amber-400">Escudo Dourado de Euclides + 200 XP</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-rose-500 flex items-center gap-1"><Clock size={14}/> Expira em 2 dias</p>
                          <button className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black px-6 py-2.5 rounded-full hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all shadow-md">
                            Iniciar Missão
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Missão 2 */}
                  <div className="bg-white dark:bg-neutral-900 rounded-[28px] border-2 border-neutral-100 dark:border-neutral-800/50 p-6 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 -rotate-3 group-hover:-rotate-6 transition-transform">
                        <BookOpen size={32} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">História</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500"><Timer size={12}/> 30 min</span>
                        </div>
                        <h4 className="font-black text-lg text-neutral-900 dark:text-white mb-2 leading-tight">A Viagem no Tempo: Egito Antigo</h4>
                        
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-500 shrink-0">
                            <Star size={16} fill="currentColor" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase">Recompensa da Missão</p>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Insígnia do Faraó + 150 XP</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-neutral-400 flex items-center gap-1"><Clock size={14}/> Faltam 5 dias</p>
                          <button className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black px-6 py-2.5 rounded-full hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white transition-all shadow-md">
                            Iniciar Missão
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missões Concluídas */}
              <div className="space-y-6">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Shield className="text-sky-500" size={24} />
                  Suas Vitórias Anteriores
                </h3>
                
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-2">
                  {/* Resultado 1 */}
                  <div className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">Biologia: O Reino Mágico das Plantas</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Concluída há 3 dias</p>
                    </div>
                    <div className="text-right">
                      <div className="flex text-amber-400 mb-1">
                        <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
                      </div>
                      <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-500/10 px-2 py-1 rounded-md">Nota Máxima!</span>
                    </div>
                  </div>
                  
                  {/* Resultado 2 */}
                  <div className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">Português: Caçadores de Rimas</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Concluída há 1 semana</p>
                    </div>
                    <div className="text-right">
                      <div className="flex text-amber-400 mb-1 justify-end">
                        <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} className="text-neutral-300 dark:text-neutral-700" />
                      </div>
                      <span className="text-[10px] font-black text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-500/10 px-2 py-1 rounded-md">Muito Bom!</span>
                    </div>
                  </div>

                  {/* Resultado 3 */}
                  <div className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">Geografia: Explorando os Continentes</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Concluída há 2 semanas</p>
                    </div>
                    <div className="text-right">
                      <div className="flex text-amber-400 mb-1 justify-end">
                        <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">Nota Máxima!</span>
                    </div>
                  </div>

                  <button className="w-full text-center py-4 text-xs font-bold text-neutral-500 hover:text-indigo-600 transition-colors mt-2 border-t border-neutral-100 dark:border-neutral-800">
                    Ver todas as vitórias
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conquistas UI */}
        {activeView === 'achievements' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 p-8 md:p-10 text-neutral-900 shadow-xl shadow-amber-400/20">
              <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute right-6 bottom-0 opacity-10 pointer-events-none translate-y-1/4">
                <Trophy size={220} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 bg-neutral-900/20 backdrop-blur-sm text-neutral-900 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                    <Crown size={12} /> Sala dos Campeões
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black mb-2 leading-tight">Suas Conquistas Épicas!</h2>
                  <p className="text-neutral-800 font-medium max-w-md">Cada missão cumprida, cada desafio vencido te aproxima de novas e incríveis recompensas. Continue sua jornada!</p>
                </div>
                {/* XP Counter */}
                <div className="bg-white/30 backdrop-blur-md rounded-[24px] p-6 border border-white/40 shrink-0 text-center min-w-[160px]">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Zap size={20} className="text-yellow-700" fill="currentColor" />
                    <span className="text-4xl font-black text-neutral-900">1.850</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">XP Total</p>
                  <div className="mt-3 w-full h-2 bg-neutral-900/20 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-900 rounded-full" style={{ width: '74%' }}></div>
                  </div>
                  <p className="text-[10px] font-bold text-neutral-700 mt-1">Nível 7 → 8 (74%)</p>
                </div>
              </div>
            </div>

            {/* Streak Streak Bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Flame size={28} fill="currentColor" />
                </div>
                <div>
                  <p className="text-3xl font-black text-neutral-900 dark:text-white">12 dias</p>
                  <p className="text-sm font-bold text-neutral-500">Sequência de Estudos 🔥</p>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between text-xs font-bold text-neutral-500 mb-2">
                  <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                </div>
                <div className="flex gap-1.5">
                  {[true, true, true, true, true, true, false].map((active, i) => (
                    <div key={i} className={`flex-1 h-8 rounded-lg transition-all ${active ? 'bg-orange-400 shadow-sm shadow-orange-400/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}></div>
                  ))}
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-black px-4 py-2.5 rounded-xl shrink-0">
                Recorde: 18 dias!
              </div>
            </div>

            {/* Conquered Badges */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Unlock className="text-emerald-500" size={22} />
                Troféus Conquistados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[
                  { emoji: '⭐', name: 'Super Estrela', desc: 'Nota máxima em 5 missões', color: 'amber', xp: '+200 XP', date: 'Jun 10' },
                  { emoji: '⚡', name: 'Relâmpago', desc: 'Completou missão com 15 min de sobra', color: 'yellow', xp: '+150 XP', date: 'Jun 8' },
                  { emoji: '🔥', name: 'Em Chamas!', desc: '7 dias de sequência de estudos', color: 'orange', xp: '+300 XP', date: 'Jun 5' },
                  { emoji: '🧙', name: 'Mago Matemático', desc: 'Acertou 100% na trilha de Números', color: 'indigo', xp: '+500 XP', date: 'Mai 28' },
                  { emoji: '📚', name: 'Devorador de Livros', desc: 'Leu 10 materiais de apoio', color: 'sky', xp: '+250 XP', date: 'Mai 20' },
                  { emoji: '🎯', name: 'Mira Certeira', desc: 'Acertou 5 avaliações seguidas', color: 'rose', xp: '+400 XP', date: 'Mai 15' },
                ].map((badge, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col items-center gap-3 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group text-center">
                    <div className={`w-16 h-16 rounded-2xl bg-${badge.color}-50 dark:bg-${badge.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform text-4xl border border-${badge.color}-200/50 dark:border-${badge.color}-500/20 shadow-sm`}>
                      {badge.emoji}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">{badge.name}</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{badge.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-auto">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{badge.xp}</span>
                      <span className="text-[10px] text-neutral-400">{badge.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Locked Badges */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Lock className="text-neutral-400" size={22} />
                Próximas Conquistas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[
                  { emoji: '🚀', name: 'Explorador', desc: 'Complete a trilha de Ciências', progress: 65, needed: 'Fase 3 de 5' },
                  { emoji: '👑', name: 'Rei das Rimas', desc: 'Nota máxima em Português', progress: 80, needed: '1 missão' },
                  { emoji: '🦁', name: 'Coração Bravo', desc: '20 dias de sequência seguidos', progress: 60, needed: '8 dias restantes' },
                  { emoji: '🌟', name: 'Lenda da Sala', desc: 'Top 1 do ranking semanal', progress: 40, needed: 'Faltam 3 posições' },
                ].map((badge, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 rounded-[24px] p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col items-center gap-3 text-center opacity-80 hover:opacity-100 transition-opacity">
                    <div className="relative w-16 h-16">
                      <div className="w-full h-full rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-4xl grayscale border border-neutral-200 dark:border-neutral-700">
                        {badge.emoji}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900">
                        <Lock size={11} className="text-neutral-600 dark:text-neutral-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">{badge.name}</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{badge.desc}</p>
                    </div>
                    <div className="w-full space-y-1 mt-auto">
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all" style={{ width: `${badge.progress}%` }}></div>
                      </div>
                      <p className="text-[10px] font-bold text-neutral-500">{badge.needed}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Suporte Placeholder */}
        {activeView === 'support' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <HelpCircle size={48} />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Central de Ajuda</h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Precisando de uma mãozinha? Nossos monitores e suporte técnico estão à disposição.</p>
          </div>
        )}
      </main>

      {/* Floating Chat Button & Window */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
        
        {/* Chat Window */}
        <div className={`w-[calc(100vw-2rem)] md:w-96 h-[450px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right pointer-events-auto ${isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <User size={20} className="text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-300 rounded-full border-2 border-emerald-600"></div>
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide">Professor AI</h4>
                <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">Online</p>
              </div>
            </div>
            <button className="hover:bg-white/20 p-2 rounded-full transition-colors" onClick={() => setIsChatOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          {/* Message History */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-neutral-50/50 dark:bg-neutral-950/50">
            <div className="flex flex-col items-start">
              <div className="bg-white dark:bg-neutral-800 p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-100 dark:border-neutral-700 max-w-[85%]">
                <p className="text-sm text-neutral-700 dark:text-neutral-200">Olá Arthur! Como posso te ajudar com os exercícios de Matemática hoje?</p>
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 ml-1 font-medium">10:30</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="bg-emerald-600 p-3.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] text-white">
                <p className="text-sm">Oi professor! Estou com dúvida na questão 4 do diagnóstico.</p>
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 mr-1 font-medium">10:32</span>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-center gap-2 shrink-0">
            <button className="p-2.5 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-colors">
              <Paperclip size={18} />
            </button>
            <input 
              className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-none outline-none focus:ring-0 rounded-full px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400" 
              placeholder="Digite sua dúvida..." 
              type="text" 
            />
            <button className="bg-emerald-600 text-white p-2.5 rounded-full hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/20">
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
        
        {/* Floating Action Button */}
        <button 
          className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto" 
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

    </div>
  );
};
