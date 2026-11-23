import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  X,
  Clock,
  Save,
  Printer,
  Wifi,
  WifiOff,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  EnrollmentRecord,
  ClassAttendanceSheetData,
  getEnrollments,
  getClassAttendanceSheetData
} from '../../../lib/api/education';
import { DiarioOficialPDF } from './DiarioOficialPDF';
import { showToast } from '../../../components/ui/Toast';

interface EducationClassDiaryManagerProps {
  institutionId?: string;
  teacherName?: string;
}

type AttendanceMark = 'presente' | 'falta' | 'justificada';

interface DiaryLogEntry {
  id: string;
  class_name: string;
  school_name: string;
  subject: string;
  lesson_date: string;
  bncc_code?: string | null;
  lesson_topic: string;
  teacher_name: string;
  present_count: number;
  absent_count: number;
}

interface OfflineDiaryPayload {
  id: string;
  institution_id: string;
  school_name: string;
  class_name: string;
  subject: string;
  lesson_date: string;
  bncc_code: string;
  lesson_topic: string;
  teacher_name: string;
  marks: Array<{ enrollment_id: string; status: AttendanceMark }>;
}

const OFFLINE_QUEUE_KEY = 'gestao360_edu_diary_offline_queue';

const BNCC_QUICK_CODES = [
  { code: 'EI03EO01', label: 'EI03EO01 · Empatia e interação (Infantil)' },
  { code: 'EF01LP05', label: 'EF01LP05 · Sistema de escrita alfabética' },
  { code: 'EF04LP01', label: 'EF04LP01 · Grafia e leitura fluente' },
  { code: 'EF04MA03', label: 'EF04MA03 · Problemas de adição e subtração' },
  { code: 'EF05MA07', label: 'EF05MA07 · Operações e raciocínio lógico' },
  { code: 'EF05CI02', label: 'EF05CI02 · Ciclo da água e meio ambiente' },
  { code: 'EF04GE01', label: 'EF04GE01 · Território e cultura municipal' },
  { code: 'EF05HI01', label: 'EF05HI01 · Formação histórica e cidadania' }
];

const SUBJECT_OPTIONS = [
  'Língua Portuguesa',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Artes',
  'Educação Física',
  'Educação Infantil (Campos de Experiência)'
];

export const EducationClassDiaryManager: React.FC<EducationClassDiaryManagerProps> = ({
  institutionId = 'inst_1',
  teacherName = 'Professor(a) Regente'
}) => {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('Língua Portuguesa');
  const [lessonDate, setLessonDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bnccCode, setBnccCode] = useState<string>('EF04LP01');
  const [lessonTopic, setLessonTopic] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [recentLogs, setRecentLogs] = useState<DiaryLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [pdfSheet, setPdfSheet] = useState<ClassAttendanceSheetData | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const readOfflineQueue = (): OfflineDiaryPayload[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const syncOfflineQueue = async () => {
    const queue = readOfflineQueue();
    setOfflineQueueCount(queue.length);
    if (queue.length === 0 || !navigator.onLine) return;

    const remaining: OfflineDiaryPayload[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const presentCount = item.marks.filter((m) => m.status === 'presente').length;
        const absentCount = item.marks.filter((m) => m.status === 'falta').length;

        const { error: diaryErr } = await supabase.from('education_class_diary').insert({
          institution_id: item.institution_id,
          school_name: item.school_name,
          class_name: item.class_name,
          subject: item.subject,
          lesson_date: item.lesson_date,
          bncc_code: item.bncc_code || null,
          lesson_topic: item.lesson_topic,
          teacher_name: item.teacher_name,
          present_count: presentCount,
          absent_count: absentCount
        });
        if (diaryErr) throw diaryErr;

        if (item.marks.length > 0) {
          await supabase.from('education_attendance').insert(
            item.marks.map((m) => ({
              institution_id: item.institution_id,
              enrollment_id: m.enrollment_id,
              date: item.lesson_date,
              status: m.status,
              notes: item.bncc_code ? `[${item.bncc_code}] ${item.lesson_topic}` : item.lesson_topic
            }))
          );
        }
        syncedCount += 1;
      } catch {
        remaining.push(item);
      }
    }

    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
    setOfflineQueueCount(remaining.length);
    if (syncedCount > 0) {
      showToast(`${syncedCount} registro(s) offline do Diário sincronizados com a nuvem!`, 'success');
      loadRecentLogs();
    }
  };

  const loadRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('education_class_diary')
        .select('*')
        .eq('institution_id', institutionId)
        .order('lesson_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12);
      if (!error && Array.isArray(data)) {
        setRecentLogs(data as DiaryLogEntry[]);
      }
    } catch {
      // ignore when offline
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOfflineQueueCount(readOfflineQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [institutionId]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setIsLoading(true);
      try {
        const list = await getEnrollments({ status: 'matriculado' });
        if (!mounted) return;
        setEnrollments(list);
        const firstClass = list[0]?.class_name || 'Turma 4A';
        setSelectedClass((prev) => prev || firstClass);
        await loadRecentLogs();
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [institutionId]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    enrollments.forEach((e) => {
      if (e.class_name) set.add(e.class_name);
    });
    if (set.size === 0) set.add('Turma 4A');
    return Array.from(set).sort();
  }, [enrollments]);

  const classStudents = useMemo(
    () => enrollments.filter((e) => !selectedClass || e.class_name === selectedClass),
    [enrollments, selectedClass]
  );

  useEffect(() => {
    const nextMarks: Record<string, AttendanceMark> = {};
    classStudents.forEach((st) => {
      nextMarks[st.id] = marks[st.id] || 'presente';
    });
    setMarks(nextMarks);
  }, [selectedClass, classStudents.length]);

  const summary = useMemo(() => {
    let presente = 0;
    let falta = 0;
    let justificada = 0;
    classStudents.forEach((st) => {
      const m = marks[st.id] || 'presente';
      if (m === 'presente') presente++;
      else if (m === 'falta') falta++;
      else justificada++;
    });
    return { presente, falta, justificada };
  }, [classStudents, marks]);

  const setAllMarks = (status: AttendanceMark) => {
    const next: Record<string, AttendanceMark> = {};
    classStudents.forEach((st) => {
      next[st.id] = status;
    });
    setMarks(next);
  };

  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTopic.trim()) {
      showToast('Informe o conteúdo ministrado na aula antes de salvar.', 'warning');
      return;
    }

    const schoolName = classStudents[0]?.school_name || 'Escola Municipal';
    const payload: OfflineDiaryPayload = {
      id: `offline_${Date.now()}`,
      institution_id: institutionId,
      school_name: schoolName,
      class_name: selectedClass || 'Turma 4A',
      subject: selectedSubject,
      lesson_date: lessonDate,
      bncc_code: bnccCode.trim().toUpperCase(),
      lesson_topic: lessonTopic.trim(),
      teacher_name: teacherName,
      marks: classStudents.map((st) => ({
        enrollment_id: st.id,
        status: marks[st.id] || 'presente'
      }))
    };

    const enqueueOffline = () => {
      const queue = [...readOfflineQueue(), payload];
      try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      } catch {
        // ignore
      }
      setOfflineQueueCount(queue.length);
      setLessonTopic('');
      showToast(
        'Sem conexão no momento: chamada salva na fila offline e será enviada automaticamente ao reconectar.',
        'info'
      );
    };

    if (!navigator.onLine) {
      enqueueOffline();
      return;
    }

    setIsSaving(true);
    try {
      const { error: diaryErr } = await supabase.from('education_class_diary').insert({
        institution_id: payload.institution_id,
        school_name: payload.school_name,
        class_name: payload.class_name,
        subject: payload.subject,
        lesson_date: payload.lesson_date,
        bncc_code: payload.bncc_code || null,
        lesson_topic: payload.lesson_topic,
        teacher_name: payload.teacher_name,
        present_count: summary.presente,
        absent_count: summary.falta
      });

      if (diaryErr) {
        enqueueOffline();
        return;
      }

      if (payload.marks.length > 0) {
        await supabase.from('education_attendance').insert(
          payload.marks.map((m) => ({
            institution_id: payload.institution_id,
            enrollment_id: m.enrollment_id,
            date: payload.lesson_date,
            status: m.status,
            notes: payload.bncc_code
              ? `[${payload.bncc_code}] ${payload.lesson_topic}`
              : payload.lesson_topic
          }))
        );
      }

      showToast(
        `Diário salvo! ${summary.presente} presente(s) e ${summary.falta} falta(s) registrados.`,
        'success'
      );
      setLessonTopic('');
      await loadRecentLogs();
    } catch {
      enqueueOffline();
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenOfficialPdf = async () => {
    setLoadingPdf(true);
    try {
      const dt = new Date(`${lessonDate}T12:00:00`);
      const data = await getClassAttendanceSheetData(
        selectedClass || 'Turma 4A',
        dt.getMonth() + 1,
        dt.getFullYear()
      );
      setPdfSheet(data);
    } catch {
      showToast('Não foi possível montar o Diário Oficial em PDF.', 'error');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho & Status Offline-First */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
              Diário de Classe Digital (Chamada + BNCC)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Chamada diária rápida, registro de conteúdo vinculado à BNCC e suporte offline para escolas da zona rural.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'Online' : 'Modo Offline'}</span>
          </span>

          {offlineQueueCount > 0 && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Sincronizar ({offlineQueueCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenOfficialPdf}
            disabled={loadingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            <Printer size={14} />
            <span>{loadingPdf ? 'Gerando...' : 'Diário Oficial (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Formulário de Aula + Chamada */}
      <form onSubmit={handleSaveDiary} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Metadados BNCC */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 h-fit">
          <h4 className="text-sm font-black uppercase tracking-wider text-neutral-500 flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-500" />
            Dados da Aula &amp; Habilidade BNCC
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Turma
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white"
              >
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Data da Aula
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type="date"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Componente Curricular
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white"
            >
              {SUBJECT_OPTIONS.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Código BNCC
            </label>
            <input
              type="text"
              value={bnccCode}
              onChange={(e) => setBnccCode(e.target.value)}
              placeholder="Ex: EF04MA03"
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white uppercase"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {BNCC_QUICK_CODES.slice(0, 4).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setBnccCode(item.code)}
                  title={item.label}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer transition-colors ${
                    bnccCode.toUpperCase() === item.code
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {item.code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Conteúdo Ministrado / Registro Pedagógico
            </label>
            <textarea
              rows={3}
              required
              value={lessonTopic}
              onChange={(e) => setLessonTopic(e.target.value)}
              placeholder="Descreva o conteúdo trabalhado, atividade prática ou observação da aula..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? 'Salvando Diário...' : 'Salvar Chamada e Conteúdo'}</span>
          </button>
        </div>

        {/* Coluna Direita: Lista de Chamada Rápida */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-neutral-500">
                Chamada da Turma ({classStudents.length} alunos)
              </h4>
              <div className="flex items-center gap-3 mt-1 text-xs font-bold">
                <span className="text-emerald-600">Presentes: {summary.presente}</span>
                <span className="text-rose-600">Faltas: {summary.falta}</span>
                <span className="text-amber-600">Justificadas: {summary.justificada}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllMarks('presente')}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-black cursor-pointer"
              >
                Todos Presentes
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-neutral-400 font-semibold">
              Carregando lista de alunos...
            </div>
          ) : classStudents.length === 0 ? (
            <div className="py-10 text-center space-y-1 text-neutral-500">
              <AlertCircle size={24} className="mx-auto text-neutral-400" />
              <p className="text-sm font-bold">Nenhum aluno matriculado nesta turma.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[460px] overflow-y-auto pr-1">
              {classStudents.map((st, idx) => {
                const status = marks[st.id] || 'presente';
                return (
                  <div
                    key={st.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="w-6 text-center text-xs font-black text-neutral-400 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {st.student_name}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {st.shift || 'Matutino'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(
                        [
                          { id: 'presente', label: 'P', icon: Check, active: 'bg-emerald-600 text-white border-emerald-600' },
                          { id: 'falta', label: 'F', icon: X, active: 'bg-rose-600 text-white border-rose-600' },
                          { id: 'justificada', label: 'FJ', icon: Clock, active: 'bg-amber-500 text-white border-amber-500' }
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMarks((prev) => ({ ...prev, [st.id]: opt.id }))}
                          className={`min-w-[40px] min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            status === opt.id
                              ? opt.active
                              : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>

      {/* Histórico Recente de Aulas Registradas */}
      {recentLogs.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3">
          <h4 className="text-sm font-black uppercase tracking-wider text-neutral-500 flex items-center gap-2">
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Últimos Registros do Diário de Classe
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {log.class_name} · {log.subject}
                  </span>
                  <span className="text-neutral-400 font-semibold">
                    {new Date(`${log.lesson_date}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {log.bncc_code && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                    BNCC: {log.bncc_code}
                  </span>
                )}
                <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2">
                  {log.lesson_topic}
                </p>
                <div className="text-[11px] font-bold text-neutral-500 flex items-center gap-3 pt-1">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {log.present_count} P
                  </span>
                  <span className="text-rose-600">{log.absent_count} F</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pdfSheet && <DiarioOficialPDF sheetData={pdfSheet} onClose={() => setPdfSheet(null)} />}
    </div>
  );
};
