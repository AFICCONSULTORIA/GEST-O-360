import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Check,
  X,
  ArrowLeft,
  Sparkles,
  Zap,
  Coins,
  Eye,
  ArrowUp,
  ArrowDown,
  Copy,
  Image as ImageIcon,
  LayoutTemplate,
  Lightbulb,
  Loader2,
  Map,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Course,
  Module,
  Lesson,
  QuizQuestion,
  serializeCourseIconMeta,
  deserializeCourseRowMeta,
  serializeQuizQuestionText,
  deserializeQuizQuestionRow,
} from '../../lib/api/education';
import { StudentPortal } from './StudentPortal';
import { StudentQuizPlayer } from './components/StudentQuizPlayer';
import {
  EducationImageField,
  EducationImageBankCore,
} from './components/EducationImagePicker';
import { SubjectIcon, SUBJECT_ICON_OPTIONS } from './components/SubjectIcon';
import {
  COURSE_COLOR_STYLES,
  CourseColorKey,
  getCourseTheme,
  SUBJECT_PRESETS,
  EDU_READY_TEMPLATES,
  ReadyTemplate,
} from './data/eduImageBank';

export type StudioInitialMode =
  | 'list'
  | 'quick-activity'
  | 'create-trail'
  | 'templates'
  | 'image-bank';

interface TeacherEducationManagerProps {
  initialMode?: StudioInitialMode;
  institutionId?: string | null;
  onModeConsumed?: () => void;
}

interface EditableQuestion {
  id?: string;
  question: string;
  imageUrl?: string;
  contextText?: string;
  explanation?: string;
  options: string[];
  correctAnswer: number;
  showExtras?: boolean;
}

const createBlankQuestion = (): EditableQuestion => ({
  question: '',
  imageUrl: '',
  contextText: '',
  explanation: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  showExtras: false,
});

// =============================================================================
// SUBCOMPONENTE: CONSTRUTOR VISUAL MULTI-QUESTÕES (COM BANCO DE IMAGENS IA)
// =============================================================================
interface QuestionListBuilderProps {
  questions: EditableQuestion[];
  onChange: (questions: EditableQuestion[]) => void;
  subject: string;
  institutionId?: string | null;
}

const QuestionListBuilder: React.FC<QuestionListBuilderProps> = ({
  questions,
  onChange,
  subject,
  institutionId,
}) => {
  const updateQ = (idx: number, patch: Partial<EditableQuestion>) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const addQuestion = () => {
    onChange([...questions, createBlankQuestion()]);
  };

  const duplicateQuestion = (idx: number) => {
    const source = questions[idx];
    const copy: EditableQuestion = {
      ...source,
      id: undefined,
      options: [...source.options],
      showExtras: Boolean(source.contextText || source.explanation),
    };
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    onChange(questions.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const setTrueFalsePreset = (idx: number) => {
    updateQ(idx, {
      options: ['Verdadeiro', 'Falso'],
      correctAnswer: 0,
    });
  };

  const setFourOptionsPreset = (idx: number) => {
    const cur = questions[idx].options;
    updateQ(idx, {
      options: [cur[0] || '', cur[1] || '', cur[2] || '', cur[3] || ''],
      correctAnswer: Math.min(questions[idx].correctAnswer, 3),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-black text-neutral-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <HelpCircle size={16} className="text-amber-500" />
            Questões da Atividade ({questions.length})
          </h4>
          <p className="text-xs text-neutral-500">
            Adicione quantas perguntas desejar, ilustre com o Banco de Imagens IA e marque a alternativa correta.
          </p>
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
        >
          <Plus size={15} /> Adicionar Questão
        </button>
      </div>

      <div className="space-y-5">
        {questions.map((q, qIdx) => {
          const isTrueFalse =
            q.options.length === 2 &&
            q.options[0] === 'Verdadeiro' &&
            q.options[1] === 'Falso';

          return (
            <div
              key={qIdx}
              className="bg-amber-50/50 dark:bg-neutral-900/90 border-2 border-amber-200/70 dark:border-amber-500/20 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              {/* Barra superior da questão */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-amber-200/50 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                    {qIdx + 1}
                  </span>
                  <span className="font-black text-sm text-neutral-900 dark:text-white">
                    Questão {qIdx + 1}
                  </span>

                  {/* Alternador rápido Múltipla Escolha vs Verdadeiro/Falso */}
                  <div className="ml-2 flex items-center bg-white dark:bg-neutral-800 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setFourOptionsPreset(qIdx)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        !isTrueFalse
                          ? 'bg-indigo-600 text-white'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                      }`}
                    >
                      Múltipla Escolha
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrueFalsePreset(qIdx)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        isTrueFalse
                          ? 'bg-indigo-600 text-white'
                          : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                      }`}
                    >
                      Verdadeiro / Falso
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {qIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveQuestion(qIdx, 'up')}
                      title="Subir questão"
                      className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-indigo-600 cursor-pointer"
                    >
                      <ArrowUp size={14} />
                    </button>
                  )}
                  {qIdx < questions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveQuestion(qIdx, 'down')}
                      title="Descer questão"
                      className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-indigo-600 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(qIdx)}
                    title="Duplicar esta questão"
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={13} /> Duplicar
                  </button>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      title="Remover questão"
                      className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Ilustração da Questão (Banco de Imagens IA ou Upload) */}
              <EducationImageField
                label="Figura / Ilustração da Questão (Opcional)"
                value={q.imageUrl}
                onChange={(url) => updateQ(qIdx, { imageUrl: url })}
                subject={subject}
                institutionId={institutionId}
                helperText="Ilustre com pizzas de fração, plantas, mapas, relógios ou envie/cole uma figura (Ctrl+V)"
                compact
              />

              {/* Enunciado */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase mb-1.5">
                  Enunciado da Pergunta *
                </label>
                <textarea
                  rows={2}
                  value={q.question}
                  onChange={(e) => updateQ(qIdx, { question: e.target.value })}
                  placeholder="Digite a pergunta clara para o aluno..."
                  className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:border-amber-500 outline-none resize-none font-bold text-sm text-neutral-900 dark:text-white"
                />
              </div>

              {/* Alternativas */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase">
                  Alternativas (Clique na bolinha verde para marcar a correta)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.correctAnswer === oIdx;
                    return (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/10'
                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateQ(qIdx, { correctAnswer: oIdx })}
                          title="Marcar como resposta correta"
                          className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-emerald-100'
                          }`}
                        >
                          {isCorrect ? (
                            <Check size={14} strokeWidth={3} />
                          ) : (
                            ['A', 'B', 'C', 'D'][oIdx] || oIdx + 1
                          )}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const nextOpts = [...q.options];
                            nextOpts[oIdx] = e.target.value;
                            updateQ(qIdx, { options: nextOpts });
                          }}
                          placeholder={`Alternativa ${['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}`}
                          className="flex-1 bg-transparent text-sm font-semibold text-neutral-900 dark:text-white outline-none min-w-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão expansível para Texto Base e Explicação Pedagógica */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    updateQ(qIdx, {
                      showExtras: !Boolean(
                        q.showExtras || q.contextText || q.explanation
                      ),
                    })
                  }
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb size={13} />
                  {q.showExtras || q.contextText || q.explanation
                    ? 'Ocultar Texto de Apoio e Explicação da Resposta'
                    : '+ Adicionar Texto de Apoio (Interpretação) ou Explicação da Resposta'}
                </button>

                {(q.showExtras || q.contextText || q.explanation) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-amber-200/50 dark:border-neutral-800">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                        Texto Base / Trecho de Leitura (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={q.contextText || ''}
                        onChange={(e) =>
                          updateQ(qIdx, { contextText: e.target.value })
                        }
                        placeholder="Ex: Trecho de fábula, poema ou problema contextualizado..."
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-200 outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                        Explicação Pedagógica após Responder (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={(e) =>
                          updateQ(qIdx, { explanation: e.target.value })
                        }
                        placeholder="Ex: 2/8 simplificado por 2 equivale a 1/4 da pizza!"
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-200 outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <Plus size={16} /> Adicionar Mais uma Questão a esta Atividade
      </button>
    </div>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL: ESTÚDIO DE ATIVIDADES & TRILHAS DO PROFESSOR
// =============================================================================
export const TeacherEducationManager: React.FC<TeacherEducationManagerProps> = ({
  initialMode = 'list',
  institutionId = null,
  onModeConsumed,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modos do Estúdio: list | quick-activity | create-trail | edit-course | templates | image-bank
  const [view, setView] = useState<
    | 'list'
    | 'quick-activity'
    | 'create-trail'
    | 'edit-course'
    | 'templates'
    | 'image-bank'
  >(initialMode);

  const [listFilter, setListFilter] = useState<'all' | 'quick' | 'trails'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('Todas');

  // Toast feedback sem usar alert()
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToastMsg = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3800);
    },
    []
  );

  useEffect(() => {
    if (initialMode && initialMode !== 'list') {
      setView(initialMode);
      if (onModeConsumed) onModeConsumed();
    }
  }, [initialMode, onModeConsumed]);

  // Preview Aluno (Trilha inteira ou Quiz rápido direto)
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);
  const [previewQuizLesson, setPreviewQuizLesson] = useState<Lesson | null>(null);
  const [previewQuizState, setPreviewQuizState] = useState({
    currentQuestionIndex: 0,
    selectedOption: null as number | null,
    isCorrect: null as boolean | null,
    score: 0,
    isFinished: false,
  });

  // Matérias e Turmas dinâmicas da Escola
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    'Matemática',
    'Português',
    'Ciências',
    'História',
    'Geografia',
    'Artes',
  ]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([
    'Turma 4A',
    'Turma 5B',
  ]);

  useEffect(() => {
    const syncSchoolLists = () => {
      try {
        const sRaw = localStorage.getItem('gestao360_subjects');
        if (sRaw) {
          const parsed = JSON.parse(sRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const names = parsed.map((s: any) => s.name).filter(Boolean);
            setAvailableSubjects(
              Array.from(new Set([...names, 'Artes']))
            );
          }
        }
        const cRaw = localStorage.getItem('gestao360_classes');
        if (cRaw) {
          const parsed = JSON.parse(cRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailableClasses(parsed.map((c: any) => c.name).filter(Boolean));
          }
        }
      } catch {}
    };
    syncSchoolLists();
    window.addEventListener('subjects-updated', syncSchoolLists);
    window.addEventListener('classes-updated', syncSchoolLists);
    return () => {
      window.removeEventListener('subjects-updated', syncSchoolLists);
      window.removeEventListener('classes-updated', syncSchoolLists);
    };
  }, []);

  // =========================================================================
  // ESTADO 1: CRIADOR DE ATIVIDADE RÁPIDA (EM 1 ÚNICA TELA)
  // =========================================================================
  const [quickForm, setQuickForm] = useState({
    title: '',
    subject: 'Matemática',
    description: '',
    color: 'sky' as CourseColorKey,
    icon: 'Calculator',
    coverUrl: '/edu-bank/cover-matematica.jpg',
    duration: '10 min',
    xp: 100,
    coins: 30,
    target_classes: [] as string[],
    questions: [createBlankQuestion()] as EditableQuestion[],
  });

  // =========================================================================
  // ESTADO 2: CRIADOR DE TRILHA COMPLETA (ENXUTO E VISUAL)
  // =========================================================================
  const [trailForm, setTrailForm] = useState({
    title: '',
    subject: 'Português',
    description: '',
    color: 'emerald' as CourseColorKey,
    icon: 'BookOpen',
    coverUrl: '/edu-bank/cover-portugues.jpg',
    target_classes: [] as string[],
    firstModuleTitle: 'Fase 1: Introdução e Conceitos',
    firstModuleDesc: 'Primeiros passos para explorar o tema com segurança.',
    includeStarterLesson: true,
    starterType: 'text' as 'text' | 'video' | 'quiz',
    starterTitle: '',
    starterDuration: '10 min',
    starterXp: 50,
    starterCoins: 20,
    starterImageUrl: '',
    starterContentUrl: '',
    starterContentBody: '',
    starterQuestions: [createBlankQuestion()] as EditableQuestion[],
  });

  // =========================================================================
  // ESTADO 3: CONSTRUTOR DE FASES/AULAS DA TRILHA SELECIONADA
  // =========================================================================
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isEditingCourseMeta, setIsEditingCourseMeta] = useState(false);
  const [editCourseMeta, setEditCourseMeta] = useState({
    title: '',
    subject: '',
    description: '',
    color: 'emerald' as CourseColorKey,
    icon: 'BookOpen',
    coverUrl: '',
    target_classes: [] as string[],
  });

  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModTitle, setNewModTitle] = useState('');
  const [newModDesc, setNewModDesc] = useState('');

  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const [lessonDraft, setLessonDraft] = useState({
    type: 'quiz' as 'video' | 'text' | 'quiz',
    title: '',
    duration: '10 min',
    xp: 60,
    coins: 20,
    contentUrl: '',
    imageUrl: '',
    contentBody: '',
    questions: [createBlankQuestion()] as EditableQuestion[],
  });

  // =========================================================================
  // PERSISTÊNCIA RESILIENTE NO SUPABASE (COM SUPORTE V5 + LEGADO)
  // =========================================================================
  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: any[] | null = null;
      let v5Query = supabase
        .from('edu_courses')
        .select(
          `
          id, institution_id, title, subject, description, color, icon, cover_url, target_classes, is_quick_activity,
          edu_modules (
            id, title, description, order_index,
            edu_lessons (
              id, type, title, duration_text, xp_reward, coin_reward, content_url, image_url, content_body, order_index,
              edu_quiz_questions (
                id, question_text, image_url, context_text, explanation, options, correct_answer_index, order_index
              )
            )
          )
        `
        )
        .order('created_at', { ascending: false });

      if (institutionId) {
        v5Query = v5Query.or(
          `institution_id.eq.${institutionId},institution_id.is.null`
        );
      }

      const v5Res = await v5Query;
      if (!v5Res.error) {
        data = v5Res.data || [];
      } else {
        const legRes = await supabase
          .from('edu_courses')
          .select(
            `
            id, title, subject, description, color, icon,
            edu_modules (
              id, title, description, order_index,
              edu_lessons (
                id, type, title, xp_reward, coin_reward, content_url, content_body, order_index,
                edu_quiz_questions (
                  id, question_text, options, correct_answer_index, order_index
                )
              )
            )
          `
          )
          .order('created_at', { ascending: false });

        if (legRes.error) throw legRes.error;
        data = legRes.data || [];
      }

      const mapped: Course[] = (data || []).map((c: any) => {
        const meta = deserializeCourseRowMeta(c);
        return {
          id: c.id,
          institution_id: c.institution_id ?? null,
          title: c.title,
          subject: c.subject,
          description: c.description,
          color: c.color || 'emerald',
          icon: meta.icon,
          coverUrl: meta.coverUrl,
          isQuickActivity: meta.isQuickActivity,
          target_classes: meta.target_classes,
          modules: (c.edu_modules || [])
            .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((m: any) => ({
              id: m.id,
              course_id: c.id,
              title: m.title,
              description: m.description,
              order_index: m.order_index ?? 0,
              lessons: (m.edu_lessons || [])
                .sort(
                  (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
                )
                .map((l: any) => ({
                  id: l.id,
                  module_id: m.id,
                  type: l.type,
                  title: l.title,
                  duration: l.duration_text || '10 min',
                  xp: l.xp_reward || 50,
                  coins: l.coin_reward || 15,
                  contentUrl: l.content_url || '',
                  imageUrl:
                    l.image_url ||
                    (l.type !== 'video' ? l.content_url || '' : ''),
                  contentBody: l.content_body || '',
                  questions: (l.edu_quiz_questions || [])
                    .sort(
                      (a: any, b: any) =>
                        (a.order_index ?? 0) - (b.order_index ?? 0)
                    )
                    .map((q: any) => {
                      const decoded = deserializeQuizQuestionRow(q);
                      return {
                        id: q.id,
                        lesson_id: l.id,
                        question: decoded.question,
                        imageUrl: decoded.imageUrl,
                        contextText: decoded.contextText,
                        explanation: decoded.explanation,
                        options: Array.isArray(q.options)
                          ? q.options
                          : ['', '', '', ''],
                        correctAnswer: q.correct_answer_index ?? 0,
                      };
                    }),
                })),
            })),
        };
      });

      setCourses(mapped);
      if (selectedCourse) {
        const refreshed = mapped.find((c) => c.id === selectedCourse.id);
        if (refreshed) setSelectedCourse(refreshed);
      }
    } catch (err) {
      console.error('Erro ao carregar trilhas e atividades:', err);
      showToastMsg('Não foi possível sincronizar as trilhas no momento.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, selectedCourse?.id, showToastMsg]);

  useEffect(() => {
    loadCourses();
  }, []);

  // Helper resiliente para inserir Curso/Trilha no Supabase
  const insertCourseRecord = async (params: {
    title: string;
    subject: string;
    description: string;
    color: CourseColorKey;
    icon: string;
    coverUrl?: string;
    isQuickActivity?: boolean;
    targetClasses?: string[];
  }) => {
    const packedIcon = serializeCourseIconMeta({
      icon: params.icon,
      coverUrl: params.coverUrl,
      isQuickActivity: params.isQuickActivity,
      targetClasses: params.targetClasses,
    });

    const v5Attempt = await supabase
      .from('edu_courses')
      .insert([
        {
          institution_id: institutionId || null,
          title: params.title,
          subject: params.subject,
          description: params.description,
          color: params.color,
          icon: packedIcon,
          cover_url: params.coverUrl || null,
          target_classes: params.targetClasses || [],
          is_quick_activity: Boolean(params.isQuickActivity),
        },
      ])
      .select()
      .single();

    let created = v5Attempt.data;
    if (v5Attempt.error) {
      const fallbackColor =
        params.color === 'indigo' ? 'sky' : params.color;
      const legAttempt = await supabase
        .from('edu_courses')
        .insert([
          {
            title: params.title,
            subject: params.subject,
            description: params.description,
            color: fallbackColor,
            icon: packedIcon,
          },
        ])
        .select()
        .single();
      if (legAttempt.error) throw legAttempt.error;
      created = legAttempt.data;
    }

    // Espelha também no cache local de turmas para compatibilidade imediata
    if (created?.id && params.targetClasses) {
      try {
        const raw = localStorage.getItem('gestao360_course_classes');
        const map = raw ? JSON.parse(raw) : {};
        map[created.id] = params.targetClasses;
        localStorage.setItem('gestao360_course_classes', JSON.stringify(map));
      } catch {}
    }

    return created;
  };

  // Helper resiliente para inserir Aula + N Questões Ilustradas
  const insertLessonWithQuestions = async (params: {
    moduleId: string;
    type: 'video' | 'text' | 'quiz';
    title: string;
    duration?: string;
    xp: number;
    coins: number;
    contentUrl?: string;
    imageUrl?: string;
    contentBody?: string;
    orderIndex: number;
    questions?: EditableQuestion[];
  }) => {
    const effectiveContentUrl =
      params.type === 'video'
        ? params.contentUrl || null
        : params.imageUrl || null;

    const v5Lesson = await supabase
      .from('edu_lessons')
      .insert([
        {
          module_id: params.moduleId,
          type: params.type,
          title: params.title,
          duration_text: params.duration || '10 min',
          xp_reward: params.xp,
          coin_reward: params.coins,
          content_url: effectiveContentUrl,
          image_url: params.imageUrl || null,
          content_body: params.type === 'text' ? params.contentBody || '' : null,
          order_index: params.orderIndex,
        },
      ])
      .select()
      .single();

    let lessonRow = v5Lesson.data;
    if (v5Lesson.error) {
      const legLesson = await supabase
        .from('edu_lessons')
        .insert([
          {
            module_id: params.moduleId,
            type: params.type,
            title: params.title,
            xp_reward: params.xp,
            coin_reward: params.coins,
            content_url: effectiveContentUrl,
            content_body:
              params.type === 'text' ? params.contentBody || '' : null,
            order_index: params.orderIndex,
          },
        ])
        .select()
        .single();
      if (legLesson.error) throw legLesson.error;
      lessonRow = legLesson.data;
    }

    if (
      params.type === 'quiz' &&
      lessonRow?.id &&
      params.questions &&
      params.questions.length > 0
    ) {
      const validQuestions = params.questions.filter(
        (q) => q.question.trim().length > 0
      );
      if (validQuestions.length > 0) {
        const v5QRows = validQuestions.map((q, idx) => ({
          lesson_id: lessonRow.id,
          question_text: serializeQuizQuestionText(q),
          image_url: q.imageUrl?.trim() || null,
          context_text: q.contextText?.trim() || null,
          explanation: q.explanation?.trim() || null,
          options: q.options.filter((o) => o.trim().length > 0),
          correct_answer_index: q.correctAnswer,
          order_index: idx,
        }));

        const qAttempt = await supabase
          .from('edu_quiz_questions')
          .insert(v5QRows);

        if (qAttempt.error) {
          const legQRows = validQuestions.map((q, idx) => ({
            lesson_id: lessonRow.id,
            question_text: serializeQuizQuestionText(q),
            options: q.options.filter((o) => o.trim().length > 0),
            correct_answer_index: q.correctAnswer,
            order_index: idx,
          }));
          const legAttempt = await supabase
            .from('edu_quiz_questions')
            .insert(legQRows);
          if (legAttempt.error) throw legAttempt.error;
        }
      }
    }

    return lessonRow;
  };

  // =========================================================================
  // AÇÃO 1: PUBLICAR ATIVIDADE RÁPIDA (1 TELA)
  // =========================================================================
  const handleSaveQuickActivity = async () => {
    if (!quickForm.title.trim()) {
      showToastMsg('Dê um título para a atividade antes de publicar.', 'error');
      return;
    }
    const validQs = quickForm.questions.filter(
      (q) =>
        q.question.trim().length > 0 &&
        q.options.filter((o) => o.trim().length > 0).length >= 2
    );
    if (validQs.length === 0) {
      showToastMsg(
        'Preencha pelo menos 1 questão com enunciado e no mínimo 2 alternativas.',
        'error'
      );
      return;
    }

    setIsSaving(true);
    try {
      const course = await insertCourseRecord({
        title: quickForm.title.trim(),
        subject: quickForm.subject,
        description:
          quickForm.description.trim() ||
          `Atividade rápida de ${quickForm.subject} (${validQs.length} questões).`,
        color: quickForm.color,
        icon: quickForm.icon,
        coverUrl: quickForm.coverUrl,
        isQuickActivity: true,
        targetClasses: quickForm.target_classes,
      });

      const { data: modData, error: modErr } = await supabase
        .from('edu_modules')
        .insert([
          {
            course_id: course.id,
            title: 'Desafio Principal',
            description: quickForm.description.trim() || 'Atividade avaliativa',
            order_index: 0,
          },
        ])
        .select()
        .single();
      if (modErr) throw modErr;

      await insertLessonWithQuestions({
        moduleId: modData.id,
        type: 'quiz',
        title: quickForm.title.trim(),
        duration: quickForm.duration,
        xp: quickForm.xp,
        coins: quickForm.coins,
        imageUrl: quickForm.coverUrl,
        orderIndex: 0,
        questions: validQs,
      });

      await loadCourses();
      setQuickForm({
        title: '',
        subject: 'Matemática',
        description: '',
        color: 'sky',
        icon: 'Calculator',
        coverUrl: '/edu-bank/cover-matematica.jpg',
        duration: '10 min',
        xp: 100,
        coins: 30,
        target_classes: [],
        questions: [createBlankQuestion()],
      });
      setView('list');
      showToastMsg(
        'Atividade rápida publicada! Já está disponível nas Trilhas e Missões dos alunos.'
      );
    } catch (err: any) {
      console.error('Erro ao publicar atividade rápida:', err);
      showToastMsg(
        err?.message || 'Erro ao salvar atividade no banco de dados.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // AÇÃO 2: PUBLICAR NOVA TRILHA DE APRENDIZAGEM
  // =========================================================================
  const handleSaveNewTrail = async () => {
    if (!trailForm.title.trim()) {
      showToastMsg('Informe o título da trilha de aprendizagem.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const course = await insertCourseRecord({
        title: trailForm.title.trim(),
        subject: trailForm.subject,
        description:
          trailForm.description.trim() ||
          `Trilha estruturada de ${trailForm.subject}.`,
        color: trailForm.color,
        icon: trailForm.icon,
        coverUrl: trailForm.coverUrl,
        isQuickActivity: false,
        targetClasses: trailForm.target_classes,
      });

      const { data: modData, error: modErr } = await supabase
        .from('edu_modules')
        .insert([
          {
            course_id: course.id,
            title: trailForm.firstModuleTitle.trim() || 'Fase 1: Introdução',
            description: trailForm.firstModuleDesc.trim(),
            order_index: 0,
          },
        ])
        .select()
        .single();
      if (modErr) throw modErr;

      if (trailForm.includeStarterLesson && trailForm.starterTitle.trim()) {
        await insertLessonWithQuestions({
          moduleId: modData.id,
          type: trailForm.starterType,
          title: trailForm.starterTitle.trim(),
          duration: trailForm.starterDuration,
          xp: trailForm.starterXp,
          coins: trailForm.starterCoins,
          contentUrl: trailForm.starterContentUrl,
          imageUrl: trailForm.starterImageUrl,
          contentBody: trailForm.starterContentBody,
          orderIndex: 0,
          questions: trailForm.starterQuestions,
        });
      }

      await loadCourses();
      setView('list');
      showToastMsg('Nova trilha criada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar trilha:', err);
      showToastMsg(err?.message || 'Erro ao criar trilha.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // AÇÃO 3: USAR MODELO PRONTO BNCC (CARREGA NO EDITOR P/ REVISAR OU PUBLICA)
  // =========================================================================
  const handleUseTemplate = (tpl: ReadyTemplate) => {
    if (tpl.kind === 'quick-activity') {
      setQuickForm({
        title: tpl.title,
        subject: tpl.subject,
        description: `${tpl.description} (${tpl.bnccCode})`,
        color: tpl.color,
        icon: tpl.icon,
        coverUrl: tpl.coverUrl,
        duration: tpl.duration,
        xp: tpl.xp,
        coins: tpl.coins,
        target_classes: [],
        questions: tpl.questions.map((q) => ({
          question: q.question,
          imageUrl: q.imageUrl || '',
          contextText: q.contextText || '',
          explanation: q.explanation || '',
          options: [...q.options],
          correctAnswer: q.correctAnswer,
          showExtras: Boolean(q.contextText || q.explanation),
        })),
      });
      setView('quick-activity');
      showToastMsg(
        `Modelo "${tpl.title}" carregado! Revise ou personalize como quiser antes de publicar.`
      );
    } else {
      // Publica a trilha modelo completa (Leitura Ilustrada + Quiz Multi-Questões) e abre para edição
      (async () => {
        setIsSaving(true);
        try {
          const course = await insertCourseRecord({
            title: tpl.title,
            subject: tpl.subject,
            description: `${tpl.description} (${tpl.bnccCode})`,
            color: tpl.color,
            icon: tpl.icon,
            coverUrl: tpl.coverUrl,
            isQuickActivity: false,
            targetClasses: [],
          });

          const { data: modData, error: modErr } = await supabase
            .from('edu_modules')
            .insert([
              {
                course_id: course.id,
                title: 'Fase 1: Estudo Ilustrado & Desafio',
                description: `Alinhado à habilidade ${tpl.bnccCode} (${tpl.gradeHint})`,
                order_index: 0,
              },
            ])
            .select()
            .single();
          if (modErr) throw modErr;

          let orderIdx = 0;
          if (tpl.readingLesson) {
            await insertLessonWithQuestions({
              moduleId: modData.id,
              type: 'text',
              title: tpl.readingLesson.title,
              duration: '8 min',
              xp: 50,
              coins: 20,
              imageUrl: tpl.readingLesson.imageUrl,
              contentBody: tpl.readingLesson.contentBody,
              orderIndex: orderIdx++,
            });
          }

          await insertLessonWithQuestions({
            moduleId: modData.id,
            type: 'quiz',
            title: `Desafio: ${tpl.title}`,
            duration: tpl.duration,
            xp: tpl.xp,
            coins: tpl.coins,
            imageUrl: tpl.coverUrl,
            orderIndex: orderIdx,
            questions: tpl.questions.map((q) => ({
              question: q.question,
              imageUrl: q.imageUrl,
              contextText: q.contextText,
              explanation: q.explanation,
              options: q.options,
              correctAnswer: q.correctAnswer,
            })),
          });

          await loadCourses();
          setView('list');
          showToastMsg(
            `Trilha completa "${tpl.title}" criada a partir do modelo BNCC!`
          );
        } catch (err: any) {
          showToastMsg(err?.message || 'Erro ao aplicar modelo.', 'error');
        } finally {
          setIsSaving(false);
        }
      })();
    }
  };

  // =========================================================================
  // AÇÃO 4: DUPLICAR TRILHA OU ATIVIDADE EM 1 CLIQUE
  // =========================================================================
  const handleDuplicateCourse = async (source: Course) => {
    setIsSaving(true);
    try {
      const clonedCourse = await insertCourseRecord({
        title: `${source.title} (Cópia)`,
        subject: source.subject,
        description: source.description,
        color: (source.color as CourseColorKey) || 'emerald',
        icon: source.icon,
        coverUrl: source.coverUrl,
        isQuickActivity: source.isQuickActivity,
        targetClasses: source.target_classes || [],
      });

      for (let mIdx = 0; mIdx < source.modules.length; mIdx++) {
        const mod = source.modules[mIdx];
        const { data: newMod, error: mErr } = await supabase
          .from('edu_modules')
          .insert([
            {
              course_id: clonedCourse.id,
              title: mod.title,
              description: mod.description,
              order_index: mIdx,
            },
          ])
          .select()
          .single();
        if (mErr || !newMod) continue;

        for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
          const les = mod.lessons[lIdx];
          await insertLessonWithQuestions({
            moduleId: newMod.id,
            type: les.type,
            title: les.title,
            duration: les.duration,
            xp: les.xp,
            coins: les.coins,
            contentUrl: les.contentUrl,
            imageUrl: les.imageUrl,
            contentBody: les.contentBody,
            orderIndex: lIdx,
            questions: (les.questions || []).map((q) => ({
              question: q.question,
              imageUrl: q.imageUrl,
              contextText: q.contextText,
              explanation: q.explanation,
              options: q.options,
              correctAnswer: q.correctAnswer,
            })),
          });
        }
      }

      await loadCourses();
      showToastMsg(`"${source.title}" duplicada com sucesso!`);
    } catch (err: any) {
      showToastMsg(err?.message || 'Erro ao duplicar atividade.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (
      !window.confirm(
        'Deseja excluir esta trilha/atividade permanentemente? As fases e questões vinculadas também serão removidas.'
      )
    )
      return;
    try {
      await supabase.from('edu_courses').delete().eq('id', id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (selectedCourse?.id === id) {
        setSelectedCourse(null);
        setView('list');
      }
      showToastMsg('Item excluído com sucesso.');
    } catch {
      showToastMsg('Erro ao excluir item.', 'error');
    }
  };

  // =========================================================================
  // EDIÇÃO DE METADADOS, MÓDULOS E AULAS DE UMA TRILHA EXISTENTE
  // =========================================================================
  const handleSaveCourseMeta = async () => {
    if (!selectedCourse || !editCourseMeta.title.trim()) return;
    setIsSaving(true);
    try {
      const packedIcon = serializeCourseIconMeta({
        icon: editCourseMeta.icon,
        coverUrl: editCourseMeta.coverUrl,
        isQuickActivity: selectedCourse.isQuickActivity,
        targetClasses: editCourseMeta.target_classes,
      });

      const v5Upd = await supabase
        .from('edu_courses')
        .update({
          title: editCourseMeta.title.trim(),
          subject: editCourseMeta.subject,
          description: editCourseMeta.description,
          color: editCourseMeta.color,
          icon: packedIcon,
          cover_url: editCourseMeta.coverUrl || null,
          target_classes: editCourseMeta.target_classes,
        })
        .eq('id', selectedCourse.id);

      if (v5Upd.error) {
        const legUpd = await supabase
          .from('edu_courses')
          .update({
            title: editCourseMeta.title.trim(),
            subject: editCourseMeta.subject,
            description: editCourseMeta.description,
            color:
              editCourseMeta.color === 'indigo' ? 'sky' : editCourseMeta.color,
            icon: packedIcon,
          })
          .eq('id', selectedCourse.id);
        if (legUpd.error) throw legUpd.error;
      }

      try {
        const raw = localStorage.getItem('gestao360_course_classes');
        const map = raw ? JSON.parse(raw) : {};
        map[selectedCourse.id] = editCourseMeta.target_classes;
        localStorage.setItem('gestao360_course_classes', JSON.stringify(map));
      } catch {}

      setIsEditingCourseMeta(false);
      await loadCourses();
      showToastMsg('Configurações e capa da trilha atualizadas!');
    } catch (err: any) {
      showToastMsg(err?.message || 'Erro ao atualizar trilha.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateModule = async () => {
    if (!selectedCourse || !newModTitle.trim()) return;
    try {
      const { error } = await supabase.from('edu_modules').insert([
        {
          course_id: selectedCourse.id,
          title: newModTitle.trim(),
          description: newModDesc.trim(),
          order_index: selectedCourse.modules.length,
        },
      ]);
      if (error) throw error;
      setNewModTitle('');
      setNewModDesc('');
      setIsAddingModule(false);
      await loadCourses();
      showToastMsg('Nova fase adicionada à trilha!');
    } catch {
      showToastMsg('Erro ao criar nova fase.', 'error');
    }
  };

  const handleSaveNewLessonInModule = async () => {
    if (!addingLessonTo || !lessonDraft.title.trim() || !selectedCourse) return;
    const mod = selectedCourse.modules.find((m) => m.id === addingLessonTo);
    const nextOrder = mod?.lessons?.length || 0;

    setIsSaving(true);
    try {
      await insertLessonWithQuestions({
        moduleId: addingLessonTo,
        type: lessonDraft.type,
        title: lessonDraft.title.trim(),
        duration: lessonDraft.duration,
        xp: lessonDraft.xp,
        coins: lessonDraft.coins,
        contentUrl: lessonDraft.contentUrl,
        imageUrl: lessonDraft.imageUrl,
        contentBody: lessonDraft.contentBody,
        orderIndex: nextOrder,
        questions: lessonDraft.questions,
      });

      setAddingLessonTo(null);
      setLessonDraft({
        type: 'quiz',
        title: '',
        duration: '10 min',
        xp: 60,
        coins: 20,
        contentUrl: '',
        imageUrl: '',
        contentBody: '',
        questions: [createBlankQuestion()],
      });
      await loadCourses();
      showToastMsg('Nova aula/atividade salva com sucesso!');
    } catch (err: any) {
      showToastMsg(err?.message || 'Erro ao salvar aula.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateExistingLesson = async (lessonId: string) => {
    if (!lessonDraft.title.trim()) return;
    setIsSaving(true);
    try {
      const effectiveContentUrl =
        lessonDraft.type === 'video'
          ? lessonDraft.contentUrl || null
          : lessonDraft.imageUrl || null;

      const v5Upd = await supabase
        .from('edu_lessons')
        .update({
          type: lessonDraft.type,
          title: lessonDraft.title.trim(),
          duration_text: lessonDraft.duration || '10 min',
          xp_reward: lessonDraft.xp,
          coin_reward: lessonDraft.coins,
          content_url: effectiveContentUrl,
          image_url: lessonDraft.imageUrl || null,
          content_body:
            lessonDraft.type === 'text' ? lessonDraft.contentBody : null,
        })
        .eq('id', lessonId);

      if (v5Upd.error) {
        const legUpd = await supabase
          .from('edu_lessons')
          .update({
            type: lessonDraft.type,
            title: lessonDraft.title.trim(),
            xp_reward: lessonDraft.xp,
            coin_reward: lessonDraft.coins,
            content_url: effectiveContentUrl,
            content_body:
              lessonDraft.type === 'text' ? lessonDraft.contentBody : null,
          })
          .eq('id', lessonId);
        if (legUpd.error) throw legUpd.error;
      }

      // Sincroniza todas as questões da atividade (substitui pelas editadas mantendo ordem)
      if (lessonDraft.type === 'quiz') {
        await supabase
          .from('edu_quiz_questions')
          .delete()
          .eq('lesson_id', lessonId);

        const validQs = lessonDraft.questions.filter(
          (q) => q.question.trim().length > 0
        );
        if (validQs.length > 0) {
          const v5Rows = validQs.map((q, idx) => ({
            lesson_id: lessonId,
            question_text: serializeQuizQuestionText(q),
            image_url: q.imageUrl?.trim() || null,
            context_text: q.contextText?.trim() || null,
            explanation: q.explanation?.trim() || null,
            options: q.options.filter((o) => o.trim().length > 0),
            correct_answer_index: q.correctAnswer,
            order_index: idx,
          }));
          const qRes = await supabase
            .from('edu_quiz_questions')
            .insert(v5Rows);

          if (qRes.error) {
            const legRows = validQs.map((q, idx) => ({
              lesson_id: lessonId,
              question_text: serializeQuizQuestionText(q),
              options: q.options.filter((o) => o.trim().length > 0),
              correct_answer_index: q.correctAnswer,
              order_index: idx,
            }));
            await supabase.from('edu_quiz_questions').insert(legRows);
          }
        }
      }

      setEditingLessonId(null);
      await loadCourses();
      showToastMsg('Atividade atualizada com sucesso!');
    } catch (err: any) {
      showToastMsg(err?.message || 'Erro ao atualizar aula.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Correção do bug order_index (antes tentava atualizar position_index inexistente)
  const handleReorderLesson = async (
    moduleId: string,
    currentIdx: number,
    direction: 'up' | 'down'
  ) => {
    if (!selectedCourse) return;
    const mod = selectedCourse.modules.find((m) => m.id === moduleId);
    if (!mod || !mod.lessons) return;

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= mod.lessons.length) return;

    const lessonA = mod.lessons[currentIdx];
    const lessonB = mod.lessons[targetIdx];

    await Promise.all([
      supabase
        .from('edu_lessons')
        .update({ order_index: targetIdx })
        .eq('id', lessonA.id),
      supabase
        .from('edu_lessons')
        .update({ order_index: currentIdx })
        .eq('id', lessonB.id),
    ]);

    await loadCourses();
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Remover esta aula/atividade da fase?')) return;
    await supabase.from('edu_lessons').delete().eq('id', lessonId);
    await loadCourses();
    showToastMsg('Aula removida.');
  };

  const openQuizPreview = (lesson: Lesson) => {
    setPreviewQuizState({
      currentQuestionIndex: 0,
      selectedOption: null,
      isCorrect: null,
      score: 0,
      isFinished: false,
    });
    setPreviewQuizLesson(lesson);
  };

  // Se estiver no modo Preview Completo do Portal do Aluno
  if (previewCourseId) {
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 overflow-y-auto">
        <div className="bg-amber-500 text-amber-950 px-6 py-2.5 text-xs font-black uppercase tracking-widest flex justify-between items-center sticky top-0 z-[210] shadow-md">
          <span className="flex items-center gap-2">
            <Eye size={16} /> Visão do Aluno — Testando Trilha em Tempo Real
          </span>
          <button
            onClick={() => setPreviewCourseId(null)}
            className="bg-amber-950 text-amber-400 hover:bg-black px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Voltar ao Estúdio do Professor
          </button>
        </div>
        <StudentPortal
          onBack={() => setPreviewCourseId(null)}
          previewCourseId={previewCourseId}
        />
      </div>
    );
  }

  const filteredCourses = courses.filter((c) => {
    const matchesKind =
      listFilter === 'all' ||
      (listFilter === 'quick' && Boolean(c.isQuickActivity)) ||
      (listFilter === 'trails' && !c.isQuickActivity);
    const matchesSubject =
      subjectFilter === 'Todas' || c.subject === subjectFilter;
    return matchesKind && matchesSubject;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 pb-24">
      {/* Toast Flutuante */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[230] px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.type === 'error' ? <X size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modal de Teste Instantâneo de Quiz ("Ver como Aluno") */}
      {previewQuizLesson && (
        <StudentQuizPlayer
          activeLesson={previewQuizLesson}
          setActiveView={() => {}}
          setActiveLesson={() => setPreviewQuizLesson(null)}
          quizState={previewQuizState}
          setQuizState={setPreviewQuizState}
          finishLesson={() => setPreviewQuizLesson(null)}
          isTeacherPreview
          onClosePreview={() => setPreviewQuizLesson(null)}
        />
      )}

      {/* ===================================================================== */}
      {/* VISÃO 1: HUB PRINCIPAL DE ATIVIDADES & TRILHAS                        */}
      {/* ===================================================================== */}
      {view === 'list' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header + Botões Rápidos de Criação */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/70 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-2">
                  <Sparkles size={13} /> Estúdio Pedagógico do Professor
                </span>
                <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Atividades, Missões & Trilhas
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                  Crie atividades ilustradas em segundos usando o Banco de Imagens IA, modelos BNCC ou suas próprias figuras.
                </p>
              </div>
            </div>

            {/* 4 Cards de Ação Rápida para o Professor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setView('quick-activity')}
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-left shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 hover:shadow-xl transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Zap size={22} />
                </div>
                <h3 className="font-black text-base">Nova Atividade Rápida</h3>
                <p className="text-xs text-white/85 mt-1">
                  Crie um desafio ilustrado com várias questões em 1 única tela
                </p>
              </button>

              <button
                type="button"
                onClick={() => setView('create-trail')}
                className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white text-left shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Map size={22} />
                </div>
                <h3 className="font-black text-base">Nova Trilha Completa</h3>
                <p className="text-xs text-white/85 mt-1">
                  Estruture fases sequenciais com leituras, vídeos e quizzes
                </p>
              </button>

              <button
                type="button"
                onClick={() => setView('templates')}
                className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border-2 border-neutral-200 dark:border-neutral-700 hover:border-emerald-400 text-left transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <LayoutTemplate size={22} />
                </div>
                <h3 className="font-black text-base text-neutral-900 dark:text-white">
                  Modelos Prontos BNCC
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Comece em 1 clique com atividades já ilustradas e editáveis
                </p>
              </button>

              <button
                type="button"
                onClick={() => setView('image-bank')}
                className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border-2 border-neutral-200 dark:border-neutral-700 hover:border-purple-400 text-left transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ImageIcon size={22} />
                </div>
                <h3 className="font-black text-base text-neutral-900 dark:text-white">
                  Banco de Imagens IA
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Explore figuras por matéria ou envie imagens da sua escola
                </p>
              </button>
            </div>
          </div>

          {/* Barra de Filtros da Lista */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-fit">
              {[
                { id: 'all', label: `Tudo (${courses.length})` },
                {
                  id: 'quick',
                  label: `Atividades Rápidas (${
                    courses.filter((c) => c.isQuickActivity).length
                  })`,
                },
                {
                  id: 'trails',
                  label: `Trilhas (${
                    courses.filter((c) => !c.isQuickActivity).length
                  })`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setListFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    listFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={15} className="text-neutral-400" />
              {['Todas', ...availableSubjects].map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSubjectFilter(subj)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    subjectFilter === subj
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Cards das Trilhas e Atividades */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-neutral-400 gap-3">
              <Loader2 size={26} className="animate-spin text-indigo-500" />
              <span className="font-bold">Carregando seu estúdio...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Sparkles size={36} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                Nenhuma atividade ou trilha neste filtro
              </h3>
              <p className="text-sm text-neutral-500 max-w-md mx-auto">
                Experimente criar uma <strong>Atividade Rápida Ilustrada</strong> ou começar com um dos nossos <strong>Modelos Prontos BNCC</strong>!
              </p>
              <div className="flex justify-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setView('quick-activity')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Zap size={16} /> Criar Atividade Rápida
                </button>
                <button
                  type="button"
                  onClick={() => setView('templates')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer"
                >
                  <LayoutTemplate size={16} /> Ver Modelos BNCC
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const theme = getCourseTheme(course.color);
                const cover =
                  course.coverUrl ||
                  SUBJECT_PRESETS[course.subject]?.defaultCover;
                const totalLessons = course.modules.reduce(
                  (acc, m) => acc + (m.lessons?.length || 0),
                  0
                );
                const totalQuestions = course.modules.reduce(
                  (acc, m) =>
                    acc +
                    (m.lessons || []).reduce(
                      (qAcc, l) => qAcc + (l.questions?.length || 0),
                      0
                    ),
                  0
                );

                return (
                  <div
                    key={course.id}
                    className={`bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col hover:shadow-xl transition-all group ${theme.cardHover}`}
                  >
                    {/* Capa */}
                    <div className="h-40 w-full relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                      {cover ? (
                        <img
                          src={cover}
                          alt={course.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${theme.gradient}`}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider">
                          {course.subject}
                        </span>
                        {course.isQuickActivity ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase flex items-center gap-1">
                            <Zap size={10} /> Atividade Rápida
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white text-[10px] font-black uppercase">
                            Trilha ({course.modules.length} fases)
                          </span>
                        )}
                      </div>

                      {/* Ações rápidas no canto superior direito */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewCourseId(course.id)}
                          title="Testar como Aluno"
                          className="w-8 h-8 rounded-lg bg-black/55 hover:bg-emerald-600 text-white backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateCourse(course)}
                          title="Duplicar para outra turma"
                          className="w-8 h-8 rounded-lg bg-black/55 hover:bg-indigo-600 text-white backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          title="Excluir"
                          className="w-8 h-8 rounded-lg bg-black/55 hover:bg-rose-600 text-white backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div
                          className={`w-10 h-10 rounded-xl ${theme.iconBg} ${theme.iconText} bg-white/95 dark:bg-neutral-900/95 flex items-center justify-center shadow-md`}
                        >
                          <SubjectIcon icon={course.icon} size={20} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                          <span>{totalLessons} aulas</span>
                          {totalQuestions > 0 && (
                            <>
                              <span>•</span>
                              <span>{totalQuestions} questões</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Corpo */}
                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div>
                        <h4 className="font-black text-lg text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                          {course.title}
                        </h4>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      </div>

                      {/* Turmas Alvo */}
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {course.target_classes &&
                        course.target_classes.length > 0 ? (
                          course.target_classes.map((cls) => (
                            <span
                              key={cls}
                              className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold"
                            >
                              {cls}
                            </span>
                          ))
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[11px] font-semibold">
                            Aberta para todas as turmas
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourse(course);
                          setIsEditingCourseMeta(false);
                          if (course.modules.length > 0) {
                            setExpandedModules({ [course.modules[0].id]: true });
                          }
                          setView('edit-course');
                        }}
                        className={`w-full py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-transparent cursor-pointer ${theme.buttonHover}`}
                      >
                        <Edit2 size={15} /> Editar Conteúdo & Questões
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 2: CRIAR ATIVIDADE RÁPIDA (EM 1 ÚNICA TELA + BANCO DE IMAGENS)  */}
      {/* ===================================================================== */}
      {view === 'quick-activity' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft size={18} /> Voltar ao Estúdio
            </button>

            <button
              type="button"
              onClick={() =>
                openQuizPreview({
                  id: 'preview-quick',
                  type: 'quiz',
                  title: quickForm.title || 'Prévia da Atividade',
                  xp: quickForm.xp,
                  coins: quickForm.coins,
                  imageUrl: quickForm.coverUrl,
                  questions: quickForm.questions
                    .filter((q) => q.question.trim().length > 0)
                    .map((q, idx) => ({
                      id: `pq-${idx}`,
                      question: q.question,
                      imageUrl: q.imageUrl,
                      contextText: q.contextText,
                      explanation: q.explanation,
                      options: q.options,
                      correctAnswer: q.correctAnswer,
                    })),
                })
              }
              className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={15} /> Testar como Aluno
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                  Nova Atividade Rápida Ilustrada
                </h2>
                <p className="text-xs text-neutral-500">
                  Tudo em uma única tela: escolha a matéria, ilustre e adicione quantas questões quiser.
                </p>
              </div>
            </div>

            {/* Dados Básicos + Matéria com Auto-Preset de Capa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                  Título da Atividade *
                </label>
                <input
                  type="text"
                  value={quickForm.title}
                  onChange={(e) =>
                    setQuickForm({ ...quickForm, title: e.target.value })
                  }
                  placeholder="Ex: Revisão Ilustrada de Frações — 4º Ano"
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                  Matéria / Disciplina
                </label>
                <select
                  value={quickForm.subject}
                  onChange={(e) => {
                    const subj = e.target.value;
                    const preset = SUBJECT_PRESETS[subj];
                    setQuickForm((prev) => ({
                      ...prev,
                      subject: subj,
                      color: preset?.color || prev.color,
                      icon: preset?.icon || prev.icon,
                      coverUrl: preset?.defaultCover || prev.coverUrl,
                    }));
                  }}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white outline-none focus:border-amber-500"
                >
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capa da Atividade (Banco de Imagens IA ou Upload) */}
            <EducationImageField
              label="Imagem de Capa da Atividade"
              value={quickForm.coverUrl}
              onChange={(url) => setQuickForm({ ...quickForm, coverUrl: url })}
              subject={quickForm.subject}
              institutionId={institutionId}
              helperText="A capa aparece nos cards de Missões e Trilhas do aluno"
            />

            {/* Turmas Destinatárias + Recompensas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                  Destinar para quais Turmas? (Vazio = Todas)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableClasses.map((cls) => {
                    const active = quickForm.target_classes.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() =>
                          setQuickForm((prev) => ({
                            ...prev,
                            target_classes: active
                              ? prev.target_classes.filter((c) => c !== cls)
                              : [...prev.target_classes, cls],
                          }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {active && '✓ '}
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                    Tempo
                  </label>
                  <input
                    type="text"
                    value={quickForm.duration}
                    onChange={(e) =>
                      setQuickForm({ ...quickForm, duration: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                    XP
                  </label>
                  <input
                    type="number"
                    value={quickForm.xp}
                    onChange={(e) =>
                      setQuickForm({
                        ...quickForm,
                        xp: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                    Moedas
                  </label>
                  <input
                    type="number"
                    value={quickForm.coins}
                    onChange={(e) =>
                      setQuickForm({
                        ...quickForm,
                        coins: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Construtor Multi-Questões */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <QuestionListBuilder
                questions={quickForm.questions}
                onChange={(questions) =>
                  setQuickForm({ ...quickForm, questions })
                }
                subject={quickForm.subject}
                institutionId={institutionId}
              />
            </div>

            {/* Barra de Publicação */}
            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-6 py-3.5 rounded-2xl font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveQuickActivity}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-black shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Publicando...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Publicar Atividade para os Alunos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 3: CRIAR NOVA TRILHA COMPLETA                                   */}
      {/* ===================================================================== */}
      {view === 'create-trail' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft size={18} /> Voltar ao Estúdio
          </button>

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Map size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                  Criar Nova Trilha de Aprendizagem
                </h2>
                <p className="text-xs text-neutral-500">
                  Ideal para organizar uma jornada com múltiplas fases, textos ilustrados, vídeos e quizzes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                  Nome da Trilha *
                </label>
                <input
                  type="text"
                  value={trailForm.title}
                  onChange={(e) =>
                    setTrailForm({ ...trailForm, title: e.target.value })
                  }
                  placeholder="Ex: Aventura pela Leitura e Interpretação"
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                  Matéria
                </label>
                <select
                  value={trailForm.subject}
                  onChange={(e) => {
                    const subj = e.target.value;
                    const preset = SUBJECT_PRESETS[subj];
                    setTrailForm((prev) => ({
                      ...prev,
                      subject: subj,
                      color: preset?.color || prev.color,
                      icon: preset?.icon || prev.icon,
                      coverUrl: preset?.defaultCover || prev.coverUrl,
                    }));
                  }}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                Descrição Curta para os Alunos
              </label>
              <textarea
                rows={2}
                value={trailForm.description}
                onChange={(e) =>
                  setTrailForm({ ...trailForm, description: e.target.value })
                }
                placeholder="Ex: Explore textos, fábulas e desafios interativos passo a passo!"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Capa da Trilha */}
            <EducationImageField
              label="Capa Ilustrada da Trilha"
              value={trailForm.coverUrl}
              onChange={(url) => setTrailForm({ ...trailForm, coverUrl: url })}
              subject={trailForm.subject}
              institutionId={institutionId}
            />

            {/* Cor Temática e Ícone da Matéria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                  Cor Temática
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {(Object.keys(COURSE_COLOR_STYLES) as CourseColorKey[]).map(
                    (cKey) => (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() =>
                          setTrailForm({ ...trailForm, color: cKey })
                        }
                        title={COURSE_COLOR_STYLES[cKey].label}
                        className={`w-10 h-10 rounded-full ${
                          COURSE_COLOR_STYLES[cKey].dot
                        } flex items-center justify-center text-white transition-transform cursor-pointer ${
                          trailForm.color === cKey
                            ? 'scale-110 ring-4 ring-offset-2 ring-indigo-500/40 dark:ring-offset-neutral-900'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {trailForm.color === cKey && <Check size={16} />}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                  Ícone da Trilha
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setTrailForm({ ...trailForm, icon: opt.id })
                      }
                      title={opt.label}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        trailForm.icon === opt.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <SubjectIcon icon={opt.id} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Turmas */}
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                Turmas Vinculadas (Vazio = Todas as Turmas)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableClasses.map((cls) => {
                  const active = trailForm.target_classes.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() =>
                        setTrailForm((prev) => ({
                          ...prev,
                          target_classes: active
                            ? prev.target_classes.filter((c) => c !== cls)
                            : [...prev.target_classes, cls],
                        }))
                      }
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {active && '✓ '}
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primeira Fase */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                Fase Inicial da Trilha
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={trailForm.firstModuleTitle}
                  onChange={(e) =>
                    setTrailForm({
                      ...trailForm,
                      firstModuleTitle: e.target.value,
                    })
                  }
                  placeholder="Título da Fase 1"
                  className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm text-neutral-900 dark:text-white outline-none"
                />
                <input
                  type="text"
                  value={trailForm.firstModuleDesc}
                  onChange={(e) =>
                    setTrailForm({
                      ...trailForm,
                      firstModuleDesc: e.target.value,
                    })
                  }
                  placeholder="Objetivo desta fase (opcional)"
                  className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={trailForm.includeStarterLesson}
                  onChange={(e) =>
                    setTrailForm({
                      ...trailForm,
                      includeStarterLesson: e.target.checked,
                    })
                  }
                  className="rounded text-indigo-600"
                />
                Já cadastrar a primeira aula desta fase agora
              </label>

              {trailForm.includeStarterLesson && (
                <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex gap-2">
                    {(['text', 'video', 'quiz'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setTrailForm({ ...trailForm, starterType: t })
                        }
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          trailForm.starterType === t
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500'
                        }`}
                      >
                        {t === 'text'
                          ? '📖 Leitura Ilustrada'
                          : t === 'video'
                          ? '🎬 Vídeo (YouTube)'
                          : '⚡ Desafio (Quiz)'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={trailForm.starterTitle}
                    onChange={(e) =>
                      setTrailForm({
                        ...trailForm,
                        starterTitle: e.target.value,
                      })
                    }
                    placeholder="Título da Primeira Aula (deixe em branco se preferir adicionar depois)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm text-neutral-900 dark:text-white outline-none"
                  />

                  {trailForm.starterType === 'video' && (
                    <input
                      type="text"
                      value={trailForm.starterContentUrl}
                      onChange={(e) =>
                        setTrailForm({
                          ...trailForm,
                          starterContentUrl: e.target.value,
                        })
                      }
                      placeholder="Link do YouTube ou vídeo MP4"
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none"
                    />
                  )}

                  {trailForm.starterType === 'text' && (
                    <div className="space-y-3">
                      <EducationImageField
                        label="Ilustração da Leitura (Opcional)"
                        value={trailForm.starterImageUrl}
                        onChange={(url) =>
                          setTrailForm({ ...trailForm, starterImageUrl: url })
                        }
                        subject={trailForm.subject}
                        institutionId={institutionId}
                        compact
                      />
                      <textarea
                        rows={4}
                        value={trailForm.starterContentBody}
                        onChange={(e) =>
                          setTrailForm({
                            ...trailForm,
                            starterContentBody: e.target.value,
                          })
                        }
                        placeholder="Escreva o texto didático da aula..."
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none resize-none"
                      />
                    </div>
                  )}

                  {trailForm.starterType === 'quiz' && (
                    <QuestionListBuilder
                      questions={trailForm.starterQuestions}
                      onChange={(qs) =>
                        setTrailForm({ ...trailForm, starterQuestions: qs })
                      }
                      subject={trailForm.subject}
                      institutionId={institutionId}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-6 py-3 rounded-2xl font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveNewTrail}
                className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Criar Trilha
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 4: GALERIA DE MODELOS PRONTOS BNCC                              */}
      {/* ===================================================================== */}
      {view === 'templates' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft size={18} /> Voltar ao Estúdio
          </button>

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
                <LayoutTemplate size={13} /> Praticidade para Sala de Aula
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white">
                Modelos Prontos & Ilustrados (BNCC)
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Escolha um modelo pronto: ele já vem com ilustrações do Banco de Imagens IA, questões e explicações pedagógicas que você pode adaptar livremente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {EDU_READY_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50/60 dark:bg-neutral-800/40 flex flex-col hover:border-indigo-400 transition-all"
                >
                  <div className="h-44 relative overflow-hidden bg-neutral-200 dark:bg-neutral-900">
                    <img
                      src={tpl.coverUrl}
                      alt={tpl.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-black uppercase">
                        {tpl.subject} • {tpl.bnccCode}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase">
                        {tpl.gradeHint}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-black text-lg leading-tight">
                        {tpl.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {tpl.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs font-bold text-neutral-500">
                        <span>
                          {tpl.kind === 'quick-activity'
                            ? '⚡ Atividade Rápida'
                            : '🗺️ Trilha Completa (Leitura + Desafio)'}
                        </span>
                        <span>•</span>
                        <span>{tpl.questions.length} questões ilustradas</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleUseTemplate(tpl)}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Sparkles size={16} />
                      {tpl.kind === 'quick-activity'
                        ? 'Personalizar e Usar Modelo'
                        : 'Criar Trilha com este Modelo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 5: BANCO DE IMAGENS IA & ACERVO DA ESCOLA                       */}
      {/* ===================================================================== */}
      {view === 'image-bank' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft size={18} /> Voltar ao Estúdio
          </button>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm min-h-[70vh]">
            <EducationImageBankCore
              mode="panel"
              institutionId={institutionId}
              onSelect={(url, title) => {
                // Permite já iniciar uma atividade rápida com a imagem escolhida!
                setQuickForm((prev) => ({
                  ...prev,
                  coverUrl: url,
                  questions: prev.questions.map((q, idx) =>
                    idx === 0 && !q.imageUrl ? { ...q, imageUrl: url } : q
                  ),
                }));
                showToastMsg(
                  `Imagem "${title || 'selecionada'}" vinculada! Abrindo criador de atividade...`
                );
                setView('quick-activity');
              }}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISÃO 6: EDITOR COMPLETO DE TRILHA / FASES / AULAS E QUESTÕES         */}
      {/* ===================================================================== */}
      {view === 'edit-course' && selectedCourse && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft size={18} /> Voltar para Minhas Trilhas e Atividades
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDuplicateCourse(selectedCourse)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center gap-1.5 hover:border-indigo-400 cursor-pointer"
              >
                <Copy size={14} /> Duplicar
              </button>
              <button
                type="button"
                onClick={() => setPreviewCourseId(selectedCourse.id)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Eye size={15} /> Ver Trilha como Aluno
              </button>
            </div>
          </div>

          {/* Cabeçalho Visual da Trilha Selecionada */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm">
            {!isEditingCourseMeta ? (
              <div className="flex flex-col md:flex-row">
                <div className="md:w-72 h-44 md:h-auto relative bg-neutral-100 dark:bg-neutral-800 shrink-0">
                  <img
                    src={
                      selectedCourse.coverUrl ||
                      SUBJECT_PRESETS[selectedCourse.subject]?.defaultCover ||
                      '/edu-bank/cover-matematica.jpg'
                    }
                    alt={selectedCourse.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {selectedCourse.subject}
                      </span>
                      <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mt-0.5">
                        {selectedCourse.title}
                      </h2>
                      <p className="text-sm text-neutral-500 mt-1">
                        {selectedCourse.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCourseMeta({
                          title: selectedCourse.title,
                          subject: selectedCourse.subject,
                          description: selectedCourse.description,
                          color:
                            (selectedCourse.color as CourseColorKey) ||
                            'emerald',
                          icon: selectedCourse.icon || 'BookOpen',
                          coverUrl: selectedCourse.coverUrl || '',
                          target_classes: selectedCourse.target_classes || [],
                        });
                        setIsEditingCourseMeta(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-neutral-700 dark:text-neutral-200 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Edit2 size={14} /> Editar Capa & Dados
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.target_classes &&
                    selectedCourse.target_classes.length > 0 ? (
                      selectedCourse.target_classes.map((cls) => (
                        <span
                          key={cls}
                          className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                        >
                          {cls}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-semibold text-neutral-400">
                        Visível para todas as turmas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 md:p-8 space-y-5">
                <h3 className="font-black text-lg text-neutral-900 dark:text-white">
                  Editar Capa, Turmas e Informações
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={editCourseMeta.title}
                      onChange={(e) =>
                        setEditCourseMeta({
                          ...editCourseMeta,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Matéria
                    </label>
                    <select
                      value={editCourseMeta.subject}
                      onChange={(e) =>
                        setEditCourseMeta({
                          ...editCourseMeta,
                          subject: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-900 dark:text-white outline-none"
                    >
                      {availableSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={editCourseMeta.description}
                  onChange={(e) =>
                    setEditCourseMeta({
                      ...editCourseMeta,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descrição..."
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none resize-none"
                />

                <EducationImageField
                  label="Capa da Trilha / Atividade"
                  value={editCourseMeta.coverUrl}
                  onChange={(url) =>
                    setEditCourseMeta({ ...editCourseMeta, coverUrl: url })
                  }
                  subject={editCourseMeta.subject}
                  institutionId={institutionId}
                  compact
                />

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
                    Turmas Vinculadas (Vazio = Todas)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableClasses.map((cls) => {
                      const active = editCourseMeta.target_classes.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() =>
                            setEditCourseMeta((prev) => ({
                              ...prev,
                              target_classes: active
                                ? prev.target_classes.filter((c) => c !== cls)
                                : [...prev.target_classes, cls],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                            active
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          {active && '✓ '}
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingCourseMeta(false)}
                    className="px-4 py-2 rounded-xl font-bold text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveCourseMeta}
                    className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista de Fases (Módulos) e Aulas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                Fases & Conteúdos ({selectedCourse.modules.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingModule(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} /> Nova Fase
              </button>
            </div>

            {isAddingModule && (
              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-2 border-indigo-500/40 space-y-3">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                  Adicionar Nova Fase
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newModTitle}
                    onChange={(e) => setNewModTitle(e.target.value)}
                    placeholder="Nome da Fase (Ex: Fase 2 — Exercícios Práticos)"
                    className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm text-neutral-900 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    value={newModDesc}
                    onChange={(e) => setNewModDesc(e.target.value)}
                    placeholder="Descrição opcional"
                    className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingModule(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateModule}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Criar Fase
                  </button>
                </div>
              </div>
            )}

            {selectedCourse.modules.map((mod, mIdx) => {
              const isExpanded = expandedModules[mod.id] ?? true;
              return (
                <div
                  key={mod.id}
                  className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm"
                >
                  <div
                    onClick={() =>
                      setExpandedModules((prev) => ({
                        ...prev,
                        [mod.id]: !isExpanded,
                      }))
                    }
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={18} className="text-neutral-400" />
                      <div>
                        <h4 className="font-black text-base text-neutral-900 dark:text-white">
                          <span className="text-indigo-600 dark:text-indigo-400 mr-1.5">
                            Fase {mIdx + 1}:
                          </span>
                          {mod.title}
                        </h4>
                        <p className="text-xs text-neutral-500">
                          {mod.lessons?.length || 0} atividades nesta fase
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-neutral-400" />
                    ) : (
                      <ChevronDown size={20} className="text-neutral-400" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-5 bg-neutral-50/70 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                      {mod.lessons?.map((lesson, lIdx) => {
                        const isEditingThis = editingLessonId === lesson.id;
                        if (isEditingThis) {
                          return (
                            <div
                              key={lesson.id}
                              className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-2 border-indigo-500/40 space-y-5 shadow-md"
                            >
                              <h5 className="font-black text-neutral-900 dark:text-white">
                                Editando: {lesson.title}
                              </h5>

                              <div className="flex gap-2">
                                {(['quiz', 'text', 'video'] as const).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      setLessonDraft({ ...lessonDraft, type: t })
                                    }
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                                      lessonDraft.type === t
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                                    }`}
                                  >
                                    {t === 'quiz'
                                      ? '⚡ Desafio Multi-Questões'
                                      : t === 'text'
                                      ? '📖 Leitura Ilustrada'
                                      : '🎬 Vídeo (YouTube)'}
                                  </button>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input
                                  type="text"
                                  value={lessonDraft.title}
                                  onChange={(e) =>
                                    setLessonDraft({
                                      ...lessonDraft,
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder="Título da aula/atividade"
                                  className="md:col-span-2 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm text-neutral-900 dark:text-white outline-none"
                                />
                                <input
                                  type="number"
                                  value={lessonDraft.xp}
                                  onChange={(e) =>
                                    setLessonDraft({
                                      ...lessonDraft,
                                      xp: Number(e.target.value),
                                    })
                                  }
                                  placeholder="XP"
                                  className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                                />
                                <input
                                  type="number"
                                  value={lessonDraft.coins}
                                  onChange={(e) =>
                                    setLessonDraft({
                                      ...lessonDraft,
                                      coins: Number(e.target.value),
                                    })
                                  }
                                  placeholder="Moedas"
                                  className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                                />
                              </div>

                              {lessonDraft.type === 'video' && (
                                <input
                                  type="text"
                                  value={lessonDraft.contentUrl}
                                  onChange={(e) =>
                                    setLessonDraft({
                                      ...lessonDraft,
                                      contentUrl: e.target.value,
                                    })
                                  }
                                  placeholder="URL do vídeo (YouTube ou MP4)"
                                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none"
                                />
                              )}

                              {lessonDraft.type === 'text' && (
                                <div className="space-y-4">
                                  <EducationImageField
                                    label="Ilustração da Leitura"
                                    value={lessonDraft.imageUrl}
                                    onChange={(url) =>
                                      setLessonDraft({
                                        ...lessonDraft,
                                        imageUrl: url,
                                      })
                                    }
                                    subject={selectedCourse.subject}
                                    institutionId={institutionId}
                                    compact
                                  />
                                  <textarea
                                    rows={5}
                                    value={lessonDraft.contentBody}
                                    onChange={(e) =>
                                      setLessonDraft({
                                        ...lessonDraft,
                                        contentBody: e.target.value,
                                      })
                                    }
                                    placeholder="Conteúdo textual da aula..."
                                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none resize-none"
                                  />
                                </div>
                              )}

                              {lessonDraft.type === 'quiz' && (
                                <QuestionListBuilder
                                  questions={lessonDraft.questions}
                                  onChange={(questions) =>
                                    setLessonDraft({ ...lessonDraft, questions })
                                  }
                                  subject={selectedCourse.subject}
                                  institutionId={institutionId}
                                />
                              )}

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingLessonId(null)}
                                  className="px-4 py-2 rounded-xl font-bold text-sm text-neutral-500 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() =>
                                    handleUpdateExistingLesson(lesson.id)
                                  }
                                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
                                >
                                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={lesson.id}
                            className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 hover:border-indigo-300 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  lesson.type === 'video'
                                    ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'
                                    : lesson.type === 'quiz'
                                    ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
                                    : 'bg-sky-50 text-sky-500 dark:bg-sky-500/10'
                                }`}
                              >
                                {lesson.type === 'video' ? (
                                  <Video size={18} />
                                ) : lesson.type === 'quiz' ? (
                                  <HelpCircle size={18} />
                                ) : (
                                  <FileText size={18} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                                  {lesson.title}
                                </h5>
                                <div className="flex items-center gap-3 text-xs text-neutral-400 font-semibold mt-0.5 flex-wrap">
                                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Zap size={11} /> {lesson.xp} XP
                                  </span>
                                  <span className="text-amber-500 flex items-center gap-1">
                                    <Coins size={11} /> {lesson.coins}
                                  </span>
                                  {lesson.type === 'quiz' && (
                                    <span className="text-indigo-500">
                                      {lesson.questions?.length || 0} questões
                                    </span>
                                  )}
                                  {lesson.imageUrl && (
                                    <span className="text-purple-500 flex items-center gap-1">
                                      <ImageIcon size={11} /> Ilustrada
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {lesson.type === 'quiz' && (
                                <button
                                  type="button"
                                  onClick={() => openQuizPreview(lesson)}
                                  title="Testar Quiz como Aluno"
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={13} /> Testar
                                </button>
                              )}
                              {lIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReorderLesson(mod.id, lIdx, 'up')
                                  }
                                  className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-indigo-600 cursor-pointer"
                                >
                                  <ArrowUp size={14} />
                                </button>
                              )}
                              {lIdx < (mod.lessons?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReorderLesson(mod.id, lIdx, 'down')
                                  }
                                  className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-indigo-600 cursor-pointer"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setLessonDraft({
                                    type: lesson.type,
                                    title: lesson.title,
                                    duration: lesson.duration || '10 min',
                                    xp: lesson.xp,
                                    coins: lesson.coins,
                                    contentUrl: lesson.contentUrl || '',
                                    imageUrl: lesson.imageUrl || '',
                                    contentBody: lesson.contentBody || '',
                                    questions:
                                      lesson.questions &&
                                      lesson.questions.length > 0
                                        ? lesson.questions.map((q) => ({
                                            id: q.id,
                                            question: q.question,
                                            imageUrl: q.imageUrl || '',
                                            contextText: q.contextText || '',
                                            explanation: q.explanation || '',
                                            options:
                                              q.options.length >= 2
                                                ? [...q.options]
                                                : ['', '', '', ''],
                                            correctAnswer: q.correctAnswer ?? 0,
                                            showExtras: Boolean(
                                              q.contextText || q.explanation
                                            ),
                                          }))
                                        : [createBlankQuestion()],
                                  });
                                  setEditingLessonId(lesson.id);
                                  setAddingLessonTo(null);
                                }}
                                className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Formulário de Nova Aula/Atividade dentro da Fase */}
                      {addingLessonTo === mod.id ? (
                        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border-2 border-indigo-500/40 space-y-5 shadow-md">
                          <h5 className="font-black text-neutral-900 dark:text-white">
                            Nova Aula ou Atividade nesta Fase
                          </h5>

                          <div className="flex gap-2">
                            {(['quiz', 'text', 'video'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() =>
                                  setLessonDraft({ ...lessonDraft, type: t })
                                }
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                                  lessonDraft.type === t
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                                }`}
                              >
                                {t === 'quiz'
                                  ? '⚡ Desafio Multi-Questões'
                                  : t === 'text'
                                  ? '📖 Leitura Ilustrada'
                                  : '🎬 Vídeo (YouTube)'}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                              type="text"
                              value={lessonDraft.title}
                              onChange={(e) =>
                                setLessonDraft({
                                  ...lessonDraft,
                                  title: e.target.value,
                                })
                              }
                              placeholder="Título da aula ou desafio *"
                              className="md:col-span-2 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm text-neutral-900 dark:text-white outline-none"
                            />
                            <input
                              type="number"
                              value={lessonDraft.xp}
                              onChange={(e) =>
                                setLessonDraft({
                                  ...lessonDraft,
                                  xp: Number(e.target.value),
                                })
                              }
                              placeholder="XP"
                              className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                            />
                            <input
                              type="number"
                              value={lessonDraft.coins}
                              onChange={(e) =>
                                setLessonDraft({
                                  ...lessonDraft,
                                  coins: Number(e.target.value),
                                })
                              }
                              placeholder="Moedas"
                              className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none"
                            />
                          </div>

                          {lessonDraft.type === 'video' && (
                            <input
                              type="text"
                              value={lessonDraft.contentUrl}
                              onChange={(e) =>
                                setLessonDraft({
                                  ...lessonDraft,
                                  contentUrl: e.target.value,
                                })
                              }
                              placeholder="Link do YouTube ou MP4"
                              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none"
                            />
                          )}

                          {lessonDraft.type === 'text' && (
                            <div className="space-y-4">
                              <EducationImageField
                                label="Ilustração da Leitura (Opcional)"
                                value={lessonDraft.imageUrl}
                                onChange={(url) =>
                                  setLessonDraft({
                                    ...lessonDraft,
                                    imageUrl: url,
                                  })
                                }
                                subject={selectedCourse.subject}
                                institutionId={institutionId}
                                compact
                              />
                              <textarea
                                rows={5}
                                value={lessonDraft.contentBody}
                                onChange={(e) =>
                                  setLessonDraft({
                                    ...lessonDraft,
                                    contentBody: e.target.value,
                                  })
                                }
                                placeholder="Conteúdo textual da leitura..."
                                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white outline-none resize-none"
                              />
                            </div>
                          )}

                          {lessonDraft.type === 'quiz' && (
                            <QuestionListBuilder
                              questions={lessonDraft.questions}
                              onChange={(questions) =>
                                setLessonDraft({ ...lessonDraft, questions })
                              }
                              subject={selectedCourse.subject}
                              institutionId={institutionId}
                            />
                          )}

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setAddingLessonTo(null)}
                              className="px-4 py-2 rounded-xl font-bold text-sm text-neutral-500 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={isSaving || !lessonDraft.title.trim()}
                              onClick={handleSaveNewLessonInModule}
                              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm cursor-pointer"
                            >
                              {isSaving ? 'Salvando...' : 'Salvar Aula'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLessonId(null);
                            setLessonDraft({
                              type: 'quiz',
                              title: '',
                              duration: '10 min',
                              xp: 60,
                              coins: 20,
                              contentUrl: '',
                              imageUrl: '',
                              contentBody: '',
                              questions: [createBlankQuestion()],
                            });
                            setAddingLessonTo(mod.id);
                          }}
                          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 bg-white/60 dark:bg-neutral-900/50 cursor-pointer transition-colors"
                        >
                          <Plus size={18} /> Adicionar Leitura, Vídeo ou Desafio Ilustrado
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
