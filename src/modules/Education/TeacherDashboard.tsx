import React, { useState } from 'react';
import { 
  ArrowLeft,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Target,
  Bell,
  Search,
  MessageSquare,
  Settings,
  HelpCircle,
  Menu,
  X,
  TrendingUp,
  AlertTriangle,
  Users,
  PlusCircle,
  FileCheck,
  Send,
  Paperclip,
  MoreVertical,
  ChevronRight,
  GraduationCap,
  PlayCircle,
  Star,
  Download,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Video,
  Play,
  UserCog,
  ShieldCheck,
  Mail,
  Calendar as CalendarIcon,
  Key,
  ToggleRight,
  ToggleLeft
} from 'lucide-react';

export const TeacherDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'training' | 'intervention' | 'settings' | 'support'>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col md:flex-row selection:bg-indigo-500/20 overflow-x-hidden">
      
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-neutral-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-600">
            Painel do Professor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-neutral-600 hover:text-indigo-600 transition-colors">
            <Bell size={20} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-neutral-600 transition-colors">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (Navigation Rail + Drawer) */}
      <aside className={`fixed md:sticky top-0 left-0 h-[100dvh] z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border-r border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-300 flex flex-col ${isMobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'}`}>
        {/* Sidebar Header */}
        <div className="p-6 flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-800/50">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onBack}>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:scale-105 transition-all">
              <ArrowLeft size={20} className="text-neutral-600 dark:text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-neutral-900 dark:text-white group-hover:text-indigo-600 transition-colors">Voltar</h2>
              <p className="text-xs text-neutral-500">Menu Principal</p>
            </div>
          </div>
          <button className="md:hidden p-2 text-neutral-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white font-medium transition-all group"
          >
            <GraduationCap size={20} className="group-hover:scale-110 transition-transform" />
            <span>Portal do Aluno</span>
          </button>
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <LayoutDashboard size={20} className={activeView !== 'dashboard' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Painel do Professor</span>
          </button>
          <button 
            onClick={() => setActiveView('training')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'training' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <BookOpen size={20} className={activeView !== 'training' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Centro de Treinamento</span>
          </button>
          <button 
            onClick={() => setActiveView('intervention')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'intervention' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <CalendarDays size={20} className={activeView !== 'intervention' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Plano de Intervenção</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-2">
          <button 
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'settings' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <Settings size={20} className={activeView !== 'settings' ? "group-hover:rotate-45 transition-transform" : ""} />
            <span>Configurações</span>
          </button>
          <button 
            onClick={() => setActiveView('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'support' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <HelpCircle size={20} className={activeView !== 'support' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Suporte</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-x-hidden">
        
        {/* Desktop Top Header */}
        <header className="hidden md:flex sticky top-0 z-30 w-full px-8 py-5 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md justify-between items-center">
          <div className="flex items-center gap-4">
            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide rounded-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 hover:-translate-y-0.5">
              <PlusCircle size={18} />
              Nova Avaliação
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={16} className="text-neutral-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar dados..." 
                className="pl-10 pr-4 py-2.5 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse"></span>
            </button>
            
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-sky-500 cursor-pointer hover:scale-105 transition-transform shadow-md">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-950">
                <img alt="Perfil do professor" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAKGNQ1RqllZrdQWLVoyEd3sUlx6DjnRN7R4W5HYuDzn1cKbA6zH8U3l8BC9orZfHjP6uWrz_jfxoz03tJqU2tDGM4Y8kvi-ghLELJN0mRDQecwTL3Gkda0oI8w9yNGw2UAPT5nGJZcOzHapTXE5R7Zb9oCSrY6-9tUR-HPD85-Uv3-zZqomRuqIJiYX9BQsYEmni2gg-frSkXAmHT6hGXlVbrvagfePQfnHGH4qP7ftUjkbTGjBXA-Scp-Z6LuHwupqJoYG7iRgjM" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeView === 'dashboard' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          
          {/* Greeting and Summary */}
          <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="md:col-span-3 lg:col-span-3 flex flex-col justify-center">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Bem-vindo de volta, Professor!</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl">
                Aqui está um resumo do desempenho dos seus alunos esta semana. Você tem <span className="font-bold text-rose-500">3 intervenções urgentes</span> para revisar.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group">
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Média da Turma</span>
                <span className="flex items-center text-emerald-500 font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                  <TrendingUp size={14} className="mr-1" /> +4.2%
                </span>
              </div>
              <div className="text-5xl font-black text-neutral-900 dark:text-white mt-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">82.5<span className="text-2xl text-neutral-400">%</span></div>
            </div>
          </section>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Performance Overview (Charts) */}
            <div className="lg:col-span-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 md:p-8 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Target className="text-indigo-500" size={24} />
                    Desempenho em Avaliações
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">Aproveitamento médio geral ao longo da semana.</p>
                </div>
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full">
                  <button className="px-4 py-1.5 bg-white dark:bg-neutral-700 rounded-full text-sm font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">Semanal</button>
                  <button className="px-4 py-1.5 rounded-full text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Mensal</button>
                </div>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 pt-4">
                {/* Mock Chart Bars - Redesigned with Tailwind gradients */}
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "65%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Quiz: 65%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Seg</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "85%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Quiz: 85%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ter</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "45%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-rose-500 to-orange-400 opacity-90"></div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Ciências: 45%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider text-rose-500">Qua</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "92%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-teal-400 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Prova: 92%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Qui</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "78%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sex</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "30%" }}>
                    <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sáb</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "15%" }}>
                    <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Dom</span>
                </div>
              </div>
            </div>

            {/* Right Column: Students at Risk & Tasks */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Students at Risk */}
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[32px] border border-rose-200/50 dark:border-rose-900/20 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                    <AlertTriangle className="text-rose-600" size={16} />
                  </div>
                  <h3 className="font-black text-rose-600 dark:text-rose-400 text-lg">Alunos em Risco</h3>
                </div>
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all cursor-pointer group/item">
                    <img alt="Lucas" className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLv-9O5hBlmU5_LkR_8IxwSqLjfUT9l1f-b2DqKQdrRe1NmcBQQhxXv1x2Zyhk1oK7XYmwbFBs8sK8-sJY38OictlRSFj1rm3eG6zc9i9cqHsKlLPQ3_qDIGfUuPYVcXnKhWtMfDOlt1HKGQl28oO-O53I9ErFFsSECp_vberifEfzMYXQ9h2y0WuZXthEq0RDCGn7zjLbr2nbQIFvkPlcidyjXLZVvk_nJK71rD4CCDkYT2brei8pIy8MflsJr6qBXpEi0-eN-zKp" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">Lucas Oliveira</p>
                      <p className="text-xs text-rose-500 truncate">Queda de 15% em Matemática</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 group-hover/item:text-rose-500 transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all cursor-pointer group/item">
                    <img alt="Mariana" className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnnyLKW0EKdD-3a9_Ki-2ePeEPYn_-aHYBmwPrJ-0YC5mwsgc9JGY5ABaWdwKGRtqZ7nRtUY7Ga081pqIaC55W0zFGzKk3cIzq-r2oSkoJKOe7fGOnhkbkOKR3yizGPn-9oysGSfAGQ0jJ_N0ZTzRFNJuyX7iR92YyK_FFwN7xaGwh7gEI2soTtGtCrznm5Q87EnFDayT0mKpSii6802d-mztafH4O1irxwjjHfakV6o3zQKn_SbBEz-v2C10MjzY7wRLz_GbaAe0Z" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">Mariana Santos</p>
                      <p className="text-xs text-rose-500 truncate">Módulo incompleto</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 group-hover/item:text-rose-500 transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all cursor-pointer group/item">
                    <img alt="Enzo" className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDef6yKWmbZWbYLRyfSOhIQlmeg6V4JneJiJocAYmvHIIIfVDaNVv_xCDlVDB8Grfi6H3yYdPIkQ8eXY0PdHsgQ8sYnzzgY7LMXAyvN-ElPWrzIoUcwKPnHoRk--fMrPmQFx9cfrpZGmzwZMEzVmAigs3HDTeAvaJYBfw0yvfFHqCPPjFqHJINsJ3EuD7cESzeRjgx8a97jb5KeAIA-cbD_vY2UKV7AIHDUD3NDb_jE7hT4saIVqMyG9fw6V6ikuizwuAUe3E7bOWjL" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">Enzo Costa</p>
                      <p className="text-xs text-rose-500 truncate">Padrão de ausência detectado</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 group-hover/item:text-rose-500 transition-colors" />
                  </div>
                </div>
                
                <button className="w-full mt-4 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors uppercase tracking-widest text-center">Ver todos os 8 alertas</button>
              </div>

              {/* Pending Tasks */}
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                <h3 className="font-black text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                  <FileCheck className="text-sky-500" size={20} />
                  Tarefas Pendentes
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 group">
                    <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center group-hover:border-sky-500 transition-colors cursor-pointer shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm group-hover:text-sky-600 transition-colors">Corrigir Projeto de Ciências</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Vence hoje • 12 entregas</p>
                    </div>
                    <MoreVertical size={16} className="text-neutral-400 cursor-pointer hover:text-neutral-900" />
                  </div>
                  
                  <div className="flex items-start gap-3 group">
                    <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center group-hover:border-sky-500 transition-colors cursor-pointer shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm group-hover:text-sky-600 transition-colors">Materiais de Alfabetização</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Vence amanhã • Turma 4A</p>
                    </div>
                    <MoreVertical size={16} className="text-neutral-400 cursor-pointer hover:text-neutral-900" />
                  </div>
                  
                  <div className="flex items-start gap-3 group">
                    <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center group-hover:border-sky-500 transition-colors cursor-pointer shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm group-hover:text-sky-600 transition-colors">Revisar Plano de Intervenção</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Próxima semana</p>
                    </div>
                    <MoreVertical size={16} className="text-neutral-400 cursor-pointer hover:text-neutral-900" />
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
        )}

        {/* Centro de Treinamento UI */}
        {activeView === 'training' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Level: Gamification/Hero */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Hero Banner */}
              <div className="flex-1 rounded-[32px] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-8 md:p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-center min-h-[240px]">
                <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[60%] bg-fuchsia-500/20 blur-[60px] rounded-full"></div>
                </div>
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                    <Star fill="currentColor" size={12} /> Novo Curso Adicionado
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight">Formação Contínua EduMunicipa</h2>
                  <p className="text-indigo-100 max-w-xl mb-8 text-sm md:text-base leading-relaxed">Aprimore suas habilidades com novos cursos de metodologias ativas, inclusão escolar e ferramentas digitais. Evolua seu nível pedagógico.</p>
                  <button className="bg-white text-indigo-600 font-bold px-6 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 max-w-max">
                    <Play fill="currentColor" size={18} />
                    Retomar Última Aula
                  </button>
                </div>
              </div>

              {/* Gamification Stats */}
              <div className="w-full lg:w-72 bg-white dark:bg-neutral-900 rounded-[32px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-xl shadow-neutral-200/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Award size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
                    <Award className="text-amber-500" size={18} />
                    Seu Progresso
                  </h3>
                  <div className="flex items-end gap-3 mb-1">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-fuchsia-500">Nível 4</span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold">Mestre Inovador</p>
                </div>

                <div className="mt-8 relative z-10">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-neutral-500">1.250 XP</span>
                    <span className="text-indigo-500">Faltam 250 XP</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 h-full rounded-full relative" style={{ width: '80%' }}>
                      <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-10">
                {/* Continuar Assistindo (Videos) */}
                <div>
                  <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <PlayCircle className="text-indigo-500" size={24} />
                      Cursos em Progresso
                    </h3>
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">Ver todos <ChevronRight size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Course Card 1 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm group cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      <div className="h-40 bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop" alt="Capa do Curso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                            <Play fill="currentColor" size={24} className="text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                          <Clock size={12} /> 12:45 restantes
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors leading-tight">Educação Inclusiva na Prática</h4>
                        <p className="text-sm text-neutral-500 mb-6 flex-1">Módulo 2: Adaptação Curricular para Autistas</p>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-bold text-neutral-400">Último acesso ontem</span>
                          <span className="text-[11px] font-black text-indigo-600">60% concluído</span>
                        </div>
                      </div>
                    </div>
                    {/* Course Card 2 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm group cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      <div className="h-40 bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" alt="Capa do Curso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                            <Play fill="currentColor" size={24} className="text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors leading-tight">Tecnologia em Sala de Aula</h4>
                        <p className="text-sm text-neutral-500 mb-6 flex-1">Módulo 1: Ferramentas do Google para Educação</p>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: '15%' }}></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-bold text-neutral-400">Último acesso há 3 dias</span>
                          <span className="text-[11px] font-black text-sky-600">15% concluído</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trilhas de Formação Recomendadas */}
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                    <Star className="text-amber-500" fill="currentColor" size={24} />
                    Trilhas Recomendadas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Trilha 1 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 group hover:border-fuchsia-200 dark:hover:border-fuchsia-900 hover:shadow-xl hover:shadow-fuchsia-500/5 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Video size={28} />
                      </div>
                      <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-2 group-hover:text-fuchsia-600 transition-colors">Gamificação e Engajamento</h4>
                      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">Aprenda a aplicar dinâmicas de jogos para manter seus alunos super motivados.</p>
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                          <Clock size={14} />
                          4h de vídeo
                        </span>
                        <span className="bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 text-xs font-black px-2.5 py-1 rounded-lg">+300 XP</span>
                      </div>
                    </div>
                    {/* Trilha 2 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 group hover:border-sky-200 dark:hover:border-sky-900 hover:shadow-xl hover:shadow-sky-500/5 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                        <BookOpen size={28} />
                      </div>
                      <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-2 group-hover:text-sky-600 transition-colors">Avaliação Formativa Dinâmica</h4>
                      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">Estratégias para avaliar o aluno além da prova tradicional e focar no aprendizado real.</p>
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                          <Clock size={14} />
                          2.5h de vídeo
                        </span>
                        <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 text-xs font-black px-2.5 py-1 rounded-lg">+200 XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biblioteca de Recursos (Textos) */}
              <div className="xl:col-span-1">
                <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 shadow-sm sticky top-28">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                    <FileText className="text-rose-500" size={24} />
                    Biblioteca de Manuais
                  </h3>
                  <p className="text-sm text-neutral-500 mb-6">Documentos oficiais e guias práticos para consulta rápida durante o planejamento de aulas.</p>

                  <div className="space-y-3">
                    {/* Doc 1 */}
                    <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-rose-600 transition-colors leading-tight line-clamp-2">Guia Prático da BNCC 2026</h4>
                        <p className="text-[11px] font-medium text-neutral-500 mt-1">PDF • 2.4 MB</p>
                      </div>
                      <button className="text-neutral-300 group-hover:text-rose-600 transition-colors p-2 bg-white dark:bg-neutral-900 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/20 rounded-full shadow-sm">
                        <Download size={16} />
                      </button>
                    </div>

                    {/* Doc 2 */}
                    <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">Manual do Diário de Classe Digital</h4>
                        <p className="text-[11px] font-medium text-neutral-500 mt-1">PDF • 1.1 MB</p>
                      </div>
                      <button className="text-neutral-300 group-hover:text-indigo-600 transition-colors p-2 bg-white dark:bg-neutral-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 rounded-full shadow-sm">
                        <Download size={16} />
                      </button>
                    </div>

                    {/* Doc 3 */}
                    <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors leading-tight line-clamp-2">Protocolos Inclusivos de Aprendizagem</h4>
                        <p className="text-[11px] font-medium text-neutral-500 mt-1">PDF • 850 KB</p>
                      </div>
                      <button className="text-neutral-300 group-hover:text-amber-600 transition-colors p-2 bg-white dark:bg-neutral-900 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/20 rounded-full shadow-sm">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  <button className="w-full mt-6 py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all flex items-center justify-center gap-2">
                    <Search size={16} />
                    Buscar mais materiais
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plano de Intervenção Placeholder */}
        {activeView === 'intervention' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-sky-100 dark:bg-sky-900/30 text-sky-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CalendarDays size={48} />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Plano de Intervenção</h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Ferramentas para planejar e acompanhar as intervenções com alunos em risco serão disponibilizadas aqui.</p>
          </div>
        )}

        {/* Configurações UI */}
        {activeView === 'settings' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 mb-8">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Settings className="text-indigo-500" size={32} />
                Configurações da Conta
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Gerencie seu perfil profissional, preferências de sistema e segurança.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col gap-8">
                {/* Perfil Profissional */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                    <UserCog className="text-sky-500" size={24} />
                    Perfil Profissional
                  </h3>

                  <div className="flex items-center gap-6 mb-2">
                    <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden shrink-0 border-4 border-white dark:border-neutral-900 shadow-lg">
                      <img src="https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=600&auto=format&fit=crop" alt="Foto do Professor" className="w-full h-full object-cover" />
                    </div>
                    <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-bold rounded-xl transition-colors">
                      Alterar Foto
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Nome Completo</label>
                      <input type="text" defaultValue="Prof. Carlos Andrade" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2 flex items-center gap-1"><Mail size={12}/> E-mail Institucional</label>
                      <input type="email" defaultValue="carlos.andrade@edumunicipa.gov.br" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Disciplina(s) de Atuação</label>
                      <input type="text" defaultValue="Matemática e Física" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                {/* Preferências do Sistema */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Settings className="text-indigo-500" size={24} />
                    Preferências do Sistema
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Alertas de Risco Pedagógico</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Notificar imediatamente sobre evasão.</p>
                      </div>
                      <ToggleRight size={32} className="text-indigo-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Modo Escuro (Dark Mode)</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Seguir a preferência do sistema.</p>
                        </div>
                      </div>
                      <ToggleRight size={32} className="text-indigo-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer opacity-75">
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Sincronização com Google Calendar</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Exportar aulas para a agenda pessoal.</p>
                        </div>
                      </div>
                      <ToggleLeft size={32} className="text-neutral-400" />
                    </div>
                  </div>
                </div>

                {/* Segurança */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-rose-500" size={24} />
                    Segurança e Acesso
                  </h3>

                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Key size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Alterar Senha</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Última alteração há 6 meses</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Autenticação em 2 Fatores</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Atualmente desativada</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-neutral-200/50 dark:border-neutral-800/50">
              <button className="bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 transition-all">
                Salvar Alterações
              </button>
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
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Base de conhecimento, tutoriais e contato direto com a equipe de suporte do EduMunicipa.</p>
          </div>
        )}
      </main>

      {/* Floating Chat Button & Window */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
        
        {/* Chat Window */}
        <div className={`w-[calc(100vw-2rem)] md:w-96 h-[450px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right pointer-events-auto ${isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-sky-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center backdrop-blur-sm overflow-hidden">
                  <img alt="Aluno" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLv-9O5hBlmU5_LkR_8IxwSqLjfUT9l1f-b2DqKQdrRe1NmcBQQhxXv1x2Zyhk1oK7XYmwbFBs8sK8-sJY38OictlRSFj1rm3eG6zc9i9cqHsKlLPQ3_qDIGfUuPYVcXnKhWtMfDOlt1HKGQl28oO-O53I9ErFFsSECp_vberifEfzMYXQ9h2y0WuZXthEq0RDCGn7zjLbr2nbQIFvkPlcidyjXLZVvk_nJK71rD4CCDkYT2brei8pIy8MflsJr6qBXpEi0-eN-zKp" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-indigo-600"></div>
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide">Lucas Oliveira</h4>
                <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold">Aluno Online</p>
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
                <p className="text-sm text-neutral-700 dark:text-neutral-200">Professor, eu não entendi como fazer a divisão na questão 2.</p>
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 ml-1 font-medium">09:15</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="bg-indigo-600 p-3.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] text-white">
                <p className="text-sm">Olá Lucas! Lembre-se de separar os números por partes. Vamos revisar juntos amanhã na aula, combinado?</p>
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 mr-1 font-medium">09:20</span>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-center gap-2 shrink-0">
            <button className="p-2.5 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors">
              <Paperclip size={18} />
            </button>
            <input 
              className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-none outline-none focus:ring-0 rounded-full px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400" 
              placeholder="Responder Lucas..." 
              type="text" 
            />
            <button className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-500/20">
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
        
        {/* Floating Action Button */}
        <button 
          className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto" 
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

    </div>
  );
};
