import React from 'react';
import { 
  ArrowLeft, 
  Zap, 
  Video, 
  CheckCircle2
} from 'lucide-react';
import { Course, Lesson } from '../StudentPortal';

interface StudentLessonPlayerProps {
  activeCourse: Course | null;
  activeLesson: Lesson;
  setActiveView: (view: any) => void;
  setActiveLesson: (lesson: Lesson | null) => void;
  finishLesson: () => void;
}

export const StudentLessonPlayer: React.FC<StudentLessonPlayerProps> = ({
  activeCourse,
  activeLesson,
  setActiveView,
  setActiveLesson,
  finishLesson,
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col text-white animate-in slide-in-from-bottom-8 duration-500">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => { setActiveView('trail-map'); setActiveLesson(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
              <ArrowLeft size={24} />
            </button>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{activeCourse?.title}</p>
              <h2 className="text-lg font-black">{activeLesson.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">
              <Zap size={14} /> {activeLesson.xp} XP
            </span>
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
                    <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover opacity-30" alt="Video cover" />
                    <div className="z-20 flex flex-col items-center">
                      <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white mb-4">
                        <Video size={32} />
                      </div>
                      <h3 className="text-white font-bold text-xl">Nenhum vídeo disponível</h3>
                      <p className="text-white/60 text-sm mt-2 max-w-md">O professor ainda não configurou o link para o vídeo desta aula.</p>
                    </div>
                  </div>
                );
              }
              const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
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
            <div className="w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-3xl p-10 md:p-16 shadow-2xl">
              <h1 className="text-3xl font-black mb-6">{activeLesson.title}</h1>
              <div className="prose prose-invert prose-emerald max-w-none">
                <p className="text-lg leading-relaxed text-neutral-300">
                  {activeLesson.contentBody || 'O conteúdo textual da aula será exibido aqui. Pode conter parágrafos ricos, imagens, destaques e fórmulas.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-6 py-6 border-t border-white/10 bg-black/40 backdrop-blur-md flex justify-end sticky bottom-0 z-10">
          <button 
            onClick={finishLesson}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 cursor-pointer"
          >
            Concluir e Ganhar Recompensas
            <CheckCircle2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
