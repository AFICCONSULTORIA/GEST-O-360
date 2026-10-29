import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, BookOpen, Brain, Star, Award, 
  ArrowRight, ChevronLeft, ChevronRight, PlayCircle, 
  FileText, CheckCircle2, User, Users, BookMarked, MonitorPlay,
  School, Lock, Loader2, Sparkles, Baby, Key, Eye, EyeOff, AlertCircle, Shield,
  Zap
} from 'lucide-react';
import { StudentPortal } from './StudentPortal';
import { TeacherDashboard } from './TeacherDashboard';
import { TeddyLoginCharacter } from './components/TeddyLoginCharacter';
import { loginStudent } from '../../lib/api/education';
import { staffService } from './services/staffService';

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

// Síntese procedural de som elétrico suave e trovão usando Web Audio API nativo
function playPortalLightningSound(isDischarge = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 1. Estalo elétrico de alta voltagem
    const bufferSize = ctx.sampleRate * (isDischarge ? 0.45 : 0.22);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isDischarge ? 2600 : 3200, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(isDischarge ? 0.5 : 0.25, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isDischarge ? 0.4 : 0.18));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start();

    // 2. Ressonância grave (trovão / zumbido de plasma elétrico)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = isDischarge ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isDischarge ? 100 : 75, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + (isDischarge ? 1.1 : 0.4));

    oscGain.gain.setValueAtTime(isDischarge ? 0.35 : 0.15, ctx.currentTime + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isDischarge ? 1.1 : 0.4));

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.04);
    osc.stop(ctx.currentTime + (isDischarge ? 1.15 : 0.45));
  } catch (e) {
    // Falha silenciosa caso o navegador não permita reprodução automática de áudio
  }
}

export const PublicEducacaoPortal = ({ darkMode, currentInstitution }: PublicEducacaoPortalProps) => {
  const [activeTab, setActiveTab] = useState<'home' | 'student' | 'teacher' | 'student-login' | 'teacher-login'>('home');
  
  // Student Login State & Teddy Interactivity
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentLoginError, setStudentLoginError] = useState<string | null>(null);
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false);

  // Estados de foco e reação interativa do Teddy Bear
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [isLoginFail, setIsLoginFail] = useState(false);

  // Teacher Login State (Acesso restrito cadastrado pela coordenação)
  const [isTeacherLoggingIn, setIsTeacherLoggingIn] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherLoginError, setTeacherLoginError] = useState<string | null>(null);

  // Student Dashboard State
  const [studentGrade, setStudentGrade] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentCode || isStudentLoggingIn) return;
    
    setStudentLoginError(null);
    setIsLoginFail(false);
    setIsStudentLoggingIn(true);
    
    const result = await loginStudent(enrollmentCode, studentPassword, currentInstitution?.id);
    if (!result.success || !result.student) {
      setIsStudentLoggingIn(false);
      setIsLoginFail(true);
      setTimeout(() => setIsLoginFail(false), 2200);
      if (result.error === 'INVALID_PASSWORD') {
        setStudentLoginError('Senha incorreta! Verifique os dígitos e tente novamente.');
      } else {
        setStudentLoginError('Matrícula não encontrada! Verifique o código (ex: ART001).');
      }
      return;
    }

    const student = result.student;
    // Armazena a sessão do aluno localmente
    localStorage.setItem('edu_student_id', student.id);
    localStorage.setItem('edu_student_name', student.name);
    localStorage.setItem('edu_student_code', student.enrollment_code);
    
    // Teddy comemora de imediato com os braços no ar!
    setIsLoginSuccess(true);

    // Sem animação de raio posterior: vai direto para o portal após a festa do Teddy!
    setTimeout(() => {
      setIsStudentLoggingIn(false);
      setIsLoginSuccess(false);
      setActiveTab('student');
    }, 1100);
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim()) return;
    
    setTeacherLoginError(null);
    setIsTeacherLoggingIn(true);

    const result = await staffService.authenticateStaff(teacherEmail, teacherPassword);

    setIsTeacherLoggingIn(false);
    if (!result.success || !result.staff) {
      if (result.error === 'INVALID_PASSWORD') {
        setTeacherLoginError('Senha incorreta! Verifique os dados e tente novamente.');
      } else if (result.error === 'INACTIVE') {
        setTeacherLoginError('Este cadastro está inativo. Procure a Secretaria de Educação.');
      } else {
        setTeacherLoginError('Educador não encontrado! Verifique o e-mail ou cadastre-se na aba ao lado.');
      }
      return;
    }

    const staff = result.staff;
    localStorage.setItem('gestao360_teacher_id', staff.id);
    localStorage.setItem('gestao360_teacher_name', staff.name);
    localStorage.setItem('gestao360_teacher_email', staff.email);
    localStorage.setItem('gestao360_teacher_role', staff.role);
    localStorage.setItem('gestao360_teacher_subject', staff.subject);
    localStorage.setItem('gestao360_teacher_school', staff.school);
    if (staff.avatar) {
      localStorage.setItem('gestao360_teacher_photo', staff.avatar);
    }

    window.dispatchEvent(new CustomEvent('teacher-updated', {
      detail: {
        name: staff.name,
        email: staff.email,
        subject: staff.subject,
        role: staff.role,
        school: staff.school,
        photo: staff.avatar || ''
      }
    }));

    setActiveTab('teacher');
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

      <div className="max-w-xl mx-auto px-4 relative z-10 mb-8">
        <a 
          href="/cmei"
          className="group flex items-center justify-between p-5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-[2rem] shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-1 transition-all duration-300 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
              <Baby size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Vagas no CMEI</h3>
              <p className="text-pink-100 text-xs sm:text-sm font-medium">Fila única e critérios de seleção.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-pink-600 transition-colors">
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </a>
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

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-3xl p-6 sm:p-8 rounded-[3rem] shadow-2xl shadow-amber-500/20 border-4 border-amber-200/50 dark:border-amber-500/20 relative">
          
          {/* Magic floating lightning icon */}
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 border-4 border-white dark:border-neutral-900 z-20"
          >
            <Zap size={28} className="text-white fill-amber-100 animate-pulse" />
          </motion.div>

          <button 
            onClick={() => setActiveTab('home')}
            className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 hover:scale-110 shadow-sm border border-amber-200 dark:border-amber-800 transition-all mb-4 group cursor-pointer"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* Teddy Bear Interativo Ampliado (Segue o cursor e tampa os olhos na senha) */}
          <div className="text-center mb-6">
            <TeddyLoginCharacter
              isUsernameFocused={isUsernameFocused}
              usernameLength={enrollmentCode.length}
              isPasswordFocused={isPasswordFocused}
              isPasswordVisible={showStudentPassword}
              isSuccess={isLoginSuccess}
              isFail={isLoginFail}
              className="mb-2"
            />
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
              Portal do Aluno ⚡
            </h2>
            <p className="text-amber-600/90 dark:text-amber-400/90 mt-1.5 font-bold text-sm sm:text-base">
              Digite sua matrícula e prepare sua sequência de estudos! 🚀
            </p>
          </div>

          <form onSubmit={handleStudentLogin} className="space-y-5">
            {studentLoginError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                <span>{studentLoginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest pl-4">
                🎟️ Matrícula ou E-mail do Aluno
              </label>
              <div className="relative group">
                <User size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type="text" 
                  required
                  value={enrollmentCode}
                  onFocus={() => {
                    setIsUsernameFocused(true);
                    setIsPasswordFocused(false);
                  }}
                  onBlur={() => setIsUsernameFocused(false)}
                  onChange={(e) => {
                    setEnrollmentCode(e.target.value);
                    if (studentLoginError) setStudentLoginError(null);
                  }}
                  placeholder="Ex: AFIC001 ou aficconsultoria@gmail.com"
                  className="w-full pl-14 pr-4 py-4 bg-amber-50/50 dark:bg-neutral-950/50 border-4 border-amber-100 dark:border-neutral-800 rounded-3xl focus:border-amber-400 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all font-black text-neutral-900 dark:text-white text-base md:text-lg placeholder:text-neutral-400/70 placeholder:font-bold shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest pl-4">
                🔑 Senha de Acesso
              </label>
              <div className="relative group">
                <Key size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type={showStudentPassword ? "text" : "password"} 
                  required
                  value={studentPassword}
                  onFocus={() => {
                    setIsPasswordFocused(true);
                    setIsUsernameFocused(false);
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
                  onChange={(e) => {
                    setStudentPassword(e.target.value);
                    if (studentLoginError) setStudentLoginError(null);
                  }}
                  placeholder="••••••"
                  className="w-full pl-14 pr-14 py-4 bg-amber-50/50 dark:bg-neutral-950/50 border-4 border-amber-100 dark:border-neutral-800 rounded-3xl focus:border-amber-400 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-all font-black text-neutral-900 dark:text-white text-lg placeholder:text-neutral-400/70 placeholder:font-bold shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 p-1"
                >
                  {showStudentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Atalhos Rápidos de Acesso */}
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-bold text-center text-neutral-400 uppercase tracking-wider">
                Acessos Rápidos Disponíveis
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollmentCode('aficconsultoria@gmail.com');
                    setStudentPassword('gestao123@');
                    if (studentLoginError) setStudentLoginError(null);
                  }}
                  className="py-2.5 px-4 bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-emerald-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 border-2 border-amber-400/70 rounded-2xl text-neutral-900 dark:text-white text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer shadow-sm"
                >
                  <div>
                    <span className="font-black flex items-center gap-1.5 text-amber-700 dark:text-yellow-400">
                      ⚡ Carlos (AFIC Consultoria)
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">aficconsultoria@gmail.com · Senha: gestao123@</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-neutral-950">Entrar ⚡</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollmentCode('ANA001');
                    setStudentPassword('123');
                    if (studentLoginError) setStudentLoginError(null);
                  }}
                  className="py-2 px-3 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 rounded-xl text-sky-800 dark:text-sky-300 text-xs font-bold transition-all text-left flex flex-col cursor-pointer"
                >
                  <span className="font-black">Ana Silva (ANA001)</span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">Turma 4A · 123</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEnrollmentCode('DIE004');
                    setStudentPassword('123');
                    if (studentLoginError) setStudentLoginError(null);
                  }}
                  className="py-2 px-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all text-left flex flex-col cursor-pointer"
                >
                  <span className="font-black">Diego Ramos (DIE004)</span>
                  <span className="text-[10px] text-neutral-500 font-semibold">Turma 5B · 123</span>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isStudentLoggingIn}
              className="w-full mt-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-1 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-3 overflow-hidden relative group cursor-pointer border border-amber-300/40 disabled:opacity-80 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjUpIi8+PC9zdmc+')] opacity-0 group-hover:opacity-30 transition-opacity animate-[spin_10s_linear_infinite]" />
              <Zap size={24} className="relative z-10 text-yellow-200 fill-yellow-300 animate-pulse" />
              <span className="relative z-10">{isStudentLoggingIn ? 'Entrando no Portal... 🚀' : 'Entrar no Portal ⚡'}</span>
              <ArrowRight size={24} className="relative z-10 group-hover:translate-x-2 transition-transform" />
            </button>
          </form>
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

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-neutral-800/50">
          
          <button 
            onClick={() => setActiveTab('home')}
            className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm border border-neutral-100 dark:border-neutral-700 transition-colors mb-4 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
              <Brain size={32} className="text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white">
              Acesso do Educador
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm font-medium">
              Professores e Coordenadores da Rede Municipal
            </p>
          </div>

          {/* Mensagem de Erro */}
          {teacherLoginError && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in duration-200">
              <AlertCircle size={16} className="shrink-0" />
              <span>{teacherLoginError}</span>
            </div>
          )}

          {/* Formulário de Login Direto */}
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-4">E-mail Profissional</label>
              <div className="relative">
                <FileText size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="email" 
                  required
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="seu.email@escola.gov.br"
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal text-sm shadow-inner"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-normal text-sm shadow-inner"
                />
              </div>
            </div>

            {/* Aviso Informativo Obrigatório para o Corpo Docente */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1 flex items-start gap-3">
              <Shield size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-800 dark:text-amber-300">Acesso Restrito ao Corpo Docente</p>
                <p className="text-[11px] leading-relaxed mt-0.5 opacity-90">
                  Acesso exclusivo para professores cadastrados pela Coordenação Pedagógica. Em caso de dúvidas, contate a Secretaria da sua escola.
                </p>
              </div>
            </div>

            {/* Atalhos Rápidos Educador */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setTeacherEmail('aficconsultoria@gmail.com');
                  setTeacherPassword('gestao123@');
                  if (teacherLoginError) setTeacherLoginError(null);
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-emerald-500/15 hover:from-indigo-500/25 hover:to-emerald-500/25 border-2 border-indigo-400/60 rounded-2xl text-neutral-900 dark:text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-sm"
              >
                <div className="text-left">
                  <span className="font-black flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    👑 Prof. Carlos (AFIC Consultoria)
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">aficconsultoria@gmail.com · Senha: gestao123@</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-600 text-white">Entrar 🎓</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTeacherEmail('carlos.eduardo@escola.gov.br');
                  setTeacherPassword('123');
                  setTeacherLoginError(null);
                }}
                className="w-full py-2 px-3 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-400 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Professor Demonstrativo (carlos.eduardo@escola.gov.br · 123)</span>
              </button>
            </div>

            <button 
              type="submit"
              disabled={isTeacherLoggingIn}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {isTeacherLoggingIn ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight size={18} />
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
