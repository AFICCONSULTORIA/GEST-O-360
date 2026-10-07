import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchStudentProfile, awardStudent, spendCoins, fetchCoursesWithProgress, completeLesson, DEFAULT_DEMO_STUDENTS } from '../../lib/api/education';
import { 
  ArrowLeft,
  Bell,
  Menu,
  X,
  Send,
  Paperclip,
  Sparkles,
  MessageSquare,
  Flame
} from 'lucide-react';

import { 
  getLocalDateString, 
  calculateDuolingoStreak, 
  calculateWeeklyActivity, 
  seedInitialStreakDates 
} from './utils/streakUtils';

import { StudentSidebar } from './components/StudentSidebar';
import { StudentHeader } from './components/StudentHeader';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentCourses } from './components/StudentCourses';
import { StudentTrailMap } from './components/StudentTrailMap';
import { StudentLessonPlayer } from './components/StudentLessonPlayer';
import { StudentQuizPlayer } from './components/StudentQuizPlayer';
import { StudentAssessments } from './components/StudentAssessments';
import { StudentAchievements } from './components/StudentAchievements';
import { StudentSettings } from './components/StudentSettings';
import { StudentStore } from './components/StudentStore';
import { StreakAnimationOverlay } from './components/StreakAnimationOverlay';
import { EducationAvatar } from './components/EducationAvatar';

// --- TYPES ---
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Lesson {
  id: string;
  type: 'video' | 'text' | 'quiz';
  title: string;
  duration?: string;
  xp: number;
  coins: number;
  contentUrl?: string; // para video
  contentBody?: string; // para texto
  questions?: QuizQuestion[]; // para quiz
  isCompleted?: boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  color: 'emerald' | 'sky' | 'rose' | 'amber' | 'purple';
  icon: string;
  modules: Module[];
}

export const StudentPortal = ({ onBack, previewCourseId }: { onBack: () => void, previewCourseId?: string }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'courses' | 'assessments' | 'achievements' | 'settings' | 'support' | 'trail-map' | 'lesson-player' | 'quiz-player'>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // -- Chat State --
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [studentId, setStudentId] = useState<string>(() => {
    return localStorage.getItem('edu_student_id') || '2';
  });
  const [selectedChatTeacher, setSelectedChatTeacher] = useState<any>(null);

  const teacherPhoto = localStorage.getItem('gestao360_teacher_photo') || '';
  const mockTeachers = [
    { id: 1, name: 'Prof. Carlos (Matemática)', avatar: teacherPhoto, status: 'Online agora' },
    { id: 2, name: 'Profa. Sofia (Português)', avatar: '', status: 'Visto por último às 14:00' }
  ];

  const totalUnreadCount = chatMessages.filter((m: any) => m.sender === 'teacher' && !m.read).length;

  useEffect(() => {
    if (isChatOpen && selectedChatTeacher) {
      const saved = localStorage.getItem('gestao360_students');
      if (saved) {
        let students = JSON.parse(saved);
        let updated = false;
        
        students = students.map((s: any) => {
          if (String(s.id) === String(studentId) || s.enrollmentId === studentId) {
            let sUpdated = false;
            const newMessages = (s.messages || []).map((m: any) => {
              if (m.sender === 'teacher' && !m.read && m.teacherId === selectedChatTeacher.id) {
                sUpdated = true;
                return { ...m, read: true };
              }
              return m;
            });
            if (sUpdated) {
              updated = true;
              return { ...s, messages: newMessages };
            }
          }
          return s;
        });

        if (updated) {
          localStorage.setItem('gestao360_students', JSON.stringify(students));
          const me = students.find((s: any) => String(s.id) === String(studentId) || s.enrollmentId === studentId);
          if (me) {
            setChatMessages(me.messages || []);
          }
          window.dispatchEvent(new CustomEvent('students-updated'));
        }
      }
    }
  }, [isChatOpen, chatMessages, selectedChatTeacher, studentId]);

  useEffect(() => {
    const loadMessages = () => {
      const saved = localStorage.getItem('gestao360_students');
      if (saved) {
        const students = JSON.parse(saved);
        const me = students.find((s: any) => String(s.id) === String(studentId) || s.enrollmentId === studentId);
        if (me) {
          setChatMessages(me.messages || []);
        }
      }
    };
    loadMessages();

    const handleStudentsUpdated = () => {
      loadMessages();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gestao360_students') {
        handleStudentsUpdated();
      }
    };

    window.addEventListener('students-updated', handleStudentsUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('students-updated', handleStudentsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [studentId]);

  const handleSendChatMessage = () => {
    if (!newMessageText.trim() || !selectedChatTeacher) return;

    const newMessage = {
      sender: 'student',
      teacherId: selectedChatTeacher.id,
      text: newMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const saved = localStorage.getItem('gestao360_students');
    if (saved) {
      let students = JSON.parse(saved);
      students = students.map((s: any) => 
        (String(s.id) === String(studentId) || s.enrollmentId === studentId)
          ? { ...s, messages: [...(s.messages || []), newMessage] }
          : s
      );
      
      localStorage.setItem('gestao360_students', JSON.stringify(students));
      
      const me = students.find((s: any) => String(s.id) === String(studentId) || s.enrollmentId === studentId);
      if (me) {
        setChatMessages(me.messages || []);
      }

      window.dispatchEvent(new CustomEvent('students-updated'));
    }

    setNewMessageText('');
  };
  
  // -- Cursos e Aulas --
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  
  // -- Estado do Quiz --
  const [quizState, setQuizState] = useState({
    currentQuestionIndex: 0,
    selectedOption: null as number | null,
    isCorrect: null as boolean | null,
    score: 0,
    isFinished: false
  });

  const handleAccessCourse = (course: Course) => {
    setActiveCourse(course);
    setActiveView('trail-map');
  };

  const isLessonUnlocked = (lesson: Lesson, course?: Course | null): boolean => {
    if (!course) return true;
    const modIndex = course.modules.findIndex(m => m.lessons.some(l => l.id === lesson.id));
    if (modIndex === -1) return true;
    
    // Todos os módulos anteriores devem estar 100% concluídos
    const prevModulesCompleted = course.modules.slice(0, modIndex).every(
      m => m.lessons.length > 0 && m.lessons.every(l => Boolean(l.isCompleted))
    );
    if (!prevModulesCompleted) return false;

    // Dentro do módulo atual, aulas anteriores devem estar concluídas
    const mod = course.modules[modIndex];
    const lessIndex = mod.lessons.findIndex(l => l.id === lesson.id);
    if (lessIndex === -1) return true;
    if (lesson.isCompleted) return true; // Já concluída, pode revisar
    if (lessIndex === 0) return true; // Primeira aula do módulo liberado
    return Boolean(mod.lessons[lessIndex - 1].isCompleted);
  };

  const handleStartLesson = (lesson: Lesson) => {
    // Proteção: impede iniciar aula de módulo bloqueado ou aula sequencial bloqueada
    if (activeCourse && !isLessonUnlocked(lesson, activeCourse)) {
      return;
    }

    setActiveLesson(lesson);
    if (lesson.type === 'quiz') {
      setQuizState({ currentQuestionIndex: 0, selectedOption: null, isCorrect: null, score: 0, isFinished: false });
      setActiveView('quiz-player');
    } else {
      setActiveView('lesson-player');
    }
  };

  const finishLesson = async () => {
    if (activeLesson) {
      handleAward(activeLesson.xp, activeLesson.coins);
      await completeCurrentLesson(quizState.isFinished ? quizState.score : 0);
    }
    
    if (!activeCourse) {
      setActiveView('assessments');
    } else {
      setActiveView('trail-map');
    }
    setActiveLesson(null);
  };

  // Student Global State
  const [studentData, setStudentData] = useState({
    id: '',
    name: 'Arthur da Silva',
    level: 7,
    title: 'Explorador Nível 7 ⚡',
    xp: 1850,
    nextLevelXp: 2500,
    streak: 12,
    coins: 450,
    highestStreak: 12,
    streakFreezes: 0,
    weeklyActivity: [false, false, false, false, false, false, false],
    hasPracticedToday: false,
    avatar: '',
    inventory: [] as string[]
  });

  // Animação de Sequência (Streak)
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakAnimationData, setStreakAnimationData] = useState({ prev: 0, current: 0 });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const studentId = localStorage.getItem('edu_student_id');
      
      const coursesData = await fetchCoursesWithProgress(studentId || undefined);

      // Identificar turma do estudante para controle de acesso às trilhas
      let studentClass = '';
      const savedStudents = localStorage.getItem('gestao360_students');
      if (savedStudents && studentId) {
        try {
          const list = JSON.parse(savedStudents);
          const currentStudent = list.find((s: any) => String(s.id) === String(studentId) || s.enrollmentId === studentId);
          if (currentStudent) {
            const savedClasses = localStorage.getItem('gestao360_classes');
            if (savedClasses && currentStudent.classId) {
              const cList = JSON.parse(savedClasses);
              const foundC = cList.find((c: any) => c.id === currentStudent.classId);
              if (foundC) studentClass = foundC.name;
            }
            if (!studentClass && currentStudent.studentClass) {
              studentClass = currentStudent.studentClass;
            }
          }
        } catch (e) {}
      }

      // Filtra apenas as trilhas destinadas à turma do aluno (ou abertas para todas)
      const allowedCourses = (!previewCourseId && studentClass)
        ? coursesData.filter((c: any) => !c.target_classes || c.target_classes.length === 0 || c.target_classes.includes(studentClass))
        : coursesData;

      setCourses(allowedCourses);

      if (previewCourseId) {
        const pCourse = coursesData.find((c: any) => c.id === previewCourseId);
        if (pCourse) {
          setActiveCourse(pCourse);
          setActiveView('trail-map');
        }
      }

      // Carregar Streak e atividade local estilo Duolingo
      let localActivity = { dates: [] as string[], freezes: 0, highestStreak: 0, avatar: '', inventory: [] as string[] };
      if (studentId) {
        const storedAct = localStorage.getItem(`edu_activity_${studentId}`);
        if (storedAct) {
          try {
            localActivity = { ...localActivity, ...JSON.parse(storedAct) };
          } catch (e) {}
        }
      }

      if (studentId) {
        let profile = await fetchStudentProfile(studentId);
        
        // Fallback local caso não encontre no Supabase
        if (!profile) {
          const savedStudents = localStorage.getItem('gestao360_students');
          if (savedStudents) {
            try {
              const parsed = JSON.parse(savedStudents);
              const found = parsed.find((s: any) => String(s.id) === String(studentId) || s.enrollmentId === studentId);
              if (found) {
                profile = {
                  id: String(found.id),
                  enrollment_code: found.enrollmentId || found.enrollment_code || 'ART001',
                  name: found.name,
                  level: found.level || 1,
                  title: found.title || 'Explorador Aprendiz',
                  xp: found.xp || 0,
                  coins: found.coins || 0,
                  streak: found.streak || 0
                };
              }
            } catch (e) {
              console.warn('Erro ao ler gestao360_students:', e);
            }
          }
        }

        // Fallback final nos alunos de demonstração
        if (!profile) {
          const demo = DEFAULT_DEMO_STUDENTS.find(s => s.id === String(studentId) || s.enrollment_code === studentId);
          if (demo) {
            profile = {
              id: demo.id,
              enrollment_code: demo.enrollment_code,
              name: demo.name,
              level: demo.level,
              title: demo.title,
              xp: demo.xp,
              coins: demo.coins,
              streak: demo.streak
            };
          }
        }

        // Se o histórico de datas estiver vazio mas o aluno tiver um streak pré-definido,
        // inicializa o histórico com os dias anteriores terminando em ontem (para que hoje comece com fogo apagado).
        const initialStreak = profile?.streak ?? 12;
        if ((!localActivity.dates || localActivity.dates.length === 0) && initialStreak > 0) {
          localActivity.dates = seedInitialStreakDates(initialStreak);
          localActivity.highestStreak = Math.max(localActivity.highestStreak || 0, initialStreak);
          localStorage.setItem(`edu_activity_${studentId}`, JSON.stringify(localActivity));
        }

        // Calcular estado exato da ofensiva (Duolingo)
        const streakData = calculateDuolingoStreak(localActivity.dates, localActivity.freezes);
        const weeklyActivity = calculateWeeklyActivity(localActivity.dates);

        if (profile) {
          setStudentData(prev => ({
            ...prev,
            id: profile.id, 
            name: profile.name,
            level: profile.level,
            title: profile.title,
            xp: profile.xp,
            coins: profile.coins,
            streak: streakData.currentStreak,
            hasPracticedToday: streakData.hasPracticedToday,
            highestStreak: Math.max(localActivity.highestStreak || 0, streakData.currentStreak),
            streakFreezes: streakData.freezesRemaining,
            weeklyActivity,
            avatar: localActivity.avatar || prev.avatar,
            inventory: localActivity.inventory || prev.inventory
          }));
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, [previewCourseId]);

  // Salvar avatar e inventário sempre que mudarem
  useEffect(() => {
    if (studentData.id) {
      const storedAct = localStorage.getItem(`edu_activity_${studentData.id}`);
      let localActivity = { dates: [] as string[], freezes: 0, highestStreak: 0, avatar: '', inventory: [] as string[] };
      if (storedAct) {
        localActivity = { ...localActivity, ...JSON.parse(storedAct) };
      }
      localActivity.avatar = studentData.avatar;
      localActivity.inventory = studentData.inventory;
      localActivity.freezes = studentData.streakFreezes;
      localStorage.setItem(`edu_activity_${studentData.id}`, JSON.stringify(localActivity));
    }
  }, [studentData.avatar, studentData.inventory, studentData.streakFreezes, studentData.id]);

  const registerStudentActivity = (studentId: string) => {
    const todayStr = getLocalDateString();
    const storedAct = localStorage.getItem(`edu_activity_${studentId}`);
    let localActivity = storedAct ? JSON.parse(storedAct) : { dates: [] as string[], freezes: 0, highestStreak: 0 };
    if (!Array.isArray(localActivity.dates)) {
      localActivity.dates = [];
    }

    // Regra Duolingo: Apenas na PRIMEIRA atividade daquele dia!
    const alreadyPracticedToday = localActivity.dates.includes(todayStr);

    if (alreadyPracticedToday) {
      // Se já fez atividade hoje, mantém a chama acesa e não altera o streak nem exibe modal de streak
      setStudentData(prev => ({
        ...prev,
        hasPracticedToday: true
      }));
      return;
    }

    // Primeira atividade de hoje:
    // 1. Calcula a sequência que existia até ontem
    const prevCalculation = calculateDuolingoStreak(localActivity.dates, localActivity.freezes);
    const prevStreak = prevCalculation.currentStreak;

    // 2. Registra o dia de hoje
    localActivity.dates.push(todayStr);

    // 3. Recalcula a nova sequência agora incluindo hoje
    const newCalculation = calculateDuolingoStreak(localActivity.dates, localActivity.freezes);
    const newStreak = newCalculation.currentStreak;

    localActivity.highestStreak = Math.max(localActivity.highestStreak || 0, newStreak);
    localActivity.freezes = newCalculation.freezesRemaining;
    localStorage.setItem(`edu_activity_${studentId}`, JSON.stringify(localActivity));

    // Sincroniza no gestao360_students (para refletir no painel do professor)
    const savedStudents = localStorage.getItem('gestao360_students');
    if (savedStudents) {
      try {
        const parsed = JSON.parse(savedStudents);
        const updated = parsed.map((s: any) => {
          if (String(s.id) === String(studentId) || s.enrollmentId === studentId) {
            return { ...s, streak: newStreak };
          }
          return s;
        });
        localStorage.setItem('gestao360_students', JSON.stringify(updated));
      } catch (e) {}
    }

    const newWeekly = calculateWeeklyActivity(localActivity.dates);

    // 4. Dispara a animação e o modal comemorativo da ofensiva apenas na 1ª atividade do dia
    setStreakAnimationData({ prev: prevStreak, current: newStreak });
    setShowStreakModal(true);

    // 5. Atualiza o estado global: Fogo ACENDE! 🔥
    setStudentData(prev => ({
      ...prev,
      streak: newStreak,
      hasPracticedToday: true,
      highestStreak: Math.max(localActivity.highestStreak || 0, newStreak),
      streakFreezes: localActivity.freezes,
      weeklyActivity: newWeekly
    }));
  };

  const handleAward = async (xp: number, coins: number) => {
    setStudentData(prev => ({...prev, xp: prev.xp + xp, coins: prev.coins + coins}));
    if (studentData.id) {
      registerStudentActivity(studentData.id);
      await awardStudent(studentData.id, xp, coins);
    }
  };

  const completeCurrentLesson = async (score: number = 0) => {
    if (!activeLesson) return;
    if (studentData.id) {
      await completeLesson(studentData.id, activeLesson.id, score);
    }
    
    // Atualizar no estado local (cursos gerais)
    setCourses(prev => prev.map(c => ({
      ...c,
      modules: c.modules.map(m => ({
        ...m,
        lessons: m.lessons.map(l => l.id === activeLesson.id ? { ...l, isCompleted: true } : l)
      }))
    })));

    // Atualizar no estado do curso ativo (para refletir na trilha imediatamente)
    setActiveCourse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => l.id === activeLesson.id ? { ...l, isCompleted: true } : l)
        }))
      };
    });
  };

  const xpPercentage = Math.min(100, Math.round((studentData.xp / studentData.nextLevelXp) * 100));

  return (
    <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col md:flex-row selection:bg-emerald-500/20">
      
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-emerald-600 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shadow-sm">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-black text-base bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-sky-600">
              Gestão 360 Educação
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Streak Pill estilo Duolingo (Aceso vs Apagado) */}
          <div 
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border transition-all ${
              studentData.hasPracticedToday
                ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400'
                : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
            }`}
            title={studentData.hasPracticedToday ? "Ofensiva ativa hoje! Fogo aceso 🔥" : "Faça uma lição hoje para acender o fogo! 🕯️"}
          >
            <Flame size={13} fill={studentData.hasPracticedToday ? "currentColor" : "none"} className={studentData.hasPracticedToday ? "text-orange-500 animate-pulse" : "text-neutral-400 opacity-60"} />
            <span>{studentData.streak}</span>
            {studentData.hasPracticedToday && <span>🔥</span>}
          </div>

          <button className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-emerald-600 transition-all relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse"></span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <StudentSidebar
        onBack={onBack}
        previewCourseId={previewCourseId}
        activeView={activeView}
        setActiveView={setActiveView}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        studentData={studentData}
        xpPercentage={xpPercentage}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-x-hidden">
        
        {/* Desktop Header */}
        <StudentHeader
          activeView={activeView}
          studentData={studentData}
          setActiveView={setActiveView}
        />

        {/* Dynamic Views */}
        {activeView === 'dashboard' && (
          <StudentDashboard
            xpPercentage={xpPercentage}
            courses={courses}
            setActiveView={setActiveView}
            handleAccessCourse={handleAccessCourse}
            handleStartLesson={handleStartLesson}
            studentData={studentData}
          />
        )}

        {activeView === 'courses' && (
          <StudentCourses
            courses={courses}
            isLoading={isLoading}
            handleAccessCourse={handleAccessCourse}
          />
        )}

        {activeView === 'trail-map' && activeCourse && (
          <StudentTrailMap
            activeCourse={activeCourse}
            setActiveView={setActiveView}
            handleStartLesson={handleStartLesson}
          />
        )}

        {activeView === 'lesson-player' && activeLesson && (
          <StudentLessonPlayer
            activeCourse={activeCourse}
            activeLesson={activeLesson}
            setActiveView={setActiveView}
            setActiveLesson={setActiveLesson}
            finishLesson={finishLesson}
          />
        )}

        {activeView === 'quiz-player' && activeLesson && (
          <StudentQuizPlayer
            activeCourse={activeCourse}
            activeLesson={activeLesson}
            setActiveView={setActiveView}
            setActiveLesson={setActiveLesson}
            quizState={quizState}
            setQuizState={setQuizState}
            finishLesson={finishLesson}
          />
        )}

        {activeView === 'assessments' && (
          <StudentAssessments
            handleAward={handleAward}
            handleStartLesson={handleStartLesson}
            setActiveView={setActiveView}
          />
        )}

        {activeView === 'achievements' && (
          <StudentAchievements
            studentData={studentData}
          />
        )}

        {activeView === 'settings' && (
          <StudentSettings
            studentData={studentData}
            setStudentData={setStudentData}
          />
        )}

        {activeView === 'store' && (
          <StudentStore 
            studentData={studentData}
            setStudentData={setStudentData}
          />
        )}

        {/* Modal de Animação de Streak (Sempre visível após uma atividade) */}
        {showStreakModal && (
          <StreakAnimationOverlay 
            prevStreak={streakAnimationData.prev} 
            currentStreak={streakAnimationData.current} 
            onClose={() => setShowStreakModal(false)} 
          />
        )}
      </main>

      {/* Floating Chat Button & Window */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[150] flex flex-col items-end gap-4 print:hidden pointer-events-none">
        
        {/* Chat Window */}
        <div className={`w-[calc(100vw-2rem)] md:w-96 h-[500px] max-h-[80vh] bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right pointer-events-auto ${isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}>
          
          {!selectedChatTeacher ? (
            /* Lista de Professores */
            <>
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shrink-0">
                <h3 className="font-black text-xl mb-1">Meus Professores</h3>
                <p className="text-emerald-100 text-sm font-medium">Com quem você quer falar?</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white dark:bg-neutral-900">
                {mockTeachers.map(teacher => {
                  const teacherMessages = chatMessages.filter((m: any) => m.teacherId === teacher.id || m.teacherId === undefined);
                  const lastMsg = teacherMessages.length > 0 
                    ? teacherMessages[teacherMessages.length - 1] 
                    : null;
                  const unread = teacherMessages.filter((m: any) => m.sender === 'teacher' && !m.read).length;
                    
                  return (
                    <div 
                      key={teacher.id}
                      onClick={() => setSelectedChatTeacher(teacher)}
                      className="flex items-center gap-4 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <EducationAvatar 
                          src={teacher.avatar} 
                          name={teacher.name} 
                          role="teacher" 
                          size="md" 
                        />
                        {teacher.id === 1 && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-neutral-900 dark:text-white truncate">{teacher.name}</h4>
                          {lastMsg && <span className="text-[10px] font-bold text-neutral-400 shrink-0 ml-2">{lastMsg.time}</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                            {lastMsg ? (lastMsg.sender === 'student' ? `Você: ${lastMsg.text}` : lastMsg.text) : 'Nenhuma mensagem'}
                          </p>
                          {unread > 0 && (
                            <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 ml-2 shadow-sm">
                              {unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Chat Individual com o Professor */
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center gap-3 text-white shrink-0 shadow-sm relative z-10">
                <button 
                  onClick={() => setSelectedChatTeacher(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <EducationAvatar 
                      src={selectedChatTeacher.avatar} 
                      name={selectedChatTeacher.name} 
                      role="teacher" 
                      size="sm" 
                    />
                    {selectedChatTeacher.id === 1 && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-300 rounded-full border-2 border-emerald-600"></div>
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-sm tracking-wide truncate">{selectedChatTeacher.name}</h4>
                    <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold truncate">{selectedChatTeacher.status}</p>
                  </div>
                </div>
              </div>
              
              {/* Message History */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-neutral-50/50 dark:bg-neutral-950/50 flex flex-col">
                <div className="text-center text-xs font-bold text-neutral-400 mb-2">Hoje</div>
                
                {chatMessages.filter((m: any) => m.teacherId === selectedChatTeacher.id || m.teacherId === undefined).length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-2">
                    <MessageSquare size={32} className="opacity-20" />
                    <p className="text-sm font-medium">Nenhuma mensagem com {selectedChatTeacher.name.split(' ')[0]}.</p>
                  </div>
                )}
                
                {chatMessages.filter((m: any) => m.teacherId === selectedChatTeacher.id || m.teacherId === undefined).map((msg: any, idx: number) => (
                  <div key={idx} className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3.5 ${msg.sender === 'student' ? 'bg-emerald-600 text-white rounded-tr-sm shadow-emerald-500/20 shadow-md' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-tl-sm shadow-sm'}`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <span className={`text-[10px] font-bold mt-1.5 block text-right ${msg.sender === 'student' ? 'text-emerald-200' : 'text-neutral-400'}`}>{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-center gap-2 shrink-0">
                <button className="p-2.5 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-colors shrink-0">
                  <Paperclip size={18} />
                </button>
                <input 
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-none outline-none focus:ring-0 rounded-full px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400" 
                  placeholder="Digite sua mensagem..." 
                  type="text" 
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatMessage();
                  }}
                />
                <button 
                  onClick={handleSendChatMessage}
                  disabled={!newMessageText.trim()}
                  className="bg-emerald-600 text-white p-2.5 rounded-full hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/20 disabled:hover:scale-100 shrink-0"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Floating Action Button */}
        <div className="relative">
          <button 
            className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto" 
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (isChatOpen) setSelectedChatTeacher(null);
            }}
          >
            {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          </button>
          
          {totalUnreadCount > 0 && !isChatOpen && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm animate-bounce">
              {totalUnreadCount}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
