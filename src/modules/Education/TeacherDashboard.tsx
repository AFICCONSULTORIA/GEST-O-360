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
  Book,
  Camera,
  RotateCcw
} from 'lucide-react';
import { TeacherEducationManager } from './TeacherEducationManager';
import { TeacherStudentManager } from './TeacherStudentManager';
import { SupportArticlesManager } from './SupportArticlesManager';
import { SupportTutorialsManager } from './SupportTutorialsManager';
import { SupportCommunityManager } from './SupportCommunityManager';
import { SupportTicketsManager } from './SupportTicketsManager';
import { TeacherInterventionPlan } from './TeacherInterventionPlan';
import { TeacherTrainingCenter } from './TeacherTrainingCenter';
import { EducationStaffAdmin } from './components/EducationStaffAdmin';
import { EducationAvatar, optimizeAvatarImage } from './components/EducationAvatar';
import { getTeacherDashboardMetrics, TeacherDashboardMetrics } from '../../lib/api/education';


export const TeacherDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'training' | 'intervention' | 'settings' | 'support' | 'student-portal-mgmt' | 'student-mgmt' | 'profile' | 'staff-mgmt'>('dashboard');
  const [activeSupportTab, setActiveSupportTab] = useState<'home' | 'articles' | 'tutorials' | 'community' | 'tickets'>('home');
  const [selectedArticleCategory, setSelectedArticleCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Teacher Profile & Settings State ---
  const [teacherPhoto, setTeacherPhoto] = useState<string>(() => localStorage.getItem('gestao360_teacher_photo') || '');
  const [teacherName, setTeacherName] = useState<string>(() => localStorage.getItem('gestao360_teacher_name') || 'Educador(a)');
  const [teacherEmail, setTeacherEmail] = useState<string>(() => localStorage.getItem('gestao360_teacher_email') || 'educador@escola.gov.br');
  const [teacherSubject, setTeacherSubject] = useState<string>(() => localStorage.getItem('gestao360_teacher_subject') || 'Ensino Fundamental');
  const [teacherRole, setTeacherRole] = useState<'teacher' | 'coordinator'>(() => {
    return (localStorage.getItem('gestao360_teacher_role') as any) || 'teacher';
  });
  const [teacherSchool, setTeacherSchool] = useState<string>(() => {
    return localStorage.getItem('gestao360_teacher_school') || 'Rede Municipal';
  });

  const [formTeacherName, setFormTeacherName] = useState(teacherName);
  const [formTeacherEmail, setFormTeacherEmail] = useState(teacherEmail);
  const [formTeacherSubject, setFormTeacherSubject] = useState(teacherSubject);
  const [notifyRiskAlerts, setNotifyRiskAlerts] = useState<boolean>(() => {
    const saved = localStorage.getItem('gestao360_teacher_pref_alerts');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [googleCalendarSync, setGoogleCalendarSync] = useState<boolean>(() => {
    const saved = localStorage.getItem('gestao360_teacher_pref_gcal');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const teacherFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveSettings = () => {
    setTeacherName(formTeacherName);
    setTeacherEmail(formTeacherEmail);
    setTeacherSubject(formTeacherSubject);
    localStorage.setItem('gestao360_teacher_name', formTeacherName);
    localStorage.setItem('gestao360_teacher_email', formTeacherEmail);
    localStorage.setItem('gestao360_teacher_subject', formTeacherSubject);
    localStorage.setItem('gestao360_teacher_pref_alerts', JSON.stringify(notifyRiskAlerts));
    localStorage.setItem('gestao360_teacher_pref_gcal', JSON.stringify(googleCalendarSync));
    window.dispatchEvent(new CustomEvent('teacher-updated', {
      detail: {
        name: formTeacherName,
        email: formTeacherEmail,
        subject: formTeacherSubject,
        photo: teacherPhoto
      }
    }));
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleTeacherPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const optimized = await optimizeAvatarImage(file, 360, 0.85);
      setTeacherPhoto(optimized);
      localStorage.setItem('gestao360_teacher_photo', optimized);
      window.dispatchEvent(new CustomEvent('teacher-updated', { detail: { photo: optimized } }));
    } catch (err) {
      console.error('Erro ao processar foto do professor:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (teacherFileInputRef.current) teacherFileInputRef.current.value = '';
    }
  };

  const handleResetTeacherPhoto = () => {
    setTeacherPhoto('');
    localStorage.removeItem('gestao360_teacher_photo');
    window.dispatchEvent(new CustomEvent('teacher-updated', { detail: { photo: '' } }));
  };

  // --- Support Chat & Contact State ---
  const [supportLiveChatOpen, setSupportLiveChatOpen] = useState(false);
  const [supportLiveChatMessages, setSupportLiveChatMessages] = useState<{ sender: 'user' | 'support', text: string }[]>([
    { sender: 'support', text: 'Olá! Como posso ajudar você hoje?' }
  ]);
  const [supportLiveChatInput, setSupportLiveChatInput] = useState('');
  const [supportContact, setSupportContact] = useState(() => {
    const saved = localStorage.getItem('gestao360_support_contact');
    return saved ? JSON.parse(saved) : {
      email: 'suporte@gestao360.com.br',
      phone: '(66) 9 9689-3617'
    };
  });
  const [isEditingSupportContact, setIsEditingSupportContact] = useState(false);
  const [tempSupportContact, setTempSupportContact] = useState(supportContact);

  useEffect(() => {
    localStorage.setItem('gestao360_support_contact', JSON.stringify(supportContact));
  }, [supportContact]);

  // --- Global Chat State ---
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [selectedChatStudent, setSelectedChatStudent] = useState<any>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [chatStudents, setChatStudents] = useState<any[]>([]);

  const LOGGED_IN_TEACHER_ID = 1; // Simulando Prof. Carlos
  const teacherId = localStorage.getItem('gestao360_teacher_id') || '00000000-0000-0000-0000-000000000001';

  const [metrics, setMetrics] = useState<TeacherDashboardMetrics>({
    total_students: 15,
    active_interventions: 2,
    average_completion_rate: 84.5,
    pending_quizzes: 3
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoadingMetrics(true);
      try {
        const data = await getTeacherDashboardMetrics(teacherId);
        setMetrics(data);
      } catch (err) {
        console.error('Erro ao carregar métricas do dashboard do professor:', err);
      } finally {
        setIsLoadingMetrics(false);
      }
    }
    fetchMetrics();
  }, [teacherId]);

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

    const handleTeacherUpdated = () => {
      setTeacherName(localStorage.getItem('gestao360_teacher_name') || 'Educador(a)');
      setTeacherEmail(localStorage.getItem('gestao360_teacher_email') || 'educador@escola.gov.br');
      setTeacherSubject(localStorage.getItem('gestao360_teacher_subject') || 'Ensino Fundamental');
      setTeacherPhoto(localStorage.getItem('gestao360_teacher_photo') || '');
      setTeacherRole((localStorage.getItem('gestao360_teacher_role') as any) || 'teacher');
      setTeacherSchool(localStorage.getItem('gestao360_teacher_school') || 'Rede Municipal');
    };

    const handleOpenNewIntervention = (e: any) => {
      setActiveView('intervention');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-create-plan', { detail: e.detail }));
      }, 150);
    };

    const handleInterventionPlansUpdated = async () => {
      try {
        const data = await getTeacherDashboardMetrics(teacherId);
        setMetrics(data);
      } catch (err) {
        console.error('Erro ao atualizar métricas após alteração de planos:', err);
      }
    };

    window.addEventListener('open-teacher-chat', handleOpenChat);
    window.addEventListener('students-updated', handleStudentsUpdated);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('teacher-updated', handleTeacherUpdated);
    window.addEventListener('open-new-intervention', handleOpenNewIntervention);
    window.addEventListener('intervention-plans-updated', handleInterventionPlansUpdated);

    return () => {
      window.removeEventListener('open-teacher-chat', handleOpenChat);
      window.removeEventListener('students-updated', handleStudentsUpdated);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('teacher-updated', handleTeacherUpdated);
      window.removeEventListener('open-new-intervention', handleOpenNewIntervention);
      window.removeEventListener('intervention-plans-updated', handleInterventionPlansUpdated);
    };
  }, [teacherId]);

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

  // --- Interactive Tasks & Dynamic Dashboard Data ---
  const [tasks, setTasks] = useState<{ id: string; title: string; due: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem('gestao360_teacher_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [
      { id: '1', title: 'Corrigir Projeto de Ciências', due: 'Vence hoje • 12 entregas', completed: false },
      { id: '2', title: 'Preparar Materiais de Alfabetização', due: 'Vence amanhã • Turma 4A', completed: false },
      { id: '3', title: 'Revisar Alunos em Risco e Faltas', due: 'Próxima semana', completed: false }
    ];
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleToggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    localStorage.setItem('gestao360_teacher_tasks', JSON.stringify(updated));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      due: 'Para breve',
      completed: false
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem('gestao360_teacher_tasks', JSON.stringify(updated));
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem('gestao360_teacher_tasks', JSON.stringify(updated));
  };

  // Cálculos dinâmicos com base nos alunos reais
  const atRiskStudents = chatStudents.filter(s => s.status === 'Em Risco' || s.status === 'Atenção');
  const avgGradeNum = chatStudents.length > 0
    ? (chatStudents.reduce((acc, s) => acc + (s.grade || 0), 0) / chatStudents.length)
    : 8.25;
  const avgPercentage = (avgGradeNum * 10).toFixed(1);

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

          <input
            ref={teacherFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleTeacherPhotoChange}
            className="hidden"
          />

          <div
            onClick={() => setActiveView('profile')}
            className="p-1 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 cursor-pointer hover:scale-105 transition-transform shadow-md mb-3"
            title="Ver meu perfil"
          >
            <EducationAvatar
              src={teacherPhoto}
              name={teacherName}
              role="teacher"
              size="lg"
            />
          </div>

          <h2 className="font-black text-lg text-neutral-900 dark:text-white text-center">{teacherName}</h2>
          <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              teacherRole === 'coordinator' 
                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50' 
                : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
            }`}>
              {teacherRole === 'coordinator' ? 'Coordenador(a)' : 'Professor(a)'}
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{teacherSubject}</span>
          </div>
          <p className="text-[11px] text-neutral-400 text-center font-medium mt-0.5 truncate max-w-full px-2">{teacherSchool}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveView('staff-mgmt')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeView === 'staff-mgmt' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white group'}`}
          >
            <Users size={20} className={activeView !== 'staff-mgmt' ? "group-hover:scale-110 transition-transform" : ""} />
            <span>Equipe Pedagógica</span>
          </button>
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

        {activeView === 'staff-mgmt' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            <EducationStaffAdmin schoolFilter={teacherRole === 'coordinator' ? teacherSchool : undefined} isTeacherPortal={true} />
          </div>
        )}

        {activeView === 'profile' && (
          <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full pb-24 md:pb-8 flex flex-col items-center">
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-10 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg w-full flex flex-col items-center gap-6 mt-10">
              <div className="relative group">
                <div className="p-1 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-sky-500 shadow-xl">
                  <EducationAvatar
                    src={teacherPhoto}
                    name={teacherName}
                    role="teacher"
                    size="2xl"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => teacherFileInputRef.current?.click()}
                  title="Alterar foto do professor"
                  className="absolute bottom-1 right-1 p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Camera size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => teacherFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Camera size={14} />
                  {isUploadingPhoto ? 'Processando...' : 'Carregar Minha Foto'}
                </button>
                {teacherPhoto && (
                  <button
                    type="button"
                    onClick={handleResetTeacherPhoto}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Usar Ícone Padrão
                  </button>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white">{teacherName}</h2>
                <p className="text-lg font-medium text-neutral-500 dark:text-neutral-400 mt-1">{teacherEmail}</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest">{teacherSubject}</span>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">Ensino Fundamental</span>
                </div>
              </div>

              <div className="w-full mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-4">
                <button onClick={() => setActiveView('settings')} className="py-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl font-bold text-neutral-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Settings size={18} />
                  Configurações do Perfil
                </button>
                <button onClick={onBack} className="py-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl font-bold text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 cursor-pointer">
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
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Bem-vindo de volta, {teacherName}!</h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-3xl">
                  Aqui está um resumo consolidado do desempenho escolar. Você tem <span className="font-bold text-rose-500">{metrics.active_interventions} {metrics.active_interventions === 1 ? 'plano de intervenção ativo' : 'planos de intervenção ativos'}</span> e <span className="font-bold text-amber-500">{atRiskStudents.length} alunos em atenção</span>.
                </p>
              </div>

              {/* KPI Cards Conectados ao Supabase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Alunos Monitorados */}
                <div 
                  onClick={() => setActiveView('student-mgmt')}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Alunos Monitorados</span>
                    <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-xs bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full">
                      <Users size={13} className="mr-1" /> Ativos
                    </span>
                  </div>
                  <div className="text-4xl font-black text-neutral-900 dark:text-white mt-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {isLoadingMetrics ? (
                      <span className="text-2xl text-neutral-400 animate-pulse">Carregando...</span>
                    ) : (
                      metrics.total_students
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 font-medium">Turmas da rede municipal</p>
                </div>

                {/* Card 2: Intervenções Pedagógicas */}
                <div 
                  onClick={() => setActiveView('intervention')}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase tracking-widest text-rose-600 dark:text-rose-400">Intervenções (PIP)</span>
                    <span className="flex items-center text-rose-600 dark:text-rose-400 font-bold text-xs bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-full">
                      <AlertTriangle size={13} className="mr-1" /> Em Andamento
                    </span>
                  </div>
                  <div className="text-4xl font-black text-neutral-900 dark:text-white mt-4 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    {isLoadingMetrics ? (
                      <span className="text-2xl text-neutral-400 animate-pulse">Carregando...</span>
                    ) : (
                      metrics.active_interventions
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 font-medium">Acompanhamentos abertos</p>
                </div>

                {/* Card 3: Taxa de Conclusão / Desempenho */}
                <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Conclusão Média</span>
                    <span className="flex items-center text-emerald-500 font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <TrendingUp size={13} className="mr-1" /> +4.2%
                    </span>
                  </div>
                  <div className="text-4xl font-black text-neutral-900 dark:text-white mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {isLoadingMetrics ? (
                      <span className="text-2xl text-neutral-400 animate-pulse">Carregando...</span>
                    ) : (
                      <>{metrics.average_completion_rate}<span className="text-2xl text-neutral-400">%</span></>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 font-medium">Taxa média de lições concluídas</p>
                </div>

                {/* Card 4: Avaliações Realizadas */}
                <div 
                  onClick={() => setActiveView('student-portal-mgmt')}
                  className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-sky-200 dark:hover:border-sky-800 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase tracking-widest text-sky-600 dark:text-sky-400">Avaliações</span>
                    <span className="flex items-center text-sky-600 dark:text-sky-400 font-bold text-xs bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 rounded-full">
                      <Target size={13} className="mr-1" /> Recentes
                    </span>
                  </div>
                  <div className="text-4xl font-black text-neutral-900 dark:text-white mt-4 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {isLoadingMetrics ? (
                      <span className="text-2xl text-neutral-400 animate-pulse">Carregando...</span>
                    ) : (
                      metrics.pending_quizzes
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 font-medium">Quizzes e testes enviados</p>
                </div>
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

                  <div className="flex items-center justify-between mb-5 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                        <AlertTriangle className="text-rose-600" size={16} />
                      </div>
                      <h3 className="font-black text-rose-600 dark:text-rose-400 text-lg">Alunos em Alerta</h3>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                      {atRiskStudents.length}
                    </span>
                  </div>

                  <div className="space-y-3 relative z-10 max-h-60 overflow-y-auto pr-1">
                    {atRiskStudents.length === 0 ? (
                      <div className="text-center py-6 px-4">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Nenhum aluno em risco!</p>
                        <p className="text-xs text-neutral-400 mt-1">Todos os estudantes estão com bom rendimento.</p>
                      </div>
                    ) : (
                      atRiskStudents.map((student: any) => (
                        <div
                          key={student.id}
                          onClick={() => {
                            setActiveView('student-mgmt');
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('select-teacher-student', { detail: student.id }));
                            }, 100);
                          }}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md transition-all cursor-pointer group/item"
                          title="Clique para ver a ficha completa do aluno"
                        >
                          <EducationAvatar src={student.avatar} name={student.name} role="student" size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-neutral-900 dark:text-white truncate group-hover/item:text-rose-600 dark:group-hover/item:text-rose-400 transition-colors">
                              {student.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${student.status === 'Em Risco'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                {student.status}
                              </span>
                              <span className="text-[11px] text-neutral-400 truncate">
                                • Nota {student.grade ?? 'N/A'}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-neutral-300 group-hover/item:text-rose-500 group-hover/item:translate-x-1 transition-all" />
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-rose-100 dark:border-rose-900/30 text-xs font-bold">
                    <button
                      onClick={() => setActiveView('student-mgmt')}
                      className="text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider py-1 cursor-pointer"
                    >
                      Ver Alunos →
                    </button>
                    <button
                      onClick={() => setActiveView('intervention')}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-extrabold transition-colors uppercase tracking-wider py-1 cursor-pointer flex items-center gap-1"
                    >
                      <CalendarDays size={14} />
                      Planos PIP →
                    </button>
                  </div>
                </div>

                {/* Pending Tasks */}
                <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 text-base">
                      <FileCheck className="text-sky-500" size={20} />
                      Tarefas Pendentes
                    </h3>
                    <button
                      onClick={() => setIsAddingTask(!isAddingTask)}
                      className="p-1.5 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="Adicionar Tarefa"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {isAddingTask && (
                    <form onSubmit={handleAddTask} className="mb-4 flex gap-2 animate-in fade-in duration-200">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nova tarefa..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Salvar
                      </button>
                    </form>
                  )}

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-4">Nenhuma tarefa pendente!</p>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 group p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-neutral-300 dark:border-neutral-600 hover:border-indigo-500'
                              }`}
                          >
                            {task.completed && <CheckCircle2 size={14} />}
                          </button>
                          <div className="flex-1 min-w-0" onClick={() => handleToggleTask(task.id)}>
                            <p className={`font-bold text-sm cursor-pointer transition-colors truncate ${task.completed
                                ? 'line-through text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-900 dark:text-white group-hover:text-indigo-600'
                              }`}>
                              {task.title}
                            </p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">{task.due}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-500 p-1 transition-opacity cursor-pointer"
                            title="Excluir tarefa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Centro de Treinamento UI */}
        {activeView === 'training' && (
          <TeacherTrainingCenter />
        )}

        {/* Plano de Intervenção Pedagógica (PIP) */}
        {activeView === 'intervention' && (
          <TeacherInterventionPlan
            students={chatStudents}
            onOpenStudent={(studentId) => {
              setActiveView('student-mgmt');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('select-teacher-student', { detail: studentId }));
              }, 100);
            }}
            onOpenChat={(studentId) => {
              const student = chatStudents.find((s: any) => s.id === studentId);
              if (student) {
                setSelectedChatStudent(student);
              }
              setIsGlobalChatOpen(true);
            }}
          />
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
                    <EducationAvatar
                      src={teacherPhoto}
                      name={teacherName}
                      role="teacher"
                      size="xl"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => teacherFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Camera size={14} />
                        {isUploadingPhoto ? 'Processando...' : 'Alterar Foto'}
                      </button>
                      {teacherPhoto && (
                        <button
                          type="button"
                          onClick={handleResetTeacherPhoto}
                          className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          Usar Ícone Padrão
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Nome Completo</label>
                      <input
                        type="text"
                        value={formTeacherName}
                        onChange={(e) => setFormTeacherName(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2 flex items-center gap-1"><Mail size={12} /> E-mail Institucional</label>
                      <input
                        type="email"
                        value={formTeacherEmail}
                        onChange={(e) => setFormTeacherEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Disciplina(s) de Atuação</label>
                      <input
                        type="text"
                        value={formTeacherSubject}
                        onChange={(e) => setFormTeacherSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-medium text-neutral-900 dark:text-white"
                      />
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
                    <div
                      onClick={() => setNotifyRiskAlerts(!notifyRiskAlerts)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer select-none"
                    >
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Alertas de Risco Pedagógico</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Notificar imediatamente sobre evasão ou queda de rendimento.</p>
                      </div>
                      {notifyRiskAlerts ? <ToggleRight size={32} className="text-indigo-500" /> : <ToggleLeft size={32} className="text-neutral-400" />}
                    </div>

                    <div
                      onClick={() => setGoogleCalendarSync(!googleCalendarSync)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Sincronização com Google Calendar</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Exportar aulas e compromissos para a agenda pessoal.</p>
                        </div>
                      </div>
                      {googleCalendarSync ? <ToggleRight size={32} className="text-indigo-500" /> : <ToggleLeft size={32} className="text-neutral-400" />}
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
                    <button
                      type="button"
                      onClick={() => alert('Para redefinir sua senha, utilize a opção "Esqueci minha senha" na tela inicial ou contate o administrador da instituição.')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Key size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Alterar Senha</h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Credenciais protegidas</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>

                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors text-left group"
                    >
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

            <div className="flex items-center justify-between pt-4 border-t border-neutral-200/50 dark:border-neutral-800/50">
              {settingsSavedToast && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl animate-in fade-in duration-300">
                  <CheckCircle2 size={16} />
                  Configurações salvas com sucesso!
                </div>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleSaveSettings}
                  className="bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suporte UI */}
        {activeView === 'support' && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeSupportTab === 'home' && (
              <>
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
                  <button onClick={() => alert('Funcionalidade de busca em desenvolvimento.')} className="absolute inset-y-2 right-2 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors">
                    Buscar
                  </button>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { id: 'articles', icon: Book, title: 'Artigos', desc: 'Base de conhecimento', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                    { id: 'tutorials', icon: Video, title: 'Tutoriais', desc: 'Passo a passo em vídeo', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                    { id: 'community', icon: Users, title: 'Comunidade', desc: 'Fórum de professores', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                    { id: 'tickets', icon: FileCheck, title: 'Chamados', desc: 'Acompanhe seus tickets', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
                  ].map((item, idx) => (
                    <button key={idx} onClick={() => setActiveSupportTab(item.id as any)} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col items-center text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-900/5 transition-all group">
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
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Phone className="text-rose-500" />
                        Fale com a Gente
                      </h3>
                      {!isEditingSupportContact ? (
                        <button
                          onClick={() => {
                            setTempSupportContact(supportContact);
                            setIsEditingSupportContact(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Edit2 size={16} />
                          Editar
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSupportContact(tempSupportContact);
                              setIsEditingSupportContact(false);
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 size={16} /> Salvar
                          </button>
                          <button
                            onClick={() => setIsEditingSupportContact(false)}
                            className="px-3 py-1.5 text-sm font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <X size={16} /> Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    <div onClick={() => setSupportLiveChatOpen(true)} className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all hover:shadow-rose-500/40">
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

                    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300">
                          <Mail size={24} />
                        </div>
                        <div className="w-full">
                          <h4 className="font-bold text-neutral-900 dark:text-white mb-1">E-mail</h4>
                          {isEditingSupportContact ? (
                            <input
                              type="email"
                              value={tempSupportContact.email}
                              onChange={(e) => setTempSupportContact({ ...tempSupportContact, email: e.target.value })}
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2"
                            />
                          ) : (
                            <p className="text-sm text-neutral-500 mb-3">{supportContact.email}</p>
                          )}
                          {!isEditingSupportContact && (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${supportContact.email}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-1 hover:underline w-fit"
                            >
                              Enviar mensagem <ChevronRight size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                          <Phone size={24} />
                        </div>
                        <div className="w-full">
                          <h4 className="font-bold text-neutral-900 dark:text-white mb-1">WhatsApp</h4>
                          {isEditingSupportContact ? (
                            <input
                              type="text"
                              value={tempSupportContact.phone}
                              onChange={(e) => setTempSupportContact({ ...tempSupportContact, phone: e.target.value })}
                              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                            />
                          ) : (
                            <p className="text-sm text-neutral-500 mb-3">{supportContact.phone}</p>
                          )}
                          <p className="text-[11px] text-neutral-400 mb-2">Seg. a Sex. das 08h às 18h</p>
                          {!isEditingSupportContact && (
                            <a
                              href={`https://wa.me/55${supportContact.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1 hover:underline w-fit"
                            >
                              Enviar mensagem <ChevronRight size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Artigos */}
            {activeSupportTab === 'articles' && (
              selectedArticleCategory ? (
                <SupportArticlesManager
                  categoryId={selectedArticleCategory}
                  onBack={() => setSelectedArticleCategory(null)}
                />
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setActiveSupportTab('home')} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                      <ArrowLeft size={24} className="text-neutral-600 dark:text-neutral-400" />
                    </button>
                    <div>
                      <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Base de Conhecimento</h2>
                      <p className="text-neutral-500 dark:text-neutral-400">Encontre artigos e guias completos.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { id: 'primeiros-passos', title: "Primeiros Passos", count: 12, icon: Compass },
                      { id: 'gestao-notas', title: "Gestão de Notas e Frequência", count: 8, icon: BookOpen },
                      { id: 'comunicacao', title: "Comunicação com Alunos", count: 5, icon: MessageSquare },
                      { id: 'relatorios', title: "Relatórios e Análises", count: 15, icon: TrendingUp },
                      { id: 'configuracoes', title: "Configurações da Conta", count: 4, icon: Settings },
                      { id: 'troubleshooting', title: "Troubleshooting", count: 9, icon: AlertTriangle }
                    ].map((cat, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedArticleCategory(cat.id)}
                        className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                            <cat.icon size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-neutral-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.title}</h3>
                            <p className="text-sm text-neutral-500">{cat.count} artigos</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Tutoriais */}
            {activeSupportTab === 'tutorials' && (
              <SupportTutorialsManager onBack={() => setActiveSupportTab('home')} />
            )}

            {/* Comunidade */}
            {activeSupportTab === 'community' && (
              <SupportCommunityManager onBack={() => setActiveSupportTab('home')} />
            )}

            {/* Chamados */}
            {activeSupportTab === 'tickets' && (
              <SupportTicketsManager onBack={() => setActiveSupportTab('home')} />
            )}
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
                      <EducationAvatar
                        src={student.avatar}
                        name={student.name}
                        role="student"
                        size="md"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-bold text-neutral-900 dark:text-white truncate">{student.name}</h4>
                        {lastMsg && <span className="text-[10px] font-bold text-neutral-400 shrink-0 ml-2">{lastMsg.time}</span>}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate ${teacherMessages.some((m: any) => m.sender === 'student' && !m.read) ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                          {lastMsg ? (lastMsg.sender === 'teacher' ? `Você: ${lastMsg.text}` : lastMsg.text) : 'Nenhuma mensagem'}
                        </p>
                        {teacherMessages.filter((m: any) => m.sender === 'student' && !m.read).length > 0 && (
                          <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 ml-2 shadow-sm">
                            {teacherMessages.filter((m: any) => m.sender === 'student' && !m.read).length}
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
                <EducationAvatar
                  src={selectedChatStudent.avatar}
                  name={selectedChatStudent.name}
                  role="student"
                  size="sm"
                />
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

      {/* Support Live Chat Window */}
      <div className={`fixed bottom-24 right-6 w-[350px] h-[500px] max-h-[80vh] bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right z-[140] print:hidden ${supportLiveChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="shrink-0 border-b border-neutral-100 dark:border-neutral-800 p-4 flex items-center justify-between bg-gradient-to-r from-rose-500 to-pink-600 text-white relative z-10 shadow-sm">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm leading-tight">Suporte 360</h3>
              <span className="text-[10px] font-bold text-rose-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Online
              </span>
            </div>
          </div>
          <button
            onClick={() => setSupportLiveChatOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col">
          <div className="text-center text-xs font-bold text-neutral-400 mb-2">Hoje</div>
          {supportLiveChatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3.5 ${msg.sender === 'user' ? 'bg-rose-600 text-white rounded-tr-sm shadow-rose-500/20 shadow-md' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-tl-sm shadow-sm'}`}>
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={supportLiveChatInput}
              onChange={(e) => setSupportLiveChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && supportLiveChatInput.trim()) {
                  setSupportLiveChatMessages([...supportLiveChatMessages, { sender: 'user', text: supportLiveChatInput }]);
                  setSupportLiveChatInput('');
                  setTimeout(() => {
                    setSupportLiveChatMessages(prev => [...prev, { sender: 'support', text: 'Nossa equipe está analisando sua mensagem e responderá em breve.' }]);
                  }, 1000);
                }
              }}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-[24px] px-4 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-neutral-900 dark:text-white text-sm font-medium"
            />
            <button
              onClick={() => {
                if (supportLiveChatInput.trim()) {
                  setSupportLiveChatMessages([...supportLiveChatMessages, { sender: 'user', text: supportLiveChatInput }]);
                  setSupportLiveChatInput('');
                  setTimeout(() => {
                    setSupportLiveChatMessages(prev => [...prev, { sender: 'support', text: 'Nossa equipe está analisando sua mensagem e responderá em breve.' }]);
                  }, 1000);
                }
              }}
              disabled={!supportLiveChatInput.trim()}
              className="w-10 h-10 shrink-0 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:cursor-not-allowed"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
