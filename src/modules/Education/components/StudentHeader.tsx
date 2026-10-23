import React from 'react';
import { 
  Zap, 
  Search, 
  Bell
} from 'lucide-react';
import { EducationAvatar } from './EducationAvatar';

interface StudentHeaderProps {
  activeView: string;
  studentData: {
    name: string;
    xp: number;
    level: number;
    streak: number;
    coins: number;
    avatar: string;
    hasPracticedToday?: boolean;
  };
  setActiveView: (view: any) => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  activeView,
  studentData,
  setActiveView,
}) => {
  return (
    <header className="hidden md:flex sticky top-0 z-30 w-full px-8 py-4 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl justify-between items-center border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
      {/* Breadcrumb / Page title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-medium">Gestão 360 Educação</span>
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
          <span className="text-xs font-black">{studentData.xp.toLocaleString('pt-BR')} XP</span>
          <span className="text-[10px] font-bold text-amber-500/70">Nível {studentData.level}</span>
        </div>

        {/* Streak Pill - Raio de Energia Elétrica (⚡ Carregado vs Descarregado) */}
        <div 
          className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            studentData.hasPracticedToday
              ? 'bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-cyan-500/15 border-amber-400/70 dark:border-yellow-400/50 text-amber-600 dark:text-yellow-400 shadow-sm shadow-amber-500/20'
              : 'bg-neutral-100 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700/60 text-neutral-400 dark:text-neutral-500'
          }`}
          title={
            studentData.hasPracticedToday
              ? `Sequência de ${studentData.streak} dias! Raio carregado com alta voltagem ⚡`
              : `Sequência de ${studentData.streak} dias: complete uma lição hoje para disparar o raio! ⚡`
          }
        >
          <Zap 
            size={14} 
            className={`transition-all duration-300 ${
              studentData.hasPracticedToday 
                ? 'text-amber-500 dark:text-yellow-400 animate-pulse drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]' 
                : 'text-neutral-400 dark:text-neutral-500 opacity-60'
            }`} 
            fill={studentData.hasPracticedToday ? "currentColor" : "none"} 
          />
          <span className="text-xs font-black">
            {studentData.streak} {studentData.streak === 1 ? 'dia' : 'dias'}
          </span>
          {studentData.hasPracticedToday ? (
            <span className="text-xs leading-none">⚡</span>
          ) : (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700/80 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Aguardando
            </span>
          )}
        </div>

        {/* Coins Pill */}
        <div className="hidden lg:flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-3 py-1.5 rounded-full">
          <span className="text-xs font-black">{studentData.coins}</span>
          <span className="text-sm leading-none mt-[-2px]">🪙</span>
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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse"></span>
        </button>
        
        {/* Profile avatar */}
        <button 
          className="flex items-center gap-2.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 rounded-xl px-2 py-1.5 transition-all group active:scale-95"
          onClick={() => setActiveView('settings')}
          title="Meu Perfil"
        >
          <EducationAvatar 
            src={studentData.avatar} 
            name={studentData.name} 
            role="student" 
            size="xs" 
          />
          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 hidden lg:block group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{studentData.name.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  );
};
