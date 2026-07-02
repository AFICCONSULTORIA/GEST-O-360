import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Target,
  Bell,
  Search,
  MessageSquare,
  Settings,
  HelpCircle,
  Menu,
  X,
  TrendingUp,
  AlertTriangle,
  Users,
  PlusCircle,
  FileCheck,
  Send,
  Paperclip,
  MoreVertical,
  ChevronRight,
  GraduationCap,
  PlayCircle,
  Star,
  Download,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Video,
  Play,
  UserCog,
  ShieldCheck,
  Mail,
  Calendar as CalendarIcon,
  Key,
  ToggleRight,
  ToggleLeft,
  Compass,
  Map,
  Flame,
  Zap,
  Coins,
  Edit2,
  Trash2,
  Plus,
  LifeBuoy,
  MessageCircle,
  Phone,
  ChevronDown,
  ExternalLink,
  Book
} from 'lucide-react';
import { TeacherEducationManager } from './TeacherEducationManager';
import { TeacherStudentManager } from './TeacherStudentManager';


export const TeacherDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'training' | 'intervention' | 'settings' | 'support' | 'student-portal-mgmt' | 'student-mgmt'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Global Chat State ---
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [selectedChatStudent, setSelectedChatStudent] = useState<any>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [chatStudents, setChatStudents] = useState<any[]>([]);

  const LOGGED_IN_TEACHER_ID = 1; // Simulando Prof. Carlos

  const totalUnreadCount = chatStudents.reduce((acc, student) => {
    const unread = (student.messages || []).filter((m: any) => m.sender === 'student' && !m.read && m.teacherId === LOGGED_IN_TEACHER_ID).length;
    return acc + unread;
  }, 0);

  useEffect(() => {
    if (isGlobalChatOpen && selectedChatStudent) {
      const saved = localStorage.getItem('gestao360_students');
      if (saved) {
        let currentStudents = JSON.parse(saved);
        let updated = false;
        
        currentStudents = currentStudents.map((s: any) => {
          if (s.id === selectedChatStudent.id) {
            let sUpdated = false;
            const newMessages = (s.messages || []).map((m: any) => {
              if (m.sender === 'student' && !m.read && m.teacherId === LOGGED_IN_TEACHER_ID) {
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
          localStorage.setItem('gestao360_students', JSON.stringify(currentStudents));
          setChatStudents(currentStudents);
          window.dispatchEvent(new CustomEvent('students-updated'));
        }
      }
    }
  }, [isGlobalChatOpen, selectedChatStudent, chatStudents]);

  useEffect(() => {
    const loadStudents = () => {
      const saved = localStorage.getItem('gestao360_students');
      if (saved) {
        setChatStudents(JSON.parse(saved));
      }
    };
    loadStudents();

    const handleOpenChat = (e: any) => {
      setIsGlobalChatOpen(true);
      const saved = localStorage.getItem('gestao360_students');
      let currentStudents = [];
      if (saved) {
        currentStudents = JSON.parse(saved);
        setChatStudents(currentStudents);
      }
      
      const studentId = e.detail;
      const student = currentStudents.find((s: any) => s.id === studentId);
      if (student) {
        setSelectedChatStudent(student);
      }
    };

    const handleStudentsUpdated = () => {
      loadStudents();
      setSelectedChatStudent((current: any) => {
        if (!current) return current;
        const saved = localStorage.getItem('gestao360_students');
        if (saved) {
          const parsed = JSON.parse(saved);
          const updated = parsed.find((s: any) => s.id === current.id);
          return updated || current;
        }
        return current;
      });
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gestao360_students') {
        handleStudentsUpdated();
      }
    };

    window.addEventListener('open-teacher-chat', handleOpenChat);
    window.addEventListener('students-updated', handleStudentsUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('open-teacher-chat', handleOpenChat);
      window.removeEventListener('students-updated', handleStudentsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleSendChatMessage = () => {
    if (!newMessageText.trim() || !selectedChatStudent) return;

    const newMessage = {
      sender: 'teacher',
      teacherId: LOGGED_IN_TEACHER_ID,
      text: newMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const saved = localStorage.getItem('gestao360_students');
    if (saved) {
      let currentStudents = JSON.parse(saved);
      currentStudents = currentStudents.map((s: any) => 
        s.id === selectedChatStudent.id 
          ? { ...s, messages: [...(s.messages || []), newMessage] }
          : s
      );
      
      localStorage.setItem('gestao360_students', JSON.stringify(currentStudents));
      setChatStudents(currentStudents);
      
      setSelectedChatStudent((current: any) => ({
        ...current,
        messages: [...(current.messages || []), newMessage]
      }));

      window.dispatchEvent(new CustomEvent('students-updated'));
    }

    setNewMessageText('');
  };

  // --- Gestão de Alunos State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [contentTab, setContentTab] = useState<'ativos' | 'atividade' | 'trilha' | 'material'>('ativos');
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);

  const [students] = useState([
    { id: 1, name: 'Arthur da Silva', level: 7, xp: 1850, coins: 450, streak: 12, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v', status: 'Excelente' },
    { id: 2, name: 'Lucas Oliveira', level: 5, xp: 1200, coins: 200, streak: 4, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLv-9O5hBlmU5_LkR_8IxwSqLjfUT9l1f-b2DqKQdrRe1NmcBQQhxXv1x2Zyhk1oK7XYmwbFBs8sK8-sJY38OictlRSFj1rm3eG6zc9i9cqHsKlLPQ3_qDIGfUuPYVcXnKhWtMfDOlt1HKGQl28oO-O53I9ErFFsSECp_vberifEfzMYXQ9h2y0WuZXthEq0RDCGn7zjLbr2nbQIFvkPlcidyjXLZVvk_nJK71rD4CCDkYT2brei8pIy8MflsJr6qBXpEi0-eN-zKp', status: 'Atenção' },
    { id: 3, name: 'Mariana Santos', level: 8, xp: 2100, coins: 650, streak: 21, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnnyLKW0EKdD-3a9_Ki-2ePeEPYn_-aHYBmwPrJ-0YC5mwsgc9JGY5ABaWdwKGRtqZ7nRtUY7Ga081pqIaC55W0zFGzKk3cIzq-r2oSkoJKOe7fGOnhkbkOKR3yizGPn-9oysGSfAGQ0jJ_N0ZTzRFNJuyX7iR92YyK_FFwN7xaGwh7gEI2soTtGtCrznm5Q87EnFDayT0mKpSii6802d-mztafH4O1irxwjjHfakV6o3zQKn_SbBEz-v2C10MjzY7wRLz_GbaAe0Z', status: 'Excelente' },
    { id: 4, name: 'Enzo Costa', level: 3, xp: 500, coins: 50, streak: 1, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDef6yKWmbZWbYLRyfSOhIQlmeg6V4JneJiJocAYmvHIIIfVDaNVv_xCDlVDB8Grfi6H3yYdPIkQ8eXY0PdHsgQ8sYnzzgY7LMXAyvN-ElPWrzIoUcwKPnHoRk--fMrPmQFx9cfrpZGmzwZMEzVmAigs3HDTeAvaJYBfw0yvfFHqCPPjFqHJINsJ3EuD7cESzeRjgx8a97jb5KeAIA-cbD_vY2UKV7AIHDUD3NDb_jE7hT4saIVqMyG9fw6V6ikuizwuAUe3E7bOWjL', status: 'Em Risco' },
  ]);

  const [activeContents, setActiveContents] = useState([
    { id: 1, type: 'atividade', title: 'Quiz de Frações', subject: 'Matemática', stats: '18/28 entregas', icon: Target, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { id: 2, type: 'trilha', title: 'Os Mistérios do Sistema Solar', subject: 'Ciências', stats: '65% conclusão média', icon: Compass, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { id: 3, type: 'material', title: 'Mapa Mundi Interativo', subject: 'Geografia', stats: '24 acessos hoje', icon: Map, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ]);

  return (
    <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col md:flex-row selection:bg-indigo-500/20">
      
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-neutral-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-600">
            Painel do Professor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-neutral-600 hover:text-indigo-600 transition-colors">
            <Bell size={20} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-neutral-600 transition-colors">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (Navigation Rail + Drawer) */}
      <aside className={`fixed md:sticky self-start top-0 left-0 h-[100dvh] z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border-r border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-300 flex flex-col ${isMobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'}`}>
        {/* Sidebar Header */}
        {/* Sidebar Header: Perfil do Professor */}
        <div className="p-6 flex flex-col items-center justify-center border-b border-neutral-200/50 dark:border-neutral-800/50 relative">
          <button className="md:hidden absolute top-4 right-4 p-2 text-neutral-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
          
          <div 
            onClick={() => setActiveView('profile')}
            className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-sky-500 cursor-pointer hover:scale-105 transition-transform shadow-md mb-3"
          >
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-950">
              <img alt="Perfil do professor" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAKGNQ1RqllZrdQWLVoyEd3sUlx6DjnRN7R4W5HYuDzn1cKbA6zH8U3l8BC9orZfHjP6uWrz_jfxoz03tJqU2tDGM4Y8kvi-ghLELJN0mRDQecwTL3Gkda0oI8w9yNGw2UAPT5nGJZcOzHapTXE5R7Zb9oCSrY6-9tUR-HPD85-Uv3-zZqomRuqIJiYX9BQsYEmni2gg-frSkXAmHT6hGXlVbrvagfePQfnHGH4qP7ftUjkbTGjBXA-Scp-Z6LuHwupqJoYG7iRgjM" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <h2 className="font-black text-lg text-neutral-900 dark:text-white text-center">Prof. Carlos</h2>
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Matemática</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveView('student-portal-mgmt')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'student-portal-mgmt' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <Compass size={20} className={activeView !== 'student-portal-mgmt' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Gestão de Trilhas EaD</span>
          </button>
          <button 
            onClick={() => setActiveView('student-mgmt')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'student-mgmt' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <Users size={20} className={activeView !== 'student-mgmt' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Gestão de Alunos</span>
          </button>
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <LayoutDashboard size={20} className={activeView !== 'dashboard' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Painel do Professor</span>
          </button>
          <button 
            onClick={() => setActiveView('training')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'training' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <BookOpen size={20} className={activeView !== 'training' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Centro de Treinamento</span>
          </button>
          <button 
            onClick={() => setActiveView('intervention')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'intervention' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <CalendarDays size={20} className={activeView !== 'intervention' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Plano de Intervenção</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-2">
          <button 
            onClick={() => setActiveView('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'support' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <HelpCircle size={20} className={activeView !== 'support' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Suporte</span>
          </button>
          
          <div className="pt-2">
            <button 
              onClick={onBack}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all group"
            >
              <X size={20} className="group-hover:scale-110 transition-transform" />
              <span>Sair / Logoff</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-x-hidden">
        
        {/* Dashboard Content */}
        {activeView === 'student-portal-mgmt' && (
          <TeacherEducationManager />
        )}

        {activeView === 'student-mgmt' && (
          <TeacherStudentManager />
        )}

        {activeView === 'profile' && (
          <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full pb-24 md:pb-8 flex flex-col items-center">
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-10 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg w-full flex flex-col items-center gap-6 mt-10">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-sky-500 shadow-xl">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-neutral-950">
                  <img alt="Perfil do professor" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAKGNQ1RqllZrdQWLVoyEd3sUlx6DjnRN7R4W5HYuDzn1cKbA6zH8U3l8BC9orZfHjP6uWrz_jfxoz03tJqU2tDGM4Y8kvi-ghLELJN0mRDQecwTL3Gkda0oI8w9yNGw2UAPT5nGJZcOzHapTXE5R7Zb9oCSrY6-9tUR-HPD85-Uv3-zZqomRuqIJiYX9BQsYEmni2gg-frSkXAmHT6hGXlVbrvagfePQfnHGH4qP7ftUjkbTGjBXA-Scp-Z6LuHwupqJoYG7iRgjM" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Prof. Carlos</h2>
                <p className="text-lg font-medium text-neutral-500 dark:text-neutral-400 mt-1">carlos@escola.gov.br</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest">Matemática</span>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">Ensino Fundamental</span>
                </div>
              </div>
              
              <div className="w-full mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-4">
                <button className="py-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl font-bold text-neutral-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                  <Settings size={18} />
                  Configurações do Perfil
                </button>
                <button onClick={onBack} className="py-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl font-bold text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2">
                  <X size={18} />
                  Sair / Logoff
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'dashboard' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          
          {/* Greeting and Summary */}
          <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="md:col-span-3 lg:col-span-3 flex flex-col justify-center">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Bem-vindo de volta, Professor!</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl">
                Aqui está um resumo do desempenho dos seus alunos esta semana. Você tem <span className="font-bold text-rose-500">3 intervenções urgentes</span> para revisar.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group">
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Média da Turma</span>
                <span className="flex items-center text-emerald-500 font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                  <TrendingUp size={14} className="mr-1" /> +4.2%
                </span>
              </div>
              <div className="text-5xl font-black text-neutral-900 dark:text-white mt-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">82.5<span className="text-2xl text-neutral-400">%</span></div>
            </div>
          </section>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Performance Overview (Charts) */}
            <div className="lg:col-span-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 md:p-8 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Target className="text-indigo-500" size={24} />
                    Desempenho em Avaliações
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">Aproveitamento médio geral ao longo da semana.</p>
                </div>
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full">
                  <button className="px-4 py-1.5 bg-white dark:bg-neutral-700 rounded-full text-sm font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">Semanal</button>
                  <button className="px-4 py-1.5 rounded-full text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Mensal</button>
                </div>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 pt-4">
                {/* Mock Chart Bars - Redesigned with Tailwind gradients */}
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "65%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Quiz: 65%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Seg</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "85%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Quiz: 85%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ter</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "45%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-rose-500 to-orange-400 opacity-90"></div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Ciências: 45%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider text-rose-500">Qua</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "92%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-teal-400 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">Prova: 92%</div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Qui</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "78%" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-sky-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sex</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "30%" }}>
                    <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sáb</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-xl relative group transition-all cursor-pointer overflow-hidden hover:-translate-y-1" style={{ height: "15%" }}>
                    <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Dom</span>
                </div>
              </div>
            </div>

            {/* Right Column: Students at Risk & Tasks */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Students at Risk */}
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[32px] border border-rose-200/50 dark:border-rose-900/20 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] pointer-events-none"></div>
                
                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                    <AlertTriangle className="text-rose-600" size={16} />
                  </div>
                  <h3 className="font-black text-rose-600 dark:text-rose-400 text-lg">Alunos em Risco</h3>
                </div>
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all cursor-pointer group/item">
                    <img alt="Lucas" className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLv-9O5hBlmU5_LkR_8IxwSqLjfUT9l1f-b2DqKQdrRe1NmcBQQhxXv1x2Zyhk1oK7XYmwbFBs8sK8-sJY38OictlRSFj1rm3eG6zc9i9cqHsKlLPQ3_qDIGfUuPYVcXnKhWtMfDOlt1HKGQl28oO-O53I9ErFFsSECp_vberifEfzMYXQ9h2y0WuZXthEq0RDCGn7zjLbr2nbQIFvkPlcidyjXLZVvk_nJK71rD4CCDkYT2brei8pIy8MflsJr6qBXpEi0-eN-zKp" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">Lucas Oliveira</p>
                      <p className="text-xs text-rose-500 truncate">Queda de 15% em Matemática</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 group-hover/item:text-rose-500 transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all cursor-pointer group/item">
                    <img alt="Mariana" className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnnyLKW0EKdD-3a9_Ki-2ePeEPYn_-aHYBmwPrJ-0YC5mwsgc9JGY5ABaWdwKGRtqZ7nRtUY7Ga081pqIaC55W0zFGzKk3cIzq-r2oSkoJKOe7fGOnhkbkOKR3yizGPn-9oysGSfAGQ0jJ_N0ZTzRFNJuyX7iR92YyK_FFwN7xaGwh7gEI2soTtGtCrznm5Q87EnFDayT0mKpSii6802d-mztafH4O1irxwjjHfakV6o3zQKn_SbBEz-v2C10MjzY7wRLz_GbaAe0Z" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">Mariana Santos</p>
                      <p className="text-xs text-rose-500 truncate">Módulo incompleto</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 group-hover/item:text-rose-500 transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-md transition-all cursor-pointer group/item">
                    <img alt="Enzo" className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDef6yKWmbZWbYLRyfSOhIQlmeg6V4JneJiJocAYmvHIIIfVDaNVv_xCDlVDB8Grfi6H3yYdPIkQ8eXY0PdHsgQ8sYnzzgY7LMXAyvN-ElPWrzIoUcwKPnHoRk--fMrPmQFx9cfrpZGmzwZMEzVmAigs3HDTeAvaJYBfw0yvfFHqCPPjFqHJINsJ3EuD7cESzeRjgx8a97jb5KeAIA-cbD_vY2UKV7AIHDUD3NDb_jE7hT4saIVqMyG9fw6V6ikuizwuAUe3E7bOWjL" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">Enzo Costa</p>
                      <p className="text-xs text-rose-500 truncate">Padrão de ausência detectado</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 group-hover/item:text-rose-500 transition-colors" />
                  </div>
                </div>
                
                <button className="w-full mt-4 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors uppercase tracking-widest text-center">Ver todos os 8 alertas</button>
              </div>

              {/* Pending Tasks */}
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                <h3 className="font-black text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                  <FileCheck className="text-sky-500" size={20} />
                  Tarefas Pendentes
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 group">
                    <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center group-hover:border-sky-500 transition-colors cursor-pointer shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm group-hover:text-sky-600 transition-colors">Corrigir Projeto de Ciências</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Vence hoje • 12 entregas</p>
                    </div>
                    <MoreVertical size={16} className="text-neutral-400 cursor-pointer hover:text-neutral-900" />
                  </div>
                  
                  <div className="flex items-start gap-3 group">
                    <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center group-hover:border-sky-500 transition-colors cursor-pointer shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm group-hover:text-sky-600 transition-colors">Materiais de Alfabetização</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Vence amanhã • Turma 4A</p>
                    </div>
                    <MoreVertical size={16} className="text-neutral-400 cursor-pointer hover:text-neutral-900" />
                  </div>
                  
                  <div className="flex items-start gap-3 group">
                    <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded flex items-center justify-center group-hover:border-sky-500 transition-colors cursor-pointer shrink-0 mt-0.5"></div>
                    <div className="flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm group-hover:text-sky-600 transition-colors">Revisar Plano de Intervenção</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Próxima semana</p>
                    </div>
                    <MoreVertical size={16} className="text-neutral-400 cursor-pointer hover:text-neutral-900" />
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
        )}

        {/* Centro de Treinamento UI */}
        {activeView === 'training' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Level: Gamification/Hero */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Hero Banner */}
              <div className="flex-1 rounded-[32px] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-8 md:p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-center min-h-[240px]">
                <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[60%] bg-fuchsia-500/20 blur-[60px] rounded-full"></div>
                </div>
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                    <Star fill="currentColor" size={12} /> Novo Curso Adicionado
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight">Formação Contínua Gestão 360 Educação</h2>
                  <p className="text-indigo-100 max-w-xl mb-8 text-sm md:text-base leading-relaxed">Aprimore suas habilidades com novos cursos de metodologias ativas, inclusão escolar e ferramentas digitais. Evolua seu nível pedagógico.</p>
                  <button className="bg-white text-indigo-600 font-bold px-6 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 max-w-max">
                    <Play fill="currentColor" size={18} />
                    Retomar Última Aula
                  </button>
                </div>
              </div>

              {/* Gamification Stats */}
              <div className="w-full lg:w-72 bg-white dark:bg-neutral-900 rounded-[32px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-xl shadow-neutral-200/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Award size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
                    <Award className="text-amber-500" size={18} />
                    Seu Progresso
                  </h3>
                  <div className="flex items-end gap-3 mb-1">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-fuchsia-500">Nível 4</span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold">Mestre Inovador</p>
                </div>

                <div className="mt-8 relative z-10">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-neutral-500">1.250 XP</span>
                    <span className="text-indigo-500">Faltam 250 XP</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 h-full rounded-full relative" style={{ width: '80%' }}>
                      <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-10">
                {/* Continuar Assistindo (Videos) */}
                <div>
                  <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <PlayCircle className="text-indigo-500" size={24} />
                      Cursos em Progresso
                    </h3>
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">Ver todos <ChevronRight size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Course Card 1 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm group cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      <div className="h-40 bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop" alt="Capa do Curso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                            <Play fill="currentColor" size={24} className="text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                          <Clock size={12} /> 12:45 restantes
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors leading-tight">Educação Inclusiva na Prática</h4>
                        <p className="text-sm text-neutral-500 mb-6 flex-1">Módulo 2: Adaptação Curricular para Autistas</p>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-bold text-neutral-400">Último acesso ontem</span>
                          <span className="text-[11px] font-black text-indigo-600">60% concluído</span>
                        </div>
                      </div>
                    </div>
                    {/* Course Card 2 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm group cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col">
                      <div className="h-40 bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden shrink-0">
                        <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" alt="Capa do Curso" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                            <Play fill="currentColor" size={24} className="text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors leading-tight">Tecnologia em Sala de Aula</h4>
                        <p className="text-sm text-neutral-500 mb-6 flex-1">Módulo 1: Ferramentas do Google para Educação</p>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: '15%' }}></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] font-bold text-neutral-400">Último acesso há 3 dias</span>
                          <span className="text-[11px] font-black text-sky-600">15% concluído</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trilhas de Formação Recomendadas */}
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                    <Star className="text-amber-500" fill="currentColor" size={24} />
                    Trilhas Recomendadas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Trilha 1 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 group hover:border-fuchsia-200 dark:hover:border-fuchsia-900 hover:shadow-xl hover:shadow-fuchsia-500/5 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Video size={28} />
                      </div>
                      <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-2 group-hover:text-fuchsia-600 transition-colors">Gamificação e Engajamento</h4>
                      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">Aprenda a aplicar dinâmicas de jogos para manter seus alunos super motivados.</p>
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                          <Clock size={14} />
                          4h de vídeo
                        </span>
                        <span className="bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 text-xs font-black px-2.5 py-1 rounded-lg">+300 XP</span>
                      </div>
                    </div>
                    {/* Trilha 2 */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 group hover:border-sky-200 dark:hover:border-sky-900 hover:shadow-xl hover:shadow-sky-500/5 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                        <BookOpen size={28} />
                      </div>
                      <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-2 group-hover:text-sky-600 transition-colors">Avaliação Formativa Dinâmica</h4>
                      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">Estratégias para avaliar o aluno além da prova tradicional e focar no aprendizado real.</p>
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                          <Clock size={14} />
                          2.5h de vídeo
                        </span>
                        <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 text-xs font-black px-2.5 py-1 rounded-lg">+200 XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biblioteca de Recursos (Textos) */}
              <div className="xl:col-span-1">
                <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 shadow-sm sticky top-28">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                    <FileText className="text-rose-500" size={24} />
                    Biblioteca de Manuais
                  </h3>
                  <p className="text-sm text-neutral-500 mb-6">Documentos oficiais e guias práticos para consulta rápida durante o planejamento de aulas.</p>

                  <div className="space-y-3">
                    {/* Doc 1 */}
                    <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-rose-600 transition-colors leading-tight line-clamp-2">Guia Prático da BNCC 2026</h4>
                        <p className="text-[11px] font-medium text-neutral-500 mt-1">PDF • 2.4 MB</p>
                      </div>
                      <button className="text-neutral-300 group-hover:text-rose-600 transition-colors p-2 bg-white dark:bg-neutral-900 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/20 rounded-full shadow-sm">
                        <Download size={16} />
                      </button>
                    </div>

                    {/* Doc 2 */}
                    <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">Manual do Diário de Classe Digital</h4>
                        <p className="text-[11px] font-medium text-neutral-500 mt-1">PDF • 1.1 MB</p>
                      </div>
                      <button className="text-neutral-300 group-hover:text-indigo-600 transition-colors p-2 bg-white dark:bg-neutral-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 rounded-full shadow-sm">
                        <Download size={16} />
                      </button>
                    </div>

                    {/* Doc 3 */}
                    <div className="flex items-center gap-4 group cursor-pointer p-3 -mx-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors leading-tight line-clamp-2">Protocolos Inclusivos de Aprendizagem</h4>
                        <p className="text-[11px] font-medium text-neutral-500 mt-1">PDF • 850 KB</p>
                      </div>
                      <button className="text-neutral-300 group-hover:text-amber-600 transition-colors p-2 bg-white dark:bg-neutral-900 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/20 rounded-full shadow-sm">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  <button className="w-full mt-6 py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all flex items-center justify-center gap-2">
                    <Search size={16} />
                    Buscar mais materiais
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plano de Intervenção Placeholder */}
        {activeView === 'intervention' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-sky-100 dark:bg-sky-900/30 text-sky-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CalendarDays size={48} />
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Plano de Intervenção</h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Ferramentas para planejar e acompanhar as intervenções com alunos em risco serão disponibilizadas aqui.</p>
          </div>
        )}

        {/* Configurações UI */}
        {activeView === 'settings' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2 mb-8">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Settings className="text-indigo-500" size={32} />
                Configurações da Conta
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Gerencie seu perfil profissional, preferências de sistema e segurança.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col gap-8">
                {/* Perfil Profissional */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                    <UserCog className="text-sky-500" size={24} />
                    Perfil Profissional
                  </h3>

                  <div className="flex items-center gap-6 mb-2">
                    <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden shrink-0 border-4 border-white dark:border-neutral-900 shadow-lg">
                      <img src="https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=600&auto=format&fit=crop" alt="Foto do Professor" className="w-full h-full object-cover" />
                    </div>
                    <button className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-bold rounded-xl transition-colors">
                      Alterar Foto
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Nome Completo</label>
                      <input type="text" defaultValue="Prof. Carlos Andrade" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2 flex items-center gap-1"><Mail size={12}/> E-mail Institucional</label>
                      <input type="email" defaultValue="carlos.andrade@gestao360.gov.br" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Disciplina(s) de Atuação</label>
                      <input type="text" defaultValue="Matemática e Física" className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                {/* Preferências do Sistema */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Settings className="text-indigo-500" size={24} />
                    Preferências do Sistema
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Alertas de Risco Pedagógico</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Notificar imediatamente sobre evasão.</p>
                      </div>
                      <ToggleRight size={32} className="text-indigo-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Modo Escuro (Dark Mode)</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Seguir a preferência do sistema.</p>
                        </div>
                      </div>
                      <ToggleRight size={32} className="text-indigo-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer opacity-75">
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Sincronização com Google Calendar</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Exportar aulas para a agenda pessoal.</p>
                        </div>
                      </div>
                      <ToggleLeft size={32} className="text-neutral-400" />
                    </div>
                  </div>
                </div>

                {/* Segurança */}
                <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-rose-500" size={24} />
                    Segurança e Acesso
                  </h3>

                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Key size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Alterar Senha</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Última alteração há 6 meses</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Autenticação em 2 Fatores</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Atualmente desativada</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-neutral-200/50 dark:border-neutral-800/50">
              <button className="bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 transition-all">
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* Suporte UI */}
        {activeView === 'support' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-900 p-6 md:p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-5">
                <div className="p-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl shadow-inner border border-rose-200/50 dark:border-rose-800/50">
                  <LifeBuoy size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Central de Ajuda</h2>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-1">Como podemos ajudar você hoje?</p>
                </div>
              </div>
            </div>

            {/* Busca */}
            <div className="relative group max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-neutral-400 group-focus-within:text-rose-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Busque por artigos, tutoriais ou dúvidas frequentes..."
                className="w-full pl-12 pr-32 py-4 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:focus:border-rose-500 transition-all text-neutral-900 dark:text-white placeholder-neutral-400 shadow-sm text-lg"
              />
              <button className="absolute inset-y-2 right-2 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors">
                Buscar
              </button>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: Book, title: 'Artigos', desc: 'Base de conhecimento', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                { icon: Video, title: 'Tutoriais', desc: 'Passo a passo em vídeo', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                { icon: Users, title: 'Comunidade', desc: 'Fórum de professores', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                { icon: FileCheck, title: 'Chamados', desc: 'Acompanhe seus tickets', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
              ].map((item, idx) => (
                <button key={idx} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col items-center text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-900/5 transition-all group">
                  <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${item.color}`}>
                    <item.icon size={28} />
                  </div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-neutral-500">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* FAQs */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                  <MessageSquare className="text-rose-500" />
                  Dúvidas Frequentes
                </h3>
                
                {[
                  { q: 'Como lançar notas para uma turma inteira?', a: 'Acesse "Gestão de Alunos", selecione a turma desejada e clique em "Lançamento em Lote". Você poderá importar uma planilha ou preencher diretamente no sistema.' },
                  { q: 'Onde encontro os relatórios de engajamento?', a: 'No Dashboard principal, role até a seção "Desempenho Geral". Lá você encontrará gráficos interativos e a opção de exportar relatórios detalhados em PDF.' },
                  { q: 'Como enviar um comunicado para os pais?', a: 'Utilize a ferramenta "Comunicações" no menu lateral. Você pode selecionar "Pais e Responsáveis" como destinatários e acompanhar quem visualizou a mensagem.' },
                  { q: 'Esqueci minha senha, como recuperar?', a: 'Na tela de login, clique em "Esqueci minha senha". Enviaremos um link de recuperação para seu e-mail institucional cadastrado.' },
                ].map((faq, idx) => (
                  <details key={idx} className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <span className="font-semibold text-neutral-900 dark:text-white pr-4">{faq.q}</span>
                      <ChevronDown size={20} className="text-neutral-400 group-open:-rotate-180 transition-transform duration-300 flex-shrink-0" />
                    </summary>
                    <div className="p-5 pt-0 text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>

              {/* Contato Direto */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
                  <Phone className="text-rose-500" />
                  Fale com a Gente
                </h3>

                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all hover:shadow-rose-500/40">
                  <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                    <MessageCircle size={100} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-black text-xl mb-2">Chat ao Vivo</h4>
                    <p className="text-rose-100 text-sm mb-6 max-w-[200px]">Atendimento imediato com nossa equipe especializada.</p>
                    <button className="bg-white text-rose-600 font-bold px-5 py-2.5 rounded-xl text-sm w-full hover:bg-rose-50 transition-colors shadow-sm">
                      Iniciar Conversa
                    </button>
                    <p className="text-[10px] text-rose-200 text-center mt-3 flex items-center justify-center gap-1">
                      <Clock size={12} /> Tempo de resposta: ~2 min
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white mb-1">E-mail</h4>
                      <p className="text-sm text-neutral-500 mb-3">suporte@gestao360.com.br</p>
                      <button className="text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-1 hover:underline">
                        Enviar mensagem <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white mb-1">Telefone</h4>
                      <p className="text-sm text-neutral-500 mb-3">0800 123 4567</p>
                      <p className="text-[11px] text-neutral-400">Seg. a Sex. das 08h às 18h</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gestão do Aluno UI - Premium Design */}
        {activeView === 'student-portal-mgmt' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header com Gradiente */}
            <div className="flex flex-col gap-3 mb-10">
              <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 flex items-center gap-4">
                <div className="p-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/20 dark:border-white/5">
                  <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={36} />
                </div>
                Gestão de Conteúdos & Alunos
              </h2>
              <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl">Acompanhe o desempenho, envie atividades interativas e crie trilhas gamificadas para elevar o engajamento das suas turmas.</p>
            </div>

            {/* Top Stats - Glassmorphism & Glow */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
              <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[32px] p-6 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(99,102,241,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Total de Alunos</span>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <span className="text-4xl font-black text-neutral-900 dark:text-white">28</span>
              </div>
              <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[32px] p-6 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(244,63,94,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Atividades</span>
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Target size={20} className="text-rose-600 dark:text-rose-400" />
                  </div>
                </div>
                <span className="text-4xl font-black text-neutral-900 dark:text-white">14</span>
              </div>
              <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[32px] p-6 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Conclusão Média</span>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <span className="text-4xl font-black text-neutral-900 dark:text-white">82%</span>
              </div>
              <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[32px] p-6 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Trilhas Ativas</span>
                  <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Compass size={20} className="text-sky-600 dark:text-sky-400" />
                  </div>
                </div>
                <span className="text-4xl font-black text-neutral-900 dark:text-white">4</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Students List (Bento Box 1) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[40px] p-6 md:p-8 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full min-h-[600px] relative overflow-hidden">
                  {/* Decorative Gradient Blur */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-6 flex items-center gap-3 relative z-10">
                    <Users className="text-indigo-500" size={28} />
                    Meus Alunos
                  </h3>
                  
                  {/* Search Bar - Modern */}
                  <div className="relative mb-6 z-10 group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-transform group-focus-within:scale-110 group-focus-within:text-indigo-500">
                      <Search size={18} className="text-neutral-400 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Pesquisar aluno..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 placeholder:font-medium shadow-inner"
                    />
                  </div>

                  {/* Student List */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar z-10 relative">
                    {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
                      <div 
                        key={student.id} 
                        onClick={() => setSelectedStudent(student)}
                        className={`flex items-center gap-4 p-4 rounded-[24px] cursor-pointer transition-all duration-300 relative overflow-hidden group ${selectedStudent?.id === student.id ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200 dark:border-indigo-500/30' : 'bg-white/40 dark:bg-neutral-800/40 border-transparent hover:bg-white/80 dark:hover:bg-neutral-800/80 hover:shadow-md'}`}
                        style={{ borderWidth: '1.5px' }}
                      >
                        {/* Selected Indicator Bar */}
                        {selectedStudent?.id === student.id && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        )}

                        <div className="w-14 h-14 rounded-[18px] overflow-hidden shrink-0 border-2 border-white/50 dark:border-neutral-700/50 shadow-sm relative">
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-black text-base truncate transition-colors ${selectedStudent?.id === student.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-neutral-900 dark:text-white'}`}>{student.name}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-200/50 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 backdrop-blur-sm">Nível {student.level}</span>
                            <span className="text-[11px] font-black text-orange-500 flex items-center gap-1 drop-shadow-sm"><Flame size={12} fill="currentColor" /> {student.streak}</span>
                            {student.status === 'Em Risco' && <span className="text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full ml-auto animate-pulse">EM RISCO</span>}
                          </div>
                        </div>
                        <ChevronRight size={20} className={`transition-all duration-300 ${selectedStudent?.id === student.id ? 'text-indigo-500 translate-x-1' : 'text-neutral-300 group-hover:text-neutral-400 group-hover:translate-x-1'}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Student Details OR Content Creation (Bento Box 2) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Switcher Tabs - Floating Pill Style */}
                <div className="flex bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl p-2 rounded-[28px] w-full overflow-x-auto no-scrollbar border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  {['ativos', 'atividade', 'trilha', 'material'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setContentTab(tab as any); setSelectedStudent(null); setSelectedContent(null); setIsEditingContent(false); }}
                      className={`flex-1 py-3 px-5 rounded-[20px] text-sm font-black capitalize transition-all duration-300 whitespace-nowrap ${contentTab === tab && !selectedStudent && !selectedContent ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 -translate-y-0.5' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'}`}
                    >
                      {tab === 'ativos' ? 'Conteúdos Ativos' : `Nova ${tab}`}
                    </button>
                  ))}
                </div>

                {/* Dynamic Content Area - Glass Card */}
                <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl rounded-[40px] p-8 md:p-10 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 min-h-[600px] relative overflow-hidden">
                  
                  {/* Decorative Gradient Blur Top Right */}
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                  {/* View: Selected Student Details (Dashboard Pessoal) */}
                  {selectedStudent && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 relative z-10">
                      
                      {/* Profile Header Style Videogame */}
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-br from-white/50 to-neutral-50/10 dark:from-neutral-800/50 dark:to-neutral-900/10 p-6 rounded-[32px] border border-white/50 dark:border-white/5 shadow-inner backdrop-blur-sm">
                        <div className="relative">
                          <div className="w-28 h-28 rounded-[24px] overflow-hidden shrink-0 border-4 border-white dark:border-neutral-800 shadow-xl relative z-10">
                            <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-indigo-600 text-white font-black text-sm flex items-center justify-center rounded-xl shadow-lg border-2 border-white dark:border-neutral-900 z-20 transform rotate-12 hover:rotate-0 transition-transform">
                            L{selectedStudent.level}
                          </div>
                        </div>
                        <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                          <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">{selectedStudent.name}</h3>
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <div className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl font-bold text-sm text-neutral-700 dark:text-neutral-300 shadow-sm">
                              <Zap size={16} className="text-amber-500" />
                              {selectedStudent.xp} XP
                            </div>
                            <div className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl font-bold text-sm text-neutral-700 dark:text-neutral-300 shadow-sm">
                              <Coins size={16} className="text-yellow-500" />
                              {selectedStudent.coins} Moedas
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 text-neutral-400 transition-colors">
                          <X size={24} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-3 py-4 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[24px] font-black hover:bg-indigo-600 hover:text-white transition-all duration-300 group shadow-sm">
                          <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                          Enviar Mensagem
                        </button>
                        <button className="flex items-center justify-center gap-3 py-4 bg-amber-50/80 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-[24px] font-black hover:bg-amber-500 hover:text-white transition-all duration-300 group shadow-sm">
                          <Coins size={20} className="group-hover:scale-110 transition-transform" />
                          Bonificar Aluno
                        </button>
                      </div>

                      <div className="pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
                        <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                          <Target size={24} className="text-indigo-500" />
                          Desempenho Recente
                        </h4>
                        <div className="space-y-5">
                          <div className="group bg-white/50 dark:bg-neutral-800/30 p-4 rounded-[24px] border border-white/50 dark:border-neutral-700/50 hover:shadow-md transition-all">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-[18px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                <CheckCircle2 size={28} />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-end mb-2">
                                  <h5 className="font-black text-base">Quiz de Ciências</h5>
                                  <span className="font-black text-emerald-500 text-lg">90%</span>
                                </div>
                                <div className="w-full h-2.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-full overflow-hidden shadow-inner">
                                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full w-[90%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="group bg-white/50 dark:bg-neutral-800/30 p-4 rounded-[24px] border border-white/50 dark:border-neutral-700/50 hover:shadow-md transition-all">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-[18px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                <AlertTriangle size={28} />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-end mb-2">
                                  <h5 className="font-black text-base">Prova de Matemática</h5>
                                  <span className="font-black text-rose-500 text-lg">45%</span>
                                </div>
                                <div className="w-full h-2.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-full overflow-hidden shadow-inner">
                                  <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full w-[45%] shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View: Tracking do Conteúdo */}
                  {!selectedStudent && selectedContent && !isEditingContent && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 relative z-10">
                      {/* Dashboard Header do Conteúdo */}
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-br from-white/50 to-neutral-50/10 dark:from-neutral-800/50 dark:to-neutral-900/10 p-6 rounded-[32px] border border-white/50 dark:border-white/5 shadow-inner backdrop-blur-sm relative">
                        <div className={`w-24 h-24 rounded-[24px] ${selectedContent.bg} ${selectedContent.color} flex items-center justify-center shrink-0 border-4 border-white dark:border-neutral-800 shadow-xl z-10`}>
                          <selectedContent.icon size={40} />
                        </div>
                        <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 backdrop-blur-sm">{selectedContent.type}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-200/50 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-300 backdrop-blur-sm">{selectedContent.subject}</span>
                          </div>
                          <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-3">{selectedContent.title}</h3>
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <div className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl font-bold text-sm text-neutral-700 dark:text-neutral-300 shadow-sm">
                              <Target size={16} className="text-indigo-500" />
                              {selectedContent.stats}
                            </div>
                            <div className="flex items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl font-bold text-sm text-neutral-700 dark:text-neutral-300 shadow-sm">
                              <Zap size={16} className="text-amber-500" />
                              100 XP Recompensa
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setSelectedContent(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 text-neutral-400 transition-colors">
                          <X size={24} />
                        </button>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-4">
                        <button onClick={() => setIsEditingContent(true)} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/30">
                          <Edit2 size={20} />
                          Editar Conteúdo
                        </button>
                        <button onClick={() => { setSelectedContent(null); setActiveContents(prev => prev.filter(c => c.id !== selectedContent.id)); }} className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-[24px] font-black flex items-center justify-center gap-2 transition-colors">
                          <Trash2 size={20} />
                          Excluir
                        </button>
                      </div>

                      {/* Tabela de Acompanhamento (Mock) */}
                      <div className="pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
                        <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
                          <Users size={24} className="text-indigo-500" />
                          Progresso dos Alunos
                        </h4>
                        <div className="space-y-3">
                          {students.slice(0, 3).map((student, i) => (
                            <div key={student.id} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-neutral-800/30 rounded-[20px] border border-white/50 dark:border-neutral-700/50 hover:bg-white hover:shadow-md transition-all">
                              <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                              <div className="flex-1">
                                <h5 className="font-black text-sm text-neutral-900 dark:text-white">{student.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${i === 0 ? 'w-full bg-emerald-500' : i === 1 ? 'w-1/2 bg-amber-500' : 'w-0'}`}></div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${i === 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : i === 1 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>
                                  {i === 0 ? 'Concluído' : i === 1 ? 'Em Andamento' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View: Edição do Conteúdo */}
                  {!selectedStudent && selectedContent && isEditingContent && (
                    <div className="space-y-8 animate-in fade-in duration-500 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                          <Edit2 className="text-indigo-500" size={32} />
                          Editar {selectedContent.type === 'atividade' ? 'Atividade' : selectedContent.type === 'trilha' ? 'Trilha' : 'Material'}
                        </h3>
                        <button onClick={() => setIsEditingContent(false)} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 text-neutral-400 transition-colors">
                          <X size={24} />
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Título</label>
                          <input type="text" defaultValue={selectedContent.title} className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Matéria</label>
                            <select defaultValue={selectedContent.subject} className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all">
                              <option>Matemática</option>
                              <option>Ciências</option>
                              <option>Português</option>
                              <option>Geografia</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Recompensa (XP)</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Zap size={18} className="text-amber-500" />
                              </div>
                              <input type="number" defaultValue={100} className="w-full pl-14 pr-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Descrição / Instruções</label>
                          <textarea rows={4} defaultValue="Instruções atuais do conteúdo..." className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all resize-none"></textarea>
                        </div>
                        <button onClick={() => setIsEditingContent(false)} className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg rounded-[24px] shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.5)] hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-3 mt-4">
                          <CheckCircle2 size={24} /> Salvar Alterações
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View: Conteúdos Ativos */}
                  {!selectedStudent && !selectedContent && contentTab === 'ativos' && (
                    <div className="space-y-6 animate-in fade-in duration-500 relative z-10">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Conteúdos Ativos</h3>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20 px-4 py-1.5 rounded-full shadow-sm">{activeContents.length} items</span>
                      </div>
                      <div className="space-y-4">
                        {activeContents.map(content => (
                          <div 
                            key={content.id} 
                            onClick={() => setSelectedContent(content)}
                            className="flex items-center justify-between p-5 rounded-[24px] bg-white/60 dark:bg-neutral-800/40 border border-white/60 dark:border-neutral-700/50 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-5">
                              <div className={`w-14 h-14 rounded-[20px] ${content.bg} ${content.color} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                <content.icon size={28} />
                              </div>
                              <div>
                                <h4 className="font-black text-lg text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{content.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-100 dark:bg-neutral-700/50 px-2 py-0.5 rounded-md">{content.subject}</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
                                  <span className="text-xs font-bold text-neutral-500">{content.stats}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveContents(prev => prev.filter(c => c.id !== content.id)); }}
                              className="w-10 h-10 rounded-full bg-white dark:bg-neutral-700 shadow-sm border border-neutral-100 dark:border-neutral-600 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-rose-500 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/30 hover:scale-110 transition-all duration-300"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View: Adicionar Atividade */}
                  {!selectedStudent && !selectedContent && contentTab === 'atividade' && (
                    <div className="space-y-8 animate-in fade-in duration-500 relative z-10">
                      <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-3">
                        <Target className="text-indigo-500" size={32} />
                        Criar Nova Atividade
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Título da Atividade</label>
                          <input type="text" placeholder="Ex: Quiz de Biologia Celular" className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all placeholder:text-neutral-400 placeholder:font-medium" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Matéria</label>
                            <select className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all">
                              <option>Matemática</option>
                              <option>Ciências</option>
                              <option>Português</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Recompensa (XP)</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Zap size={18} className="text-amber-500" />
                              </div>
                              <input type="number" placeholder="100" className="w-full pl-14 pr-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all placeholder:text-neutral-400 placeholder:font-medium" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Descrição / Instruções</label>
                          <textarea rows={4} placeholder="Descreva o que o aluno deve fazer..." className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all resize-none placeholder:text-neutral-400 placeholder:font-medium"></textarea>
                        </div>
                        <button className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-[24px] shadow-[0_8px_30px_rgb(99,102,241,0.3)] hover:shadow-[0_8px_40px_rgb(99,102,241,0.5)] hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-3 mt-4">
                          <Plus size={24} /> Criar Atividade
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View: Adicionar Trilha */}
                  {!selectedStudent && !selectedContent && contentTab === 'trilha' && (
                    <div className="space-y-8 animate-in fade-in duration-500 relative z-10">
                      <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-3">
                        <Compass className="text-indigo-500" size={32} />
                        Criar Trilha Gamificada
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Nome da Trilha</label>
                          <input type="text" placeholder="Ex: A Jornada do Sistema Solar" className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all placeholder:text-neutral-400 placeholder:font-medium" />
                        </div>
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Fases / Aulas</label>
                          <div className="mt-2 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[32px] p-10 text-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all duration-300 group">
                            <div className="w-16 h-16 rounded-full bg-white dark:bg-neutral-800 shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300">
                              <PlusCircle size={32} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <p className="text-lg font-black text-indigo-900 dark:text-indigo-100">Adicionar Fase à Trilha</p>
                            <p className="text-sm font-medium text-indigo-500/70 mt-2">Clique ou arraste módulos para cá</p>
                          </div>
                        </div>
                        <button className="w-full py-5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-lg rounded-[24px] shadow-[0_8px_30px_rgb(14,165,233,0.3)] hover:shadow-[0_8px_40px_rgb(14,165,233,0.5)] hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-3 mt-4">
                          <Plus size={24} /> Salvar Trilha
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View: Adicionar Material */}
                  {!selectedStudent && !selectedContent && contentTab === 'material' && (
                    <div className="space-y-8 animate-in fade-in duration-500 relative z-10">
                      <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-3">
                        <Map className="text-indigo-500" size={32} />
                        Disponibilizar Material
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Título do Material</label>
                          <input type="text" placeholder="Ex: PDF - Regras da Acentuação" className="w-full px-6 py-4 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/50 dark:border-neutral-700/50 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold text-neutral-900 dark:text-white shadow-inner transition-all placeholder:text-neutral-400 placeholder:font-medium" />
                        </div>
                        <div>
                          <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Arquivo ou Link</label>
                          <div className="mt-2 border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[32px] p-12 text-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-20 h-20 rounded-[24px] bg-white dark:bg-neutral-800 shadow-md flex items-center justify-center mx-auto mb-6 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-emerald-500/20 transition-all duration-500 relative z-10">
                              <FileText size={40} className="text-emerald-500" />
                            </div>
                            <p className="text-xl font-black text-emerald-900 dark:text-emerald-100 relative z-10">Arraste seu arquivo aqui</p>
                            <p className="text-sm font-bold text-emerald-600/70 dark:text-emerald-400/70 mt-2 relative z-10">ou clique para procurar no computador</p>
                          </div>
                        </div>
                        <button className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg rounded-[24px] shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.5)] hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-3 mt-4">
                          <Plus size={24} /> Publicar Material
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Botão Flutuante de Chat Global */}
      <div className="fixed bottom-6 right-6 z-[150] print:hidden">
        <div className="relative">
          <button 
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            onClick={() => {
              setIsGlobalChatOpen(!isGlobalChatOpen);
              if (isGlobalChatOpen) setSelectedChatStudent(null);
            }}
          >
            {isGlobalChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          </button>
          
          {totalUnreadCount > 0 && !isGlobalChatOpen && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm animate-bounce">
              {totalUnreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Global Chat Window */}
      <div className={`fixed bottom-24 right-6 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right z-[140] print:hidden ${isGlobalChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}>
        
        {!selectedChatStudent ? (
          /* Lista de Alunos (Contatos) */
          <>
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-indigo-600 text-white shrink-0">
              <h3 className="font-black text-xl mb-1">Mensagens</h3>
              <p className="text-indigo-200 text-sm font-medium">Selecione um aluno para conversar</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white dark:bg-neutral-900">
              {chatStudents.map(student => {
                const teacherMessages = (student.messages || []).filter((m: any) => m.teacherId === LOGGED_IN_TEACHER_ID || m.teacherId === undefined);
                const lastMsg = teacherMessages.length > 0 
                  ? teacherMessages[teacherMessages.length - 1] 
                  : null;
                  
                return (
                  <div 
                    key={student.id}
                    onClick={() => setSelectedChatStudent(student)}
                    className="flex items-center gap-4 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl cursor-pointer transition-colors"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-bold text-neutral-900 dark:text-white truncate">{student.name}</h4>
                        {lastMsg && <span className="text-[10px] font-bold text-neutral-400 shrink-0 ml-2">{lastMsg.time}</span>}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate ${teacherMessages.some((m:any) => m.sender === 'student' && !m.read) ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                          {lastMsg ? (lastMsg.sender === 'teacher' ? `Você: ${lastMsg.text}` : lastMsg.text) : 'Nenhuma mensagem'}
                        </p>
                        {teacherMessages.filter((m:any) => m.sender === 'student' && !m.read).length > 0 && (
                          <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 ml-2 shadow-sm">
                            {teacherMessages.filter((m:any) => m.sender === 'student' && !m.read).length}
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
          /* Chat Individual */
          <>
            {/* Chat Header */}
            <div className="shrink-0 border-b border-neutral-100 dark:border-neutral-800 p-4 flex items-center gap-3 bg-white dark:bg-neutral-900 relative z-10 shadow-sm">
              <button 
                onClick={() => setSelectedChatStudent(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex gap-3 items-center flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0">
                  <img src={selectedChatStudent.avatar} alt={selectedChatStudent.name} className="w-full h-full object-cover" />
                </div>
                <div className="truncate">
                  <h3 className="font-black text-neutral-900 dark:text-white text-sm leading-tight truncate">{selectedChatStudent.name}</h3>
                  <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Online agora
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col">
              <div className="text-center text-xs font-bold text-neutral-400 mb-2">Hoje</div>
              
              {((selectedChatStudent.messages || []).filter((m: any) => m.teacherId === LOGGED_IN_TEACHER_ID || m.teacherId === undefined).length === 0) && (
                <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-2">
                  <MessageSquare size={32} className="opacity-20" />
                  <p className="text-sm font-medium">Inicie a conversa!</p>
                </div>
              )}
              
              {(selectedChatStudent.messages || []).filter((m: any) => m.teacherId === LOGGED_IN_TEACHER_ID || m.teacherId === undefined).map((msg: any, idx: number) => (
                <div key={idx} className={`flex ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 ${msg.sender === 'teacher' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/20 shadow-md' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-tl-sm shadow-sm'}`}>
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    <span className={`text-[10px] font-bold mt-1.5 block text-right ${msg.sender === 'teacher' ? 'text-indigo-200' : 'text-neutral-400'}`}>{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatMessage();
                  }}
                  placeholder="Mensagem..."
                  className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-neutral-900 dark:text-white text-sm font-medium"
                />
                <button 
                  onClick={handleSendChatMessage}
                  disabled={!newMessageText.trim()}
                  className="w-10 h-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
