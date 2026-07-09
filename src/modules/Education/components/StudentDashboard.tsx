import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Compass, 
  Calculator, 
  BookOpen, 
  Clock, 
  Play, 
  Award, 
  User
} from 'lucide-react';
import { Course } from '../StudentPortal';

interface StudentDashboardProps {
  xpPercentage: number;
  courses: Course[];
  setActiveView: (view: any) => void;
  handleAccessCourse: (course: Course) => void;
  handleStartLesson: (lesson: any) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  xpPercentage,
  courses,
  setActiveView,
  handleAccessCourse,
  handleStartLesson,
}) => {
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
            <p className="mt-3 font-bold text-emerald-50 tracking-wide text-sm">Progresso Semanal</p>
          </div>
        </div>
      </section>

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: My Trails & Courses */}
        <div className="lg:col-span-8 space-y-6">
          
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
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Daily Challenge */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-[24px] shadow-lg relative overflow-hidden text-white group">
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-white/10 blur-[40px] rounded-full group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full min-h-[160px] justify-between">
              <div className="flex items-start justify-between">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  <Award size={12} />
                  Desafio do Dia
                </span>
                <span className="text-2xl">🧩</span>
              </div>
              <div className="mt-6">
                <h4 className="text-xl font-black leading-tight mb-2">O Mistério da Equação Perdida</h4>
                <p className="text-indigo-100 text-sm opacity-90 mb-4">Resolva e ganhe 50 moedas!</p>
                <button className="w-full py-2.5 bg-white text-indigo-700 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-colors shadow-md cursor-pointer">
                  Jogar Agora
                </button>
              </div>
            </div>
          </div>

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

          {/* Amigos Online */}
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
            <h3 className="font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="text-sky-500" size={20} />
              Amigos Online
            </h3>
            <div className="flex -space-x-3 overflow-hidden mb-3 p-1">
              <img alt="Friend 1" className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD67XhB0DJ40aaTrcWE9Iu_CcFYker9wsK8fJp4A7tzRdu9BapL31HGEWE1YNiLn0vGagwV83hToRXj61oJHwqa90jNR9WsRsmG3nfD2pkzQbohLj66VPCTSk5ZgEEIr7s-KDWO0w3dGS9shn0V2SiFXd5iEDWQqlK76AiiDEsS5dkMZO5pxzNAt30M4FdnuuDXFNVVg797dlHMBDUiIpllNfDj8CTg1sGQSelXwDbN03csF-YcHbv5tjK3HL8OvXoSpjanR_rgKewT" />
              <img alt="Friend 2" className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDllRObvU5JxFTVh5peqsNKPqwOqP1l8lebIwbcOdWvzvHUyxWhDg43f0OcCFOnycftt_-hr-wNyLYuGKNAh6GHqpMby3k04-V7DZlITdVNLGB21dKL50vmm7l20NHjDpfO5mVgsqP9p8WskMxObv699qRM9aApARfS64JeVrxkhH7WIu9ioZMXSFXdgNd0A1K0Yd64IhHTrIQeSneQl-04iEuBW5ABmM_Va3_iVbWnsrdHQ1jMh8T7vzz8r_4inEwnTz4gQyLMte8j" />
              <img alt="Friend 3" className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDo0IL9p_Y9Mj9wmvRO8KmKUHwshNw8UEloqwmyKnzot8sffi7PYbE1E5zqtuYOkmxtL6IzO4FpE_OhmvAQ4lh2FGNIfGf25TeVpqrdttCCIYPOEDj-cxlMiYj3NsekfPLGjRYkFvL3sBtz541gu01UvLdC0OaGcEYOOdk6tbnoOj06DQQ_Go_41ng-Sr_j8SUedGt0w4ohI9oFlK2dQIwxMcrz5KW1CvGNBnfWNvE1sCInRc8D1EllM0C2GFssg5OEWMPAQXhPVBWj" />
              <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold shadow-sm">+5</div>
            </div>
            <p className="text-xs text-neutral-500 font-medium">Gael e outros 4 estão estudando agora.</p>
          </div>

        </aside>
      </div>
    </div>
  );
};
