import React, { useState } from 'react';
import {
  ArrowLeft,
  Zap,
  Video,
  CheckCircle2,
  Sparkles,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Course, Lesson } from '../StudentPortal';
import { completeLesson } from '../../../lib/api/education';

interface StudentLessonPlayerProps {
  activeCourse: Course | null;
  activeLesson: Lesson;
  setActiveView: (view: any) => void;
  setActiveLesson: (lesson: Lesson | null) => void;
  finishLesson: () => void;
  studentId?: string;
  onLessonCompleted?: (
    lessonId: string,
    earnedXp: number,
    earnedCoins: number
  ) => void;
}

export const StudentLessonPlayer: React.FC<StudentLessonPlayerProps> = ({
  activeCourse,
  activeLesson,
  setActiveView,
  setActiveLesson,
  finishLesson,
  studentId,
  onLessonCompleted,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompletedLocal, setIsCompletedLocal] = useState(
    Boolean(activeLesson.isCompleted)
  );
  const [toast, setToast] = useState<{
    message: string;
    xp: number;
    coins: number;
  } | null>(null);

  // Para aulas de leitura, a ilustração pode estar em imageUrl ou contentUrl
  const lessonIllustration =
    activeLesson.type !== 'video'
      ? activeLesson.imageUrl || activeLesson.contentUrl
      : undefined;

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const effStudentId =
      studentId || localStorage.getItem('edu_student_id') || '2';
    const courseId =
      activeCourse?.id || '00000000-0000-0000-0000-000000000000';

    try {
      const result = await completeLesson(
        effStudentId,
        courseId,
        activeLesson.id
      );

      setIsCompletedLocal(true);
      activeLesson.isCompleted = true;

      const earnedXp = result.earnedXp ?? activeLesson.xp ?? 15;
      const earnedCoins = result.earnedCoins ?? activeLesson.coins ?? 5;

      setToast({
        message: result.alreadyCompleted
          ? 'Aula revisada com sucesso!'
          : 'Parabéns! Aula concluída!',
        xp: earnedXp,
        coins: earnedCoins,
      });

      if (onLessonCompleted) {
        onLessonCompleted(activeLesson.id, earnedXp, earnedCoins);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        finishLesson();
      }, 1000);
    } catch (err) {
      console.error('Erro ao registrar conclusão da lição:', err);
      setIsCompletedLocal(true);
      finishLesson();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col text-white animate-in slide-in-from-bottom-8 duration-500">
      {/* Toast Feedback Visual */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300 border border-emerald-400">
          <Sparkles size={20} className="animate-spin text-yellow-200" />
          <div>
            <p className="font-black text-sm">{toast.message}</p>
            <p className="text-xs text-emerald-100 font-semibold">
              +{toast.xp} XP • +{toast.coins} Moedas adicionados ao seu saldo!
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveView(activeCourse ? 'trail-map' : 'assessments');
                setActiveLesson(null);
              }}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                {activeCourse?.title || 'Leitura Ilustrada'}
              </p>
              <h2 className="text-lg font-black flex items-center gap-2">
                {activeLesson.title}
                {isCompletedLocal && (
                  <CheckCircle2 size={18} className="text-emerald-400 inline" />
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">
              <Zap size={14} /> {activeLesson.xp} XP
            </span>
            {isCompletedLocal && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">
                <CheckCircle2 size={14} /> Concluída
              </span>
            )}
          </div>
        </div>

        {/* Player Body */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          {activeLesson.type === 'video' ? (
            (() => {
              const url = activeLesson.contentUrl;
              if (!url) {
                return (
                  <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex items-center justify-center group text-center px-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                    <img
                      src="/edu-bank/cover-ciencias.jpg"
                      className="w-full h-full object-cover opacity-30"
                      alt="Video cover"
                    />
                    <div className="z-20 flex flex-col items-center">
                      <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white mb-4">
                        <Video size={32} />
                      </div>
                      <h3 className="text-white font-bold text-xl">
                        Nenhum vídeo disponível
                      </h3>
                      <p className="text-white/60 text-sm mt-2 max-w-md">
                        O professor ainda não configurou o link para o vídeo desta aula.
                      </p>
                    </div>
                  </div>
                );
              }
              const ytMatch = url.match(
                /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
              );
              if (ytMatch) {
                return (
                  <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    ></iframe>
                  </div>
                );
              }
              return (
                <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                  <video
                    src={url}
                    controls
                    className="w-full h-full outline-none"
                    controlsList="nodownload"
                  >
                    Seu navegador não suporta a tag de vídeo.
                  </video>
                </div>
              );
            })()
          ) : (
            <div className="w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {lessonIllustration && (
                <div className="w-full max-h-80 overflow-hidden bg-neutral-950 border-b border-white/10 flex items-center justify-center">
                  <img
                    src={lessonIllustration}
                    alt={activeLesson.title}
                    className="w-full max-h-80 object-contain bg-neutral-900/80"
                  />
                </div>
              )}
              <div className="p-8 md:p-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold mb-4">
                  <BookOpen size={14} /> Material de Estudo
                </div>
                <h1 className="text-2xl md:text-3xl font-black mb-6">
                  {activeLesson.title}
                </h1>
                <div className="prose prose-invert prose-emerald max-w-none space-y-4">
                  {(
                    activeLesson.contentBody ||
                    'Leia com atenção o conteúdo preparado pelo seu professor.'
                  )
                    .split('\n')
                    .filter((p) => p.trim().length > 0)
                    .map((paragraph, idx) => (
                      <p
                        key={idx}
                        className="text-lg leading-relaxed text-neutral-200"
                      >
                        {paragraph}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-6 py-6 border-t border-white/10 bg-black/40 backdrop-blur-md flex justify-end sticky bottom-0 z-10">
          <button
            disabled={isSubmitting}
            onClick={handleFinish}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Gravando Progresso...
              </>
            ) : (
              <>
                {isCompletedLocal
                  ? 'Revisão Concluída'
                  : 'Concluir e Ganhar Recompensas'}
                <CheckCircle2 size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
