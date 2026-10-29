import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Bell,
  Calendar,
  AlertCircle,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  BookOpen,
  ShieldCheck,
  HeartHandshake,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
  Compass,
  Check
} from 'lucide-react';
import {
  AnnouncementRecord,
  StudentReportCardData,
  ProficiencyLevel,
  getFamilyAnnouncements,
  getStudentReportCardData,
  getEnrollments,
  EnrollmentRecord
} from '../../../lib/api/education';
import { BoletimEscolarPDF } from './BoletimEscolarPDF';
import { SubjectIcon } from './SubjectIcon';
import { EducationAvatar } from './EducationAvatar';

export interface FamilyPortalStudentContext {
  id: string;
  name: string;
  className?: string;
  avatar?: string;
  streak?: number;
  xp?: number;
  level?: number;
  weeklyActivity?: boolean[];
}

export interface FamilyDigitalProgressStats {
  completedLessons: number;
  totalLessons: number;
  completedTrails: number;
  quickActivitiesDone: number;
}

interface FamilyPortalViewProps {
  initialStudentId?: string;
  /** 'student' trava estritamente nos dados do aluno logado (LGPD); 'admin' permite seleção pela Secretaria */
  mode?: 'student' | 'admin';
  studentProfile?: FamilyPortalStudentContext;
  completedActivitiesStats?: FamilyDigitalProgressStats;
  onOpenTeacherChat?: () => void;
}

interface StageVisualConfig {
  emoji: string;
  title: string;
  shortTitle: string;
  saebRef: string;
  step: 1 | 2 | 3 | 4;
  summary: string;
  familyTipPrefix: string;
  chipClass: string;
  barClass: string;
  cardBorder: string;
}

const DEVELOPMENT_STAGES: Record<ProficiencyLevel, StageVisualConfig> = {
  abaixo_do_basico: {
    emoji: '🌱',
    title: 'Apoio Inicial',
    shortTitle: 'Apoio Inicial',
    saebRef: 'Abaixo do Básico',
    step: 1,
    summary: 'A criança está dando os primeiros passos nesta habilidade e conta com mediação próxima do professor.',
    familyTipPrefix: 'Acolha sem cobranças e pratique junto por 10 minutinhos:',
    chipClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70',
    barClass: 'bg-rose-400',
    cardBorder: 'border-rose-200/80 dark:border-rose-800/50'
  },
  basico: {
    emoji: '🧭',
    title: 'Em Construção',
    shortTitle: 'Em Construção',
    saebRef: 'Básico',
    step: 2,
    summary: 'Já compreende a base do conteúdo e está praticando para ganhar mais segurança no dia a dia.',
    familyTipPrefix: 'Incentive a confiança com situações simples da rotina:',
    chipClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70',
    barClass: 'bg-amber-400',
    cardBorder: 'border-amber-200/80 dark:border-amber-800/50'
  },
  adequado: {
    emoji: '⭐',
    title: 'Aprendizado Consolidado',
    shortTitle: 'Consolidado',
    saebRef: 'Adequado',
    step: 3,
    summary: 'Desenvolveu com segurança todas as habilidades esperadas para a sua etapa escolar neste período.',
    familyTipPrefix: 'Parabéns pelo percurso! Para manter a curiosidade:',
    chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70',
    barClass: 'bg-emerald-500',
    cardBorder: 'border-emerald-200/80 dark:border-emerald-800/50'
  },
  avancado: {
    emoji: '🚀',
    title: 'Autonomia & Destaque',
    shortTitle: 'Autonomia',
    saebRef: 'Avançado',
    step: 4,
    summary: 'Demonstra grande autonomia, criatividade e vai além dos objetivos previstos para o bimestre.',
    familyTipPrefix: 'Estimule novos desafios e protagonismo em casa:',
    chipClass: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70',
    barClass: 'bg-sky-500',
    cardBorder: 'border-sky-200/80 dark:border-sky-800/50'
  }
};

const SUBJECT_VISUAL_META: Record<string, { icon: string; bgIcon: string; textIcon: string; homeTip: string }> = {
  'Língua Portuguesa': {
    icon: 'BookOpen',
    bgIcon: 'bg-amber-100 dark:bg-amber-500/20',
    textIcon: 'text-amber-600 dark:text-amber-400',
    homeTip: 'Reserve 15 minutos para leitura compartilhada de gibis, contos ou receitas e peça para a criança recontar a história com suas próprias palavras.'
  },
  Matemática: {
    icon: 'Calculator',
    bgIcon: 'bg-sky-100 dark:bg-sky-500/20',
    textIcon: 'text-sky-600 dark:text-sky-400',
    homeTip: 'Brinque de contar objetos em casa, dividir alimentos em partes iguais (metade, um quarto) ou conferir horários no relógio juntos.'
  },
  'Ciências da Natureza': {
    icon: 'FlaskConical',
    bgIcon: 'bg-emerald-100 dark:bg-emerald-500/20',
    textIcon: 'text-emerald-600 dark:text-emerald-400',
    homeTip: 'Observe plantas, animais, o clima do dia e hábitos de higiene/alimentação saudável, estimulando perguntas sobre "por que isso acontece?".'
  },
  História: {
    icon: 'Landmark',
    bgIcon: 'bg-purple-100 dark:bg-purple-500/20',
    textIcon: 'text-purple-600 dark:text-purple-400',
    homeTip: 'Converse sobre fotos antigas da família, como era o bairro antigamente e as tradições culturais da comunidade.'
  },
  Geografia: {
    icon: 'Globe',
    bgIcon: 'bg-indigo-100 dark:bg-indigo-500/20',
    textIcon: 'text-indigo-600 dark:text-indigo-400',
    homeTip: 'No caminho para a escola, observe pontos de referência, ruas, paisagens naturais e cuidados com o lixo e a água.'
  },
  Arte: {
    icon: 'Palette',
    bgIcon: 'bg-rose-100 dark:bg-rose-500/20',
    textIcon: 'text-rose-600 dark:text-rose-400',
    homeTip: 'Valorize os desenhos, músicas, colagens e brincadeiras criativas da criança, expondo suas produções em um cantinho especial.'
  },
  'Educação Física': {
    icon: 'Trophy',
    bgIcon: 'bg-teal-100 dark:bg-teal-500/20',
    textIcon: 'text-teal-600 dark:text-teal-400',
    homeTip: 'Incentive brincadeiras ao ar livre, pular corda, jogos cooperativos e o respeito às regras e aos colegas.'
  }
};

export const FamilyPortalView: React.FC<FamilyPortalViewProps> = ({
  initialStudentId = '00000000-0000-0000-0000-000000000001',
  mode = 'admin',
  studentProfile,
  completedActivitiesStats,
  onOpenTeacherChat
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState(
    studentProfile?.id || initialStudentId
  );
  const [studentsList, setStudentsList] = useState<EnrollmentRecord[]>([]);
  const [reportCard, setReportCard] = useState<StudentReportCardData | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBoletimModalOpen, setIsBoletimModalOpen] = useState(false);

  // Interações didáticas
  const [showScaleGuide, setShowScaleGuide] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>('Língua Portuguesa');
  const [announcementFilter, setAnnouncementFilter] = useState<'todos' | 'urgente' | 'reuniao' | 'turma'>('todos');
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  // Sincroniza ID quando vem do Portal do Aluno
  useEffect(() => {
    if (mode === 'student') {
      const targetId = studentProfile?.id || initialStudentId;
      if (targetId && targetId !== selectedStudentId) {
        setSelectedStudentId(targetId);
      }
    }
  }, [mode, studentProfile?.id, initialStudentId, selectedStudentId]);

  // Carrega avisos confirmados ("Ciente") do localStorage
  useEffect(() => {
    const key = `edu_family_ack_${selectedStudentId}`;
    try {
      const saved = localStorage.getItem(key);
      setAcknowledgedIds(saved ? JSON.parse(saved) : []);
    } catch {
      setAcknowledgedIds([]);
    }
  }, [selectedStudentId]);

  const toggleAcknowledge = (announcementId: string) => {
    const key = `edu_family_ack_${selectedStudentId}`;
    setAcknowledgedIds((prev) => {
      const next = prev.includes(announcementId)
        ? prev.filter((id) => id !== announcementId)
        : [...prev, announcementId];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        if (mode === 'admin') {
          const enrollments = await getEnrollments();
          if (isMounted) setStudentsList(enrollments);

          const currentStudent =
            enrollments.find((e) => e.student_id === selectedStudentId || e.id === selectedStudentId) ||
            enrollments[0];
          const studentIdToUse = currentStudent ? currentStudent.student_id : selectedStudentId;

          const [cardData, annData] = await Promise.all([
            getStudentReportCardData(studentIdToUse, 2026),
            getFamilyAnnouncements(studentIdToUse, currentStudent?.class_name)
          ]);

          if (isMounted) {
            setReportCard(cardData);
            setAnnouncements(annData);
          }
        } else {
          // Modo Portal do Aluno (LGPD: carrega estritamente o aluno autenticado)
          const studentIdToUse = studentProfile?.id || selectedStudentId;
          const hint = studentProfile
            ? {
                name: studentProfile.name,
                className: studentProfile.className
              }
            : undefined;

          const cardData = await getStudentReportCardData(studentIdToUse, 2026, hint);
          const annData = await getFamilyAnnouncements(
            studentIdToUse,
            cardData.enrollment.class_name || studentProfile?.className
          );

          if (isMounted) {
            setReportCard(cardData);
            setAnnouncements(annData);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Boletim & Família:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    const handleRealtimeRefresh = () => {
      loadData();
    };
    window.addEventListener('school-announcement-created', handleRealtimeRefresh);
    window.addEventListener('proficiencies-updated', handleRealtimeRefresh);
    window.addEventListener('students-updated', handleRealtimeRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('school-announcement-created', handleRealtimeRefresh);
      window.removeEventListener('proficiencies-updated', handleRealtimeRefresh);
      window.removeEventListener('students-updated', handleRealtimeRefresh);
    };
  }, [selectedStudentId, mode, studentProfile?.id, studentProfile?.name, studentProfile?.className]);

  const isInfantil = useMemo(() => {
    const cls = reportCard?.enrollment.class_name || studentProfile?.className || '';
    return /infantil|creche|cmei|maternal|berçário|pré|pre/i.test(cls);
  }, [reportCard?.enrollment.class_name, studentProfile?.className]);

  const minLegalAttendance = isInfantil ? 60 : 75;

  const overallStage = useMemo(() => {
    const lvl = reportCard?.overallProficiency || 'adequado';
    return DEVELOPMENT_STAGES[lvl] || DEVELOPMENT_STAGES.adequado;
  }, [reportCard?.overallProficiency]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      if (announcementFilter === 'todos') return true;
      if (announcementFilter === 'urgente') return ann.category === 'urgente' || ann.category === 'falta';
      if (announcementFilter === 'reuniao') return ann.category === 'reuniao';
      if (announcementFilter === 'turma') return Boolean(ann.target_class);
      return true;
    });
  }, [announcements, announcementFilter]);

  const pendingAnnouncementsCount = announcements.filter((a) => !acknowledgedIds.includes(a.id)).length;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'urgente':
        return {
          label: 'Importante / Saúde',
          bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          icon: <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />
        };
      case 'reuniao':
        return {
          label: 'Encontro Família-Escola',
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          icon: <Calendar size={14} className="text-amber-600 dark:text-amber-400" />
        };
      case 'falta':
        return {
          label: 'Atenção à Frequência',
          bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800',
          icon: <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400" />
        };
      default:
        return {
          label: 'Comunicado Escolar',
          bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
          icon: <Bell size={14} className="text-indigo-600 dark:text-indigo-400" />
        };
    }
  };

  const renderStageChip = (level: ProficiencyLevel | null | undefined, compact = false) => {
    if (!level) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200/70 dark:border-neutral-700">
          Em curso
        </span>
      );
    }
    const cfg = DEVELOPMENT_STAGES[level] || DEVELOPMENT_STAGES.adequado;
    return (
      <span
        title={`${cfg.title}: ${cfg.summary}`}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold border transition-transform ${
          compact ? 'text-[11px]' : 'text-xs'
        } ${cfg.chipClass}`}
      >
        <span>{cfg.emoji}</span>
        <span>{compact ? cfg.shortTitle : cfg.title}</span>
      </span>
    );
  };

  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto w-full pb-16">
      {/* Top Banner Acolhedor: Vida Escolar & Família */}
      <div className="bg-gradient-to-r from-indigo-600 via-teal-600 to-emerald-600 rounded-[32px] p-6 sm:p-9 text-white shadow-xl shadow-indigo-500/15 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-64 h-64 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {mode === 'student' && reportCard ? (
              <div className="p-1 rounded-full bg-white/25 backdrop-blur-md shrink-0 shadow-lg">
                <EducationAvatar
                  src={studentProfile?.avatar}
                  name={reportCard.enrollment.student_name}
                  role="student"
                  size="lg"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <HeartHandshake size={32} className="text-white" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                  <ShieldCheck size={12} />
                  {mode === 'student' ? 'Ambiente Protegido LGPD • Família & Aluno' : 'Visão da Coordenação • Família'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-400/25 border border-white/20">
                  🌱 Ensino Básico • Avaliação Sem Notas Numéricas
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
                {mode === 'student' && reportCard
                  ? `Vida Escolar de ${reportCard.enrollment.student_name}`
                  : 'Boletim Qualitativo & Portal da Família'}
              </h2>

              <p className="text-emerald-50 text-sm mt-1 max-w-2xl font-medium leading-relaxed">
                {reportCard ? (
                  <>
                    <strong>{reportCard.enrollment.school_name}</strong> • Turma{' '}
                    <strong>{reportCard.enrollment.class_name}</strong> ({reportCard.enrollment.shift || 'Matutino'}) • Ano Letivo{' '}
                    {reportCard.enrollment.academic_year}
                  </>
                ) : (
                  'Acompanhamento pedagógico formativo por desenvolvimento de habilidades, frequência e diálogo direto com a escola.'
                )}
              </p>
            </div>
          </div>

          {/* Ações Rápidas ou Seletor (Seletor visível APENAS no modo Admin da Secretaria) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {mode === 'admin' && studentsList.length > 0 && (
              <div className="bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col gap-1 min-w-[230px]">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 px-2 flex items-center gap-1">
                  <Users size={11} /> Selecionar Matrícula (Secretaria)
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-neutral-900 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                >
                  {studentsList.map((st) => (
                    <option key={st.id} value={st.student_id}>
                      {st.student_name} ({st.class_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportCard && (
              <button
                onClick={() => setIsBoletimModalOpen(true)}
                className="px-5 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-95"
              >
                <Printer size={16} />
                <span>Emitir Boletim Oficial (PDF)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Explicação Didática: Por que não há notas de 0 a 10? */}
      <div className="bg-amber-50/90 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 rounded-3xl p-5 sm:p-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                Como funciona a avaliação sem notas na Educação Básica?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                Na Educação Infantil e no Ensino Básico (conforme a <strong>LDB e a BNCC</strong>), cada criança aprende no seu tempo. Em vez de notas de 0 a 10, os professores registram <strong>etapas de desenvolvimento</strong> e <strong>pareceres descritivos</strong> que mostram as conquistas e onde apoiar.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowScaleGuide(!showScaleGuide)}
            className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-amber-100/50 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <span>{showScaleGuide ? 'Ocultar Etapas' : 'Entender as 4 Etapas'}</span>
            {showScaleGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {showScaleGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-amber-200/60 dark:border-amber-800/40 animate-in fade-in duration-200">
            {(['abaixo_do_basico', 'basico', 'adequado', 'avancado'] as ProficiencyLevel[]).map((lvl) => {
              const st = DEVELOPMENT_STAGES[lvl];
              return (
                <div
                  key={lvl}
                  className={`bg-white dark:bg-neutral-900 p-4 rounded-2xl border ${st.cardBorder} space-y-2 shadow-xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{st.emoji}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      Etapa {st.step} de 4
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-neutral-900 dark:text-white">{st.title}</h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{st.summary}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold">Carregando acompanhamento pedagógico...</span>
        </div>
      ) : (
        reportCard && (
          <>
            {/* 3 Cards de Resumo Didático: Desenvolvimento Global + Frequência Escolar + Atividades Digitais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Síntese Qualitativa Global */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-[28px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Desenvolvimento Geral
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp size={13} /> Percurso Ativo
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 my-2">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/70 dark:border-emerald-500/30 flex items-center justify-center text-3xl shrink-0">
                      {overallStage.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-neutral-900 dark:text-white leading-tight">
                        {overallStage.title}
                      </h3>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {reportCard.finalStatus}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mt-3">
                    {overallStage.summary}
                  </p>
                </div>

                {/* Barra de 4 blocos qualitativos (sem números de nota) */}
                <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between text-[11px] font-bold text-neutral-500">
                    <span>Caminhada de Aprendizagem</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      Etapa {overallStage.step} de 4
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-2.5 rounded-full transition-all ${
                          step <= overallStage.step
                            ? overallStage.barClass
                            : 'bg-neutral-100 dark:bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Frequência Escolar Viva */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-[28px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Presença na Escola
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        reportCard.attendanceRate >= minLegalAttendance
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                      }`}
                    >
                      {reportCard.attendanceRate >= minLegalAttendance
                        ? 'Presença Saudável'
                        : 'Atenção às Faltas'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl font-black text-neutral-900 dark:text-white">
                      {reportCard.attendanceRate}%
                    </span>
                    <span className="text-xs text-neutral-500 font-semibold">
                      ({reportCard.totalClasses - reportCard.totalAbsences} presenças • {reportCard.totalAbsences} faltas)
                    </span>
                  </div>

                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3 rounded-full mt-3.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        reportCard.attendanceRate >= minLegalAttendance
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-rose-500 to-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, reportCard.attendanceRate)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-3 leading-relaxed">
                    <strong>Regra LDB:</strong> Mínimo de <strong>{minLegalAttendance}%</strong> de frequência anual para{' '}
                    {isInfantil ? 'Educação Infantil (Pré-Escola)' : 'o Ensino Fundamental'}.
                  </p>
                </div>

                {onOpenTeacherChat ? (
                  <button
                    onClick={onOpenTeacherChat}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageSquare size={15} />
                    <span>Falar com o Professor / Justificar Ausência</span>
                  </button>
                ) : (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-[11px] text-neutral-500 font-medium">
                    A presença diária fortalece os vínculos e as experiências em sala de aula.
                  </div>
                )}
              </div>

              {/* Card 3: Participação nas Atividades do Portal */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-[28px] border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Atividades no Portal
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 flex items-center gap-1">
                      <Zap size={11} /> {studentProfile?.streak ?? 12} dias ativos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-2">
                    <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20">
                      <span className="text-2xl font-black text-sky-700 dark:text-sky-300 block">
                        {completedActivitiesStats?.completedLessons ?? 6}
                      </span>
                      <span className="text-[11px] font-bold text-sky-900/70 dark:text-sky-200/80">
                        Aulas & Missões feitas
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                      <span className="text-2xl font-black text-purple-700 dark:text-purple-300 block">
                        {completedActivitiesStats?.completedTrails ?? 1}
                      </span>
                      <span className="text-[11px] font-bold text-purple-900/70 dark:text-purple-200/80">
                        Trilhas concluídas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Constância Semanal Visual */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-500 block mb-2">
                    Hábito de estudo nesta semana:
                  </span>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {weekLabels.map((day, idx) => {
                      const active = studentProfile?.weeklyActivity
                        ? studentProfile.weeklyActivity[idx]
                        : idx >= 1 && idx <= 4;
                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                              active
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {active ? '✓' : '·'}
                          </div>
                          <span className="text-[9px] font-bold text-neutral-400">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa Evolutivo Bimestral por Componente Curricular (100% Sem Notas Numéricas) */}
            <section className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 sm:p-8 border border-neutral-200/70 dark:border-neutral-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
                    <Compass className="text-indigo-600 dark:text-indigo-400" size={24} />
                    Acompanhamento por Componente Curricular
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    Clique em qualquer matéria para ver a observação do professor e sugestões práticas para apoiar em casa.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3.5 py-2 rounded-xl self-start sm:self-auto">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Toque na matéria para abrir dicas</span>
                </div>
              </div>

              <div className="space-y-3">
                {reportCard.subjects.map((sub) => {
                  const meta = SUBJECT_VISUAL_META[sub.subject] || {
                    icon: 'BookOpen',
                    bgIcon: 'bg-indigo-100 dark:bg-indigo-500/20',
                    textIcon: 'text-indigo-600 dark:text-indigo-400',
                    homeTip: 'Converse sobre o que foi aprendido na aula de hoje e valorize cada descoberta da criança.'
                  };

                  const currentLevel: ProficiencyLevel = sub.proficiencyLevel || 'adequado';
                  const stageCfg = DEVELOPMENT_STAGES[currentLevel] || DEVELOPMENT_STAGES.adequado;
                  const isExpanded = expandedSubject === sub.subject;

                  const firstStep = sub.b1Proficiency ? DEVELOPMENT_STAGES[sub.b1Proficiency].step : stageCfg.step;
                  const latestStep = stageCfg.step;
                  const hasProgressed = latestStep > firstStep;

                  return (
                    <div
                      key={sub.subject}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isExpanded
                          ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-sm'
                          : 'border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/60 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      {/* Linha Principal Clicável */}
                      <button
                        type="button"
                        onClick={() => setExpandedSubject(isExpanded ? null : sub.subject)}
                        className="w-full p-4 sm:p-5 text-left flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
                      >
                        {/* Nome da Matéria + Ícone */}
                        <div className="flex items-center gap-3.5 min-w-[230px]">
                          <div className={`w-12 h-12 rounded-2xl ${meta.bgIcon} ${meta.textIcon} flex items-center justify-center shrink-0`}>
                            <SubjectIcon icon={meta.icon} size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-base text-neutral-900 dark:text-white">
                                {sub.subject}
                              </h4>
                              {hasProgressed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  <TrendingUp size={11} /> Evoluiu!
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-500 font-medium">
                              Faltas registradas: <strong>{sub.totalAbsences}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Linha do Tempo dos 4 Bimestres */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-2xl">
                          {[
                            { label: '1º Bim', val: sub.b1Proficiency },
                            { label: '2º Bim', val: sub.b2Proficiency },
                            { label: '3º Bim', val: sub.b3Proficiency },
                            { label: '4º Bim', val: sub.b4Proficiency }
                          ].map((bim) => (
                            <div
                              key={bim.label}
                              className="bg-white dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800 rounded-xl p-2 flex flex-col items-center justify-center gap-1"
                            >
                              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                                {bim.label}
                              </span>
                              {renderStageChip(bim.val, true)}
                            </div>
                          ))}
                        </div>

                        {/* Síntese + Botão Expandir */}
                        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-200/50 dark:border-neutral-800">
                          <div className="text-left lg:text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                              Momento Atual
                            </span>
                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                              {stageCfg.emoji} {stageCfg.title}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 shrink-0">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </button>

                      {/* Painel Expandido: Parecer da Matéria + Como Apoiar em Casa */}
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                          <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 space-y-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                              <BookOpen size={13} /> Observação Pedagógica em {sub.subject}
                            </span>
                            <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              {sub.descriptiveOpinion
                                ? `"${sub.descriptiveOpinion}"`
                                : stageCfg.summary}
                            </p>
                          </div>

                          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 space-y-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                              <Lightbulb size={14} /> Como a Família Pode Apoiar em Casa
                            </span>
                            <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                              <strong className="text-neutral-900 dark:text-white">{stageCfg.familyTipPrefix}</strong>{' '}
                              {meta.homeTip}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Seção em Destaque: O Olhar do Professor (Pareceres Descritivos Bimestrais) */}
            {reportCard.opinions && reportCard.opinions.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                      O Olhar do Professor (Pareceres Descritivos)
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Registros qualitativos elaborados pelos educadores sobre as conquistas e vivências da criança
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportCard.opinions.map((op, idx) => (
                    <div
                      key={`${op.subject}-${op.bimester}-${idx}`}
                      className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30">
                            {op.subject}
                          </span>
                          <span className="text-[11px] font-bold text-neutral-400">
                            {op.bimester}º Bimestre
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                          "{op.opinion}"
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 font-semibold">
                        <span>{op.teacherName || 'Professor(a) Regente'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Registrado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )
      )}

      {/* Mural Família-Escola Interativo */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center relative">
              <Bell size={20} />
              {pendingAnnouncementsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingAnnouncementsCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                Agenda & Comunicados da Escola
              </h3>
              <p className="text-xs text-neutral-500">
                Avisos da coordenação e dos professores — marque "Ciente" após a leitura
              </p>
            </div>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl overflow-x-auto">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'urgente', label: 'Importantes' },
              { id: 'reuniao', label: 'Reuniões' },
              { id: 'turma', label: 'Minha Turma' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAnnouncementFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  announcementFilter === tab.id
                    ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((ann) => {
            const badge = getCategoryBadge(ann.category);
            const isAck = acknowledgedIds.includes(ann.id);

            return (
              <div
                key={ann.id}
                className={`bg-white dark:bg-neutral-900 p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  isAck
                    ? 'border-neutral-200/50 dark:border-neutral-800/60 opacity-85'
                    : 'border-indigo-200/80 dark:border-indigo-800/50 shadow-sm hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>

                    <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(ann.publish_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h4 className="font-black text-base text-neutral-900 dark:text-white leading-tight">
                    {ann.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                    {ann.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 text-[11px]">
                  <div className="text-neutral-500 font-semibold truncate">
                    <span>Por: <strong>{ann.author_name}</strong></span>
                    {ann.target_class && (
                      <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-bold">
                        • {ann.target_class}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAcknowledge(ann.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isAck
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                    <span>{isAck ? 'Ciente Confirmado' : 'Confirmar Ciência'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal: Visualizador e Impressão do Boletim Oficial Qualitativo */}
      {isBoletimModalOpen && reportCard && (
        <BoletimEscolarPDF
          reportCard={reportCard}
          onClose={() => setIsBoletimModalOpen(false)}
        />
      )}
    </div>
  );
};
