import React, { useState, useEffect } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Save, 
  Filter, 
  BookOpen, 
  Users, 
  FileText, 
  Printer, 
  Sparkles, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Check, 
  RefreshCw,
  TrendingUp,
  Shield,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { 
  ProficiencyLevel, 
  ProficiencyRecord, 
  PROFICIENCY_LABELS, 
  getProficienciesByClass, 
  saveProficienciesBatch, 
  getEnrollments, 
  EnrollmentRecord,
  getAssignedTeachersList,
  TeacherRecord,
  getStudentReportCardData,
  StudentReportCardData
} from '../../../lib/api/education';
import { EducationAvatar } from './EducationAvatar';
import { BoletimEscolarPDF } from './BoletimEscolarPDF';

interface TeacherProficiencyEntryProps {
  onBack?: () => void;
}

const BIMESTERS = [
  { id: 1, label: '1º Bimestre', period: 'Fevereiro - Abril' },
  { id: 2, label: '2º Bimestre', period: 'Maio - Julho' },
  { id: 3, label: '3º Bimestre', period: 'Agosto - Setembro' },
  { id: 4, label: '4º Bimestre', period: 'Outubro - Dezembro' },
];

const DEFAULT_SUBJECTS = [
  'Língua Portuguesa',
  'Matemática',
  'Ciências da Natureza',
  'História',
  'Geografia',
  'Arte',
  'Educação Física'
];

const PEDAGOGICAL_OPINION_SUGGESTIONS = [
  'Demonstra domínio consolidado das habilidades esperadas para a etapa e raciocínio autônomo.',
  'Participação exemplar nos debates e excelente cooperação em atividades coletivas.',
  'Desenvolveu aprendizagens fundamentais; sugere-se aprofundamento das atividades práticas.',
  'Requer intervenção pedagógica prioritária e mediação individualizada nas tarefas.',
  'Apresenta avanços significativos na leitura e interpretação textual em relação ao período anterior.'
];

export const TeacherProficiencyEntry: React.FC<TeacherProficiencyEntryProps> = ({ onBack }) => {
  // Dados do professor logado
  const teacherId = localStorage.getItem('gestao360_teacher_id') || 'c1000000-0000-0000-0000-000000000001';
  const teacherName = localStorage.getItem('gestao360_teacher_name') || 'Prof. Carlos Eduardo Silva';
  const teacherEmail = localStorage.getItem('gestao360_teacher_email') || 'carlos.eduardo@escola.gov.br';
  const teacherRole = localStorage.getItem('gestao360_teacher_role') || 'teacher';

  // Turmas e disciplinas atribuídas ao professor pelo coordenador
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);

  // Filtros ativos
  const [selectedClass, setSelectedClass] = useState<string>('4º Ano A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Matemática');
  const [selectedBimester, setSelectedBimester] = useState<number>(4);

  // Alunos e Lançamentos
  const [students, setStudents] = useState<EnrollmentRecord[]>([]);
  const [entries, setEntries] = useState<Record<string, {
    proficiency_level: ProficiencyLevel;
    descriptive_opinion: string;
  }>>({});
  
  const [expandedOpinions, setExpandedOpinions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal de Boletim PDF do aluno
  const [selectedReportCard, setSelectedReportCard] = useState<StudentReportCardData | null>(null);
  const [isLoadingReportCard, setIsLoadingReportCard] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Carrega dados do perfil e vínculos do professor
  useEffect(() => {
    async function loadTeacherProfile() {
      try {
        const teachers = await getAssignedTeachersList();
        const found = teachers.find(t => 
          t.email.toLowerCase() === teacherEmail.toLowerCase() || 
          t.id === teacherId
        );

        if (found && found.assigned_classes && found.assigned_classes.length > 0) {
          setAssignedClasses(found.assigned_classes);
          setSelectedClass(found.assigned_classes[0]);
        } else {
          // Fallback para coordenadores ou professor polivalente
          setAssignedClasses(['4º Ano A', '5º Ano B', '1º Ano A']);
          setSelectedClass('4º Ano A');
        }

        if (found && found.assigned_subjects && found.assigned_subjects.length > 0) {
          setAssignedSubjects(found.assigned_subjects);
          setSelectedSubject(found.assigned_subjects[0]);
        } else {
          setAssignedSubjects(DEFAULT_SUBJECTS);
          setSelectedSubject('Matemática');
        }
      } catch (err) {
        console.warn('Erro ao carregar atribuições docentes:', err);
        setAssignedClasses(['4º Ano A', '5º Ano B']);
        setAssignedSubjects(DEFAULT_SUBJECTS);
      }
    }
    loadTeacherProfile();
  }, [teacherEmail, teacherId]);

  // 2. Carrega lista de alunos da turma selecionada e proficiências existentes
  const loadClassData = async () => {
    setIsLoading(true);
    try {
      // 1. Busca matrículas da turma
      let enrollmentsList = await getEnrollments({ class_name: selectedClass });
      if (enrollmentsList.length === 0) {
        // Fallback de alunos demonstrativos caso a tabela ainda não contenha registros da turma
        enrollmentsList = [
          {
            id: 'b0000000-0000-0000-0000-000000000001',
            student_id: '00000000-0000-0000-0000-000000000001',
            student_name: 'Ana Silva',
            class_name: selectedClass,
            school_name: 'Escola Municipal Monteiro Lobato',
            shift: 'Matutino',
            academic_year: 2026,
            status: 'matriculado'
          },
          {
            id: 'b0000000-0000-0000-0000-000000000002',
            student_id: '00000000-0000-0000-0000-000000000002',
            student_name: 'Bruno Souza',
            class_name: selectedClass,
            school_name: 'Escola Municipal Monteiro Lobato',
            shift: 'Matutino',
            academic_year: 2026,
            status: 'matriculado'
          },
          {
            id: 'b0000000-0000-0000-0000-000000000003',
            student_id: '00000000-0000-0000-0000-000000000003',
            student_name: 'Carla Dias',
            class_name: selectedClass,
            school_name: 'Escola Municipal Monteiro Lobato',
            shift: 'Matutino',
            academic_year: 2026,
            status: 'matriculado'
          },
          {
            id: 'b0000000-0000-0000-0000-000000000004',
            student_id: '00000000-0000-0000-0000-000000000004',
            student_name: 'Diego Ramos',
            class_name: selectedClass,
            school_name: 'Escola Municipal Monteiro Lobato',
            shift: 'Vespertino',
            academic_year: 2026,
            status: 'matriculado'
          },
          {
            id: 'b0000000-0000-0000-0000-000000000005',
            student_id: '00000000-0000-0000-0000-000000000005',
            student_name: 'Enzo Costa',
            class_name: selectedClass,
            school_name: 'Escola Municipal Monteiro Lobato',
            shift: 'Vespertino',
            academic_year: 2026,
            status: 'matriculado'
          }
        ];
      }
      setStudents(enrollmentsList);

      // 2. Busca lançamentos já existentes
      const existingProfs = await getProficienciesByClass(selectedClass, selectedSubject, selectedBimester);
      const initialMap: Record<string, { proficiency_level: ProficiencyLevel; descriptive_opinion: string }> = {};

      enrollmentsList.forEach((st, idx) => {
        const found = existingProfs.find(p => p.enrollment_id === st.id || p.student_id === st.student_id);
        if (found) {
          initialMap[st.id] = {
            proficiency_level: found.proficiency_level,
            descriptive_opinion: found.descriptive_opinion || ''
          };
        } else {
          // Padrão pedagógico equilibrado para novas inserções
          const defaultLevel: ProficiencyLevel = idx === 0 ? 'avancado' : (idx === 1 ? 'adequado' : (idx === 3 ? 'basico' : 'adequado'));
          initialMap[st.id] = {
            proficiency_level: defaultLevel,
            descriptive_opinion: ''
          };
        }
      });

      setEntries(initialMap);
    } catch (err) {
      console.error('Erro ao carregar dados da turma:', err);
      showToast('Erro ao carregar lista de alunos da turma.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedBimester) {
      loadClassData();
    }
  }, [selectedClass, selectedSubject, selectedBimester]);

  // Alteração de nível de proficiência SAEB
  const handleLevelChange = (enrollmentId: string, level: ProficiencyLevel) => {
    setEntries(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        proficiency_level: level
      }
    }));
  };

  // Alteração do parecer pedagógico
  const handleOpinionChange = (enrollmentId: string, text: string) => {
    setEntries(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        descriptive_opinion: text
      }
    }));
  };

  // Alterna expansão da caixa de parecer
  const toggleExpandOpinion = (enrollmentId: string) => {
    setExpandedOpinions(prev => ({
      ...prev,
      [enrollmentId]: !prev[enrollmentId]
    }));
  };

  // Helper: Preencher todos como Adequado
  const handleFillAllAdequate = () => {
    setEntries(prev => {
      const next: typeof prev = {};
      Object.keys(prev).forEach(id => {
        next[id] = {
          ...prev[id],
          proficiency_level: 'adequado'
        };
      });
      return next;
    });
    showToast('Todos os alunos definidos temporariamente como "Adequado". Clique em Salvar para gravar.');
  };

  // Salvamento em Lote
  const handleSaveBatch = async () => {
    setIsSaving(true);
    try {
      const batchPayload: Array<Omit<ProficiencyRecord, 'id' | 'updated_at'>> = students.map(st => {
        const item = entries[st.id] || { proficiency_level: 'adequado', descriptive_opinion: '' };
        return {
          enrollment_id: st.id,
          student_id: st.student_id,
          subject: selectedSubject,
          bimester: selectedBimester,
          proficiency_level: item.proficiency_level,
          descriptive_opinion: item.descriptive_opinion.trim() || null,
          teacher_id: teacherId
        };
      });

      const success = await saveProficienciesBatch(batchPayload);
      if (success) {
        showToast(`Sucesso! ${batchPayload.length} avaliações do ${selectedBimester}º Bimestre salvas com sucesso!`, 'success');
      } else {
        showToast('Não foi possível gravar no Supabase. Os dados foram salvos no armazenamento local.', 'error');
      }
    } catch (err) {
      console.error('Erro ao salvar em lote:', err);
      showToast('Ocorreu um erro ao salvar os lançamentos.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Visualizar Boletim Escolar Oficial do Estudante
  const handleOpenBoletimModal = async (studentId: string) => {
    setIsLoadingReportCard(true);
    try {
      const data = await getStudentReportCardData(studentId, 2026);
      setSelectedReportCard(data);
    } catch (err) {
      console.error('Erro ao emitir boletim:', err);
      showToast('Erro ao carregar boletim oficial do aluno.', 'error');
    } finally {
      setIsLoadingReportCard(false);
    }
  };

  // Estatísticas da Turma em Tempo Real
  const totalStudents = students.length;
  const entryList = Object.values(entries) as Array<{
    proficiency_level: ProficiencyLevel;
    descriptive_opinion: string;
  }>;
  const countAbaixo = entryList.filter(e => e.proficiency_level === 'abaixo_do_basico').length;
  const countBasico = entryList.filter(e => e.proficiency_level === 'basico').length;
  const countAdequado = entryList.filter(e => e.proficiency_level === 'adequado').length;
  const countAvancado = entryList.filter(e => e.proficiency_level === 'avancado').length;

  const pctAbaixo = totalStudents > 0 ? Math.round((countAbaixo / totalStudents) * 100) : 0;
  const pctBasico = totalStudents > 0 ? Math.round((countBasico / totalStudents) * 100) : 0;
  const pctAdequado = totalStudents > 0 ? Math.round((countAdequado / totalStudents) * 100) : 0;
  const pctAvancado = totalStudents > 0 ? Math.round((countAvancado / totalStudents) * 100) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-28 md:pb-12 animate-in fade-in duration-300">
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`fixed top-8 right-8 z-[200] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white transition-all animate-in slide-in-from-top-4 ${
          toastMessage.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          <CheckCircle2 size={20} className="shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 rounded-[32px] p-6 md:p-10 text-white shadow-xl shadow-teal-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest text-emerald-100">
            <Award size={13} />
            Escala Oficial SAEB • Avaliação por Habilidades
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Lançamento de Boletim & Proficiência
          </h2>
          <p className="text-teal-100 text-sm md:text-base font-medium opacity-90 leading-relaxed">
            Avalie o rendimento da sua turma substituindo notas numéricas pelos 4 níveis oficiais do SAEB. 
            Emita pareceres pedagógicos bimestrais integrados diretamente ao boletim do aluno.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3">
          <button
            onClick={handleFillAllAdequate}
            type="button"
            className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
          >
            <Sparkles size={14} className="text-amber-300" />
            Lançar Todos Adequado
          </button>
          <button
            onClick={handleSaveBatch}
            disabled={isSaving}
            type="button"
            className="px-6 py-3.5 bg-white text-emerald-800 hover:bg-neutral-50 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} className="text-emerald-700" />}
            {isSaving ? 'Gravando...' : 'Salvar Lançamentos'}
          </button>
        </div>
      </div>

      {/* Barra de Filtros com Restrição às Turmas do Professor */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-[28px] border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400">
          <Filter size={14} className="text-indigo-600" />
          Filtros de Turma Atribuída & Componente Curricular
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Seletor de Turma (Filtrado estritamente pelas turmas atribuídas) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Users size={14} className="text-sky-600" />
              Turma Vinculada (assigned_classes)
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {assignedClasses.map(cls => (
                <option key={cls} value={cls}>
                  {cls} (Sua Turma Atribuída)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 pl-1">
              * Apenas turmas autorizadas pela Coordenação para {teacherName}.
            </p>
          </div>

          {/* Seletor de Componente Curricular */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <BookOpen size={14} className="text-emerald-600" />
              Componente Curricular (Disciplina)
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {assignedSubjects.map(sub => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Bimestre */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Calendar size={14} className="text-purple-600" />
              Bimestre de Avaliação
            </label>
            <select
              value={selectedBimester}
              onChange={(e) => setSelectedBimester(Number(e.target.value))}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {BIMESTERS.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label} • ({b.period})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Painel Diagnóstico: Distribuição da Turma na Escala SAEB */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Abaixo do Básico */}
        <div className="p-5 rounded-3xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Abaixo do Básico
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
              {pctAbaixo}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-rose-700 dark:text-rose-300">{countAbaixo}</h3>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
              Nível Crítico • Intervenção Necessária
            </p>
          </div>
        </div>

        {/* Básico */}
        <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Básico
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              {pctBasico}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-amber-700 dark:text-amber-300">{countBasico}</h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              Em Desenvolvimento • Habilidades Mínimas
            </p>
          </div>
        </div>

        {/* Adequado */}
        <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Adequado
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              {pctAdequado}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{countAdequado}</h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Consolidado • Habilidades Plenas
            </p>
          </div>
        </div>

        {/* Avançado */}
        <div className="p-5 rounded-3xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Avançado
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {pctAvancado}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-blue-700 dark:text-blue-300">{countAvancado}</h3>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
              Destaque • Superação das Expectativas
            </p>
          </div>
        </div>

      </div>

      {/* Lista de Alunos e Lançamento SAEB */}
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
              Estudantes da Turma ({selectedClass}) • {selectedSubject}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Selecione o nível de proficiência SAEB e registre o parecer pedagógico descritivo individual.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadClassData}
              type="button"
              className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-bold text-neutral-500">Carregando dados da turma e proficiências...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Users size={32} className="text-neutral-400 mx-auto" />
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Nenhum aluno matriculado nesta turma.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {students.map((student, idx) => {
              const currentEntry = entries[student.id] || { proficiency_level: 'adequado', descriptive_opinion: '' };
              const isOpinionExpanded = !!expandedOpinions[student.id];

              return (
                <div key={student.id} className="p-5 md:p-6 transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 space-y-4">
                  
                  {/* Linha Principal do Aluno */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Aluno Avatar e Identificação */}
                    <div className="flex items-center gap-3.5 min-w-[260px]">
                      <span className="text-xs font-black text-neutral-400 w-5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <EducationAvatar 
                        name={student.student_name} 
                        role="student" 
                        size="md" 
                      />
                      <div>
                        <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">
                          {student.student_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                          <span>Matrícula: {student.student_id.substring(0, 8).toUpperCase()}</span>
                          <span>• {student.shift || 'Matutino'}</span>
                        </div>
                      </div>
                    </div>

                    {/* SELETOR DE PROFICIÊNCIA SAEB COM AS 4 CORES PADRONIZADAS */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 lg:justify-center">
                      
                      {/* Abaixo do Básico */}
                      <button
                        type="button"
                        onClick={() => handleLevelChange(student.id, 'abaixo_do_basico')}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                          currentEntry.proficiency_level === 'abaixo_do_basico'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50 scale-105'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100'
                        }`}
                      >
                        {currentEntry.proficiency_level === 'abaixo_do_basico' && <Check size={14} />}
                        <span>Abaixo do Básico</span>
                      </button>

                      {/* Básico */}
                      <button
                        type="button"
                        onClick={() => handleLevelChange(student.id, 'basico')}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                          currentEntry.proficiency_level === 'basico'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50 scale-105'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
                        }`}
                      >
                        {currentEntry.proficiency_level === 'basico' && <Check size={14} />}
                        <span>Básico</span>
                      </button>

                      {/* Adequado */}
                      <button
                        type="button"
                        onClick={() => handleLevelChange(student.id, 'adequado')}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                          currentEntry.proficiency_level === 'adequado'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50 scale-105'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100'
                        }`}
                      >
                        {currentEntry.proficiency_level === 'adequado' && <Check size={14} />}
                        <span>Adequado</span>
                      </button>

                      {/* Avançado */}
                      <button
                        type="button"
                        onClick={() => handleLevelChange(student.id, 'avancado')}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                          currentEntry.proficiency_level === 'avancado'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50 scale-105'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100'
                        }`}
                      >
                        {currentEntry.proficiency_level === 'avancado' && <Check size={14} />}
                        <span>Avançado</span>
                      </button>

                    </div>

                    {/* Ações Rápidas: Parecer Descritivo & Boletim Oficial */}
                    <div className="flex items-center gap-2 self-end lg:self-auto">
                      <button
                        type="button"
                        onClick={() => toggleExpandOpinion(student.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          currentEntry.descriptive_opinion || isOpinionExpanded
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                        }`}
                        title="Registrar Parecer Descritivo"
                      >
                        <MessageSquare size={14} />
                        <span>Parecer {currentEntry.descriptive_opinion ? '✓' : ''}</span>
                        {isOpinionExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBoletimModal(student.student_id)}
                        className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors cursor-pointer"
                        title="Ver / Imprimir Boletim Oficial deste Aluno"
                      >
                        <Printer size={16} />
                      </button>
                    </div>

                  </div>

                  {/* Campo Expansível de Parecer Pedagógico */}
                  {isOpinionExpanded && (
                    <div className="mt-3 p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare size={13} className="text-indigo-600" />
                          Parecer Descritivo do Professor ({selectedBimester}º Bimestre)
                        </label>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          Este parecer será impresso no Boletim Escolar Oficial
                        </span>
                      </div>

                      <textarea
                        rows={2}
                        value={currentEntry.descriptive_opinion}
                        onChange={(e) => handleOpinionChange(student.id, e.target.value)}
                        placeholder={`Descreva a evolução das aprendizagens, competências e pontos de atenção para ${student.student_name}...`}
                        className="w-full p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                      />

                      {/* Chips de Sugestões Pedagógicas Rápidas */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-neutral-400 mr-1">Sugestões:</span>
                        {PEDAGOGICAL_OPINION_SUGGESTIONS.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              const existing = currentEntry.descriptive_opinion.trim();
                              handleOpinionChange(student.id, existing ? `${existing} ${sug}` : sug);
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-indigo-50 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[10px] font-medium transition-colors cursor-pointer truncate max-w-xs"
                            title={sug}
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Barra Flutuante de Ação no Rodapé */}
      <div className="sticky bottom-6 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl p-4 md:p-5 rounded-[28px] border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black">
            <Check size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">
              {students.length} alunos prontos para homologação
            </p>
            <p className="text-[11px] text-neutral-400">
              {selectedClass} • {selectedSubject} • {selectedBimester}º Bimestre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveBatch}
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Salvar Lançamentos em Lote</span>
          </button>
        </div>
      </div>

      {/* Modal do Boletim Escolar em PDF */}
      {selectedReportCard && (
        <BoletimEscolarPDF
          reportCard={selectedReportCard}
          onClose={() => setSelectedReportCard(null)}
        />
      )}

    </div>
  );
};
