import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, BookOpen, Brain, Star, Award, 
  ArrowRight, ChevronLeft, ChevronRight, PlayCircle, 
  FileText, CheckCircle2, User, Users, BookMarked, MonitorPlay,
  School, Lock, Loader2, Sparkles
} from 'lucide-react';
import { StudentPortal } from './StudentPortal';
import { TeacherDashboard } from './TeacherDashboard';

interface PublicEducacaoPortalProps {
  darkMode: boolean;
  currentInstitution: any;
}

const MOCK_COURSES = [
  { id: 1, title: 'Práticas Lúdicas para Alfabetização', category: 'Alfabetização', duration: '20h', progress: 0, image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400' },
  { id: 2, title: 'Matemática Inclusiva Básica', category: 'Matemática', duration: '30h', progress: 45, image: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&q=80&w=400' },
  { id: 3, title: 'Gestão de Sala de Aula e Autismo', category: 'Inclusão', duration: '40h', progress: 100, image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400' },
  { id: 4, title: 'Letramento Digital no Ensino Fundamental', category: 'Tecnologia', duration: '15h', progress: 10, image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=400' },
];

const MOCK_QUESTIONS = [
  {
    id: 1,
    subject: 'Matemática',
    text: 'João tinha 5 maçãs e ganhou mais 3 da sua professora. Com quantas maçãs João ficou?',
    options: ['5', '6', '7', '8'],
    correctAnswer: 3, // index of '8'
    image: '🍎'
  },
  {
    id: 2,
    subject: 'Português',
    text: 'Qual destas palavras começa com a letra B?',
    options: ['Cachorro', 'Bola', 'Gato', 'Sapo'],
    correctAnswer: 1, // index of 'Bola'
    image: '📚'
  },
  {
    id: 3,
    subject: 'Matemática',
    text: 'Qual é o número que vem depois do 9?',
    options: ['8', '11', '10', '12'],
    correctAnswer: 2, // index of '10'
    image: '🔢'
  }
];

export const PublicEducacaoPortal = ({ darkMode, currentInstitution }: PublicEducacaoPortalProps) => {
  const [activeTab, setActiveTab] = useState<'home' | 'student' | 'teacher' | 'student-login'>('home');
  
  // Student Login State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Student Dashboard State
  const [studentGrade, setStudentGrade] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !studentName || !studentPassword) return;
    
    setIsLoggingIn(true);
    // Simulate network request
    setTimeout(() => {
      setIsLoggingIn(false);
      setActiveTab('student');
    }, 1500);
  };

  const resetQuiz = () => {
    setStudentGrade(null);
    setCurrentQuestion(0);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleAnswer = (optionIndex: number) => {
    if (optionIndex === MOCK_QUESTIONS[currentQuestion].correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
    
    if (currentQuestion < MOCK_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto space-y-12 relative"
    >
      {/* Decorative background elements */}
      <div className="absolute -top-20 left-0 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-pulse" />
      <div className="absolute top-40 right-0 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="text-center space-y-6 relative z-10">
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-24 h-24 bg-gradient-to-br from-sky-400 to-indigo-500 text-white rounded-[2rem] shadow-xl shadow-sky-500/30 flex items-center justify-center mx-auto mb-6 transform rotate-3 hover:rotate-6 transition-transform cursor-default"
        >
          <GraduationCap size={48} />
        </motion.div>
        
        <h2 className="text-5xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400 drop-shadow-sm">
          Portal da Educação
        </h2>
        
        <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto font-medium">
          Um universo de aprendizado e diversão espera por você! 🚀
          <br/>Escolha quem você é para começar a aventura:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 px-4 relative z-10">
        {/* Student Card - Highly playful */}
        <motion.button 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('student-login')}
          className="group text-left p-1.5 rounded-[2.5rem] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIi8+PC9zdmc+')] opacity-50 animate-[spin_60s_linear_infinite]" />
          
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-[2.3rem] h-full relative z-10 border border-white/20">
            <div className="absolute top-6 right-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={40} className="text-amber-400 opacity-30" />
              </motion.div>
            </div>

            <div className="space-y-6">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="w-20 h-20 bg-gradient-to-br from-amber-300 to-orange-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/30"
              >
                <Star size={40} className="fill-current" />
              </motion.div>
              
              <div>
                <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 mb-3">
                  Área do Aluno
                </h3>
                <div className="inline-flex px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-bold rounded-full mb-4">
                  1º ao 5º ano 👦👧
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-base leading-relaxed font-medium">
                  Venha brincar, jogar e aprender! Ganhe medalhas, faça desafios incríveis e mostre que você é um super aluno! 🎮✨
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <div className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg rounded-xl flex items-center gap-2 group-hover:pr-4 transition-all">
                  ENTRAR AGORA
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </motion.button>

        {/* Teacher Card - Clean but vibrant */}
        <motion.button 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('teacher')}
          className="group text-left p-1.5 rounded-[2.5rem] bg-gradient-to-br from-indigo-400 via-blue-500 to-cyan-500 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 relative overflow-hidden"
        >
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-[2.3rem] h-full relative z-10 border border-white/20">
            <div className="absolute top-6 right-6">
              <BookOpen size={80} className="text-indigo-500 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>

            <div className="space-y-6">
              <motion.div 
                whileHover={{ rotate: -15, scale: 1.1 }}
                className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-blue-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
              >
                <Brain size={40} />
              </motion.div>
              
              <div>
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 mb-3">
                  Área do Professor
                </h3>
                <div className="inline-flex px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-full mb-4">
                  Educadores 📚
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-base leading-relaxed font-medium">
                  Acesse suas turmas, acompanhe o desenvolvimento dos alunos, baixe materiais e participe de formações exclusivas.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <div className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold text-lg rounded-xl flex items-center gap-2 group-hover:pr-4 transition-all">
                  Acessar Painel
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );

  const renderStudentLogin = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4 relative"
    >
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/50 via-transparent to-transparent dark:from-emerald-900/20" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-sky-100/50 via-transparent to-transparent dark:from-sky-900/20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-3xl p-8 rounded-[40px] shadow-2xl border border-white/50 dark:border-neutral-800/50">
          
          <button 
            onClick={() => setActiveTab('home')}
            className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm border border-neutral-100 dark:border-neutral-700 transition-colors mb-6"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-sky-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20 transform rotate-3 hover:rotate-0 transition-transform">
              <Sparkles size={36} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Área do Aluno</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium">Prepare-se para aprender brincando!</p>
          </div>

          <form onSubmit={handleStudentLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-4">Sua Escola</label>
              <div className="relative">
                <School size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <select 
                  required
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-0 outline-none transition-colors appearance-none font-bold text-neutral-700 dark:text-neutral-200 shadow-inner"
                >
                  <option value="" disabled>Selecione sua escola...</option>
                  <option value="1">Escola Municipal Maria Quitéria</option>
                  <option value="2">Centro Educacional Crescer</option>
                  <option value="3">Escola Setor Rural Boa Vista</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-4">Seu Nome Mágico</label>
              <div className="relative">
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Como você se chama?"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-sky-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-4">Senha Secreta</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="password" 
                  required
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="* * * * * *"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-amber-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-black text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal tracking-[0.3em] shadow-inner"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-sky-500/20 hover:shadow-sky-500/40 hover:-translate-y-1 active:scale-95 transition-all flex justify-center items-center gap-2 overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              {isLoggingIn ? (
                <>
                  <Loader2 size={24} className="animate-spin relative z-10" />
                  <span className="relative z-10">Entrando na Aventura...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Começar a Aventura</span>
                  <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`min-h-[100dvh] transition-colors ${darkMode ? 'dark' : ''} ${(activeTab === 'home' || activeTab === 'student-login') ? 'pt-24 pb-20 px-4 md:px-8 bg-[#F4F4F2] dark:bg-neutral-950' : 'bg-edu-background'}`}>
      <AnimatePresence mode="wait">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'student-login' && renderStudentLogin()}
        {activeTab === 'student' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StudentPortal onBack={() => setActiveTab('home')} />
          </motion.div>
        )}
        {activeTab === 'teacher' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TeacherDashboard onBack={() => setActiveTab('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
