import React from 'react';
import { 
  X, 
  Shield, 
  HelpCircle, 
  Trophy, 
  Check, 
  Swords
} from 'lucide-react';
import { Lesson } from '../StudentPortal';

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
  setQuizState: React.Dispatch<React.SetStateAction<{
    currentQuestionIndex: number;
    selectedOption: number | null;
    isCorrect: boolean | null;
    score: number;
    isFinished: boolean;
  }>>;
  finishLesson: () => void;
  activeCourse?: any;
}

export const StudentQuizPlayer: React.FC<StudentQuizPlayerProps> = ({
  activeLesson,
  setActiveView,
  setActiveLesson,
  quizState,
  setQuizState,
  finishLesson,
  activeCourse,
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <button onClick={() => { setActiveView(activeCourse ? 'trail-map' : 'assessments'); setActiveLesson(null); }} className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer">
          <X size={24} />
        </button>
        <div className="flex-1 max-w-xl mx-8">
          {/* Progress Bar */}
          <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${((quizState.currentQuestionIndex) / (activeLesson.questions?.length || 1)) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="text-rose-500" size={24} />
        </div>
      </div>

      {/* Quiz Body */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        {!quizState.isFinished ? (() => {
          if (!activeLesson.questions || activeLesson.questions.length === 0) {
            return (
              <div className="text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700">
                  <HelpCircle size={48} className="text-neutral-400" />
                </div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Ops! Sem perguntas</h2>
                <p className="text-neutral-500 mb-8 max-w-sm mx-auto">Parece que o professor ainda não adicionou as perguntas para este desafio.</p>
                <div className="mt-8">
                <button onClick={() => { setActiveView(activeCourse ? 'trail-map' : 'assessments'); setActiveLesson(null); }} className="px-8 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-colors cursor-pointer">Voltar</button>
              </div>
              </div>
            );
          }

          const q = activeLesson.questions[quizState.currentQuestionIndex];
          return (
            <div className="w-full max-w-2xl animate-in slide-in-from-right-8 duration-500">
              <h2 className="text-2xl md:text-4xl font-black text-neutral-900 dark:text-white mb-10 text-center leading-tight">
                {q.question}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {q.options.map((opt, idx) => {
                  const isSelected = quizState.selectedOption === idx;
                  const isCorrectAnswer = q.correctAnswer === idx;
                  const showResult = quizState.isCorrect !== null;
                  
                  let btnClass = "border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20";
                  
                  if (showResult) {
                    if (isCorrectAnswer) {
                      btnClass = "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
                    } else if (isSelected && !isCorrectAnswer) {
                      btnClass = "border-2 border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
                    } else {
                      btnClass = "border-2 border-neutral-200 dark:border-neutral-800 opacity-50";
                    }
                  } else if (isSelected) {
                    btnClass = "border-2 border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400";
                  }

                  return (
                    <button 
                      key={idx}
                      disabled={showResult}
                      onClick={() => setQuizState(prev => ({...prev, selectedOption: idx}))}
                      className={`p-5 rounded-2xl text-left font-bold text-lg transition-all cursor-pointer ${btnClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })() : (
          <div className="text-center animate-in zoom-in-95 duration-500">
            <div className="w-32 h-32 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6 border-4 border-amber-400">
              <Trophy size={64} className="text-amber-500" />
            </div>
            <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4">Desafio Concluído!</h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
              Você acertou {quizState.score} de {activeLesson.questions?.length} perguntas.
            </p>
            <button 
              onClick={finishLesson}
              className="px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest transition-transform hover:scale-105 shadow-xl shadow-emerald-500/20 cursor-pointer"
            >
              Resgatar XP e Continuar
            </button>
          </div>
        )}
      </div>

      {/* Bottom Validation Bar */}
      {!quizState.isFinished && (
        <div className={`border-t p-6 flex justify-between items-center transition-colors duration-300 ${
          quizState.isCorrect === true ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800' :
          quizState.isCorrect === false ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800' :
          'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
        }`}>
          <div>
            {quizState.isCorrect === true && (
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <div className="w-10 h-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center"><Check size={24} /></div>
                <div>
                  <h4 className="font-black text-xl leading-none">Incrível!</h4>
                  <p className="text-sm font-bold opacity-80">Resposta correta.</p>
                </div>
              </div>
            )}
            {quizState.isCorrect === false && (
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="w-10 h-10 bg-rose-200 dark:bg-rose-800 rounded-full flex items-center justify-center"><X size={24} /></div>
                <div>
                  <h4 className="font-black text-xl leading-none">Quase!</h4>
                  <p className="text-sm font-bold opacity-80">A resposta correta era a outra.</p>
                </div>
              </div>
            )}
          </div>
          
          <button 
            disabled={quizState.selectedOption === null}
            onClick={() => {
              const q = activeLesson.questions![quizState.currentQuestionIndex];
              if (quizState.isCorrect === null) {
                // Check answer
                const correct = quizState.selectedOption === q.correctAnswer;
                setQuizState(prev => ({
                  ...prev, 
                  isCorrect: correct,
                  score: correct ? prev.score + 1 : prev.score
                }));
              } else {
                // Next question
                if (quizState.currentQuestionIndex + 1 < activeLesson.questions!.length) {
                  setQuizState(prev => ({
                    ...prev,
                    currentQuestionIndex: prev.currentQuestionIndex + 1,
                    selectedOption: null,
                    isCorrect: null
                  }));
                } else {
                  setQuizState(prev => ({...prev, isFinished: true}));
                }
              }
            }}
            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all cursor-pointer ${
              quizState.selectedOption === null ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed' :
              quizState.isCorrect === true ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' :
              quizState.isCorrect === false ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20' :
              'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20'
            }`}
          >
            {quizState.isCorrect === null ? 'Verificar' : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
};
