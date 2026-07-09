import React from 'react';
import { 
  Map, 
  Star, 
  PlayCircle, 
  Calculator, 
  BookOpen, 
  Compass
} from 'lucide-react';
import { Course } from '../StudentPortal';

interface StudentCoursesProps {
  courses: Course[];
  isLoading: boolean;
  handleAccessCourse: (course: Course) => void;
}

export const StudentCourses: React.FC<StudentCoursesProps> = ({
  courses,
  isLoading,
  handleAccessCourse,
}) => {
  return (
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
          
          <button 
            onClick={() => courses.length > 0 && handleAccessCourse(courses[0])}
            className="bg-white text-indigo-600 hover:bg-neutral-50 font-black px-8 py-5 rounded-[20px] shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all flex items-center gap-3 w-full md:w-auto justify-center group/btn cursor-pointer">
            <PlayCircle size={28} className="group-hover/btn:scale-110 transition-transform" />
            Continuar Aventura
          </button>
        </div>
      </div>

      {/* Grid de Trilhas */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhuma Trilha Encontrada</h3>
          <p className="text-neutral-500">Volte mais tarde para novas aventuras de conhecimento!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
            const completedLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.filter(l => l.isCompleted).length, 0);
            const progress = Math.round((completedLessons / totalLessons) * 100) || 0;

            return (
              <div key={course.id} className={`bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:shadow-${course.color}-500/10 hover:-translate-y-1 transition-all group`}>
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl bg-${course.color}-100 dark:bg-${course.color}-500/20 text-${course.color}-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform rotate-3`}>
                    {course.icon === 'Calculator' ? <Calculator size={28} /> : <BookOpen size={28} />}
                  </div>
                  <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                    {totalLessons} Fases
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-1">{course.title}</h4>
                  <p className="text-xs text-neutral-500 font-medium">{course.description}</p>
                </div>
                
                <div className="space-y-1.5 mt-auto">
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-${course.color}-500 rounded-full`} style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className={`text-[10px] font-bold text-${course.color}-600 dark:text-${course.color}-400 text-right`}>{progress}% Concluído</p>
                </div>

                <button 
                  onClick={() => handleAccessCourse(course)}
                  className={`w-full mt-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-${course.color}-50 dark:hover:bg-${course.color}-500/10 text-neutral-900 dark:text-white hover:text-${course.color}-600 dark:hover:text-${course.color}-400 font-bold py-3 rounded-xl transition-colors border border-transparent hover:border-${course.color}-200 dark:hover:border-${course.color}-500/30 flex items-center justify-center gap-2 cursor-pointer`}
                >
                  <Compass size={18} /> Acessar Trilha
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
