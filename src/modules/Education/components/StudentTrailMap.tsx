import React from 'react';
import { 
  ArrowLeft, 
  Check, 
  Play, 
  Swords, 
  FileText, 
  Zap,
  Lock,
  Sparkles,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { Course, Lesson, Module } from '../StudentPortal';

interface StudentTrailMapProps {
  activeCourse: Course;
  setActiveView: (view: any) => void;
  handleStartLesson: (lesson: Lesson) => void;
}

export const StudentTrailMap: React.FC<StudentTrailMapProps> = ({
  activeCourse,
  setActiveView,
  handleStartLesson,
}) => {
  // Estatísticas gerais da trilha
  const totalCourseLessons = activeCourse.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCourseLessons = activeCourse.modules.reduce((acc, m) => acc + m.lessons.filter(l => Boolean(l.isCompleted)).length, 0);
  const coursePercent = totalCourseLessons > 0 ? Math.round((completedCourseLessons / totalCourseLessons) * 100) : 0;
  const isCourseFinished = totalCourseLessons > 0 && completedCourseLessons === totalCourseLessons;

  // Função para verificar se um módulo foi 100% concluído
  const isModuleFinished = (m: Module) => {
    return m.lessons.length > 0 && m.lessons.every(l => Boolean(l.isCompleted));
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full pb-28 md:pb-12 min-h-dvh animate-in fade-in duration-300">
      {/* Cabeçalho da Trilha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveView('dashboard')} 
            className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:scale-105 transition-transform shadow-sm cursor-pointer"
            title="Voltar ao início"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">
                {activeCourse.subject}
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="text-xs font-semibold text-neutral-500">
                {activeCourse.modules.length} Módulos
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {activeCourse.title}
            </h2>
          </div>
        </div>

        {/* Card Resumo do Progresso Geral */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-4 min-w-[240px]">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-200 dark:text-neutral-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-700"
                strokeDasharray={`${coursePercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-neutral-800 dark:text-neutral-100">
              {coursePercent}%
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Progresso Geral</p>
            <p className="text-sm font-black text-neutral-900 dark:text-white">
              {completedCourseLessons} de {totalCourseLessons} aulas
            </p>
          </div>
        </div>
      </div>

      {/* Árvore de Progresso com liberação sequencial dos módulos */}
      <div className="space-y-16 py-6 relative">
        {activeCourse.modules.map((mod, modIndex) => {
          // REGRA DE OURO: Um módulo só é liberado se todos os módulos anteriores estiverem 100% concluídos!
          const isModuleUnlocked = modIndex === 0 || activeCourse.modules.slice(0, modIndex).every(prevMod => isModuleFinished(prevMod));
          const isModDone = isModuleFinished(mod);
          const completedInMod = mod.lessons.filter(l => Boolean(l.isCompleted)).length;
          const totalInMod = mod.lessons.length;
          const prevModuleName = modIndex > 0 ? activeCourse.modules[modIndex - 1]?.title : '';

          return (
            <div key={mod.id} className="relative z-10">
              {/* Header do Módulo com indicação clara de Bloqueio/Conclusão */}
              <div 
                className={`rounded-3xl p-6 shadow-sm mb-12 transition-all ${
                  !isModuleUnlocked 
                    ? 'bg-neutral-100/70 dark:bg-neutral-900/40 border-2 border-dashed border-neutral-300 dark:border-neutral-800 opacity-80' 
                    : isModDone
                    ? 'bg-white dark:bg-neutral-900 border border-emerald-500/30 shadow-emerald-500/5'
                    : 'bg-white dark:bg-neutral-900 border-2 border-sky-500/30 shadow-sky-500/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isModuleUnlocked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full text-[11px] font-black uppercase tracking-wider">
                          <Lock size={12} /> Módulo Bloqueado
                        </span>
                      ) : isModDone ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-black uppercase tracking-wider">
                          <Check size={12} strokeWidth={3} /> Módulo Concluído
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-full text-[11px] font-black uppercase tracking-wider">
                          <Sparkles size={12} /> Módulo em Andamento
                        </span>
                      )}

                      <span className="text-xs font-bold text-neutral-400">
                        {completedInMod}/{totalInMod} aulas concluídas
                      </span>
                    </div>

                    <h3 className={`text-xl md:text-2xl font-black ${!isModuleUnlocked ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                      {mod.title}
                    </h3>

                    <p className="text-sm text-neutral-500">
                      {!isModuleUnlocked ? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          🔒 Conclua todas as aulas do módulo anterior ({prevModuleName || `Módulo ${modIndex}`}) para desbloquear esta fase.
                        </span>
                      ) : (
                        mod.description || 'Avance pelas lições para dominar este módulo.'
                      )}
                    </p>
                  </div>

                  {/* Número/Ícone do Módulo */}
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black shrink-0 transition-transform ${
                      !isModuleUnlocked 
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400' 
                        : isModDone
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    }`}
                  >
                    {!isModuleUnlocked ? (
                      <Lock size={22} className="text-neutral-400 dark:text-neutral-500" />
                    ) : isModDone ? (
                      <Check size={26} strokeWidth={3} />
                    ) : (
                      <span className="text-xl">{modIndex + 1}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Aulas do módulo no trajeto ziguezague estilo Duolingo */}
              <div className="flex flex-col items-center gap-14 relative">
                {/* Linha da Trilha */}
                <div 
                  className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 rounded-full -z-10 transition-colors ${
                    !isModuleUnlocked 
                      ? 'bg-neutral-200/60 dark:bg-neutral-800/40 border border-dashed border-neutral-300 dark:border-neutral-700/60' 
                      : isModDone
                      ? 'bg-emerald-100 dark:bg-emerald-950/40'
                      : 'bg-neutral-100 dark:bg-neutral-800/50'
                  }`}
                />
                
                {mod.lessons.map((lesson, lessIndex) => {
                  const isEven = lessIndex % 2 === 0;
                  const offset = isEven ? '-translate-x-16' : 'translate-x-16';

                  const isDone = Boolean(lesson.isCompleted);
                  
                  // A lição está bloqueada se:
                  // 1. O módulo não estiver desbloqueado; OU
                  // 2. Se a lição ainda não foi feita E a lição anterior dentro do módulo não foi concluída
                  const isLocked = !isModuleUnlocked || (!isDone && lessIndex > 0 && !Boolean(mod.lessons[lessIndex - 1].isCompleted));
                  
                  // A lição atual (próxima a ser feita)
                  const isCurrent = isModuleUnlocked && !isDone && (lessIndex === 0 || Boolean(mod.lessons[lessIndex - 1].isCompleted));

                  let colorClass = 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-400 dark:text-neutral-500 border-4 border-neutral-200 dark:border-neutral-700/60 shadow-sm';
                  if (isDone) {
                    colorClass = 'bg-emerald-500 text-white shadow-emerald-500/40 shadow-xl border-4 border-emerald-200 dark:border-emerald-900';
                  } else if (isCurrent) {
                    colorClass = 'bg-sky-500 text-white shadow-sky-500/40 shadow-xl border-4 border-sky-200 dark:border-sky-900 animate-bounce ring-4 ring-sky-400/20';
                  }

                  return (
                    <div 
                      key={lesson.id} 
                      className={`relative flex flex-col items-center ${offset} transition-transform ${isLocked ? '' : 'hover:scale-110'}`}
                    >
                      <button 
                        disabled={isLocked}
                        onClick={() => handleStartLesson(lesson)}
                        title={
                          isLocked 
                            ? (!isModuleUnlocked ? `Módulo bloqueado. Conclua ${prevModuleName || 'o módulo anterior'} primeiro.` : 'Conclua a aula anterior para liberar')
                            : lesson.title
                        }
                        className={`w-20 h-20 rounded-full flex items-center justify-center z-10 transition-all ${colorClass} ${
                          isLocked 
                            ? 'opacity-60 cursor-not-allowed' 
                            : 'cursor-pointer hover:brightness-110 active:scale-95'
                        }`}
                      >
                        {isLocked ? (
                          <Lock size={26} strokeWidth={2.5} className="text-neutral-400 dark:text-neutral-500" />
                        ) : isDone ? (
                          <Check size={32} strokeWidth={4} />
                        ) : lesson.type === 'video' ? (
                          <Play size={32} strokeWidth={3} className="ml-1" />
                        ) : lesson.type === 'quiz' ? (
                          <Swords size={32} strokeWidth={3} />
                        ) : (
                          <FileText size={32} strokeWidth={3} />
                        )}
                      </button>
                      
                      {/* Tooltip / Identificador da Aula */}
                      <div 
                        className={`absolute top-full mt-3 w-max max-w-[150px] text-center transition-all ${
                          isCurrent 
                            ? 'bg-white dark:bg-neutral-800 shadow-xl border border-sky-300 dark:border-sky-700 rounded-2xl p-3 z-20' 
                            : ''
                        }`}
                      >
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1">
                            Sua Próxima Aula
                          </span>
                        )}

                        <p className={`text-xs font-black leading-tight ${
                          isCurrent 
                            ? 'text-neutral-900 dark:text-white' 
                            : isDone 
                            ? 'text-neutral-700 dark:text-neutral-300' 
                            : 'text-neutral-400 dark:text-neutral-500'
                        }`}>
                          {lesson.title}
                        </p>

                        {isCurrent && (
                          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg py-1 px-2">
                            <Zap size={10} /> +{lesson.xp} XP
                          </div>
                        )}

                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            <CheckCircle2 size={11} strokeWidth={2.5} /> Concluída
                          </span>
                        )}

                        {isLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-1">
                            <Lock size={10} /> {!isModuleUnlocked ? 'Módulo bloqueado' : 'Bloqueada'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Comemorativo de Fim de Trilha */}
      {isCourseFinished && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden mt-8 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Trophy size={40} className="text-yellow-200" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black mb-2">🎉 Parabéns! Você completou toda a trilha!</h3>
          <p className="text-amber-100 max-w-lg mx-auto text-sm md:text-base font-medium">
            Você dominou todos os módulos e lições de {activeCourse.title}. Continue avançando para conquistar mais XP e insígnias épicas!
          </p>
          <div className="mt-6">
            <button 
              onClick={() => setActiveView('courses')}
              className="px-6 py-3 bg-white text-amber-700 font-black rounded-xl hover:scale-105 transition-transform shadow-lg cursor-pointer text-sm uppercase tracking-wider"
            >
              Explorar Novas Trilhas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
