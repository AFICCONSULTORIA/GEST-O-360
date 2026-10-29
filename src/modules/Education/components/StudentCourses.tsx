import React from 'react';
import {
  Map,
  Star,
  PlayCircle,
  Compass,
  Zap,
} from 'lucide-react';
import { Course } from '../StudentPortal';
import { getCourseTheme, SUBJECT_PRESETS } from '../data/eduImageBank';
import { SubjectIcon } from './SubjectIcon';

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
  // Trilha em destaque real (primeira em andamento ou primeira trilha disponível)
  const featuredCourse =
    courses.find((c) => {
      const total = c.modules.reduce((acc, m) => acc + m.lessons.length, 0);
      const done = c.modules.reduce(
        (acc, m) => acc + m.lessons.filter((l) => l.isCompleted).length,
        0
      );
      return total > 0 && done < total;
    }) || courses[0];

  const featuredStats = featuredCourse
    ? (() => {
        const total = featuredCourse.modules.reduce(
          (acc, m) => acc + m.lessons.length,
          0
        );
        const done = featuredCourse.modules.reduce(
          (acc, m) => acc + m.lessons.filter((l) => l.isCompleted).length,
          0
        );
        return {
          total,
          done,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          cover:
            featuredCourse.coverUrl ||
            SUBJECT_PRESETS[featuredCourse.subject]?.defaultCover ||
            '/edu-bank/ativ-sistema-solar.jpg',
        };
      })()
    : null;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
          <Map className="text-sky-500" size={32} />
          Trilhas & Atividades da Turma
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Escolha uma trilha ou atividade criada pelo seu professor e avance nas fases!
        </p>
      </div>

      {/* Trilha Recomendada Dinâmica (Hero Card) */}
      {featuredCourse && featuredStats && (
        <div className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 rounded-[32px] p-1 shadow-xl shadow-indigo-500/20 relative group overflow-hidden">
          <img
            src={featuredStats.cover}
            alt={featuredCourse.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none"
          />
          <div className="bg-neutral-900/55 backdrop-blur-md w-full h-full rounded-[28px] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-yellow-400 text-yellow-950 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-yellow-400/20">
                  <Star size={12} fill="currentColor" /> Recomendada para Você
                </span>
                {featuredCourse.isQuickActivity && (
                  <span className="bg-amber-500/90 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Zap size={12} /> Atividade Rápida
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
                  {featuredCourse.title}
                </h3>
                <p className="text-white/85 font-medium">
                  {featuredCourse.subject} • {featuredStats.total}{' '}
                  {featuredStats.total === 1 ? 'atividade' : 'aulas'}
                </p>
              </div>

              <div className="max-w-md w-full space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-white/90">
                  <span>Progresso na Trilha</span>
                  <span>{featuredStats.progress}%</span>
                </div>
                <div className="w-full h-3 bg-neutral-900/50 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full relative transition-all duration-500"
                    style={{ width: `${featuredStats.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleAccessCourse(featuredCourse)}
              className="bg-white text-indigo-600 hover:bg-neutral-50 font-black px-8 py-5 rounded-[20px] shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all flex items-center gap-3 w-full md:w-auto justify-center group/btn cursor-pointer"
            >
              <PlayCircle
                size={28}
                className="group-hover/btn:scale-110 transition-transform"
              />
              {featuredStats.done > 0 ? 'Continuar Aventura' : 'Começar Agora'}
            </button>
          </div>
        </div>
      )}

      {/* Grid de Trilhas e Atividades */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Nenhuma Trilha ou Atividade Disponível
          </h3>
          <p className="text-neutral-500">
            Assim que seu professor publicar novas atividades para sua turma, elas aparecerão aqui!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const totalLessons = course.modules.reduce(
              (acc, mod) => acc + mod.lessons.length,
              0
            );
            const completedLessons = course.modules.reduce(
              (acc, mod) => acc + mod.lessons.filter((l) => l.isCompleted).length,
              0
            );
            const progress =
              totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;
            const theme = getCourseTheme(course.color);
            const cover =
              course.coverUrl || SUBJECT_PRESETS[course.subject]?.defaultCover;

            return (
              <div
                key={course.id}
                className={`bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all group ${theme.cardHover}`}
              >
                {/* Capa Ilustrada da Trilha/Atividade */}
                <div className="h-40 w-full relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {cover ? (
                    <img
                      src={cover}
                      alt={course.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${theme.gradient} opacity-85`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-sm text-white text-[11px] font-black uppercase tracking-wider">
                      {course.subject}
                    </span>
                    {course.isQuickActivity && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                        <Zap size={11} /> Rápida
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl ${theme.iconBg} ${theme.iconText} backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 flex items-center justify-center shadow-md`}
                    >
                      <SubjectIcon icon={course.icon} size={20} />
                    </div>
                    <span className="text-xs font-bold text-white bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      {totalLessons} {totalLessons === 1 ? 'Aula' : 'Aulas'}
                    </span>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-1 line-clamp-2">
                      {course.title}
                    </h4>
                    <p className="text-xs text-neutral-500 font-medium line-clamp-2">
                      {course.description || 'Explore as atividades preparadas pelo professor.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${theme.barBg} rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className={`text-[11px] font-bold ${theme.progressText} text-right`}>
                      {progress}% Concluído
                    </p>
                  </div>

                  <button
                    onClick={() => handleAccessCourse(course)}
                    className={`w-full mt-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold py-3 rounded-xl transition-colors border border-transparent flex items-center justify-center gap-2 cursor-pointer ${theme.buttonHover}`}
                  >
                    <Compass size={18} />
                    {course.isQuickActivity ? 'Iniciar Atividade' : 'Acessar Trilha'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
