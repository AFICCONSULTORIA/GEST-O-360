import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, ChevronRight, Award, Zap, Coins, Flame, 
  Target, TrendingUp, AlertTriangle, ShieldCheck, Mail, Gift, 
  X, CheckCircle2, Clock, BarChart3, Star, Edit2, Trash2, Printer, Send, MessageSquare, ArrowLeft,
  Key, Copy, Check, Camera, RotateCcw, Plus
} from 'lucide-react';
import { generateEnrollmentCode } from '../../lib/api/education';
import { EducationAvatar, optimizeAvatarImage } from './components/EducationAvatar';

const MOCK_SUBJECTS = [
  { id: 1, name: 'Matemática', color: 'bg-blue-500' },
  { id: 2, name: 'Português', color: 'bg-emerald-500' },
  { id: 3, name: 'Ciências', color: 'bg-amber-500' },
  { id: 4, name: 'História', color: 'bg-rose-500' },
  { id: 5, name: 'Geografia', color: 'bg-purple-500' },
];

const MOCK_CLASSES = [
  { id: 1, name: 'Turma 4A', subjects: ['Matemática', 'Português', 'Ciências'], studentCount: 15, avgGrade: 8.5 },
  { id: 2, name: 'Turma 5B', subjects: ['Matemática', 'Geografia'], studentCount: 12, avgGrade: 7.2 },
];

const MOCK_STUDENTS = [
  { id: 1, classId: 1, enrollmentId: 'MAR002', password: '123', name: 'Mariana Santos', email: 'mariana.santos@escola.gov.br', level: 8, xp: 2100, nextLevelXp: 2500, coins: 650, streak: 21, avatar: '', status: 'Excelente', grade: 9.5, completedTrails: 4, subjectGrades: [{ subject: 'Matemática', grade: 9.5, xp: 1100, streak: 10 }, { subject: 'Português', grade: 9.5, xp: 1000, streak: 11 }], evaluations: [{ subject: 'Matemática', bimonthly: ['A', 'A', 'A', null], absences: 2 }, { subject: 'Português', bimonthly: ['A', 'ED', 'A', null], absences: 0 }, { subject: 'Ciências', bimonthly: ['A', 'A', 'ED', null], absences: 1 }], feedback: 'Mariana demonstra excelente compreensão matemática e avançou muito na leitura neste bimestre. É colaborativa e muito participativa nas aulas.', messages: [{ sender: 'teacher', text: 'Olá Mariana, parabéns pelas ótimas notas neste bimestre!', time: '10:00' }, { sender: 'student', text: 'Muito obrigada, professor!', time: '10:15' }] },
  { id: 2, classId: 1, enrollmentId: 'ART001', password: '123', name: 'Arthur da Silva', email: 'arthur.silva@escola.gov.br', level: 7, xp: 1850, nextLevelXp: 2000, coins: 450, streak: 12, avatar: '', status: 'Excelente', grade: 8.8, completedTrails: 3, subjectGrades: [{ subject: 'Matemática', grade: 8.8, xp: 950, streak: 5 }, { subject: 'Ciências', grade: 8.8, xp: 900, streak: 7 }], evaluations: [{ subject: 'Matemática', bimonthly: ['A', 'ED', 'A', null], absences: 1 }, { subject: 'Português', bimonthly: ['ED', 'ED', 'A', null], absences: 2 }, { subject: 'Ciências', bimonthly: ['A', 'A', 'A', null], absences: 0 }], feedback: 'Arthur é curioso e adora ciências. Melhorou bastante sua concentração nas últimas semanas.', messages: [] },
  { id: 3, classId: 1, enrollmentId: 'LUC003', password: '123', name: 'Lucas Oliveira', email: 'lucas.oliveira@escola.gov.br', level: 5, xp: 1200, nextLevelXp: 1500, coins: 200, streak: 4, avatar: '', status: 'Atenção', grade: 6.5, completedTrails: 1, subjectGrades: [{ subject: 'Matemática', grade: 6.0, xp: 500, streak: 1 }, { subject: 'Português', grade: 7.0, xp: 700, streak: 3 }], evaluations: [{ subject: 'Matemática', bimonthly: ['ED', 'NA', 'ED', null], absences: 6 }, { subject: 'Português', bimonthly: ['ED', 'ED', 'ED', null], absences: 5 }, { subject: 'Ciências', bimonthly: ['A', 'ED', 'A', null], absences: 2 }], feedback: 'Lucas precisa de mais atenção e apoio em matemática. Tem faltado um pouco mais que o normal, o que impacta no seu ritmo.', messages: [{ sender: 'teacher', text: 'Lucas, notei que faltou nas últimas aulas. Precisa de alguma ajuda com o material?', time: '09:30' }] },
  { id: 4, classId: 2, enrollmentId: 'ENZ004', password: '123', name: 'Enzo Costa', email: 'enzo.costa@escola.gov.br', level: 3, xp: 500, nextLevelXp: 800, coins: 50, streak: 1, avatar: '', status: 'Em Risco', grade: 4.2, completedTrails: 0, subjectGrades: [{ subject: 'Geografia', grade: 4.2, xp: 500, streak: 1 }], evaluations: [{ subject: 'Matemática', bimonthly: ['NA', 'NA', 'NA', null], absences: 12 }, { subject: 'Geografia', bimonthly: ['ED', 'NA', 'NA', null], absences: 10 }], feedback: 'Enzo está com muitas faltas, o que prejudicou severamente seu aprendizado neste bimestre. A coordenação já foi acionada para contato com os responsáveis.', messages: [] },
  { id: 5, classId: 2, enrollmentId: 'BEA005', password: '123', name: 'Beatriz Almeida', email: 'beatriz.almeida@escola.gov.br', level: 6, xp: 1600, nextLevelXp: 2000, coins: 300, streak: 8, avatar: '', status: 'Excelente', grade: 9.0, completedTrails: 2, subjectGrades: [{ subject: 'Geografia', grade: 9.0, xp: 1600, streak: 8 }], evaluations: [{ subject: 'Matemática', bimonthly: ['A', 'A', 'A', null], absences: 0 }, { subject: 'Geografia', bimonthly: ['A', 'A', 'A', null], absences: 0 }], feedback: 'Beatriz é uma aluna exemplar. Sempre disposta a ajudar os colegas.', messages: [] },
  { id: 6, classId: 2, enrollmentId: 'JOA006', password: '123', name: 'João Pedro', email: 'joao.pedro@escola.gov.br', level: 4, xp: 950, nextLevelXp: 1200, coins: 150, streak: 2, avatar: '', status: 'Atenção', grade: 7.0, completedTrails: 1, subjectGrades: [{ subject: 'Geografia', grade: 7.0, xp: 950, streak: 2 }], evaluations: [{ subject: 'Matemática', bimonthly: ['ED', 'ED', 'A', null], absences: 4 }, { subject: 'Geografia', bimonthly: ['A', 'ED', 'ED', null], absences: 2 }], feedback: 'João Pedro começou o ano com algumas dificuldades em se organizar, mas apresentou melhora neste último bimestre.', messages: [] },
];

export const TeacherStudentManager = () => {
  const [classes, setClasses] = useState<any[]>(() => {
    const saved = localStorage.getItem('gestao360_classes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return MOCK_CLASSES;
  });

  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('gestao360_students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garante que alunos salvos tenham enrollmentId padronizado e password
        return parsed.map((s: any, idx: number) => ({
          ...s,
          enrollmentId: s.enrollmentId || generateEnrollmentCode(s.name, idx + 1),
          password: s.password || '123'
        }));
      } catch (e) {
        return MOCK_STUDENTS;
      }
    }
    return MOCK_STUDENTS;
  });

  useEffect(() => {
    localStorage.setItem('gestao360_classes', JSON.stringify(classes));
    window.dispatchEvent(new CustomEvent('classes-updated'));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('gestao360_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    const handleSelectStudent = (e: any) => {
      const studentId = e.detail;
      const found = students.find((s: any) => s.id === studentId || String(s.id) === String(studentId));
      if (found) {
        setSelectedStudent(found);
      }
    };
    window.addEventListener('select-teacher-student', handleSelectStudent);
    return () => window.removeEventListener('select-teacher-student', handleSelectStudent);
  }, [students]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | 'all'>('all');
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ 
    name: '', 
    enrollmentId: '', 
    classId: 1,
    password: '123',
    avatar: ''
  });
  const [isProcessingStudentPhoto, setIsProcessingStudentPhoto] = useState(false);
  const newStudentPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const editStudentPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [createdStudentCredentials, setCreatedStudentCredentials] = useState<any | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [newClassData, setNewClassData] = useState({ name: '', subjects: [] as string[] });
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [subjectsList, setSubjectsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('gestao360_subjects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return MOCK_SUBJECTS;
  });

  useEffect(() => {
    localStorage.setItem('gestao360_subjects', JSON.stringify(subjectsList));
    window.dispatchEvent(new CustomEvent('subjects-updated'));
  }, [subjectsList]);

  const [inlineNewSubjectName, setInlineNewSubjectName] = useState('');

  const handleQuickAddSubject = () => {
    const trimmed = inlineNewSubjectName.trim();
    if (!trimmed) return;
    
    let existing = subjectsList.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!existing) {
      const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500', 'bg-pink-500', 'bg-violet-500', 'bg-lime-500'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      existing = {
        id: Date.now(),
        name: trimmed,
        color: randomColor
      };
      setSubjectsList(prev => [...prev, existing]);
    }
    
    if (!newClassData.subjects.includes(existing.name)) {
      setNewClassData(prev => ({
        ...prev,
        subjects: [...prev.subjects, existing.name]
      }));
    }
    
    setInlineNewSubjectName('');
    showToast(`Disciplina "${existing.name}" incluída na turma!`, 'success');
  };
  const [isNewSubjectModalOpen, setIsNewSubjectModalOpen] = useState(false);
  const [newSubjectData, setNewSubjectData] = useState({ name: '', color: 'bg-indigo-500' });
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error' | 'info'}>({ show: false, message: '', type: 'success' });
  const [reportCardStudent, setReportCardStudent] = useState<any>(null);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSort, setFilterSort] = useState<string>('name');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, id: number | null}>({ show: false, id: null });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleEditClass = (cls: any) => {
    setEditingClassId(cls.id);
    setNewClassData({ name: cls.name, subjects: cls.subjects });
    setIsNewClassModalOpen(true);
  };

  const confirmDeleteClass = (id: number) => {
    setDeleteConfirmation({ show: true, id });
  };

  const handleEditFeedback = () => {
    setFeedbackText(reportCardStudent.feedback || '');
    setIsEditingFeedback(true);
  };

  const handleSaveFeedback = () => {
    setStudents(students.map(s => 
      s.id === reportCardStudent.id 
        ? { ...s, feedback: feedbackText }
        : s
    ));
    setReportCardStudent({ ...reportCardStudent, feedback: feedbackText });
    setIsEditingFeedback(false);
    showToast('Parecer descritivo atualizado com sucesso!', 'success');
  };

  const executeDeleteClass = () => {
    if (deleteConfirmation.id) {
      setClasses(classes.filter(c => c.id !== deleteConfirmation.id));
      if (selectedClassId === deleteConfirmation.id) setSelectedClassId('all');
      showToast('Turma excluída com sucesso!', 'success');
    }
    setDeleteConfirmation({ show: false, id: null });
  };

  const handleNewStudentPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingStudentPhoto(true);
      const optimized = await optimizeAvatarImage(file, 360, 0.85);
      setNewStudentData(prev => ({ ...prev, avatar: optimized }));
      showToast('Foto do aluno anexada!', 'success');
    } catch (err) {
      showToast('Erro ao carregar foto do aluno', 'error');
    } finally {
      setIsProcessingStudentPhoto(false);
      if (newStudentPhotoInputRef.current) newStudentPhotoInputRef.current.value = '';
    }
  };

  const handleEditStudentPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;
    try {
      setIsProcessingStudentPhoto(true);
      const optimized = await optimizeAvatarImage(file, 360, 0.85);
      const updated = students.map(s => s.id === selectedStudent.id ? { ...s, avatar: optimized } : s);
      setStudents(updated);
      setSelectedStudent({ ...selectedStudent, avatar: optimized });
      localStorage.setItem('gestao360_students', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('students-updated'));
      showToast('Foto do aluno atualizada com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao carregar foto do aluno', 'error');
    } finally {
      setIsProcessingStudentPhoto(false);
      if (editStudentPhotoInputRef.current) editStudentPhotoInputRef.current.value = '';
    }
  };

  const handleResetSelectedStudentPhoto = () => {
    if (!selectedStudent) return;
    const updated = students.map(s => s.id === selectedStudent.id ? { ...s, avatar: '' } : s);
    setStudents(updated);
    setSelectedStudent({ ...selectedStudent, avatar: '' });
    localStorage.setItem('gestao360_students', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('students-updated'));
    showToast('Ícone padrão do aluno restaurado!', 'success');
  };
  // Filtrar alunos pela turma selecionada e busca
  const classStudents = selectedClassId === 'all' 
    ? students 
    : students.filter(s => s.classId === selectedClassId);
    
  let filteredStudents = classStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (filterStatus !== 'all') {
    filteredStudents = filteredStudents.filter(s => s.status === filterStatus);
  }

  filteredStudents.sort((a, b) => {
    if (filterSort === 'name') return a.name.localeCompare(b.name);
    if (filterSort === 'xp_desc') return b.xp - a.xp;
    if (filterSort === 'grade_desc') return b.grade - a.grade;
    return 0;
  });

  // Ordenar por XP para o Ranking (baseado na turma filtrada)
  const rankedStudents = [...classStudents].sort((a, b) => b.xp - a.xp);
  const top3 = rankedStudents.slice(0, 3);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Excelente': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
      case 'Atenção': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case 'Em Risco': return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-200';
    }
  };

  const renderPodium = () => {
    if (top3.length < 3) return null;
    
    const positions = [
      { student: top3[1], rank: 2, height: 'h-32', color: 'from-slate-300 to-slate-400', shadow: 'shadow-slate-400/50' }, // 2nd
      { student: top3[0], rank: 1, height: 'h-40', color: 'from-amber-300 to-amber-500', shadow: 'shadow-amber-500/50', isFirst: true }, // 1st
      { student: top3[2], rank: 3, height: 'h-24', color: 'from-amber-700 to-amber-800', shadow: 'shadow-amber-800/50' }, // 3rd
    ];

    return (
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-8 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col items-center justify-end h-[350px] relative overflow-hidden">
        <div className="absolute top-4 left-6">
          <h3 className="font-black text-xl text-neutral-900 dark:text-white flex items-center gap-2">
            <Award className="text-amber-500" size={24} />
            Top 3 da Turma
          </h3>
          <p className="text-sm text-neutral-500">Ranking por XP acumulado</p>
        </div>

        <div className="flex items-end justify-center gap-4 sm:gap-8 w-full mt-12">
          {positions.map(({ student, rank, height, color, shadow, isFirst }) => (
            <div key={student.id} className="flex flex-col items-center group cursor-pointer" onClick={() => setSelectedStudent(student)}>
              {/* Avatar & Info */}
              <div className={`flex flex-col items-center transition-transform duration-300 group-hover:-translate-y-2 ${isFirst ? 'mb-4' : 'mb-2'}`}>
                {isFirst && <Star className="text-amber-400 mb-2 animate-[spin_4s_linear_infinite]" size={24} fill="currentColor" />}
                <div className={`relative ${isFirst ? 'w-20 h-20' : 'w-16 h-16'} rounded-full p-1 bg-gradient-to-tr ${color} shadow-lg ${shadow} flex items-center justify-center`}>
                  <EducationAvatar 
                    src={student.avatar} 
                    name={student.name} 
                    role="student" 
                    size={isFirst ? 'lg' : 'md'} 
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center font-black text-sm shadow-sm border border-neutral-100 dark:border-neutral-700">
                    #{rank}
                  </div>
                </div>
                <span className="font-bold text-neutral-900 dark:text-white mt-3 text-sm">{student.name.split(' ')[0]}</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{student.xp} XP</span>
              </div>
              
              {/* Podium Block */}
              <div className={`w-20 sm:w-28 ${height} rounded-t-2xl bg-gradient-to-t ${color} shadow-inner opacity-90 relative overflow-hidden flex justify-center`}>
                <div className="absolute inset-0 bg-white/20"></div>
                <div className="w-full h-2 bg-white/40 absolute top-0"></div>
                <span className="font-black text-4xl text-white/50 mt-4">{rank}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative print:hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Users className="text-indigo-500" size={32} />
            Gestão de Alunos
          </h2>
          <p className="text-neutral-500 mt-1 text-lg">Acompanhe o desempenho, XP e perfil da turma em tempo real.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-2">

            <button
              onClick={() => setIsNewSubjectModalOpen(true)}
              className="px-4 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-sm transition-colors whitespace-nowrap"
            >
              + Nova Disciplina
            </button>
            <button
              onClick={() => setIsNewClassModalOpen(true)}
              className="px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
            >
              + Nova Turma
            </button>
            <button 
              onClick={() => setIsNewStudentModalOpen(true)}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/30 whitespace-nowrap"
            >
              + Cadastrar Aluno
            </button>
          </div>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80 pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-neutral-900 dark:text-white placeholder-neutral-400 shadow-sm"
          />
          </div>
        </div>
      </div>

      {/* Class Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setSelectedClassId('all')}
          className={`shrink-0 px-6 py-3 rounded-2xl font-bold transition-all border ${selectedClassId === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300'}`}
        >
          Todas as Turmas
        </button>
        {classes.map(cls => (
          <div className="relative group shrink-0" key={cls.id}>
            <button 
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-6 py-3 rounded-2xl font-bold transition-all border ${selectedClassId === cls.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300'}`}
            >
              {cls.name}
            </button>
            {selectedClassId === cls.id && (
              <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 p-1">
                 <button className="p-1 text-neutral-500 hover:text-indigo-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleEditClass(cls); }} title="Editar turma"><Edit2 size={14}/></button>
                 <button className="p-1 text-neutral-500 hover:text-rose-500 transition-colors" onClick={(e) => { e.stopPropagation(); confirmDeleteClass(cls.id); }} title="Excluir turma"><Trash2 size={14}/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Class Summary Widget */}
      {selectedClassId !== 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users size={28} />
            </div>
            <div>
              <p className="text-neutral-500 font-bold text-sm">Alunos na Turma</p>
              <h4 className="text-2xl font-black text-neutral-900 dark:text-white">{MOCK_CLASSES.find(c => c.id === selectedClassId)?.studentCount}</h4>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BarChart3 size={28} />
            </div>
            <div>
              <p className="text-neutral-500 font-bold text-sm">Média da Turma</p>
              <h4 className="text-2xl font-black text-neutral-900 dark:text-white">{MOCK_CLASSES.find(c => c.id === selectedClassId)?.avgGrade.toFixed(1)}</h4>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap size={28} />
            </div>
            <div>
              <p className="text-neutral-500 font-bold text-sm">XP Total da Turma</p>
              <h4 className="text-2xl font-black text-neutral-900 dark:text-white">{classStudents.reduce((acc, curr) => acc + curr.xp, 0).toLocaleString()}</h4>
            </div>
          </div>
        </div>
      )}

      {/* Podium Section */}
      {renderPodium()}

      {/* Student List */}
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/50">
          <h3 className="font-black text-lg text-neutral-900 dark:text-white">Lista de Alunos</h3>
          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-indigo-600 transition-colors bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm"
            >
              <Filter size={16} />
              Filtros
            </button>
            
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 z-50 p-4 space-y-4 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Status</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 outline-none text-sm font-medium text-neutral-900 dark:text-white"
                    >
                      <option value="all">Todos</option>
                      <option value="Excelente">Excelente</option>
                      <option value="Atenção">Atenção</option>
                      <option value="Em Risco">Em Risco</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Ordenar por</label>
                    <select 
                      value={filterSort}
                      onChange={(e) => setFilterSort(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 outline-none text-sm font-medium text-neutral-900 dark:text-white"
                    >
                      <option value="name">Nome (A-Z)</option>
                      <option value="xp_desc">Maior XP</option>
                      <option value="grade_desc">Maior Média</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/30 text-xs font-black text-neutral-500 uppercase tracking-widest">
                <th className="p-4 pl-6">Aluno</th>
                <th className="p-4">Progresso / XP</th>
                <th className="p-4">Engajamento</th>
                <th className="p-4">Média / Status</th>
                <th className="p-4 text-right pr-6">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(student)}>
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <EducationAvatar 
                          src={student.avatar} 
                          name={student.name} 
                          role="student" 
                          size="sm" 
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[10px] font-black text-white">
                          {student.level}
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{student.name}</p>
                        <p className="text-xs text-neutral-500">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">{student.xp.toLocaleString()}</span>
                      <span className="text-xs text-neutral-400">/ {student.nextLevelXp.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5" title="Moedas">
                        <Coins size={16} className="text-amber-500" />
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">{student.coins}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Ofensiva">
                        <Flame size={16} className="text-rose-500" />
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">{student.streak} dias</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-black text-neutral-900 dark:text-white">Nota: {student.grade.toFixed(1)}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusColor(student.status)}`}>
                        {student.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors ml-auto">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-12 text-center text-neutral-500">
              Nenhum aluno encontrado para "{searchQuery}".
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Student Profile Modal/Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStudent(null)}></div>
          
          <div className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200/50 dark:border-neutral-800 animate-in slide-in-from-right duration-300 flex flex-col overflow-y-auto">
            <input 
              ref={editStudentPhotoInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleEditStudentPhoto} 
              className="hidden" 
            />
            
            {/* Header / Cover */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-sky-600 p-6 flex flex-col justify-between shrink-0">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="mt-auto flex items-end gap-4">
                <div className="relative p-1 rounded-2xl bg-white dark:bg-neutral-800 shadow-xl -mb-12 flex items-center justify-center">
                  <EducationAvatar 
                    src={selectedStudent.avatar} 
                    name={selectedStudent.name} 
                    role="student" 
                    size="xl" 
                  />
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-black text-white text-xs">
                    {selectedStudent.level}
                  </div>
                  <button
                    type="button"
                    onClick={() => editStudentPhotoInputRef.current?.click()}
                    disabled={isProcessingStudentPhoto}
                    title="Alterar foto do aluno"
                    className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    <Camera size={14} />
                  </button>
                </div>
                <div className="text-white pb-2 flex-1 min-w-0">
                  <h2 className="font-black text-2xl leading-none shadow-black/50 drop-shadow-md truncate">{selectedStudent.name}</h2>
                  <p className="font-medium text-indigo-100 text-sm mt-1 truncate">{selectedStudent.email}</p>
                  {selectedStudent.avatar && (
                    <button
                      type="button"
                      onClick={handleResetSelectedStudentPhoto}
                      className="mt-2 text-[10px] font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      Usar Ícone Padrão
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Body */}
            <div className="flex-1 p-6 pt-16 space-y-8">
              
              {/* Level & XP */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Target size={18} className="text-indigo-500" />
                    Progresso de Nível
                  </h4>
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{Math.round((selectedStudent.xp / selectedStudent.nextLevelXp) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full relative" 
                    style={{ width: `${(selectedStudent.xp / selectedStudent.nextLevelXp) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-bold text-neutral-400">
                  <span>{selectedStudent.xp.toLocaleString()} XP Atuais</span>
                  <span>{selectedStudent.nextLevelXp.toLocaleString()} XP para Nível {selectedStudent.level + 1}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Coins size={18} />
                    <span className="font-black text-sm uppercase tracking-wider">Moedas</span>
                  </div>
                  <span className="font-black text-2xl text-neutral-900 dark:text-white">{selectedStudent.coins}</span>
                </div>
                
                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-500 mb-1">
                    <Flame size={18} />
                    <span className="font-black text-sm uppercase tracking-wider">Ofensiva</span>
                  </div>
                  <span className="font-black text-2xl text-neutral-900 dark:text-white">{selectedStudent.streak} dias</span>
                </div>

                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-500 mb-1">
                    <CheckCircle2 size={18} />
                    <span className="font-black text-sm uppercase tracking-wider">Trilhas</span>
                  </div>
                  <span className="font-black text-2xl text-neutral-900 dark:text-white">{selectedStudent.completedTrails} conc.</span>
                </div>
                
                <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center gap-2 text-sky-500 mb-1">
                    <BarChart3 size={18} />
                    <span className="font-black text-sm uppercase tracking-wider">Média Geral</span>
                  </div>
                  <span className="font-black text-2xl text-neutral-900 dark:text-white">{selectedStudent.grade.toFixed(1)}</span>
                </div>
              </div>

              {/* Desempenho por Disciplina */}
              {selectedStudent.subjectGrades && selectedStudent.subjectGrades.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <h4 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-indigo-500" />
                    Desempenho por Disciplina
                  </h4>
                  {selectedStudent.subjectGrades.map((sg: any, idx: number) => {
                    const subjectInfo = subjectsList.find(s => s.name === sg.subject);
                    const color = subjectInfo?.color || 'bg-neutral-500';
                    
                    return (
                      <div key={idx} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-10 rounded-full ${color}`} />
                          <div>
                            <h5 className="font-bold text-neutral-900 dark:text-white">{sg.subject}</h5>
                            <div className="flex items-center gap-3 text-xs font-bold text-neutral-400 mt-1">
                              <span className="flex items-center gap-1"><Zap size={12} className="text-indigo-400" /> {sg.xp} XP</span>
                              <span className="flex items-center gap-1"><Flame size={12} className="text-rose-400" /> {sg.streak} dias</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-black ${sg.grade >= 7 ? 'text-emerald-500' : sg.grade >= 5 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {sg.grade.toFixed(1)}
                          </div>
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Média</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status Alert */}
              {selectedStudent.status !== 'Excelente' && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${selectedStudent.status === 'Em Risco' ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-900/50 dark:text-rose-300' : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-900/50 dark:text-amber-300'}`}>
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-black text-sm mb-1">Status: {selectedStudent.status}</h5>
                    <p className="text-xs font-medium opacity-80">
                      {selectedStudent.status === 'Em Risco' 
                        ? 'O aluno está com notas muito abaixo da média e não acessa o portal há vários dias. Recomendado intervenção direta.' 
                        : 'O aluno apresentou uma queda recente de rendimento. Pode ser necessário revisar os últimos módulos com ele.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button 
                  onClick={() => {
                    setSelectedStudent(null);
                    window.dispatchEvent(new CustomEvent('open-teacher-chat', { detail: selectedStudent.id }));
                  }}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/30"
                >
                  <Mail size={18} />
                  Enviar Mensagem Direta
                </button>
                <div className="flex gap-3">
                  <button className="flex-1 py-3.5 px-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-amber-200 dark:border-amber-500/30">
                    <Gift size={18} />
                    Dar Moedas
                  </button>
                  <button 
                    onClick={() => setReportCardStudent(selectedStudent)}
                    className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    Ver Boletim
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Cadastro de Aluno Modal */}
      {isNewStudentModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsNewStudentModalOpen(false)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Cadastrar Aluno</h3>
                <p className="text-xs text-neutral-500 mt-0.5">A matrícula é gerada automaticamente no padrão oficial</p>
              </div>
              <button 
                onClick={() => setIsNewStudentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!newStudentData.name.trim()) {
                showToast('Informe o nome do aluno', 'error');
                return;
              }

              const finalCode = newStudentData.enrollmentId || generateEnrollmentCode(newStudentData.name, students.length + 1);
              const finalPass = newStudentData.password || '123';

              const newStudent = {
                id: Date.now(),
                classId: newStudentData.classId,
                enrollmentId: finalCode,
                password: finalPass,
                name: newStudentData.name.trim(),
                email: `${newStudentData.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@escola.gov.br`,
                level: 1,
                xp: 0,
                nextLevelXp: 500,
                coins: 50,
                streak: 0,
                avatar: newStudentData.avatar || '',
                status: 'Excelente',
                grade: 10,
                completedTrails: 0,
                subjectGrades: [],
                evaluations: [],
                feedback: 'Aluno matriculado com sucesso na rede municipal.',
                messages: []
              };

              const updatedStudents = [newStudent, ...students];
              setStudents(updatedStudents);
              localStorage.setItem('gestao360_students', JSON.stringify(updatedStudents));
              window.dispatchEvent(new CustomEvent('students-updated'));

              setIsNewStudentModalOpen(false);
              setNewStudentData({ name: '', enrollmentId: '', classId: 1, password: '123', avatar: '' });
              setCreatedStudentCredentials(newStudent);
              showToast('Aluno cadastrado com sucesso!', 'success');
            }}>
              {/* Foto ou Ícone Padrão */}
              <input 
                ref={newStudentPhotoInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleNewStudentPhoto} 
                className="hidden" 
              />
              <div className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <EducationAvatar 
                  src={newStudentData.avatar} 
                  name={newStudentData.name || 'Aluno'} 
                  role="student" 
                  size="md" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {newStudentData.avatar ? 'Foto personalizada anexada' : 'Ícone Padrão Escolar'}
                  </p>
                  <p className="text-[11px] text-neutral-400">Padrão institucional ou foto do aluno</p>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => newStudentPhotoInputRef.current?.click()}
                      disabled={isProcessingStudentPhoto}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={13} />
                      {newStudentData.avatar ? 'Trocar Foto' : 'Adicionar Foto'}
                    </button>
                    {newStudentData.avatar && (
                      <button
                        type="button"
                        onClick={() => setNewStudentData(prev => ({ ...prev, avatar: '' }))}
                        className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        Ícone Padrão
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome Completo do Aluno</label>
                <input 
                  type="text" 
                  required
                  value={newStudentData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCode = generateEnrollmentCode(name, students.length + 1);
                    setNewStudentData({
                      ...newStudentData,
                      name,
                      enrollmentId: autoCode
                    });
                  }}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-neutral-900 dark:text-white"
                  placeholder="Ex: Arthur da Silva"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">
                    🎟️ Matrícula (3 Letras + 3 Dígitos)
                  </label>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">Automática</span>
                </div>
                <input 
                  type="text" 
                  required
                  value={newStudentData.enrollmentId}
                  onChange={(e) => setNewStudentData({...newStudentData, enrollmentId: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-lg"
                  placeholder="Ex: ART001"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  🔑 Senha Inicial de Acesso
                </label>
                <input 
                  type="text" 
                  required
                  value={newStudentData.password}
                  onChange={(e) => setNewStudentData({...newStudentData, password: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-neutral-900 dark:text-white"
                  placeholder="Padrão: 123"
                />
                <p className="text-[11px] text-neutral-400 mt-1">O aluno usará esta senha no Portal da Educação.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Turma de Destino</label>
                <select 
                  value={newStudentData.classId}
                  onChange={(e) => setNewStudentData({...newStudentData, classId: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-neutral-900 dark:text-white"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewStudentModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
                >
                  Gerar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Comprovante de Credenciais Criadas */}
      {createdStudentCredentials && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/70 backdrop-blur-md" onClick={() => setCreatedStudentCredentials(null)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl border-2 border-indigo-500/30 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Credenciais Geradas!</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-6">
              Entregue estas informações ao aluno ou responsável para acessar o Portal da Educação:
            </p>

            {/* Cartão de Credenciais estilo Crachá */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 dark:from-neutral-800/80 dark:to-neutral-900/80 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 text-left space-y-4 shadow-inner mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Aluno</span>
                <p className="text-base font-black text-neutral-900 dark:text-white">{createdStudentCredentials.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">🎟️ Matrícula</span>
                  <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-wider">{createdStudentCredentials.enrollmentId}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">🔑 Senha</span>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-wider">{createdStudentCredentials.password}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
                <span className="text-[10px] font-bold text-neutral-500">Link de Acesso: <span className="font-semibold text-neutral-700 dark:text-neutral-300">/educacao</span></span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const text = `*PORTAL DA EDUCAÇÃO 360*\nAluno: ${createdStudentCredentials.name}\nMatrícula: ${createdStudentCredentials.enrollmentId}\nSenha: ${createdStudentCredentials.password}\nAcesse: /educacao`;
                  navigator.clipboard.writeText(text);
                  setCopiedCredentials(true);
                  showToast('Credenciais copiadas!', 'success');
                  setTimeout(() => setCopiedCredentials(false), 2500);
                }}
                className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedCredentials ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                <span>{copiedCredentials ? 'Copiado!' : 'Copiar Dados'}</span>
              </button>
              <button 
                onClick={() => setCreatedStudentCredentials(null)}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cadastro de Turma Modal */}
      {isNewClassModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsNewClassModalOpen(false)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Cadastrar Turma</h3>
              <button 
                onClick={() => setIsNewClassModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (editingClassId) {
                setClasses(classes.map(c => c.id === editingClassId ? { ...c, name: newClassData.name, subjects: newClassData.subjects } : c));
                showToast('Turma atualizada com sucesso!', 'success');
                setEditingClassId(null);
              } else {
                const newClass = {
                  id: classes.length + 1,
                  name: newClassData.name,
                  subjects: newClassData.subjects,
                  studentCount: 0,
                  avgGrade: 0
                };
                setClasses([...classes, newClass]);
                showToast('Turma cadastrada com sucesso!', 'success');
              }
              setIsNewClassModalOpen(false);
              setNewClassData({ name: '', subjects: [] });
            }}>
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome da Turma</label>
                <input 
                  type="text" 
                  required
                  value={newClassData.name}
                  onChange={(e) => setNewClassData({...newClassData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-neutral-900 dark:text-white"
                  placeholder="Ex: Turma 6C"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Disciplinas da Turma</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {subjectsList.map(sub => (
                    <label key={sub.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={newClassData.subjects.includes(sub.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewClassData({...newClassData, subjects: [...newClassData.subjects, sub.name]});
                          } else {
                            setNewClassData({...newClassData, subjects: newClassData.subjects.filter(s => s !== sub.name)});
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${sub.color}`} />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{sub.name}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Inserir Outra Disciplina Diretamente na Criação da Turma */}
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Adicionar Outra Disciplina à Turma
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Robótica, Inglês, Filosofia..."
                      value={inlineNewSubjectName}
                      onChange={(e) => setInlineNewSubjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddSubject();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddSubject}
                      className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewClassModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-colors"
                >
                  {editingClassId ? 'Salvar Alterações' : 'Cadastrar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cadastro de Disciplina Modal */}
      {isNewSubjectModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsNewSubjectModalOpen(false)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Cadastrar Disciplina</h3>
              <button 
                onClick={() => setIsNewSubjectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const newSub = {
                id: subjectsList.length + 1,
                name: newSubjectData.name,
                color: newSubjectData.color
              };
              setSubjectsList([...subjectsList, newSub]);
              setIsNewSubjectModalOpen(false);
              setNewSubjectData({ name: '', color: 'bg-indigo-500' });
              showToast('Disciplina cadastrada com sucesso!', 'success');
            }}>
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome da Disciplina</label>
                <input 
                  type="text" 
                  required
                  value={newSubjectData.name}
                  onChange={(e) => setNewSubjectData({...newSubjectData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-neutral-900 dark:text-white"
                  placeholder="Ex: Física"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">Cor de Identificação</label>
                <div className="flex flex-wrap gap-3">
                  {['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-pink-500'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewSubjectData({...newSubjectData, color})}
                      className={`w-8 h-8 rounded-full ${color} ${newSubjectData.color === color ? 'ring-4 ring-offset-2 dark:ring-offset-neutral-900 ring-neutral-400' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewSubjectModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-colors"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Relatório de Avaliação (Boletim) Modal */}
      {reportCardStudent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 print:absolute print:inset-0 print:block print:p-0 print:bg-white">
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm print:hidden" onClick={() => setReportCardStudent(null)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-5xl max-h-[90vh] relative shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-200 dark:border-neutral-800 print:shadow-none print:border-none print:rounded-none print:max-w-none print:max-h-none print:h-auto print:overflow-visible print:bg-white">
            
            {/* Header */}
            <div className="shrink-0 border-b border-neutral-100 dark:border-neutral-800 p-6 flex justify-between items-start bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 p-1 flex items-center justify-center">
                  <EducationAvatar 
                    src={reportCardStudent.avatar} 
                    name={reportCardStudent.name} 
                    role="student" 
                    size="lg" 
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white leading-none mb-1">{reportCardStudent.name}</h2>
                  <div className="flex gap-3 text-sm font-bold text-neutral-500 dark:text-neutral-400">
                    <span>Matrícula: {reportCardStudent.id.toString().padStart(6, '0')}</span>
                    <span>•</span>
                    <span>Turma: {classes.find(c => c.id === reportCardStudent.classId)?.name}</span>
                    <span>•</span>
                    <span>Ano Letivo: {new Date().getFullYear()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 print:hidden">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button 
                  onClick={() => {
                    setReportCardStudent(null);
                    setIsEditingFeedback(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Tabela Bimestral */}
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="text-indigo-500" />
                  Matriz de Habilidades e Competências
                </h3>
                
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                        <th className="py-4 px-4 font-bold text-neutral-500 dark:text-neutral-400 text-sm w-1/4">Disciplina / Área</th>
                        <th className="py-4 px-2 font-bold text-neutral-500 dark:text-neutral-400 text-sm text-center">1º Bim</th>
                        <th className="py-4 px-2 font-bold text-neutral-500 dark:text-neutral-400 text-sm text-center">2º Bim</th>
                        <th className="py-4 px-2 font-bold text-neutral-500 dark:text-neutral-400 text-sm text-center">3º Bim</th>
                        <th className="py-4 px-2 font-bold text-neutral-500 dark:text-neutral-400 text-sm text-center">4º Bim</th>
                        <th className="py-4 px-4 font-bold text-neutral-500 dark:text-neutral-400 text-sm text-center">Faltas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {reportCardStudent.evaluations?.map((ev: any, idx: number) => (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="py-4 px-4 font-bold text-neutral-900 dark:text-white">
                            {ev.subject}
                          </td>
                          {ev.bimonthly.map((concept: string | null, bimIdx: number) => (
                            <td key={bimIdx} className="py-4 px-2 text-center">
                              {concept ? (
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black
                                  ${concept === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                                    concept === 'ED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 
                                    'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}
                                >
                                  {concept}
                                </span>
                              ) : (
                                <span className="text-neutral-300 dark:text-neutral-600">-</span>
                              )}
                            </td>
                          ))}
                          <td className="py-4 px-4 text-center font-bold text-neutral-500 dark:text-neutral-400">
                            {ev.absences}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legenda */}
                <div className="flex gap-4 mt-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-neutral-500">A - Atingiu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-neutral-500">ED - Em Desenvolvimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-bold text-neutral-500">NA - Não Atingiu</span>
                  </div>
                </div>
              </div>

              {/* Parecer Descritivo */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Target className="text-indigo-500" />
                    Parecer Descritivo do Professor
                  </h3>
                  {!isEditingFeedback && (
                    <button 
                      onClick={handleEditFeedback}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold print:hidden"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                  )}
                </div>
                
                {isEditingFeedback ? (
                  <div className="space-y-3">
                    <textarea 
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="w-full h-32 p-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      placeholder="Digite o parecer descritivo do aluno..."
                    ></textarea>
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setIsEditingFeedback(false)}
                        className="py-2 px-4 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 font-bold rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveFeedback}
                        className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        Salvar Parecer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 rounded-2xl">
                    <p className="text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                      {reportCardStudent.feedback || "Ainda não há parecer descritivo cadastrado para este aluno no bimestre atual."}
                    </p>
                  </div>
                )}
              </div>
              
            </div>
            
            {/* Footer */}
            <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 p-6 bg-neutral-50 dark:bg-neutral-900/80 flex justify-end print:hidden">
              <button 
                onClick={() => {
                  setReportCardStudent(null);
                  setIsEditingFeedback(false);
                }}
                className="py-3 px-6 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-black rounded-xl transition-colors"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirmation({ show: false, id: null })}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 w-full max-w-sm relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Excluir Turma?</h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-8 font-medium">Tem certeza que deseja excluir esta turma? Todos os alunos perderão o vínculo e esta ação não pode ser desfeita.</p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setDeleteConfirmation({ show: false, id: null })}
                className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteClass}
                className="flex-1 py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-colors"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[150] animate-in slide-in-from-top-5 fade-in duration-300 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'}`}>
          {toast.type === 'success' && <CheckCircle2 size={20} />}
          {toast.type === 'error' && <AlertTriangle size={20} />}
          {toast.type === 'info' && <Mail size={20} />}
          {toast.message}
        </div>
      )}

      {/* Botão Flutuante Removido para o TeacherDashboard */}

    </>
  );
};
