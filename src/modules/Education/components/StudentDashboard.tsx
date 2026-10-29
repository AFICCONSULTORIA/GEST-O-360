import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Play,
  Award,
  User,
  Users,
  Target,
  Zap,
  Loader2,
  HeartHandshake,
  ChevronRight
} from 'lucide-react';
import { Course, Lesson } from '../StudentPortal';
import { fetchClassmates, Classmate } from '../../../lib/api/education';
import { EducationAvatar } from './EducationAvatar';
import { getCourseTheme, SUBJECT_PRESETS } from '../data/eduImageBank';
import { SubjectIcon } from './SubjectIcon';

interface StudentDashboardProps {
  xpPercentage: number;
  courses: Course[];
  setActiveView: (view: any) => void;
  handleAccessCourse: (course: Course) => void;
  handleStartLesson: (lesson: any) => void;
  studentData?: {
    id?: string;
    name?: string;
    xp?: number;
    coins?: number;
    level?: number;
    streak: number;
    hasPracticedToday?: boolean;
    streakFreezes?: number;
    className?: string;
    classId?: number;
  };
}

const FALLBACK_QUICK_CHALLENGES: Array<Lesson & { subject: string; coverUrl: string }> = [
  {
    id: 'quick-demo-fracoes',
    title: 'Frações com Fatias de Pizza',
    subject: 'Matemática',
    coverUrl: '/edu-bank/ativ-fracoes-pizza.jpg',
    type: 'quiz',
    duration: '10 min',
    xp: 120,
    coins: 40,
    questions: [
      {
        id: 'q1',
        question: 'Uma pizza foi dividida em 8 fatias iguais e 2 fatias foram servidas. Qual fração representa as fatias servidas?',
        imageUrl: '/edu-bank/ativ-fracoes-pizza.jpg',
        options: ['2/8 (ou 1/4 da pizza)', '1/2 da pizza', '6/8 da pizza', '3/4 da pizza'],
        correctAnswer: 0,
        explanation: '2 fatias de 8 iguais formam 2/8, que simplificando por 2 equivale a 1/4.'
      },
      {
        id: 'q2',
        question: 'Quantas fatias ainda ficaram na tábua dessa pizza de 8 pedaços?',
        imageUrl: '/edu-bank/ativ-fracoes-pizza.jpg',
        options: ['4 fatias (4/8)', '6 fatias (6/8)', '5 fatias (5/8)', '2 fatias (2/8)'],
        correctAnswer: 1,
        explanation: 'De 8 fatias, tirando 2 restam 6 fatias!'
      }
    ]
  },
  {
    id: 'quick-demo-solar',
    title: 'Explorando o Sistema Solar',
    subject: 'Ciências',
    coverUrl: '/edu-bank/ativ-sistema-solar.jpg',
    type: 'quiz',
    duration: '10 min',
    xp: 100,
    coins: 35,
    questions: [
      {
        id: 'q1',
        question: 'Qual astro ilumina e aquece a Terra todos os dias no centro do nosso Sistema Solar?',
        imageUrl: '/edu-bank/ativ-sistema-solar.jpg',
        options: ['A Lua', 'O Sol', 'Marte', 'Saturno'],
        correctAnswer: 1,
        explanation: 'O Sol é a estrela central do nosso Sistema Solar e fonte essencial de luz e calor.'
      },
      {
        id: 'q2',
        question: 'Qual movimento da Terra explica a sucessão dos dias e das noites?',
        imageUrl: '/edu-bank/ativ-sistema-solar.jpg',
        options: ['Rotação em torno de si mesma', 'Mudança das estações', 'Eclipse lunar', 'Maré alta'],
        correctAnswer: 0,
        explanation: 'A rotação da Terra dura cerca de 24 horas, criando o dia na face iluminada e a noite na face oposta.'
      }
    ]
  }
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  xpPercentage,
  courses,
  setActiveView,
  handleAccessCourse,
  handleStartLesson,
  studentData,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFriendId, setActiveFriendId] = useState<string | number | null>(null);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [isLoadingClassmates, setIsLoadingClassmates] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadClassmates() {
      setIsLoadingClassmates(true);
      try {
        const studentId = studentData?.id || localStorage.getItem('edu_student_id') || '2';
        const className = studentData?.className || localStorage.getItem('edu_student_class') || 'Turma 4A';
        const list = await fetchClassmates(studentId, className);
        if (isMounted) {
          setClassmates(list);
        }
      } catch (err) {
        console.error('Erro ao buscar colegas da turma:', err);
      } finally {
        if (isMounted) setIsLoadingClassmates(false);
      }
    }

    loadClassmates();

    const handleUpdate = () => {
      loadClassmates();
    };

    window.addEventListener('students-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('students-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [studentData?.id, studentData?.className]);

  const handleInteract = (friendName: string, emoji: string) => {
    setToastMessage(`Você mandou um ${emoji} para ${friendName}!`);
    setActiveFriendId(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const firstName = studentData?.name ? studentData.name.split(' ')[0] : 'Explorador';

  // Separa Trilhas regulares e Atividades Rápidas criadas pelo professor
  const regularTrails = useMemo(() => {
    const trails = courses.filter((c) => !c.isQuickActivity);
    return trails.length > 0 ? trails : courses;
  }, [courses]);

  const teacherQuickActivities = useMemo(() => {
    return courses.filter((c) => c.isQuickActivity);
  }, [courses]);

  const totalCompletedLessons = useMemo(() => {
    return courses.reduce(
      (acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.filter((l) => l.isCompleted).length, 0),
      0
    );
  }, [courses]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-28 md:pb-10">
      {/* Hero Premium Section */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-7 md:p-10 text-white shadow-xl shadow-emerald-500/20 group">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none rounded-[32px]">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-white/10 blur-[80px] rounded-full group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[60%] bg-sky-500/20 blur-[60px] rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-4">
              <Sparkles size={12} className="text-emerald-200" />
              {studentData?.className || 'Minha Turma'} • Jornada de Descobertas
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">
              Olá, {firstName}! Vamos aprender hoje?
            </h2>
            <p className="text-emerald-50 text-base md:text-lg mb-6 opacity-95 max-w-lg leading-relaxed">
              {totalCompletedLessons > 0
                ? `Você já concluiu ${totalCompletedLessons} ${totalCompletedLessons === 1 ? 'aula ou atividade' : 'aulas e atividades'}! Continue explorando as trilhas preparadas pelo seu professor.`
                : 'Explore as trilhas ilustradas e missões criadas pelo seu professor para ganhar moedas e medalhas!'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveView('courses')}
                className="px-6 py-3.5 bg-white text-emerald-700 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                Ver Trilhas & Atividades
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => setActiveView('assessments')}
                className="px-5 py-3.5 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Target size={16} />
                Missões Rápidas
              </button>
            </div>
          </div>

          {/* Circular Progress */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/20" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray="282.7"
                  strokeDashoffset={282.7 * (1 - xpPercentage / 100)}
                  className="text-white drop-shadow-md"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-black tracking-tighter">{xpPercentage}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Nível {studentData?.level || 1}</span>
              </div>
            </div>
            <p className="mt-2.5 font-bold text-emerald-50 tracking-wide text-xs sm:text-sm">Rumo ao Próximo Nível</p>
          </div>
        </div>
      </section>

      {/* Card de Sequência Diária - Raio ⚡ */}
      {studentData && (
        <section
          className={`rounded-[28px] p-5 md:p-6 border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${
            studentData.hasPracticedToday
              ? 'bg-gradient-to-r from-amber-500/10 via-yellow-400/10 to-cyan-500/10 border-amber-300/80 dark:border-yellow-500/30 dark:bg-amber-950/20 shadow-amber-500/5'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                studentData.hasPracticedToday
                  ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30 ring-4 ring-yellow-400/20'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
              }`}
            >
              <Zap
                size={28}
                fill={studentData.hasPracticedToday ? 'currentColor' : 'none'}
                className={studentData.hasPracticedToday ? 'animate-pulse' : 'opacity-60'}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-neutral-900 dark:text-white">
                  {studentData.hasPracticedToday
                    ? `Sequência ativa: ${studentData.streak} ${studentData.streak === 1 ? 'dia seguido' : 'dias seguidos'}!`
                    : `Sua sequência está em ${studentData.streak} ${studentData.streak === 1 ? 'dia' : 'dias'}`}
                </h3>
                {studentData.hasPracticedToday ? (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-yellow-400 flex items-center gap-1">
                    Raio Carregado ⚡
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    Pratique hoje ⚡
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {studentData.hasPracticedToday
                  ? 'Parabéns! Você já concluiu sua prática diária hoje. Volte amanhã para somar mais um dia!'
                  : 'Complete 1 leitura ou atividade rápida hoje para acender o raio da sua sequência diária!'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('courses')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto text-center ${
              studentData.hasPracticedToday
                ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md shadow-amber-500/25 hover:scale-105 active:scale-95'
            }`}
          >
            {studentData.hasPracticedToday ? 'Ver Trilhas' : 'Praticar Agora ⚡'}
          </button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-8">
          {/* Trilhas Ilustradas em Andamento */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Compass className="text-emerald-500" size={24} />
                  Trilhas Ilustradas da Turma
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                  Continue de onde parou nas trilhas criadas pelo seu professor.
                </p>
              </div>
              <button
                onClick={() => setActiveView('courses')}
                className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            {regularTrails.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-[24px] border border-neutral-200/70 dark:border-neutral-800">
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  Nenhuma trilha publicada ainda para esta turma.
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Confira as Missões & Desafios abaixo enquanto seu professor prepara novas trilhas!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {regularTrails.slice(0, 4).map((course) => {
                  const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
                  const completedLessons = course.modules.reduce(
                    (acc, mod) => acc + mod.lessons.filter((l) => l.isCompleted).length,
                    0
                  );
                  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  const theme = getCourseTheme(course.color);
                  const cover =
                    course.coverUrl ||
                    SUBJECT_PRESETS[course.subject]?.defaultCover ||
                    '/edu-bank/cover-ciencias.jpg';

                  return (
                    <div
                      key={course.id}
                      onClick={() => handleAccessCourse(course)}
                      className={`bg-white dark:bg-neutral-900 rounded-[24px] overflow-hidden border border-neutral-200/70 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all group flex flex-col ${theme.cardHover}`}
                    >
                      {/* Capa Ilustrada por IA */}
                      <div className="h-32 w-full relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        <img
                          src={cover}
                          alt={course.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider">
                          {course.subject}
                        </span>
                        <div
                          className={`absolute bottom-2.5 left-3 w-9 h-9 rounded-xl ${theme.iconBg} ${theme.iconText} bg-white/95 dark:bg-neutral-900/95 flex items-center justify-center shadow-md`}
                        >
                          <SubjectIcon icon={course.icon} size={18} />
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h4 className="font-black text-neutral-900 dark:text-white text-base leading-snug line-clamp-1">
                            {course.title}
                          </h4>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {completedLessons} de {totalLessons} {totalLessons === 1 ? 'aula concluída' : 'aulas concluídas'}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${theme.barBg} rounded-full transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-bold ${theme.progressText}`}>
                              {progress === 100 ? 'Concluída!' : progress > 0 ? 'Em andamento' : 'Começar agora'}
                            </span>
                            <span className="font-bold text-neutral-400">{progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Atividades Rápidas Ilustradas (Reais do Professor ou Desafios BNCC) */}
          <section className="pt-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Zap className="text-amber-500" size={24} />
                  Atividades Rápidas & Desafios
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                  Atividades curtas ilustradas para praticar e acumular moedas!
                </p>
              </div>
              <button
                onClick={() => setActiveView('assessments')}
                className="text-amber-600 dark:text-amber-400 font-bold text-sm hover:underline cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            <div className="space-y-3">
              {teacherQuickActivities.length > 0
                ? teacherQuickActivities.slice(0, 4).map((act) => {
                    const firstLesson = act.modules[0]?.lessons[0];
                    const qCount = firstLesson?.questions?.length || 1;
                    const cover =
                      act.coverUrl ||
                      firstLesson?.imageUrl ||
                      SUBJECT_PRESETS[act.subject]?.defaultCover ||
                      '/edu-bank/ativ-desafio-trofeu.jpg';

                    return (
                      <div
                        key={act.id}
                        onClick={() => handleAccessCourse(act)}
                        className="flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-[22px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={cover}
                            alt={act.title}
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-neutral-200/60 dark:border-neutral-700 group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                {act.subject}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                +{firstLesson?.xp || 100} XP
                              </span>
                            </div>
                            <h5 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {act.title}
                            </h5>
                            <p className="text-xs text-neutral-500">
                              {firstLesson?.type === 'quiz' ? `${qCount} ${qCount === 1 ? 'questão ilustrada' : 'questões ilustradas'}` : 'Leitura Ilustrada'} • {firstLesson?.duration || '10 min'}
                            </p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                          <Play size={16} className="ml-0.5" />
                        </div>
                      </div>
                    );
                  })
                : FALLBACK_QUICK_CHALLENGES.map((test) => (
                    <div
                      key={test.id}
                      onClick={() => handleStartLesson(test)}
                      className="flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-neutral-900 rounded-[22px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={test.coverUrl}
                          alt={test.title}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-neutral-200/60 dark:border-neutral-700 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              {test.subject}
                            </span>
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              +{test.xp} XP • 🪙 {test.coins}
                            </span>
                          </div>
                          <h5 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {test.title}
                          </h5>
                          <p className="text-xs text-neutral-500">
                            Duração: {test.duration} • {test.questions?.length || 2} questões ilustradas
                          </p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                        <Play size={16} className="ml-0.5" />
                      </div>
                    </div>
                  ))}
            </div>
          </section>
        </div>

        {/* Coluna Lateral: Espaço Família + Conquistas + Amigos da Turma */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Atalho Didático: Espaço da Família & Acompanhamento */}
          <div
            onClick={() => setActiveView('family')}
            className="bg-gradient-to-br from-indigo-600 to-teal-600 p-6 rounded-[24px] text-white shadow-lg shadow-indigo-500/15 cursor-pointer hover:scale-[1.01] transition-all group relative overflow-hidden"
          >
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <HeartHandshake size={22} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20">
                Espaço da Família
              </span>
            </div>
            <h3 className="font-black text-lg leading-snug">
              Boletim Qualitativo & Avisos
            </h3>
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
              Veja os pareceres carinhosos do professor, etapas de desenvolvimento (sem notas numéricas) e recados da escola.
            </p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-black">
              <span>Acessar Vida Escolar</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Últimas Conquistas */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-[24px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Award className="text-amber-500" size={20} />
                Minhas Medalhas
              </h3>
              <button
                onClick={() => setActiveView('achievements')}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Ver mural
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div
                onClick={() => setActiveView('achievements')}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-200/50 transition-transform group-hover:scale-110">
                  <span className="text-2xl">⭐</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-500 text-center uppercase tracking-wide">
                  Super<br />Estrela
                </span>
              </div>

              <div
                onClick={() => setActiveView('achievements')}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center border border-sky-200/50 transition-transform group-hover:scale-110">
                  <span className="text-2xl">⚡</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-500 text-center uppercase tracking-wide">
                  Relâmpago
                </span>
              </div>

              <div
                onClick={() => setActiveView('achievements')}
                className="flex flex-col items-center gap-2 opacity-60 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200/50 transition-transform group-hover:scale-110">
                  <span className="text-2xl">🚀</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-500 text-center uppercase tracking-wide">
                  Explorador
                </span>
              </div>
            </div>
          </div>

          {/* Amigos Online da Mesma Turma */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-[24px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Users className="text-sky-500" size={20} />
                Colegas da Turma
              </h3>
              <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20 rounded-full tracking-wider">
                {studentData?.className || 'Turma 4A'}
              </span>
            </div>

            {isLoadingClassmates ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400">
                <Loader2 size={24} className="animate-spin text-sky-500" />
                <span className="text-xs font-bold">Conectando colegas da turma...</span>
              </div>
            ) : classmates.length === 0 ? (
              <div className="py-6 px-4 text-center bg-neutral-50/50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mx-auto">
                  <User size={20} />
                </div>
                <p className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                  Nenhum colega lotado nesta turma ainda
                </p>
                <p className="text-[11px] text-neutral-400">
                  Assim que novos alunos forem alocados na <strong>{studentData?.className || 'sua turma'}</strong> pelo professor, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-2">
                {classmates.map((friend) => (
                  <div key={friend.id} className="relative group">
                    <div
                      onClick={() => setActiveFriendId(activeFriendId === friend.id ? null : friend.id)}
                      className="flex items-center justify-between cursor-pointer p-2 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <EducationAvatar
                            src={friend.avatar}
                            name={friend.name}
                            role="student"
                            size="sm"
                          />
                          <div
                            className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm border border-emerald-400"
                            title="Online agora"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-black text-neutral-900 dark:text-white leading-tight">{friend.name}</p>
                          <p className="text-[10px] text-neutral-500 font-bold flex items-center gap-1.5 mt-0.5">
                            <span>{friend.statusText}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          Nv. {friend.level}
                        </span>
                      </div>
                    </div>

                    {activeFriendId === friend.id && (
                      <div className="absolute top-12 left-6 bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700 shadow-xl rounded-2xl p-2 flex items-center gap-2 z-20 animate-in zoom-in-95 duration-200">
                        <button onClick={() => handleInteract(friend.name, '🚀')} title="Mandar Foguete" className="w-9 h-9 flex items-center justify-center text-lg bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-500/20 hover:scale-110 transition-all cursor-pointer">🚀</button>
                        <button onClick={() => handleInteract(friend.name, '🔥')} title="Mandar Fogo" className="w-9 h-9 flex items-center justify-center text-lg bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/20 hover:scale-110 transition-all cursor-pointer">🔥</button>
                        <button onClick={() => handleInteract(friend.name, '👊')} title="Mandar Toca Aqui" className="w-9 h-9 flex items-center justify-center text-lg bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:scale-110 transition-all cursor-pointer">👊</button>
                        <button onClick={() => handleInteract(friend.name, '⭐')} title="Mandar Estrela" className="w-9 h-9 flex items-center justify-center text-lg bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/20 hover:scale-110 transition-all cursor-pointer">⭐</button>
                        <button onClick={() => handleInteract(friend.name, '👏')} title="Mandar Palmas" className="w-9 h-9 flex items-center justify-center text-lg bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:scale-110 transition-all cursor-pointer">👏</button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-bold px-1">
                  <span>{classmates.length} {classmates.length === 1 ? 'colega na turma' : 'colegas na turma'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Turma Conectada
                  </span>
                </div>
              </div>
            )}

            {toastMessage && (
              <div className="absolute bottom-4 left-0 right-0 mx-auto w-max px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-full shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300 z-30">
                {toastMessage}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
