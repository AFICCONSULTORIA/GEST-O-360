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
      className="max-w-5xl mx-auto space-y-12"
    >
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={40} />
        </div>
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900 dark:text-white">
          Portal da Educação Municipal
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
          Um ambiente digital voltado para o desenvolvimento contínuo da nossa rede de ensino. 
          Selecione o seu perfil abaixo para acessar os recursos disponíveis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Card */}
        <button 
          onClick={() => setActiveTab('student-login')}
          className="group text-left bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 dark:from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Área do Aluno</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                (1º ao 5º ano do Ensino Fundamental)<br/><br/>
                Faça suas avaliações de forma divertida, teste seus conhecimentos e ajude seus professores a montar as melhores aulas para você!
              </p>
            </div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest mt-4">
              Entrar como Aluno
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>

        {/* Teacher Card */}
        <button 
          onClick={() => setActiveTab('teacher')}
          className="group text-left bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 dark:from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Área do Professor</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                (Formação Continuada e Diagnósticos)<br/><br/>
                Acesse trilhas de capacitação pedagógica, analise as defasagens mapeadas dos alunos e baixe materiais de apoio exclusivos.
              </p>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest mt-4">
              Acessar Formações
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
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
