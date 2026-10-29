import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Search,
  Bell,
  ChevronRight,
  HeartHandshake,
  BookOpen,
  X
} from 'lucide-react';
import { EducationAvatar } from './EducationAvatar';
import { Course } from '../StudentPortal';
import { SubjectIcon } from './SubjectIcon';

interface StudentHeaderProps {
  activeView: string;
  studentData: {
    id?: string;
    name: string;
    xp: number;
    level: number;
    streak: number;
    coins: number;
    avatar: string;
    hasPracticedToday?: boolean;
    className?: string;
  };
  setActiveView: (view: any) => void;
  courses?: Course[];
  onSelectCourse?: (course: Course) => void;
}

const VIEW_TITLES: Record<string, string> = {
  dashboard: '🏠 Início',
  courses: '📚 Trilhas & Atividades',
  'trail-map': '🗺️ Mapa da Trilha',
  'lesson-player': '📖 Aula em Andamento',
  'quiz-player': '⚡ Desafio Interativo',
  assessments: '🎯 Missões & Desafios',
  achievements: '🏆 Conquistas & Ranking',
  family: '📋 Boletim & Família',
  store: '🛒 Loja de Recompensas',
  settings: '⚙️ Meu Perfil'
};

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  activeView,
  studentData,
  setActiveView,
  courses = [],
  onSelectCourse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim()
    ? courses.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="hidden md:flex sticky top-0 z-30 w-full px-8 py-4 bg-white/85 dark:bg-neutral-950/85 backdrop-blur-xl justify-between items-center border-b border-neutral-200/60 dark:border-neutral-800/60 shadow-xs print:hidden">
      {/* Breadcrumb / Page title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <button
            onClick={() => setActiveView('dashboard')}
            className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Gestão 360 Educação
          </button>
          <span>/</span>
          <span className="font-black text-neutral-900 dark:text-white">
            {VIEW_TITLES[activeView] || '🏠 Portal do Aluno'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* XP Pill */}
        <div className="hidden lg:flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full">
          <Zap size={14} className="text-amber-500" fill="currentColor" />
          <span className="text-xs font-black">{studentData.xp.toLocaleString('pt-BR')} XP</span>
          <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80">Nível {studentData.level}</span>
        </div>

        {/* Streak Pill */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            studentData.hasPracticedToday
              ? 'bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-cyan-500/15 border-amber-400/70 dark:border-yellow-400/50 text-amber-600 dark:text-yellow-400 shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700/60 text-neutral-400 dark:text-neutral-500'
          }`}
          title={
            studentData.hasPracticedToday
              ? `Sequência de ${studentData.streak} dias ativa! ⚡`
              : `Complete uma atividade hoje para manter sua sequência de ${studentData.streak} dias!`
          }
        >
          <Zap
            size={14}
            className={`transition-all duration-300 ${
              studentData.hasPracticedToday
                ? 'text-amber-500 dark:text-yellow-400 animate-pulse'
                : 'text-neutral-400 dark:text-neutral-500 opacity-60'
            }`}
            fill={studentData.hasPracticedToday ? 'currentColor' : 'none'}
          />
          <span className="text-xs font-black">
            {studentData.streak} {studentData.streak === 1 ? 'dia' : 'dias'}
          </span>
          {studentData.hasPracticedToday && <span className="text-xs leading-none">⚡</span>}
        </div>

        {/* Coins Pill (Clicável -> Loja) */}
        <button
          onClick={() => setActiveView('store')}
          title="Ir para a Loja de Recompensas"
          className="hidden lg:flex items-center gap-1 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 border border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
        >
          <span className="text-xs font-black">{studentData.coins}</span>
          <span className="text-sm leading-none mt-[-2px]">🪙</span>
        </button>

        {/* Functional Search */}
        <div className="relative" ref={searchRef}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={15} className="text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Buscar atividade..."
              className="pl-9 pr-8 py-2 w-52 bg-neutral-100 dark:bg-neutral-800/80 border border-transparent focus:border-emerald-400 dark:focus:border-emerald-500 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-neutral-900 transition-all text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isSearchOpen && searchQuery.trim() !== '' && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Trilhas & Atividades Encontradas
              </div>
              {searchResults.length === 0 ? (
                <div className="p-5 text-center text-xs text-neutral-500">
                  Nenhuma atividade encontrada para "{searchQuery}".
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                  {searchResults.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        if (onSelectCourse) {
                          onSelectCourse(course);
                        } else {
                          setActiveView('courses');
                        }
                      }}
                      className="w-full p-3 hover:bg-emerald-50/60 dark:hover:bg-neutral-800 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <SubjectIcon icon={course.icon} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-neutral-900 dark:text-white truncate">{course.title}</p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {course.subject} {course.isQuickActivity ? '• Atividade Rápida' : '• Trilha'}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-neutral-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell -> Avisos da Escola & Família */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Comunicados da Escola & Família"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all relative cursor-pointer"
          >
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-neutral-900"></span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-teal-600 text-white">
                <h4 className="font-black text-sm">Recados da Escola</h4>
                <p className="text-[11px] text-indigo-100">Acompanhamento Família & Aluno</p>
              </div>
              <div className="p-3 space-y-2">
                <div
                  onClick={() => {
                    setIsNotifOpen(false);
                    setActiveView('family');
                  }}
                  className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/50 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    Agenda Escolar
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">
                    Novos pareceres do professor e comunicados para a família disponíveis!
                  </p>
                </div>

                <div
                  onClick={() => {
                    setIsNotifOpen(false);
                    setActiveView('courses');
                  }}
                  className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/50 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <BookOpen size={11} /> Atividades da Turma
                  </span>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">
                    Confira as trilhas ilustradas publicadas pelo seu professor.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsNotifOpen(false);
                    setActiveView('family');
                  }}
                  className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <HeartHandshake size={14} />
                  <span>Abrir Boletim & Família</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile avatar */}
        <button
          className="flex items-center gap-2.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 rounded-xl px-2.5 py-1.5 transition-all group active:scale-95 cursor-pointer"
          onClick={() => setActiveView('settings')}
          title="Meu Perfil"
        >
          <EducationAvatar
            src={studentData.avatar}
            name={studentData.name}
            role="student"
            size="xs"
          />
          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 hidden lg:block group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
            {studentData.name.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
};
