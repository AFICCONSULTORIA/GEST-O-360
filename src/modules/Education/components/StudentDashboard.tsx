import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Compass, 
  Calculator, 
  BookOpen, 
  Clock, 
  Play, 
  Award, 
  User,
  Users,
  Target,
  Zap,
  Loader2
} from 'lucide-react';
import { Course } from '../StudentPortal';
import { fetchClassmates, Classmate } from '../../../lib/api/education';
import { EducationAvatar } from './EducationAvatar';

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

  return (
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
            <button 
              onClick={() => setActiveView('assessments')}
              className="px-6 py-3 bg-white text-emerald-700 font-bold text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              Continuar Avaliação
              <ArrowRight size={16} />
            </button>
          </div>
          
          {/* Circular Progress */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/20" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - (xpPercentage / 100))} className="text-white drop-shadow-md" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-black tracking-tighter">{xpPercentage}%</span>
              </div>
            </div>
            <p className="mt-3 font-bold text-emerald-50 tracking-wide text-sm">Rumo ao Próximo Nível</p>
          </div>
        </div>
      </section>

      {/* Card de Sequência Diária - Raio de Alta Voltagem (Carregado ⚡ vs Em Espera) */}
      {studentData && (
        <section className={`rounded-[28px] p-5 md:p-6 border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${
          studentData.hasPracticedToday
            ? 'bg-gradient-to-r from-amber-500/10 via-yellow-400/10 to-cyan-500/10 border-amber-300/80 dark:border-yellow-500/30 dark:bg-amber-950/20 shadow-amber-500/5'
            : 'bg-neutral-100/90 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
        }`}>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              studentData.hasPracticedToday
                ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30 ring-4 ring-yellow-400/20'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
            }`}>
              <Zap size={28} fill={studentData.hasPracticedToday ? "currentColor" : "none"} className={studentData.hasPracticedToday ? "animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "opacity-60"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-neutral-900 dark:text-white">
                  {studentData.hasPracticedToday 
                    ? `Poder do Raio Carregado! (${studentData.streak} ${studentData.streak === 1 ? 'dia' : 'dias'})` 
                    : `Sua Sequência está em Espera (${studentData.streak} ${studentData.streak === 1 ? 'dia' : 'dias'})`}
                </h3>
                {studentData.hasPracticedToday ? (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-yellow-400 flex items-center gap-1">
                    Raio Carregado ⚡
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    Aguardando Carga ⚡
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {studentData.hasPracticedToday 
                  ? 'Você já completou a primeira atividade de hoje e liberou a carga do raio. Volte amanhã para continuar sua sequência!' 
                  : 'Complete a primeira atividade do dia para liberar o trovão e cortar a tela com o poder do raio!'}
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
            {studentData.hasPracticedToday ? 'Explorar Trilhas' : 'Praticar para Carregar Raio ⚡'}
          </button>
        </section>
      )}

      {/* Bento Grid Content */}
      {/* Desafio do Dia */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-[32px] p-6 md:p-8 text-white shadow-lg relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 opacity-20 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
          <Sparkles size={160} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-3">
              <Target size={12} className="text-amber-100" />
              Desafio do Dia
            </div>
            <h3 className="text-2xl font-black mb-2">Mestre das Equações</h3>
            <p className="text-amber-50 text-sm max-w-sm mb-4">Resolva 5 exercícios de álgebra para ganhar a recompensa diária exclusiva!</p>
            <div className="flex items-center gap-4">
              <div className="w-48 h-2 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-2/5"></div>
              </div>
              <span className="text-xs font-bold">2/5 concluidos</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl font-black">
              <span className="text-yellow-300">🪙 +150 Moedas</span>
            </div>
            <button 
              onClick={() => setActiveView('assessments')}
              className="px-6 py-3 bg-white text-orange-600 font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.05] active:scale-95 shadow-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Jogar Agora
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Trilhas em Andamento */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Compass className="text-emerald-500" size={24} />
                  Trilhas em Andamento
                </h3>
                <p className="text-sm text-neutral-500 mt-1">Continue de onde parou.</p>
              </div>
              <button onClick={() => setActiveView('courses')} className="text-emerald-600 font-bold text-sm hover:underline cursor-pointer">Ver todas</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.slice(0, 2).map(course => {
                const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
                const completedLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.filter(l => l.isCompleted).length, 0);
                const progress = Math.round((completedLessons / totalLessons) * 100) || 0;

                return (
                  <div key={course.id} onClick={() => handleAccessCourse(course)} className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-5 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 hover:border-emerald-200 cursor-pointer transition-all group">
                    <div className="flex gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-${course.color}-50 dark:bg-${course.color}-500/10 flex items-center justify-center shrink-0`}>
                        {course.icon === 'Calculator' ? <Calculator className={`text-${course.color}-600 dark:text-${course.color}-400`} size={24} /> : <BookOpen className={`text-${course.color}-600 dark:text-${course.color}-400`} size={24} />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-lg leading-tight mb-1">{course.title}</h4>
                        <p className="text-xs text-neutral-500">{completedLessons} de {totalLessons} aulas</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r from-${course.color}-400 to-${course.color}-500 rounded-full`} style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-bold text-${course.color}-600 dark:text-${course.color}-400`}>Em andamento</span>
                        <span className="font-medium text-neutral-400">{progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Testes Disponíveis */}
          <section className="pt-2">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock className="text-teal-500" size={24} />
              Testes Disponíveis
            </h3>
            
            <div className="space-y-3">
              {[
                {
                  id: 'test-1',
                  title: 'Diagnóstico de Ciências Naturais',
                  type: 'quiz' as const,
                  duration: '45 min',
                  xp: 150,
                  coins: 50,
                  questions: [
                    { id: 'q1', question: 'Qual planeta é conhecido como o Planeta Vermelho?', options: ['Vênus', 'Marte', 'Júpiter', 'Saturno'], correctAnswer: 1 },
                    { id: 'q2', question: 'Qual é o maior oceano da Terra?', options: ['Oceano Atlântico', 'Oceano Índico', 'Oceano Pacífico', 'Oceano Ártico'], correctAnswer: 2 }
                  ]
                },
                {
                  id: 'test-2',
                  title: 'Geografia: Mapa Mundi',
                  type: 'quiz' as const,
                  duration: '30 min',
                  xp: 100,
                  coins: 30,
                  questions: [
                    { id: 'q1', question: 'Qual é o maior país do mundo em extensão territorial?', options: ['China', 'EUA', 'Canadá', 'Rússia'], correctAnswer: 3 },
                    { id: 'q2', question: 'Em qual continente fica o Egito?', options: ['África', 'Ásia', 'Europa', 'América do Sul'], correctAnswer: 0 }
                  ]
                }
              ].map((test, index) => (
                <div key={test.id} onClick={() => handleStartLesson(test)} className={`flex items-center justify-between p-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-[20px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-md ${index === 0 ? 'hover:border-emerald-200 dark:hover:border-emerald-800' : 'hover:border-sky-200 dark:hover:border-sky-800'} transition-all cursor-pointer group`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${index === 0 ? 'bg-teal-50 dark:bg-teal-500/10' : 'bg-sky-50 dark:bg-sky-500/10'} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <span className={`${index === 0 ? 'text-teal-600' : 'text-sky-600'} font-black text-lg`}>{test.title.charAt(0)}</span>
                    </div>
                    <div>
                      <h5 className={`font-bold text-neutral-900 dark:text-white ${index === 0 ? 'group-hover:text-teal-600' : 'group-hover:text-sky-600'} transition-colors`}>{test.title}</h5>
                      <p className="text-xs text-neutral-500 mt-0.5">Duração: {test.duration} • {test.questions.length} questões</p>
                    </div>
                  </div>
                  <button className={`w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 ${index === 0 ? 'group-hover:bg-teal-500' : 'group-hover:bg-sky-500'} group-hover:text-white transition-all`}>
                    <Play size={16} className="ml-1" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Achievements & Social */}
        <aside className="lg:col-span-1 space-y-6">
          
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

          {/* Amigos Online da Mesma Turma */}
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Users className="text-sky-500" size={20} />
                Amigos Online
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
                  Assim que novos alunos forem alocados na <strong>{studentData?.className || 'sua turma'}</strong> pelo professor, eles aparecerão aqui instantaneamente.
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
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm border border-emerald-400 animate-pulse" title="Online agora" />
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

                    {/* Interações Popover */}
                    {activeFriendId === friend.id && (
                      <div className="absolute top-12 left-10 bg-white dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700 shadow-xl rounded-2xl p-2 flex items-center gap-2 z-20 animate-in zoom-in-95 duration-200">
                        <button onClick={() => handleInteract(friend.name, '🚀')} title="Mandar Foguete" className="w-10 h-10 flex items-center justify-center text-xl bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-500/20 hover:scale-110 transition-all cursor-pointer">🚀</button>
                        <button onClick={() => handleInteract(friend.name, '🔥')} title="Mandar Fogo" className="w-10 h-10 flex items-center justify-center text-xl bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/20 hover:scale-110 transition-all cursor-pointer">🔥</button>
                        <button onClick={() => handleInteract(friend.name, '👊')} title="Mandar Toca Aqui" className="w-10 h-10 flex items-center justify-center text-xl bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:scale-110 transition-all cursor-pointer">👊</button>
                        <button onClick={() => handleInteract(friend.name, '⭐')} title="Mandar Estrela" className="w-10 h-10 flex items-center justify-center text-xl bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/20 hover:scale-110 transition-all cursor-pointer">⭐</button>
                        <button onClick={() => handleInteract(friend.name, '👏')} title="Mandar Palmas" className="w-10 h-10 flex items-center justify-center text-xl bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:scale-110 transition-all cursor-pointer">👏</button>
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

            {/* Toast Flutuante de Confirmação */}
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
