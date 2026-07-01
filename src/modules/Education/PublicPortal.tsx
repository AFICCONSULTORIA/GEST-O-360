import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, BookOpen, Brain, Star, Award, 
  ArrowRight, ChevronLeft, ChevronRight, PlayCircle, 
  FileText, CheckCircle2, User, Users, BookMarked, MonitorPlay,
  School, Lock, Loader2, Sparkles
} from 'lucide-react';
import { StudentPortal } from './StudentPortal';
import { TeacherDashboard } from './TeacherDashboard';
import { loginStudent } from '../../lib/api/education';

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
  const [activeTab, setActiveTab] = useState<'home' | 'student' | 'teacher' | 'student-login' | 'teacher-login'>('home');
  
  // Student Login State
  const [loginPhase, setLoginPhase] = useState<'idle' | 'loading' | 'exploding'>('idle');
  const [enrollmentCode, setEnrollmentCode] = useState('');

  // Teacher Login State
  const [isTeacherLoggingIn, setIsTeacherLoggingIn] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Student Dashboard State
  const [studentGrade, setStudentGrade] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentCode) return;
    
    setLoginPhase('loading');
    
    const student = await loginStudent(enrollmentCode, currentInstitution?.id);
    if (!student) {
      alert("Código de matrícula inválido ou não encontrado!");
      setLoginPhase('idle');
      return;
    }

    // Armazena a sessão do aluno localmente
    localStorage.setItem('edu_student_id', student.id);
    
    setTimeout(() => {
      setLoginPhase('exploding');
      setTimeout(() => {
        setLoginPhase('idle');
        setActiveTab('student');
      }, 3000); // Explosion effect duration
    }, 1000); // 1s loading
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail || !teacherPassword) return;
    
    setIsTeacherLoggingIn(true);
    setTimeout(() => {
      setIsTeacherLoggingIn(false);
      setActiveTab('teacher');
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
          onClick={() => setActiveTab('teacher-login')}
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
      className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Super Magical Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-300/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-300/30 via-transparent to-transparent" />
        {/* Floating magical orbs */}
        <motion.div animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-20 left-20 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl mix-blend-multiply" />
        <motion.div animate={{ y: [0, 30, 0], x: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-20 right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl mix-blend-multiply" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-3xl p-8 rounded-[3rem] shadow-2xl shadow-amber-500/20 border-4 border-amber-200/50 dark:border-amber-500/20 relative">
          
          <AnimatePresence mode="wait">
            {loginPhase !== 'idle' ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center py-12 space-y-10 relative z-50"
              >
                {/* Portal Animation */}
                <motion.div 
                  className="relative w-48 h-48 flex items-center justify-center"
                  animate={{ 
                    scale: loginPhase === 'exploding' ? 20 : 1,
                    opacity: loginPhase === 'exploding' ? 0 : 1
                  }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                >
                  <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-amber-400 border-r-orange-500 border-b-rose-500 border-l-purple-500 opacity-80 mix-blend-screen"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-[4px] border-dashed border-amber-300 opacity-60"
                  />
                  <motion.div 
                    animate={{ scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-500 rounded-full blur-md"
                  />
                  <Sparkles size={40} className="absolute text-white z-10 drop-shadow-lg animate-pulse" />
                </motion.div>
                
                <motion.div 
                  className="text-center space-y-4 w-full px-4 relative z-10"
                  animate={{ opacity: 1, scale: loginPhase === 'exploding' ? 1.1 : 1 }}
                  transition={{ duration: 3, ease: "easeOut" }}
                >
                  <motion.h3 
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500"
                  >
                    {loginPhase === 'exploding' ? "Vamos conhecer o novo mundo! 🌍" : "Atravessando o Portal..."}
                  </motion.h3>
                  {/* Loading Bar */}
                  <div className="w-full h-4 bg-amber-100 dark:bg-neutral-800 rounded-full overflow-hidden relative shadow-inner">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "linear" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Magic floating icon */}
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }} 
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 border-4 border-white dark:border-neutral-900"
                >
                  <Sparkles size={28} className="text-white" />
                </motion.div>

                <button 
                  onClick={() => setActiveTab('home')}
                  className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 hover:scale-110 shadow-sm border border-amber-200 dark:border-amber-800 transition-all mb-6 group"
                >
                  <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30 transform rotate-3 hover:rotate-6 hover:scale-105 transition-all">
                    <Star size={48} className="text-white fill-current" />
                  </div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500">Portal Mágico</h2>
                  <p className="text-amber-600/80 dark:text-amber-400/80 mt-2 font-bold text-lg">Pronto para a aventura? 🚀</p>
                </div>

                <form onSubmit={handleStudentLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest pl-4">🎟️ Código de Matrícula</label>
                    <div className="relative group">
                      <User size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:text-amber-500 transition-colors" />
                      <input 
                        type="text" 
                        required
                        value={enrollmentCode}
                        onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                        placeholder="Ex: ALUNO123"
                        className="w-full pl-14 pr-4 py-4 bg-amber-50/50 dark:bg-neutral-950/50 border-4 border-amber-100 dark:border-neutral-800 rounded-3xl focus:border-amber-400 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all font-black text-neutral-900 dark:text-white text-lg placeholder:text-neutral-400/70 placeholder:font-bold shadow-inner uppercase"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loginPhase !== 'idle'}
                    className="w-full mt-8 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-3 overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIi8+PC9zdmc+')] opacity-0 group-hover:opacity-30 transition-opacity animate-[spin_10s_linear_infinite]" />
                    <span className="relative z-10">Entrar no Portal</span>
                    <ArrowRight size={24} className="relative z-10 group-hover:translate-x-2 transition-transform" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );

  const renderTeacherLogin = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-[calc(100vh-100px)] flex items-center justify-center p-4 relative"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100/50 via-transparent to-transparent dark:from-indigo-900/20" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent dark:from-blue-900/20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-neutral-800/50">
          
          <button 
            onClick={() => setActiveTab('home')}
            className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm border border-neutral-100 dark:border-neutral-700 transition-colors mb-6"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Brain size={36} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Acesso do Educador</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium">Faça login para acessar o painel</p>
          </div>

          <form onSubmit={handleTeacherLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-4">E-mail Profissional</label>
              <div className="relative">
                <FileText size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="email" 
                  required
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="seu.email@escola.com.br"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-4">Senha</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="password" 
                  required
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-end px-2">
              <button type="button" className="text-sm font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Esqueceu a senha?
              </button>
            </div>

            <button 
              type="submit"
              disabled={isTeacherLoggingIn}
              className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              {isTeacherLoggingIn ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`min-h-[100dvh] transition-colors relative ${darkMode ? 'dark' : ''} ${(activeTab === 'home' || activeTab === 'student-login' || activeTab === 'teacher-login') ? 'pt-24 pb-20 px-4 md:px-8 bg-[#F4F4F2] dark:bg-neutral-950' : 'bg-edu-background'}`}>
      
      {['home', 'student-login', 'teacher-login'].includes(activeTab) && (
        <div className="absolute top-10 left-6 sm:left-10 z-50">
          <button 
            onClick={() => {
              if (activeTab === 'home') {
                window.location.href = '/';
              } else {
                setActiveTab('home');
              }
            }}
            className="flex items-center gap-2 p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-105 hover:text-sky-600 dark:hover:text-sky-400 transition-all group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm hidden sm:block">
              {activeTab === 'home' ? 'Voltar ao Início' : 'Voltar'}
            </span>
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'student-login' && renderStudentLogin()}
        {activeTab === 'teacher-login' && renderTeacherLogin()}
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
