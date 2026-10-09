import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, AlertTriangle, CheckCircle2, Clock, Plus, Search, Filter, 
  ChevronRight, Target, MessageSquare, Trash2, Edit2, X, BookOpen, 
  Sparkles, TrendingUp, Printer, FileText, Brain, Phone, Award, Check, Loader2
} from 'lucide-react';
import { EducationAvatar } from './components/EducationAvatar';
import { 
  getInterventionPlans, 
  createInterventionPlan, 
  updateInterventionPlanStatus, 
  deleteInterventionPlan,
  getTeacherStudents,
  InterventionPlanRecord
} from '../../lib/api/education';

export type InterventionPriority = 'Alta' | 'Média' | 'Baixa';
export type InterventionStatus = 'Pendente' | 'Em Andamento' | 'Concluído';
export type InterventionType = 
  | 'Reforço Contraturno' 
  | 'Adaptação Curricular' 
  | 'Apoio Psicopedagógico' 
  | 'Reunião com Família' 
  | 'Tutoria de Pares';

export interface InterventionLog {
  id: string;
  date: string;
  author: string;
  note: string;
}

export interface InterventionPlan {
  id: string;
  studentId: string | number;
  studentName: string;
  studentAvatar?: string;
  studentClass?: string;
  title: string;
  type: InterventionType;
  priority: InterventionPriority;
  status: InterventionStatus;
  diagnostic: string;
  goals: { id: string; text: string; completed: boolean }[];
  startDate: string;
  targetDate: string;
  responsibleTeacher: string;
  logs: InterventionLog[];
}

interface TeacherInterventionPlanProps {
  students: any[];
  onOpenStudent?: (studentId: string | number) => void;
  onOpenChat?: (studentId: string | number) => void;
}

const DEFAULT_INTERVENTIONS: InterventionPlan[] = [
  {
    id: 'plan-1',
    studentId: 4,
    studentName: 'Enzo Costa',
    studentAvatar: '',
    studentClass: 'Turma 5B',
    title: 'Recuperação Intensiva em Geografia e Busca Ativa',
    type: 'Reforço Contraturno',
    priority: 'Alta',
    status: 'Em Andamento',
    diagnostic: 'Nota 4.2 e 12 faltas no bimestre. Risco elevado de abandono e defasagem em conceitos básicos de relevo e clima.',
    goals: [
      { id: 'g1', text: 'Contato telefônico realizado com os responsáveis', completed: true },
      { id: 'g2', text: 'Presença confirmada em 4 aulas de reforço no contraturno', completed: true },
      { id: 'g3', text: 'Entrega das atividades práticas adaptadas', completed: false },
      { id: 'g4', text: 'Avaliação formativa de recuperação', completed: false }
    ],
    startDate: '2026-09-15',
    targetDate: '2026-10-25',
    responsibleTeacher: 'Prof. Carlos Andrade',
    logs: [
      { id: 'l1', date: '15/09/2026', author: 'Prof. Carlos', note: 'Plano aberto após fechamento da prévia bimestral com nota 4.2.' },
      { id: 'l2', date: '22/09/2026', author: 'Coordenação', note: 'Mãe compareceu à escola e justificou as faltas por questões de transporte. Aluno iniciou o contraturno.' }
    ]
  },
  {
    id: 'plan-2',
    studentId: 3,
    studentName: 'Lucas Oliveira',
    studentAvatar: '',
    studentClass: 'Turma 4A',
    title: 'Nivelamento em Frações e Resolução de Problemas',
    type: 'Adaptação Curricular',
    priority: 'Média',
    status: 'Em Andamento',
    diagnostic: 'Queda de 15% nas avaliações de Matemática (Nota 6.0). Dificuldade com operações com frações e raciocínio lógico.',
    goals: [
      { id: 'g5', text: 'Disponibilizar material lúdico e concreto sobre frações', completed: true },
      { id: 'g6', text: 'Sessão semanal de 45 minutos de tutoria assistida', completed: true },
      { id: 'g7', text: 'Realização de quiz gamificado no Portal do Aluno', completed: false }
    ],
    startDate: '2026-09-20',
    targetDate: '2026-10-30',
    responsibleTeacher: 'Prof. Carlos Andrade',
    logs: [
      { id: 'l3', date: '20/09/2026', author: 'Prof. Carlos', note: 'Lucas tem demonstrado esforço, mas precisa consolidar o conceito de MMC e frações equivalentes.' }
    ]
  },
  {
    id: 'plan-3',
    studentId: 6,
    studentName: 'João Pedro',
    studentAvatar: '',
    studentClass: 'Turma 5B',
    title: 'Organização da Rotina de Estudos e Tutoria de Pares',
    type: 'Tutoria de Pares',
    priority: 'Baixa',
    status: 'Concluído',
    diagnostic: 'Desorganização com prazos de entrega e cadernos incompletos. Potencial cognitivo preservado.',
    goals: [
      { id: 'g8', text: 'Dupla formada com Beatriz Almeida para monitoria solidária', completed: true },
      { id: 'g9', text: 'Preenchimento do planner diário escolar', completed: true },
      { id: 'g10', text: 'Supervisão semanal com o professor regente', completed: true }
    ],
    startDate: '2026-08-10',
    targetDate: '2026-09-18',
    responsibleTeacher: 'Prof. Carlos Andrade',
    logs: [
      { id: 'l4', date: '18/09/2026', author: 'Prof. Carlos', note: 'Objetivos alcançados com sucesso. João Pedro melhorou notas para média 7.0 e regularizou cadernos.' }
    ]
  }
];

export const TeacherInterventionPlan: React.FC<TeacherInterventionPlanProps> = ({
  students,
  onOpenStudent,
  onOpenChat
}) => {
  const teacherId = localStorage.getItem('gestao360_teacher_id') || '00000000-0000-0000-0000-000000000001';
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [internalStudents, setInternalStudents] = useState<any[]>(students);

  const [plans, setPlans] = useState<InterventionPlan[]>(() => {
    const saved = localStorage.getItem('gestao360_interventions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erro ao ler gestao360_interventions:', e);
      }
    }
    return DEFAULT_INTERVENTIONS;
  });

  // Keep internalStudents synced
  useEffect(() => {
    if (students && students.length > 0) {
      setInternalStudents(students);
    } else {
      getTeacherStudents(teacherId).then(data => {
        if (data && data.length > 0) {
          setInternalStudents(data);
        }
      });
    }
  }, [students, teacherId]);

  // Load plans from Supabase
  const loadPlansFromSupabase = async () => {
    setIsLoadingPlans(true);
    try {
      const dbPlans = await getInterventionPlans(teacherId);
      if (dbPlans && dbPlans.length > 0) {
        const mapped: InterventionPlan[] = dbPlans.map(p => {
          let uiStatus: InterventionStatus = 'Em Andamento';
          if (p.status === 'completed') uiStatus = 'Concluído';
          else if (p.status === 'pending') uiStatus = 'Pendente';

          const mappedGoals = (p.goals || []).map((gText, idx) => ({
            id: `g-${p.id}-${idx}`,
            text: gText,
            completed: uiStatus === 'Concluído'
          }));

          const matchedStudent = internalStudents.find(s => String(s.id) === String(p.student_id));

          return {
            id: p.id,
            studentId: p.student_id,
            studentName: p.student_name,
            studentAvatar: matchedStudent?.avatar || '',
            studentClass: matchedStudent?.classId ? `Turma ${matchedStudent.classId}` : (matchedStudent?.grade ? `${matchedStudent.grade}º Ano` : 'Ensino Fundamental'),
            title: p.intervention_plan && p.intervention_plan.length > 40 ? p.intervention_plan.slice(0, 40) + '...' : (p.intervention_plan || `Plano de Intervenção`),
            type: (['Reforço Contraturno', 'Adaptação Curricular', 'Apoio Psicopedagógico', 'Reunião com Família', 'Tutoria de Pares'].includes(p.difficulty_type)
              ? p.difficulty_type as InterventionType
              : 'Reforço Contraturno'),
            priority: 'Alta',
            status: uiStatus,
            diagnostic: p.intervention_plan || '',
            goals: mappedGoals.length > 0 ? mappedGoals : [
              { id: `g1-${p.id}`, text: 'Acompanhamento pedagógico individualizado', completed: uiStatus === 'Concluído' }
            ],
            startDate: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            targetDate: p.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            responsibleTeacher: localStorage.getItem('gestao360_teacher_name') || 'Prof. Carlos Andrade',
            logs: [
              {
                id: `l-${p.id}`,
                date: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
                author: localStorage.getItem('gestao360_teacher_name') || 'Prof. Carlos Andrade',
                note: `Plano de intervenção (${p.difficulty_type}) registrado no banco Supabase.`
              }
            ]
          };
        });

        setPlans(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar planos de intervenção no Supabase:', err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlansFromSupabase();
  }, [teacherId]);

  // Persist local backup
  useEffect(() => {
    localStorage.setItem('gestao360_interventions', JSON.stringify(plans));
  }, [plans]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<InterventionStatus | 'Todos'>('Todos');
  const [filterPriority, setFilterPriority] = useState<InterventionPriority | 'Todas'>('Todas');
  const [filterType, setFilterType] = useState<InterventionType | 'Todos'>('Todos');

  // Selected plan for details/editing modal
  const [selectedPlan, setSelectedPlan] = useState<InterventionPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // New plan form state
  const [formStudentId, setFormStudentId] = useState<string | number>('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<InterventionType>('Reforço Contraturno');
  const [formPriority, setFormPriority] = useState<InterventionPriority>('Alta');
  const [formStatus, setFormStatus] = useState<InterventionStatus>('Em Andamento');
  const [formDiagnostic, setFormDiagnostic] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formGoals, setFormGoals] = useState<string[]>(['', '']);
  const [newLogNote, setNewLogNote] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Listen for trigger-create-plan event dispatched from student list or dashboard
  useEffect(() => {
    const handleTriggerCreate = (e: any) => {
      const studentId = e.detail;
      handleOpenCreateModal(studentId);
    };
    window.addEventListener('trigger-create-plan', handleTriggerCreate);
    return () => window.removeEventListener('trigger-create-plan', handleTriggerCreate);
  }, [internalStudents]);

  // Identify students in need of intervention who do NOT have an active plan
  const atRiskStudents = internalStudents.filter(
    s => s.status === 'Em Risco' || s.status === 'Atenção' || (s.grade && s.grade < 6.0)
  );

  const studentsWithoutActivePlan = atRiskStudents.filter(s => {
    const hasActivePlan = plans.some(
      p => (p.studentId === s.id || String(p.studentId) === String(s.id)) && p.status !== 'Concluído'
    );
    return !hasActivePlan;
  });

  // Calculate statistics
  const activePlansCount = plans.filter(p => p.status !== 'Concluído').length;
  const highPriorityCount = plans.filter(p => p.priority === 'Alta' && p.status !== 'Concluído').length;
  const inProgressCount = plans.filter(p => p.status === 'Em Andamento').length;
  const completedCount = plans.filter(p => p.status === 'Concluído').length;

  // Filter plans list
  const filteredPlans = plans.filter(plan => {
    const matchesSearch = 
      plan.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.diagnostic.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'Todos' || plan.status === filterStatus;
    const matchesPriority = filterPriority === 'Todas' || plan.priority === filterPriority;
    const matchesType = filterType === 'Todos' || plan.type === filterType;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const handleOpenCreateModal = (preselectedStudentId?: string | number) => {
    setModalMode('create');
    setSelectedPlan(null);
    setFormStudentId(preselectedStudentId || (internalStudents[0]?.id || ''));
    setFormTitle('');
    setFormType('Reforço Contraturno');
    setFormPriority('Alta');
    setFormStatus('Em Andamento');
    setFormDiagnostic('');
    setFormTargetDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormGoals(['Atendimento individualizado no contraturno', 'Avaliação diagnóstica de recuperação']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: InterventionPlan) => {
    setModalMode('edit');
    setSelectedPlan(plan);
    setFormStudentId(plan.studentId);
    setFormTitle(plan.title);
    setFormType(plan.type);
    setFormPriority(plan.priority);
    setFormStatus(plan.status);
    setFormDiagnostic(plan.diagnostic);
    setFormTargetDate(plan.targetDate);
    setFormGoals(plan.goals.map(g => g.text));
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenStudent = internalStudents.find(s => String(s.id) === String(formStudentId)) || {
      id: formStudentId,
      name: 'Aluno Selecionado',
      avatar: ''
    };

    if (!formTitle.trim()) {
      alert('Por favor, informe o título do plano de intervenção.');
      return;
    }

    setIsSaving(true);
    try {
      const dbStatus: 'pending' | 'in_progress' | 'completed' = 
        formStatus === 'Pendente' ? 'pending' : 
        formStatus === 'Concluído' ? 'completed' : 'in_progress';

      const validGoals = formGoals.filter(g => g.trim().length > 0);

      if (modalMode === 'create') {
        const newRecord = await createInterventionPlan({
          student_id: chosenStudent.id,
          teacher_id: teacherId,
          student_name: chosenStudent.name,
          difficulty_type: formType,
          intervention_plan: formDiagnostic.trim() || formTitle.trim(),
          goals: validGoals,
          deadline: formTargetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: dbStatus
        });

        const newPlan: InterventionPlan = {
          id: newRecord ? newRecord.id : `plan-${Date.now()}`,
          studentId: chosenStudent.id,
          studentName: chosenStudent.name,
          studentAvatar: chosenStudent.avatar || '',
          studentClass: chosenStudent.classId ? `Turma ${chosenStudent.classId}` : 'Ensino Fundamental',
          title: formTitle.trim(),
          type: formType,
          priority: formPriority,
          status: formStatus,
          diagnostic: formDiagnostic.trim(),
          goals: validGoals.map((g, idx) => ({
            id: `g-${Date.now()}-${idx}`,
            text: g.trim(),
            completed: false
          })),
          startDate: new Date().toISOString().split('T')[0],
          targetDate: formTargetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          responsibleTeacher: localStorage.getItem('gestao360_teacher_name') || 'Prof. Carlos',
          logs: [
            {
              id: `l-${Date.now()}`,
              date: new Date().toLocaleDateString('pt-BR'),
              author: localStorage.getItem('gestao360_teacher_name') || 'Prof. Carlos',
              note: 'Plano de intervenção pedagógica cadastrado no sistema e sincronizado com o Supabase.'
            }
          ]
        };

        setPlans(prev => [newPlan, ...prev.filter(p => p.id !== newPlan.id)]);
        window.dispatchEvent(new CustomEvent('intervention-plans-updated'));
        showToast('Plano de intervenção criado e salvo com sucesso no banco de dados!');
      } else if (selectedPlan) {
        await updateInterventionPlanStatus(selectedPlan.id, dbStatus, formDiagnostic.trim());

        const updatedPlans = plans.map(p => {
          if (p.id === selectedPlan.id) {
            return {
              ...p,
              title: formTitle.trim(),
              type: formType,
              priority: formPriority,
              status: formStatus,
              diagnostic: formDiagnostic.trim(),
              targetDate: formTargetDate,
              goals: formGoals.filter(g => g.trim().length > 0).map((g, idx) => {
                const existingGoal = p.goals[idx];
                return {
                  id: existingGoal?.id || `g-${Date.now()}-${idx}`,
                  text: g.trim(),
                  completed: existingGoal?.completed || false
                };
              })
            };
          }
          return p;
        });

        setPlans(updatedPlans);
        window.dispatchEvent(new CustomEvent('intervention-plans-updated'));
        showToast('Plano de intervenção atualizado no banco de dados!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar plano de intervenção:', err);
      showToast('Erro ao salvar plano de intervenção.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGoal = async (planId: string, goalId: string) => {
    let nextStatus: InterventionStatus | null = null;
    const updated = plans.map(plan => {
      if (plan.id === planId) {
        const newGoals = plan.goals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
        const allCompleted = newGoals.length > 0 && newGoals.every(g => g.completed);
        const updatedStatus = allCompleted ? ('Concluído' as InterventionStatus) : plan.status;
        nextStatus = updatedStatus;
        return {
          ...plan,
          goals: newGoals,
          status: updatedStatus
        };
      }
      return plan;
    });

    setPlans(updated);
    if (selectedPlan && selectedPlan.id === planId) {
      const targetPlan = updated.find(p => p.id === planId);
      if (targetPlan) setSelectedPlan(targetPlan);
    }

    if (nextStatus) {
      const dbStatus = nextStatus === 'Concluído' ? 'completed' : 'in_progress';
      await updateInterventionPlanStatus(planId, dbStatus);
      window.dispatchEvent(new CustomEvent('intervention-plans-updated'));
    }
  };

  const handleAddLogNote = async (planId: string) => {
    if (!newLogNote.trim()) return;

    const noteText = newLogNote.trim();
    const newLog: InterventionLog = {
      id: `l-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      author: localStorage.getItem('gestao360_teacher_name') || 'Prof. Carlos',
      note: noteText
    };

    const updated = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          logs: [newLog, ...p.logs]
        };
      }
      return p;
    });

    setPlans(updated);
    if (selectedPlan && selectedPlan.id === planId) {
      const targetPlan = updated.find(p => p.id === planId);
      if (targetPlan) setSelectedPlan(targetPlan);
    }
    setNewLogNote('');
    await updateInterventionPlanStatus(planId, undefined, noteText);
    showToast('Anotação de evolução adicionada e salva no banco de dados!');
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este plano de intervenção?')) return;
    setPlans(plans.filter(p => p.id !== planId));
    if (selectedPlan?.id === planId) setSelectedPlan(null);
    await deleteInterventionPlan(planId);
    window.dispatchEvent(new CustomEvent('intervention-plans-updated'));
    showToast('Plano excluído com sucesso.');
  };

  const handlePrintPlan = (plan: InterventionPlan) => {
    window.print();
  };

  const getPriorityBadge = (priority: InterventionPriority) => {
    switch (priority) {
      case 'Alta':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900';
      case 'Média':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900';
      case 'Baixa':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900';
    }
  };

  const getStatusBadge = (status: InterventionStatus) => {
    switch (status) {
      case 'Pendente':
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700';
      case 'Em Andamento':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900';
      case 'Concluído':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-500">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            <CalendarDays size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Plano de Intervenção Pedagógica (PIP)
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={12} /> Acompanhamento Individual
              </span>
              {isLoadingPlans && (
                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                  <Loader2 size={14} className="animate-spin" /> Conectando Supabase...
                </span>
              )}
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-2xl">
              Estratégias estruturadas de recuperação, reforço no contraturno e adaptação curricular para alunos com defasagem ou infrequência.
            </p>
          </div>
        </div>

        <button 
          onClick={() => handleOpenCreateModal()}
          className="relative z-10 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer"
        >
          <Plus size={20} />
          <span>Novo Plano de Ação</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Planos Ativos</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">{activePlansCount}</span>
            <p className="text-xs text-neutral-500 mt-1">em andamento ou pendentes</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[28px] border border-rose-200/50 dark:border-rose-900/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Alta Prioridade</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{highPriorityCount}</span>
            <p className="text-xs text-rose-500/80 mt-1">requerem atenção urgente</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Em Andamento</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">{inProgressCount}</span>
            <p className="text-xs text-neutral-500 mt-1">com metas sendo cumpridas</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Concluídos com Sucesso</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</span>
            <p className="text-xs text-neutral-500 mt-1">alcançaram a recuperação</p>
          </div>
        </div>
      </div>

      {/* Alerta Inteligente: Alunos em Risco sem Plano */}
      {studentsWithoutActivePlan.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-orange-950/20 border-2 border-rose-200/60 dark:border-rose-900/50 p-6 rounded-[28px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-md shrink-0 mt-0.5">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-rose-950 dark:text-rose-100 flex items-center gap-2">
                Atenção Pedagógica: {studentsWithoutActivePlan.length} {studentsWithoutActivePlan.length === 1 ? 'aluno em alerta ainda não possui plano ativo' : 'alunos em alerta ainda não possuem plano ativo'}
              </h3>
              <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 mt-1">
                Foram identificados estudantes com rendimento inferior ou faltas elevadas. Recomenda-se iniciar o PIP imediatamente.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {studentsWithoutActivePlan.map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleOpenCreateModal(st.id)}
                    className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-800 hover:border-rose-500 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Criar para <strong>{st.name}</strong></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text"
            placeholder="Buscar por aluno, objetivo ou diagnóstico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none focus:border-indigo-500"
          >
            <option value="Todos">Status: Todos</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Pendente">Pendente</option>
            <option value="Concluído">Concluído</option>
          </select>

          {/* Priority Filter */}
          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none focus:border-indigo-500"
          >
            <option value="Todas">Prioridade: Todas</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>

          {/* Type Filter */}
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none focus:border-indigo-500"
          >
            <option value="Todos">Tipo: Todos</option>
            <option value="Reforço Contraturno">Reforço Contraturno</option>
            <option value="Adaptação Curricular">Adaptação Curricular</option>
            <option value="Apoio Psicopedagógico">Apoio Psicopedagógico</option>
            <option value="Reunião com Família">Reunião com Família</option>
            <option value="Tutoria de Pares">Tutoria de Pares</option>
          </select>
        </div>
      </div>

      {/* Grid de Planos de Intervenção */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.length === 0 ? (
          <div className="col-span-full bg-white/60 dark:bg-neutral-900/60 p-12 rounded-[32px] border border-dashed border-neutral-200 dark:border-neutral-800 text-center">
            <BookOpen size={48} className="mx-auto text-neutral-400 mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-neutral-700 dark:text-neutral-300">Nenhum plano de intervenção encontrado</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
              Tente ajustar os filtros ou crie um novo plano clicando no botão "Novo Plano de Ação".
            </p>
          </div>
        ) : (
          filteredPlans.map(plan => {
            const completedGoals = plan.goals.filter(g => g.completed).length;
            const totalGoals = plan.goals.length;
            const progress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

            return (
              <div 
                key={plan.id}
                className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-[32px] border border-neutral-200/60 dark:border-neutral-800/60 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300 group"
              >
                <div>
                  {/* Card Header: Student & Priority */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div 
                      onClick={() => onOpenStudent && onOpenStudent(plan.studentId)}
                      className="flex items-center gap-3 cursor-pointer group/st"
                      title="Clique para ver perfil do aluno"
                    >
                      <EducationAvatar 
                        src={plan.studentAvatar} 
                        name={plan.studentName} 
                        role="student" 
                        size="md" 
                      />
                      <div>
                        <h4 className="font-black text-base text-neutral-900 dark:text-white group-hover/st:text-indigo-600 dark:group-hover/st:text-indigo-400 transition-colors">
                          {plan.studentName}
                        </h4>
                        <span className="text-xs text-neutral-400 font-medium">
                          {plan.studentClass || 'Ensino Fundamental'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getPriorityBadge(plan.priority)}`}>
                        {plan.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(plan.status)}`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>

                  {/* Title & Type */}
                  <div className="mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md inline-block mb-1.5">
                      {plan.type}
                    </span>
                    <h3 className="font-black text-lg text-neutral-900 dark:text-white leading-snug">
                      {plan.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                      {plan.diagnostic}
                    </p>
                  </div>

                  {/* Progress & Goals */}
                  <div className="space-y-2 py-3 border-t border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-neutral-500">Metas Cumpridas</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{completedGoals}/{totalGoals} ({progress}%)</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini checklist de metas */}
                  <div className="space-y-1.5 mt-3">
                    {plan.goals.slice(0, 3).map(goal => (
                      <div 
                        key={goal.id} 
                        onClick={() => handleToggleGoal(plan.id, goal.id)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer text-xs transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          goal.completed 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}>
                          {goal.completed && <Check size={12} />}
                        </div>
                        <span className={`truncate ${goal.completed ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-300 font-medium'}`}>
                          {goal.text}
                        </span>
                      </div>
                    ))}
                    {plan.goals.length > 3 && (
                      <p className="text-[10px] text-neutral-400 font-bold pl-2">
                        +{plan.goals.length - 3} outra(s) meta(s)...
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400">
                    <Clock size={12} />
                    <span>Prazo: {new Date(plan.targetDate).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenChat && (
                      <button 
                        onClick={() => onOpenChat(plan.studentId)}
                        className="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                        title="Conversar com o aluno"
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-2 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                      title="Editar plano"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setSelectedPlan(plan)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Detalhes</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Detalhes & Evolução do Plano */}
      {selectedPlan && !isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[32px] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <EducationAvatar 
                  src={selectedPlan.studentAvatar} 
                  name={selectedPlan.studentName} 
                  role="student" 
                  size="lg" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getPriorityBadge(selectedPlan.priority)}`}>
                      Prioridade {selectedPlan.priority}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(selectedPlan.status)}`}>
                      {selectedPlan.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                    {selectedPlan.title}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Aluno: <strong>{selectedPlan.studentName}</strong> • {selectedPlan.studentClass} • Responsável: {selectedPlan.responsibleTeacher}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePrintPlan(selectedPlan)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                  title="Imprimir relatório PIP"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Diagnóstico Pedagógico */}
            <div className="bg-neutral-50 dark:bg-neutral-950 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800/80">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 mb-1 flex items-center gap-1.5">
                <Brain size={14} className="text-indigo-500" /> Diagnóstico e Motivação
              </h4>
              <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                {selectedPlan.diagnostic || 'Nenhum diagnóstico detalhado registrado.'}
              </p>
            </div>

            {/* Checklist de Metas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Target size={16} className="text-indigo-500" /> Metas e Ações Previstas
                </h4>
                <span className="text-xs font-bold text-neutral-400">
                  Clique na caixa para marcar como concluída
                </span>
              </div>
              <div className="space-y-2">
                {selectedPlan.goals.map(goal => (
                  <div 
                    key={goal.id}
                    onClick={() => handleToggleGoal(selectedPlan.id, goal.id)}
                    className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-xl border border-neutral-100 dark:border-neutral-800 cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      goal.completed 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {goal.completed && <Check size={14} />}
                    </div>
                    <span className={`text-sm font-semibold flex-1 ${
                      goal.completed ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'
                    }`}>
                      {goal.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Registro de Evoluções e Acompanhamentos */}
            <div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" /> Registro de Evolução Pedagógica
              </h4>

              {/* Inserir nova evolução */}
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Registrar anotação de acompanhamento ou parecer..."
                  value={newLogNote}
                  onChange={(e) => setNewLogNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLogNote(selectedPlan.id);
                  }}
                  className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
                />
                <button 
                  onClick={() => handleAddLogNote(selectedPlan.id)}
                  disabled={!newLogNote.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-300 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Registrar
                </button>
              </div>

              {/* Linha do tempo dos registros */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {selectedPlan.logs.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-2">Nenhuma anotação registrada ainda.</p>
                ) : (
                  selectedPlan.logs.map(log => (
                    <div key={log.id} className="p-3 bg-neutral-50 dark:bg-neutral-950/60 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 mb-1">
                        <span>{log.author}</span>
                        <span>{log.date}</span>
                      </div>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                        {log.note}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <button 
                onClick={() => handleDeletePlan(selectedPlan.id)}
                className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={16} /> Excluir Plano
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    handleOpenEditModal(selectedPlan);
                  }}
                  className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Criar / Editar Plano */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                {modalMode === 'create' ? 'Novo Plano de Intervenção' : 'Editar Plano de Intervenção'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Seleção do Aluno */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Aluno(a)
                </label>
                <select 
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  disabled={modalMode === 'edit'}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status || 'Ativo'} - Nota: {s.grade ?? 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Título do Plano */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Título da Ação de Intervenção
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Nivelamento em Frações e Cálculo Básico"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Grid: Tipo, Prioridade e Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                    Tipo de Ação
                  </label>
                  <select 
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as InterventionType)}
                    className="w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Reforço Contraturno">Reforço Contraturno</option>
                    <option value="Adaptação Curricular">Adaptação Curricular</option>
                    <option value="Apoio Psicopedagógico">Apoio Psicopedagógico</option>
                    <option value="Reunião com Família">Reunião com Família</option>
                    <option value="Tutoria de Pares">Tutoria de Pares</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                    Prioridade
                  </label>
                  <select 
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as InterventionPriority)}
                    className="w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                    Status Atual
                  </label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as InterventionStatus)}
                    className="w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
              </div>

              {/* Diagnóstico */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Diagnóstico e Justificativa Pedagógica
                </label>
                <textarea 
                  rows={3}
                  placeholder="Descreva a dificuldade apresentada pelo aluno, padrão de faltas ou histórico escolar..."
                  value={formDiagnostic}
                  onChange={(e) => setFormDiagnostic(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Prazo */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Prazo Alvo para Avaliação
                </label>
                <input 
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Metas / Ações Específicas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                    Metas / Etapas da Intervenção
                  </label>
                  <button 
                    type="button"
                    onClick={() => setFormGoals([...formGoals, ''])}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Adicionar Meta
                  </button>
                </div>
                <div className="space-y-2">
                  {formGoals.map((g, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder={`Meta ${idx + 1}`}
                        value={g}
                        onChange={(e) => {
                          const updated = [...formGoals];
                          updated[idx] = e.target.value;
                          setFormGoals(updated);
                        }}
                        className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                      {formGoals.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => setFormGoals(formGoals.filter((_, i) => i !== idx))}
                          className="p-2.5 text-neutral-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-400 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? 'Salvando...' : (modalMode === 'create' ? 'Salvar Plano' : 'Atualizar Plano')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
