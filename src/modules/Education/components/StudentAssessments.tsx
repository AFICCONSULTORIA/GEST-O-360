import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Sparkles, 
  Brain, 
  Trophy, 
  Clock, 
  Play, 
  ArrowRight, 
  X, 
  Swords, 
  Zap, 
  CheckCircle2, 
  Star, 
  Timer, 
  Shield,
  BookOpen
} from 'lucide-react';
import { Lesson } from '../StudentPortal';

interface StudentAssessmentsProps {
  handleAward: (xp: number, coins: number) => void;
  handleStartLesson: (lesson: Lesson) => void;
  setActiveView: (view: any) => void;
}

export const StudentAssessments: React.FC<StudentAssessmentsProps> = ({
  handleAward,
  handleStartLesson,
  setActiveView,
}) => {
  const [localView, setLocalView] = useState<'list' | 'taking'>('list');
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  if (localView === 'taking') {
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex flex-col animate-in fade-in duration-300">
        {/* Header Prova */}
        <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocalView('list')} className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer">
              <X size={20} />
            </button>
            <div className="h-2 w-32 md:w-64 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: assessmentStep === 0 ? '50%' : '100%' }}></div>
            </div>
            <span className="font-bold text-neutral-500 text-sm">{Math.min(assessmentStep + 1, 2)} de 2</span>
          </div>
          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full font-bold text-sm">
            <Timer size={16} /> 14:59
          </div>
        </header>

        {/* Area da Questão */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="max-w-3xl w-full space-y-8 py-8 animate-in slide-in-from-right-8 duration-500" key={assessmentStep}>
            {assessmentStep === 0 && (
              <>
                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white leading-tight">
                  1. Leia o pequeno texto abaixo. Sobre o que o texto fala principalmente?
                </h2>
                <div className="bg-orange-50 dark:bg-orange-500/10 p-6 rounded-2xl border border-orange-200 dark:border-orange-500/20 text-neutral-800 dark:text-neutral-200 font-medium text-lg leading-relaxed shadow-inner">
                  "O Sol é uma estrela que fica no centro do nosso sistema solar. Ele nos dá luz e calor durante o dia. Sem o Sol, a Terra seria muito escura e fria para os animais e as plantas viverem."
                </div>
                <div className="space-y-3">
                  {['Sobre a Lua', 'Sobre o Sol e sua importância', 'Sobre o frio e a escuridão', 'Sobre os planetas gigantes'].map((opcao, index) => (
                    <button 
                      key={index}
                      onClick={() => setSelectedAnswer(index)}
                      className={`w-full text-left p-5 rounded-2xl font-bold text-lg border-2 transition-all flex items-center gap-4 cursor-pointer ${
                        selectedAnswer === index 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 shadow-md transform scale-[1.01]' 
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${selectedAnswer === index ? 'border-orange-500 bg-orange-500 text-white' : 'border-neutral-300 text-neutral-400'}`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      {opcao}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            {assessmentStep === 1 && (
              <>
                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white leading-tight">
                  2. Observe a imagem e responda: Quantos planetas conseguimos ver nitidamente?
                </h2>
                <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800 relative">
                  <img src="https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=1000&auto=format&fit=crop" alt="Planets" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-3">
                  {['1 planeta', '2 planetas', '3 planetas', 'Nenhum'].map((opcao, index) => (
                    <button 
                      key={index}
                      onClick={() => setSelectedAnswer(index)}
                      className={`w-full text-left p-5 rounded-2xl font-bold text-lg border-2 transition-all flex items-center gap-4 cursor-pointer ${
                        selectedAnswer === index 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 shadow-md transform scale-[1.01]' 
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${selectedAnswer === index ? 'border-orange-500 bg-orange-500 text-white' : 'border-neutral-300 text-neutral-400'}`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      {opcao}
                    </button>
                  ))}
                </div>
              </>
            )}

            {assessmentStep === 2 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
                className="flex flex-col items-center justify-center text-center space-y-6 py-12 relative"
              >
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, delay: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-64 h-64 border-[4px] border-emerald-500/30 rounded-full animate-ping" />
                </motion.div>

                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-32 h-32 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center relative z-10"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Trophy size={64} />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative z-10"
                >
                  <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white mb-2 bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">Missão Concluída!</h2>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400">Excelente trabalho no Diagnóstico de Leitura e Interpretação.</p>
                </motion.div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-4 mt-8 relative z-10"
                >
                  <motion.div whileHover={{ scale: 1.05 }} className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-6 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-sm border border-sky-100 dark:border-sky-500/20">
                    <span className="text-sm uppercase tracking-wider opacity-80">XP Ganhos</span>
                    <span className="text-3xl">+250</span>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} className="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-6 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-sm border border-yellow-100 dark:border-yellow-500/20">
                    <span className="text-sm uppercase tracking-wider opacity-80">Moedas</span>
                    <span className="text-3xl">+100</span>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Prova */}
        <footer className="p-4 md:p-6 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex justify-between items-center">
          <button disabled className="px-6 py-3 font-bold text-neutral-400 opacity-50 cursor-not-allowed hidden md:block">Pular</button>
          <button 
            disabled={assessmentStep !== 2 && selectedAnswer === null}
            onClick={() => {
              if (assessmentStep === 0) {
                setAssessmentStep(1);
                setSelectedAnswer(null);
              } else if (assessmentStep === 1) {
                setAssessmentStep(2);
              } else {
                handleAward(250, 100);
                setLocalView('list');
                setAssessmentStep(0);
                setSelectedAnswer(null);
                setActiveView('dashboard');
              }
            }}
            className={`ml-auto px-8 py-4 rounded-2xl font-black text-lg text-white transition-all shadow-xl flex items-center gap-2 cursor-pointer ${(assessmentStep === 2 || selectedAnswer !== null) ? 'bg-orange-500 hover:bg-orange-600 hover:-translate-y-1 shadow-orange-500/30 active:scale-95' : 'bg-neutral-300 dark:bg-neutral-800 cursor-not-allowed shadow-none'}`}
          >
            {assessmentStep === 0 ? 'Próxima Questão' : assessmentStep === 1 ? 'Finalizar Missão' : 'Voltar ao Início'} {assessmentStep !== 2 && <ArrowRight size={20} />}
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Banner: Desafios Mágicos */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-[32px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden flex flex-col justify-center min-h-[200px]">
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-20%] right-[20%] w-[30%] h-[80%] bg-yellow-300/30 blur-[40px] rounded-full rotate-45"></div>
          </div>
          <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none translate-y-1/4">
            <Target size={240} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight flex items-center gap-3">
              Desafios Mágicos <Sparkles className="text-yellow-200" size={32} />
            </h2>
            <p className="text-white/90 max-w-xl text-sm md:text-base leading-relaxed">Mostre todo o seu poder e conhecimento! Cumpra as missões deixadas pelos seus professores para ganhar recompensas incríveis e evoluir seu nível.</p>
          </div>
        </div>

        {/* Acurácia Mágica radial */}
        <div className="w-full lg:w-80 bg-white dark:bg-neutral-900 rounded-[32px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-6 text-sm uppercase tracking-wider">
            <Zap className="text-yellow-500" size={18} fill="currentColor" />
            Sua Acurácia Mágica
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="stroke-neutral-100 dark:stroke-neutral-800" strokeWidth="12" fill="none" />
                <circle cx="50" cy="50" r="40" className="stroke-amber-500 transition-all duration-1000 ease-out" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset="37.68" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-neutral-900 dark:text-white">
                85%
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-neutral-900 dark:text-white leading-none">Excelente!</p>
              <p className="text-xs text-neutral-500 mt-1">Você acertou 17 das últimas 20 perguntas.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Avaliações e Missões Pendentes */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Swords className="text-rose-500" size={24} />
            Missões Abertas
          </h3>

          <div className="space-y-4">
            {/* Avaliação 1 - Diagnóstico de Leitura */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Brain size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Pendente</span>
                    <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                      <Clock size={12} /> 15 min
                    </span>
                  </div>
                  <h4 className="font-black text-xl text-neutral-900 dark:text-white leading-tight">Diagnóstico de Leitura e Interpretação</h4>
                </div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mt-auto">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" />
                  Recompensa: 250 XP + 100 Moedas
                </p>
              </div>
              <button 
                onClick={() => {
                  setAssessmentStep(0);
                  setSelectedAnswer(null);
                  setLocalView('taking');
                }}
                className="w-full bg-gradient-to-r from-orange-400 to-rose-500 text-white font-black py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={20} fill="currentColor" /> Iniciar Missão
              </button>
            </div>

            {/* Missão 1 - Frações Perdidas */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] border-2 border-rose-100 dark:border-rose-900/30 p-6 shadow-xl shadow-rose-500/5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 rotate-3 group-hover:rotate-6 transition-transform">
                  <Target size={32} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">Matemática</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500"><Timer size={12}/> 40 min</span>
                  </div>
                  <h4 className="font-black text-lg text-neutral-900 dark:text-white mb-2 leading-tight">O Mistério das Frações Perdidas</h4>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-500 shrink-0">
                      <Trophy size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Recompensa da Missão</p>
                      <p className="text-xs font-black text-amber-600 dark:text-amber-400">Escudo Dourado de Euclides + 200 XP</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1"><Clock size={14}/> Expira em 2 dias</p>
                    <button 
                      onClick={() => handleStartLesson({
                        id: 'missao-1',
                        title: 'O Mistério das Frações Perdidas',
                        type: 'quiz',
                        duration: '40 min',
                        xp: 200,
                        coins: 100,
                        questions: [
                          { id: 'q1', question: 'Quanto é 1/2 + 1/4?', options: ['3/4', '1/6', '2/4', '1/8'], correctAnswer: 0 },
                          { id: 'q2', question: 'Qual fração é equivalente a 0.5?', options: ['1/4', '1/2', '3/4', '1/3'], correctAnswer: 1 }
                        ]
                      })}
                      className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black px-6 py-2.5 rounded-full hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all shadow-md cursor-pointer">
                      Iniciar Missão
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Missão 2 - Egito Antigo */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] border-2 border-neutral-100 dark:border-neutral-800/50 p-6 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 -rotate-3 group-hover:-rotate-6 transition-transform">
                  <BookOpen size={32} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">História</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-500"><Timer size={12}/> 30 min</span>
                  </div>
                  <h4 className="font-black text-lg text-neutral-900 dark:text-white mb-2 leading-tight">A Viagem no Tempo: Egito Antigo</h4>
                  
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-500 shrink-0">
                      <Star size={16} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Recompensa da Missão</p>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Insígnia do Faraó + 150 XP</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-400 flex items-center gap-1"><Clock size={14}/> Faltam 5 dias</p>
                    <button 
                      onClick={() => handleStartLesson({
                        id: 'missao-2',
                        title: 'A Viagem no Tempo: Egito Antigo',
                        type: 'quiz',
                        duration: '30 min',
                        xp: 150,
                        coins: 80,
                        questions: [
                          { id: 'q1', question: 'Qual rio foi fundamental para o desenvolvimento do Egito Antigo?', options: ['Rio Tigre', 'Rio Eufrates', 'Rio Nilo', 'Rio Amazonas'], correctAnswer: 2 },
                          { id: 'q2', question: 'Quais construções famosas serviam como túmulos para os faraós?', options: ['Coliseu', 'Pirâmides', 'Acrópole', 'Templos Hindus'], correctAnswer: 1 }
                        ]
                      })}
                      className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black px-6 py-2.5 rounded-full hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white transition-all shadow-md cursor-pointer">
                      Iniciar Missão
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Missões Concluídas */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Shield className="text-sky-500" size={24} />
            Suas Vitórias Anteriores
          </h3>
          
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-2">
            {/* Resultado 1 */}
            <div className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">Biologia: O Reino Mágico das Plantas</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">Concluída há 3 dias</p>
              </div>
              <div className="text-right">
                <div className="flex text-amber-400 mb-1">
                  <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-500/10 px-2 py-1 rounded-md">Nota Máxima!</span>
              </div>
            </div>
            
            {/* Resultado 2 */}
            <div className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">Português: Caçadores de Rimas</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">Concluída há 1 semana</p>
              </div>
              <div className="text-right">
                <div className="flex text-amber-400 mb-1 justify-end">
                  <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} className="text-neutral-300 dark:text-neutral-700" />
                </div>
                <span className="text-[10px] font-black text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-500/10 px-2 py-1 rounded-md">Muito Bom!</span>
              </div>
            </div>

            {/* Resultado 3 */}
            <div className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">Geografia: Explorando os Continentes</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">Concluída há 2 semanas</p>
              </div>
              <div className="text-right">
                <div className="flex text-amber-400 mb-1 justify-end">
                  <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">Nota Máxima!</span>
              </div>
            </div>

            <button className="w-full text-center py-4 text-xs font-bold text-neutral-500 hover:text-indigo-600 transition-colors mt-2 border-t border-neutral-100 dark:border-neutral-800 cursor-pointer">
              Ver todas as vitórias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
