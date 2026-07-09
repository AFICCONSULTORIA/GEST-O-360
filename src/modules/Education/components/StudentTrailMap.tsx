import React from 'react';
import { 
  ArrowLeft, 
  Check, 
  Play, 
  Swords, 
  FileText, 
  Zap
} from 'lucide-react';
import { Course, Lesson } from '../StudentPortal';

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
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 min-h-dvh">
      {/* Cabecalho da Trilha */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setActiveView('dashboard')} className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:scale-105 transition-transform shadow-sm cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{activeCourse.title}</h2>
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">{activeCourse.subject}</p>
        </div>
      </div>

      {/* Arvore de Progresso (estilo Duolingo) */}
      <div className="space-y-16 py-8 relative">
        {activeCourse.modules.map((mod, modIndex) => (
          <div key={mod.id} className="relative z-10">
            {/* Module Header */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white">{mod.title}</h3>
                <p className="text-sm text-neutral-500 mt-1">{mod.description}</p>
              </div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center font-black text-neutral-400">
                {modIndex + 1}
              </div>
            </div>

            {/* Lessons in a snaking path */}
            <div className="flex flex-col items-center gap-12 relative">
              {/* The Path Line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-full -z-10"></div>
              
              {mod.lessons.map((lesson, lessIndex) => {
                const isEven = lessIndex % 2 === 0;
                const offset = isEven ? '-translate-x-16' : 'translate-x-16';
                const isLocked = !lesson.isCompleted && lessIndex > 0 && !mod.lessons[lessIndex - 1].isCompleted;
                const isCurrent = !lesson.isCompleted && (lessIndex === 0 || mod.lessons[lessIndex - 1].isCompleted);
                const isDone = lesson.isCompleted;

                let colorClass = 'bg-neutral-200 text-neutral-400';
                if (isDone) colorClass = 'bg-emerald-500 text-white shadow-emerald-500/40 shadow-xl border-4 border-emerald-200 dark:border-emerald-900';
                if (isCurrent) colorClass = 'bg-sky-500 text-white shadow-sky-500/40 shadow-xl border-4 border-sky-200 dark:border-sky-900 animate-bounce';

                return (
                  <div key={lesson.id} className={`relative flex flex-col items-center ${offset} transition-transform hover:scale-110`}>
                    <button 
                      disabled={isLocked}
                      onClick={() => handleStartLesson(lesson)}
                      className={`w-20 h-20 rounded-full flex items-center justify-center z-10 transition-all ${colorClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
                    >
                      {isDone ? <Check size={32} strokeWidth={4} /> : 
                       lesson.type === 'video' ? <Play size={32} strokeWidth={3} className="ml-1" /> :
                       lesson.type === 'quiz' ? <Swords size={32} strokeWidth={3} /> :
                       <FileText size={32} strokeWidth={3} />
                      }
                    </button>
                    
                    {/* Lesson tooltip/label */}
                    <div className={`absolute top-full mt-3 w-max max-w-[140px] text-center ${isCurrent ? 'bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 rounded-2xl p-3 z-20' : ''}`}>
                      <p className={`text-xs font-black leading-tight ${isCurrent ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                        {lesson.title}
                      </p>
                      {isCurrent && (
                        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg py-1 px-2">
                          <Zap size={10} /> +{lesson.xp} XP
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
