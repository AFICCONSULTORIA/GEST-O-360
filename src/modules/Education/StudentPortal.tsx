import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchStudentProfile, awardStudent, spendCoins, fetchCoursesWithProgress, completeLesson } from '../../lib/api/education';
import { 
  ArrowLeft,
  Bell,
  Menu,
  X,
  Send,
  Paperclip,
  Sparkles,
  MessageSquare
} from 'lucide-react';

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
  const studentId = 2; // Arthur da Silva (ID 2)
  const [selectedChatTeacher, setSelectedChatTeacher] = useState<any>(null);

  const mockTeachers = [
    { id: 1, name: 'Prof. Carlos (Matemática)', avatar: 'https://i.pravatar.cc/150?img=11', status: 'Online agora' },
    { id: 2, name: 'Profa. Sofia (Português)', avatar: 'https://i.pravatar.cc/150?img=5', status: 'Visto por último às 14:00' }
  ];

  const totalUnreadCount = chatMessages.filter((m: any) => m.sender === 'teacher' && !m.read).length;

  useEffect(() => {
    if (isChatOpen && selectedChatTeacher) {
      const saved = localStorage.getItem('gestao360_students');
      if (saved) {
        let students = JSON.parse(saved);
        let updated = false;
        
        students = students.map((s: any) => {
          if (s.id === studentId) {
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
          const me = students.find((s: any) => s.id === studentId);
          if (me) {
            setChatMessages(me.messages || []);
          }
          window.dispatchEvent(new CustomEvent('students-updated'));
        }
      }
    }
  }, [isChatOpen, chatMessages, selectedChatTeacher]);

  useEffect(() => {
    const loadMessages = () => {
      const saved = localStorage.getItem('gestao360_students');
      if (saved) {
        const students = JSON.parse(saved);
        const me = students.find((s: any) => s.id === studentId);
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
  }, []);

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
        s.id === studentId 
          ? { ...s, messages: [...(s.messages || []), newMessage] }
          : s
      );
      
      localStorage.setItem('gestao360_students', JSON.stringify(students));
      
      const me = students.find((s: any) => s.id === studentId);
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

  const handleStartLesson = (lesson: Lesson) => {
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
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v',
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
      setCourses(coursesData);

      if (previewCourseId) {
        const pCourse = coursesData.find((c: any) => c.id === previewCourseId);
        if (pCourse) {
          setActiveCourse(pCourse);
          setActiveView('trail-map');
        }
      }

      // Carregar Streak e atividade local
      let localActivity = { dates: [] as string[], freezes: 0, highestStreak: 0, avatar: '', inventory: [] as string[] };
      if (studentId) {
        const storedAct = localStorage.getItem(`edu_activity_${studentId}`);
        if (storedAct) {
          localActivity = { ...localActivity, ...JSON.parse(storedAct) };
        }
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      
      const dates = localActivity.dates.map((d: string) => {
        const date = new Date(d);
        date.setHours(0,0,0,0);
        return date.getTime();
      }).sort((a: number,b: number) => b - a);

      let currentStreak = 0;
      let checkDate = new Date(today.getTime());
      let freezesLeft = localActivity.freezes;
      
      for (let i = 0; i < 365; i++) {
        const timeToCheck = checkDate.getTime();
        const hasActivity = dates.includes(timeToCheck);
        
        if (hasActivity) {
          currentStreak++;
        } else {
          if (timeToCheck === today.getTime()) {
            // OK if no activity today yet
          } else if (freezesLeft > 0) {
            freezesLeft--;
          } else {
            break;
          }
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const weeklyActivity = [false, false, false, false, false, false, false];
      const startOfWeek = new Date(today);
      const dayOfWeek = startOfWeek.getDay() || 7; 
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1); 
      
      for (let i=0; i<7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        if (dates.includes(d.getTime())) {
          weeklyActivity[i] = true;
        }
      }

      if (studentId) {
        const data = await fetchStudentProfile(studentId);
        if (data) {
          setStudentData(prev => ({
            ...prev,
            id: data.id, 
            name: data.name,
            level: data.level,
            title: data.title,
            xp: data.xp,
            coins: data.coins,
            streak: currentStreak > 0 ? currentStreak : data.streak,
            highestStreak: Math.max(localActivity.highestStreak, currentStreak),
            streakFreezes: localActivity.freezes,
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
    const storedAct = localStorage.getItem(`edu_activity_${studentId}`);
    let localActivity = storedAct ? JSON.parse(storedAct) : { dates: [] as string[], freezes: 0, highestStreak: 0 };
    
    // Obter formato YYYY-MM-DD com timezone local corrigido
    const todayObj = new Date();
    const tzOffset = todayObj.getTimezoneOffset() * 60000;
    const todayStr = new Date(todayObj.getTime() - tzOffset).toISOString().split('T')[0];
    
    const isDevMode = true; // ATIVADO: Sempre contar para poder testar a animação
    
    if (!localActivity.dates.includes(todayStr) || isDevMode) {
      if (!localActivity.dates.includes(todayStr)) {
        localActivity.dates.push(todayStr);
      }
      
      const dates = localActivity.dates.map((d: string) => {
        const parts = d.split('-');
        const date = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
        date.setHours(0,0,0,0);
        return date.getTime();
      }).sort((a: number,b: number) => b - a);

      const today = new Date();
      today.setHours(0,0,0,0);
      
      let currentStreak = 0;
      let checkDate = new Date(today.getTime());
      let freezesLeft = localActivity.freezes;
      
      for (let i = 0; i < 365; i++) {
        const timeToCheck = checkDate.getTime();
        const hasActivity = dates.includes(timeToCheck);
        
        if (hasActivity) {
          currentStreak++;
        } else {
          if (timeToCheck === today.getTime()) {
             // ok
          } else if (freezesLeft > 0) {
            freezesLeft--;
          } else {
            break;
          }
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }

      localActivity.highestStreak = Math.max(localActivity.highestStreak, currentStreak);
      localActivity.freezes = freezesLeft; // consumo de freeze se necessário
      localStorage.setItem(`edu_activity_${studentId}`, JSON.stringify(localActivity));

      const dayOfWeek = today.getDay() || 7;

      setStudentData(prev => {
        const newWeekly = [...prev.weeklyActivity];
        newWeekly[dayOfWeek - 1] = true;
        
        // No modo Dev, sempre incrementamos para forçar a animação
        const nextStreak = isDevMode ? prev.streak + 1 : currentStreak;

        if (nextStreak > prev.streak) {
          setStreakAnimationData({ prev: prev.streak, current: nextStreak });
          setShowStreakModal(true);
        }

        return {
          ...prev,
          streak: nextStreak,
          highestStreak: Math.max(localActivity.highestStreak, nextStreak),
          streakFreezes: localActivity.freezes,
          weeklyActivity: newWeekly
        };
      });
    }
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
        <div className="flex items-center gap-1.5">
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
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                          <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                        </div>
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
                    <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden border border-white/30">
                      <img src={selectedChatTeacher.avatar} alt={selectedChatTeacher.name} className="w-full h-full object-cover" />
                    </div>
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
