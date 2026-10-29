import React, { useState } from 'react';
import {
  X,
  Shield,
  HelpCircle,
  Trophy,
  Check,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import { Lesson } from '../StudentPortal';
import { submitQuizAttempt } from '../../../lib/api/education';

interface StudentQuizPlayerProps {
  activeLesson: Lesson;
  setActiveView: (view: any) => void;
  setActiveLesson: (lesson: Lesson | null) => void;
  quizState: {
    currentQuestionIndex: number;
    selectedOption: number | null;
    isCorrect: boolean | null;
    score: number;
    isFinished: boolean;
  };
  setQuizState: React.Dispatch<
    React.SetStateAction<{
      currentQuestionIndex: number;
      selectedOption: number | null;
      isCorrect: boolean | null;
      score: number;
      isFinished: boolean;
    }>
  >;
  finishLesson: () => void;
  activeCourse?: any;
  studentId?: string;
  isTeacherPreview?: boolean;
  onClosePreview?: () => void;
  onQuizSubmitted?: (result: {
    earnedXp: number;
    earnedCoins: number;
    passed: boolean;
    score: number;
  }) => void;
}

export const StudentQuizPlayer: React.FC<StudentQuizPlayerProps> = ({
  activeLesson,
  setActiveView,
  setActiveLesson,
  quizState,
  setQuizState,
  finishLesson,
  activeCourse,
  studentId,
  isTeacherPreview = false,
  onClosePreview,
  onQuizSubmitted,
}) => {
  const [submissionResult, setSubmissionResult] = useState<{
    isSubmitting: boolean;
    passed: boolean;
    scorePercent: number;
    earnedXp: number;
    earnedCoins: number;
    synced: boolean;
  } | null>(null);

  const handleClose = () => {
    if (isTeacherPreview && onClosePreview) {
      onClosePreview();
      return;
    }
    setActiveView(activeCourse ? 'trail-map' : 'assessments');
    setActiveLesson(null);
  };

  const handleFinishQuiz = async (finalScore: number) => {
    const totalQuestions = activeLesson.questions?.length || 1;
    const scorePercent = Math.round((finalScore / totalQuestions) * 100);
    const passed = scorePercent >= 60;
    const baseExp = activeLesson.xp || 50;
    const baseCoins = activeLesson.coins || 10;
    const earnedXp = passed
      ? baseExp
      : Math.round(baseExp * (finalScore / totalQuestions));
    const earnedCoins = passed
      ? baseCoins
      : Math.max(1, Math.round(baseCoins * (finalScore / totalQuestions)));

    if (isTeacherPreview) {
      setSubmissionResult({
        isSubmitting: false,
        passed,
        scorePercent,
        earnedXp,
        earnedCoins,
        synced: true,
      });
      return;
    }

    setSubmissionResult({
      isSubmitting: true,
      passed,
      scorePercent,
      earnedXp,
      earnedCoins,
      synced: false,
    });

    const effStudentId =
      studentId || localStorage.getItem('edu_student_id') || '2';

    try {
      const res = await submitQuizAttempt({
        studentId: effStudentId,
        quizId: activeLesson.id,
        score: scorePercent,
        totalQuestions,
        correctAnswers: finalScore,
        earnedXp,
        earnedCoins,
      });

      setSubmissionResult((prev) =>
        prev
          ? {
              ...prev,
              isSubmitting: false,
              synced: Boolean(res.success),
              earnedXp: res.earnedXp ?? earnedXp,
              earnedCoins: res.earnedCoins ?? earnedCoins,
            }
          : null
      );

      if (onQuizSubmitted) {
        onQuizSubmitted({
          earnedXp: res.earnedXp ?? earnedXp,
          earnedCoins: res.earnedCoins ?? earnedCoins,
          passed: res.passed ?? passed,
          score: scorePercent,
        });
      }
    } catch (err) {
      console.error('Erro ao enviar quiz:', err);
      setSubmissionResult((prev) =>
        prev ? { ...prev, isSubmitting: false, synced: true } : null
      );
    }
  };

  const totalQ = activeLesson.questions?.length || 1;
  const currentQ = activeLesson.questions?.[quizState.currentQuestionIndex];
  const questionIllustration =
    currentQ?.imageUrl || activeLesson.imageUrl || activeLesson.contentUrl;

  return (
    <div className="fixed inset-0 z-[200] bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <button
          onClick={handleClose}
          className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
        >
          <X size={24} />
        </button>

        <div className="flex-1 max-w-xl mx-6">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 mb-1.5">
            <span>
              {isTeacherPreview ? '👁️ Pré-visualização como Aluno — ' : ''}
              {activeLesson.title}
            </span>
            {!quizState.isFinished && activeLesson.questions?.length ? (
              <span>
                Questão {quizState.currentQuestionIndex + 1} de {totalQ}
              </span>
            ) : null}
          </div>
          <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  quizState.isFinished
                    ? 100
                    : ((quizState.currentQuestionIndex +
                        (quizState.isCorrect !== null ? 1 : 0)) /
                        totalQ) *
                      100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="text-rose-500" size={24} />
        </div>
      </div>

      {/* Quiz Body */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        {!quizState.isFinished ? (
          (() => {
            if (!activeLesson.questions || activeLesson.questions.length === 0) {
              return (
                <div className="text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700">
                    <HelpCircle size={48} className="text-neutral-400" />
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">
                    Ops! Sem perguntas
                  </h2>
                  <p className="text-neutral-500 mb-8 max-w-sm mx-auto">
                    Parece que o professor ainda não adicionou as perguntas para este desafio.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-8 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              );
            }

            const q = activeLesson.questions[quizState.currentQuestionIndex];
            const validOptions = q.options.filter(
              (o) => typeof o === 'string' && o.trim().length > 0
            );
            const displayOptions =
              validOptions.length >= 2 ? q.options : q.options;

            return (
              <div className="w-full max-w-2xl space-y-6 my-auto py-4 animate-in slide-in-from-right-8 duration-300">
                {/* Ilustração Pedagógica da Questão */}
                {questionIllustration && (
                  <div className="w-full max-h-64 rounded-3xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md flex items-center justify-center">
                    <img
                      src={questionIllustration}
                      alt="Ilustração da questão"
                      className="max-h-64 w-full object-contain"
                    />
                  </div>
                )}

                {/* Texto Base / Trecho de Leitura Opcional */}
                {q.contextText && (
                  <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-neutral-800 dark:text-neutral-200 text-sm md:text-base leading-relaxed font-medium">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                      <BookOpen size={13} /> Leia com atenção
                    </span>
                    <p>{q.contextText}</p>
                  </div>
                )}

                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white text-center leading-tight">
                  {q.question}
                </h2>

                <div className="grid grid-cols-1 gap-3.5">
                  {displayOptions.map((opt, idx) => {
                    if (!opt || !opt.trim()) return null;
                    const isSelected = quizState.selectedOption === idx;
                    const isCorrectAnswer = q.correctAnswer === idx;
                    const showResult = quizState.isCorrect !== null;

                    let btnClass =
                      'border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20';

                    if (showResult) {
                      if (isCorrectAnswer) {
                        btnClass =
                          'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
                      } else if (isSelected && !isCorrectAnswer) {
                        btnClass =
                          'border-2 border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
                      } else {
                        btnClass =
                          'border-2 border-neutral-200 dark:border-neutral-800 opacity-50';
                      }
                    } else if (isSelected) {
                      btnClass =
                        'border-2 border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={showResult}
                        onClick={() =>
                          setQuizState((prev) => ({
                            ...prev,
                            selectedOption: idx,
                          }))
                        }
                        className={`p-4 md:p-5 rounded-2xl text-left font-bold text-base md:text-lg transition-all flex items-center gap-3.5 cursor-pointer ${btnClass}`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-black text-xs flex items-center justify-center shrink-0">
                          {['A', 'B', 'C', 'D', 'E'][idx] || idx + 1}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explicação Pedagógica imediata após responder */}
                {quizState.isCorrect !== null && q.explanation && (
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-start gap-3 animate-in fade-in duration-300">
                    <Lightbulb
                      size={20}
                      className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5"
                    />
                    <div className="text-sm text-indigo-950 dark:text-indigo-200">
                      <span className="font-black block text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                        Explicação do Professor
                      </span>
                      {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="text-center animate-in zoom-in-95 duration-500 max-w-md w-full">
            <div
              className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 border-4 shadow-xl ${
                submissionResult?.passed ?? true
                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-500'
                  : 'bg-rose-100 dark:bg-rose-900/30 border-rose-400 text-rose-500'
              }`}
            >
              {submissionResult?.passed ?? true ? (
                <Trophy size={64} className="text-amber-500 animate-bounce" />
              ) : (
                <AlertCircle size={64} className="text-rose-500" />
              )}
            </div>

            <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-2">
              {submissionResult?.passed ?? true
                ? 'Desafio Concluído!'
                : 'Quase lá!'}
            </h2>

            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
              Você acertou {quizState.score} de {activeLesson.questions?.length}{' '}
              perguntas ({submissionResult?.scorePercent ?? 0}%).
            </p>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-8 shadow-sm flex items-center justify-around">
              <div className="text-center">
                <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                  XP Ganho
                </span>
                <p className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1 mt-1">
                  <Zap size={20} /> +
                  {submissionResult?.earnedXp ?? activeLesson.xp ?? 50}
                </p>
              </div>
              <div className="h-10 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
              <div className="text-center">
                <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                  Moedas
                </span>
                <p className="text-2xl font-black text-yellow-500 flex items-center justify-center gap-1 mt-1">
                  🪙 +{submissionResult?.earnedCoins ?? activeLesson.coins ?? 10}
                </p>
              </div>
              <div className="h-10 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
              <div className="text-center">
                <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                  Status
                </span>
                <p
                  className={`text-xs font-black px-2.5 py-1 rounded-full mt-2 inline-flex items-center gap-1 ${
                    submissionResult?.passed ?? true
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {submissionResult?.passed ?? true ? 'Aprovado' : 'Revisar'}
                </p>
              </div>
            </div>

            {submissionResult?.isSubmitting ? (
              <button
                disabled
                className="w-full py-5 bg-neutral-300 dark:bg-neutral-800 text-neutral-500 rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-2 cursor-wait"
              >
                <Loader2 size={22} className="animate-spin" />
                Salvando no Supabase...
              </button>
            ) : (
              <button
                onClick={isTeacherPreview ? handleClose : finishLesson}
                className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer"
              >
                {isTeacherPreview
                  ? 'Fechar Pré-visualização'
                  : 'Resgatar Recompensas e Continuar'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Validation Bar */}
      {!quizState.isFinished && activeLesson.questions?.length ? (
        <div
          className={`border-t p-6 flex justify-between items-center transition-colors duration-300 ${
            quizState.isCorrect === true
              ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800'
              : quizState.isCorrect === false
              ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
          }`}
        >
          <div>
            {quizState.isCorrect === true && (
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <div className="w-10 h-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                  <Check size={24} />
                </div>
                <div>
                  <h4 className="font-black text-xl leading-none">Muito bem!</h4>
                  <p className="text-sm font-bold opacity-80">
                    Resposta correta.
                  </p>
                </div>
              </div>
            )}
            {quizState.isCorrect === false && (
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="w-10 h-10 bg-rose-200 dark:bg-rose-800 rounded-full flex items-center justify-center">
                  <X size={24} />
                </div>
                <div>
                  <h4 className="font-black text-xl leading-none">Atenção!</h4>
                  <p className="text-sm font-bold opacity-80">
                    Confira a alternativa destacada em verde.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={quizState.selectedOption === null}
            onClick={() => {
              const q = activeLesson.questions![quizState.currentQuestionIndex];
              if (quizState.isCorrect === null) {
                const correct = quizState.selectedOption === q.correctAnswer;
                setQuizState((prev) => ({
                  ...prev,
                  isCorrect: correct,
                  score: correct ? prev.score + 1 : prev.score,
                }));
              } else {
                if (
                  quizState.currentQuestionIndex + 1 <
                  activeLesson.questions!.length
                ) {
                  setQuizState((prev) => ({
                    ...prev,
                    currentQuestionIndex: prev.currentQuestionIndex + 1,
                    selectedOption: null,
                    isCorrect: null,
                  }));
                } else {
                  const finalScore = quizState.score;
                  setQuizState((prev) => ({ ...prev, isFinished: true }));
                  handleFinishQuiz(finalScore);
                }
              }
            }}
            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all cursor-pointer ${
              quizState.selectedOption === null
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                : quizState.isCorrect === true
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : quizState.isCorrect === false
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                : 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20'
            }`}
          >
            {quizState.isCorrect === null ? 'Verificar' : 'Continuar'}
          </button>
        </div>
      ) : null}
    </div>
  );
};
