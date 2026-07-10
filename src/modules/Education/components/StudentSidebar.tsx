import React from 'react';
import { 
  ArrowLeft, 
  LayoutDashboard, 
  BookOpen, 
  Target, 
  Award, 
  Settings, 
  Store,
  X, 
  Sparkles
} from 'lucide-react';

interface StudentSidebarProps {
  onBack: () => void;
  previewCourseId?: string;
  activeView: string;
  setActiveView: (view: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  studentData: {
    name: string;
    title: string;
    xp: number;
    nextLevelXp: number;
  };
  xpPercentage: number;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  onBack,
  previewCourseId,
  activeView,
  setActiveView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  studentData,
  xpPercentage,
}) => {
  return (
    <aside className={`fixed md:sticky self-start top-0 left-0 h-[100dvh] z-50 flex flex-col transition-all duration-300 ${isMobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'}`}
      style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfeff 50%, #f0f9ff 100%)' }}>
      {/* Dark mode overlay */}
      <div className="absolute inset-0 bg-neutral-900/95 dark:opacity-100 opacity-0 transition-opacity duration-300 pointer-events-none"></div>
      <div className="absolute inset-0 border-r border-neutral-200/80 dark:border-neutral-800/50 pointer-events-none"></div>

      {/* Sidebar Brand Header */}
      <div className="relative z-10 px-5 pt-6 pb-4">
        {previewCourseId && (
          <button onClick={onBack} className="w-full flex items-center justify-center gap-2 mb-6 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors shadow-sm">
            <ArrowLeft size={18} />
            Sair da Visualização
          </button>
        )}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-sm text-neutral-900 dark:text-white leading-none">Gestão 360 Educação</h2>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Portal do Aluno</p>
            </div>
          </div>
          <button className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Student Profile Card */}
        <div 
          className="bg-white/70 dark:bg-neutral-800/60 backdrop-blur-sm rounded-2xl p-4 border border-neutral-200/60 dark:border-neutral-700/40 shadow-sm cursor-pointer hover:bg-white/90 dark:hover:bg-neutral-800/90 transition-all hover:scale-[1.02]"
          onClick={() => {
            setActiveView('settings');
            setIsMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 to-sky-400 shadow-md shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-900 bg-white">
                <img alt="Avatar" src={studentData.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v"} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-neutral-900 dark:text-white leading-none truncate">{studentData.name}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">{studentData.title}</p>
            </div>
          </div>
          {/* XP Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">XP: {studentData.xp.toLocaleString('pt-BR')} / {studentData.nextLevelXp.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{xpPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full relative" style={{ width: `${xpPercentage}%` }}>
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
          { view: 'store', icon: <Store size={18} />, label: 'Loja', emoji: '🛒' },
          { view: 'settings', icon: <Settings size={18} />, label: 'Configurações', emoji: '⚙️' },
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
  );
};
