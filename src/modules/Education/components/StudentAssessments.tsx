import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  BookOpen,
  RotateCcw,
  Compass,
  Check,
  Award
} from 'lucide-react';
import { Lesson } from '../StudentPortal';
import { submitQuizAttempt, getStudentQuizAttempts } from '../../../lib/api/education';

export interface AssessmentQuestion {
  id: string;
  question: string;
  contextText?: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface AssessmentMission {
  id: string;
  title: string;
  subject: string;
  subjectColor: 'rose' | 'amber' | 'emerald' | 'sky';
  icon: 'brain' | 'target' | 'book' | 'compass';
  duration: string;
  xp: number;
  coins: number;
  rewardTitle: string;
  description: string;
  expiresIn?: string;
  questions: AssessmentQuestion[];
}

export interface CompletedAssessmentRecord {
  id: string;
  missionId: string;
  title: string;
  subject: string;
  score: number; // 0 a 100
  totalQuestions: number;
  correctAnswers: number;
  earnedXp: number;
  earnedCoins: number;
  stars: number;
  completedAt: string;
}

interface StudentAssessmentsProps {
  handleAward: (xp: number, coins: number) => void;
  handleStartLesson?: (lesson: Lesson) => void;
  setActiveView: (view: any) => void;
  studentData?: any;
  studentId?: string;
}

// Catálogo fixo e completo de Missões de Avaliação
const MISSIONS_CATALOG: AssessmentMission[] = [
  {
    id: 'missao-leitura',
    title: 'Diagnóstico de Leitura e Interpretação',
    subject: 'Língua Portuguesa',
    subjectColor: 'amber',
    icon: 'brain',
    duration: '15 min',
    xp: 250,
    coins: 100,
    rewardTitle: 'Medalha do Leitor Ávido + 250 XP',
    description: 'Leia textos informativos e identifique a ideia principal e relações de causa e consequência.',
    expiresIn: 'Disponível hoje',
    questions: [
      {
        id: 'q1',
        question: 'Leia o texto com atenção. Sobre o que ele fala principalmente?',
        contextText: '"O Sol é uma estrela que fica no centro do nosso sistema solar. Ele nos dá luz e calor durante o dia. Sem o Sol, a Terra seria muito escura e fria para os animais e as plantas viverem."',
        options: [
          'Sobre a Lua e as constelações',
          'Sobre o Sol e sua importância para a vida na Terra',
          'Sobre o frio e a escuridão do espaço sideral',
          'Sobre os planetas gigantes do sistema solar'
        ],
        correctAnswer: 1,
        explanation: 'O texto destaca o Sol no centro do sistema e enfatiza sua luz e calor indispensáveis à Terra.'
      },
      {
        id: 'q2',
        question: 'No trecho: "Sem o Sol, a Terra seria muito escura e fria para os animais viverem", a palavra "Sem" expressa ideia de:',
        options: [
          'Causa involuntária',
          'Condição ou ausência de algo essencial',
          'Comparação de dois elementos',
          'Conclusão de uma história'
        ],
        correctAnswer: 1,
        explanation: '"Sem" indica a falta/ausência de algo que condiciona o estado de escuridão e frio.'
      }
    ]
  },
  {
    id: 'missao-fracoes',
    title: 'O Mistério das Frações Perdidas',
    subject: 'Matemática',
    subjectColor: 'rose',
    icon: 'target',
    duration: '20 min',
    xp: 200,
    coins: 100,
    rewardTitle: 'Escudo Dourado de Euclides + 200 XP',
    description: 'Ajude os matemáticos do reino a desvendar frações equivalentes e somas de partes iguais.',
    expiresIn: 'Expira em 2 dias',
    questions: [
      {
        id: 'q1',
        question: 'Uma pizza foi dividida igualmente em 8 fatias. Se você comeu 2 fatias, qual é a fração simplificada correspondente?',
        options: ['1/4 da pizza', '2/8 sem simplificar', '1/2 da pizza', '3/8 da pizza'],
        correctAnswer: 0,
        explanation: '2/8 simplificado por 2 resulta em 1/4 da pizza.'
      },
      {
        id: 'q2',
        question: 'Quanto resulta a soma entre 1/2 e 1/4?',
        options: ['2/6', '3/4', '2/4', '1/8'],
        correctAnswer: 1,
        explanation: 'Transformando para mesmo denominador: 2/4 + 1/4 = 3/4.'
      },
      {
        id: 'q3',
        question: 'Qual número decimal equivale exatamente à fração 3/5?',
        options: ['0,35', '0,50', '0,60', '0,75'],
        correctAnswer: 2,
        explanation: 'Dividindo 3 por 5 obtemos exatamente 0,60.'
      }
    ]
  },
  {
    id: 'missao-egito',
    title: 'A Viagem no Tempo: Egito Antigo',
    subject: 'História',
    subjectColor: 'emerald',
    icon: 'book',
    duration: '15 min',
    xp: 150,
    coins: 80,
    rewardTitle: 'Insígnia Sagrada do Faraó + 150 XP',
    description: 'Descubra os segredos das pirâmides, a importância do Nilo e a escrita sagrada dos faraós.',
    expiresIn: 'Faltam 5 dias',
    questions: [
      {
        id: 'q1',
        question: 'Qual rio foi essencial para a agricultura e surgimento da civilização egípcia antiga?',
        options: ['Rio Tigre', 'Rio Eufrates', 'Rio Nilo', 'Rio Amazonas'],
        correctAnswer: 2,
        explanation: 'O Rio Nilo fertilizava as terras com suas cheias anuais, possibilitando a vida no deserto.'
      },
      {
        id: 'q2',
        question: 'As grandes pirâmides de Gizé (Quéops, Quéfren e Miquerinos) foram erguidas com que objetivo principal?',
        options: [
          'Fortalezas para guerras defensivas',
          'Túmulos monumentais para os faraós e sua vida após a morte',
          'Mercados públicos cobertos',
          'Observatórios astronômicos exclusivos'
        ],
        correctAnswer: 1,
        explanation: 'Eram monumentos funerários sagrados destinados ao descanso eterno dos faraós.'
      },
      {
        id: 'q3',
        question: 'Como se denominava a escrita sagrada egípcia registrada em papiros e templos?',
        options: ['Escrita Cuneiforme', 'Alfabeto Cirílico', 'Hieróglifos', 'Runas Antigas'],
        correctAnswer: 2,
        explanation: 'Os hieróglifos eram os símbolos sagrados grafados pelos escribas e sacerdotes egípcios.'
      }
    ]
  },
  {
    id: 'missao-ciencias',
    title: 'Desafio Relâmpago: Ecossistemas e Vida',
    subject: 'Ciências',
    subjectColor: 'sky',
    icon: 'compass',
    duration: '12 min',
    xp: 180,
    coins: 90,
    rewardTitle: 'Bússola Ecológica de Darwin + 180 XP',
    description: 'Teste seus conhecimentos sobre cadeias alimentares, fotossíntese e o ciclo da matéria.',
    expiresIn: 'Faltam 3 dias',
    questions: [
      {
        id: 'q1',
        question: 'Na cadeia alimentar, seres como plantas e algas que produzem seu próprio alimento por fotossíntese são classificados como:',
        options: ['Consumidores Primários', 'Decompositores', 'Produtores', 'Predadores de Topo'],
        correctAnswer: 2,
        explanation: 'Organismos autótrofos que fabricam seu próprio alimento são a base produtora da cadeia.'
      },
      {
        id: 'q2',
        question: 'Qual gás essencial os vegetais retiram do ar durante o processo de fotossíntese?',
        options: ['Gás Carbônico (CO₂)', 'Gás Nitrogênio', 'Gás Metano', 'Gás Hélio'],
        correctAnswer: 0,
        explanation: 'Na fotossíntese, as plantas absorvem CO₂ e liberam oxigênio (O₂) vital para a atmosfera.'
      }
    ]
  }
];

export const StudentAssessments: React.FC<StudentAssessmentsProps> = ({
  handleAward,
  setActiveView,
  studentData,
  studentId,
}) => {
  // Identificador do aluno
  const currentStudentId = studentData?.id || studentId || localStorage.getItem('edu_student_id') || '2';
  const storageKey = `gestao360_assessments_${currentStudentId}`;

  // Estados locais
  const [activeMission, setActiveMission] = useState<AssessmentMission | null>(null);
  const [localView, setLocalView] = useState<'list' | 'taking'>('list');
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [completedRecords, setCompletedRecords] = useState<CompletedAssessmentRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega tentativas do Supabase e do LocalStorage
  useEffect(() => {
    let isMounted = true;

    async function loadAttempts() {
      // 1. Carrega do localStorage primeiro (resposta imediata)
      let localRecords: CompletedAssessmentRecord[] = [];
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          localRecords = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Erro ao ler avaliações locais:', e);
      }

      // Se já houver registros locais, inicializa
      if (localRecords.length > 0 && isMounted) {
        setCompletedRecords(localRecords);
      }

      // 2. Sincroniza com Supabase
      try {
        const dbAttempts = await getStudentQuizAttempts(currentStudentId);
        if (dbAttempts && dbAttempts.length > 0 && isMounted) {
          // Mapeia tentativas do DB para o formato da interface
          const dbRecords: CompletedAssessmentRecord[] = dbAttempts.map(att => {
            const matchedMission = MISSIONS_CATALOG.find(m => 
              m.id === att.quizId || 
              att.quizId.toLowerCase().includes(m.id.replace('missao-', '').slice(0, 4))
            );

            const title = matchedMission?.title || 'Avaliação de Conhecimento';
            const subject = matchedMission?.subject || 'Geral';
            const missionId = matchedMission?.id || att.quizId;
            const stars = att.score >= 90 ? 3 : att.score >= 60 ? 2 : 1;

            return {
              id: att.id,
              missionId,
              title,
              subject,
              score: att.score,
              totalQuestions: att.totalQuestions || 2,
              correctAnswers: att.correctAnswers || Math.round((att.score / 100) * (att.totalQuestions || 2)),
              earnedXp: att.earnedXp,
              earnedCoins: att.earnedCoins,
              stars,
              completedAt: att.createdAt
            };
          });

          // Unifica sem duplicatas pelo missionId (mantendo a mais recente/melhor pontuação)
          const combinedMap = new Map<string, CompletedAssessmentRecord>();
          
          localRecords.forEach(r => combinedMap.set(r.missionId, r));
          dbRecords.forEach(r => {
            const existing = combinedMap.get(r.missionId);
            if (!existing || new Date(r.completedAt) >= new Date(existing.completedAt)) {
              combinedMap.set(r.missionId, r);
            }
          });

          const finalRecords = Array.from(combinedMap.values());
          setCompletedRecords(finalRecords);
          localStorage.setItem(storageKey, JSON.stringify(finalRecords));
        }
      } catch (err) {
        console.warn('Erro ao sincronizar avaliações com DB:', err);
      }
    }

    loadAttempts();

    return () => {
      isMounted = false;
    };
  }, [currentStudentId, storageKey]);

  // Identificação de missões abertas e concluídas
  const completedMissionIds = useMemo(() => {
    return new Set(completedRecords.map(r => r.missionId));
  }, [completedRecords]);

  const openMissions = useMemo(() => {
    return MISSIONS_CATALOG.filter(m => !completedMissionIds.has(m.id));
  }, [completedMissionIds]);

  // Cálculo da Acurácia Mágica (dinâmico e preciso)
  const accuracyStats = useMemo(() => {
    if (completedRecords.length === 0) {
      return {
        accuracy: 100,
        totalQuestions: 0,
        totalCorrect: 0,
        badgeText: 'Pronto para Brilhar! ⚡',
        subtitle: 'Você ainda não concluiu missões nesta temporada. Inicie sua primeira jornada!'
      };
    }

    const totalQuestions = completedRecords.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
    const totalCorrect = completedRecords.reduce((acc, cur) => acc + (cur.correctAnswers || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 100;

    let badgeText = 'Excelente Ritmo! ⚡';
    if (accuracy >= 90) badgeText = 'Mestre dos Desafios! 🌟';
    else if (accuracy >= 75) badgeText = 'Alta Precisão! ⚡';
    else if (accuracy >= 60) badgeText = 'Bom Desempenho! 🎯';
    else badgeText = 'Em Treinamento! 💪';

    const subtitle = `Você acertou ${totalCorrect} de ${totalQuestions} perguntas respondidas (${accuracy}% de precisão).`;

    return {
      accuracy,
      totalQuestions,
      totalCorrect,
      badgeText,
      subtitle
    };
  }, [completedRecords]);

  // Formatação de data amigável
  const formatDateRelative = (dateStr: string) => {
    if (!dateStr) return 'Recentemente';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) return 'Concluída agora mesmo';
      return `Concluída há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    }
    if (diffDays === 1) return 'Concluída ontem';
    if (diffDays < 7) return `Concluída há ${diffDays} dias`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Iniciar uma missão
  const startMission = (mission: AssessmentMission) => {
    setActiveMission(mission);
    setAssessmentStep(0);
    setUserAnswers([]);
    setSelectedAnswer(null);
    setLocalView('taking');
  };

  // Processa resposta da questão atual
  const handleAnswerOption = (index: number) => {
    setSelectedAnswer(index);
  };

  // Avança para a próxima questão ou para a tela de conclusão
  const handleNextStep = () => {
    if (!activeMission) return;

    const currentQIndex = assessmentStep;
    const updatedAnswers = [...userAnswers];
    if (selectedAnswer !== null) {
      updatedAnswers[currentQIndex] = selectedAnswer;
    }
    setUserAnswers(updatedAnswers);
    setSelectedAnswer(null);

    if (currentQIndex + 1 < activeMission.questions.length) {
      setAssessmentStep(currentQIndex + 1);
    } else {
      // Chegou ao fim da prova, vai para a tela de celebração
      setAssessmentStep(activeMission.questions.length);
    }
  };

  // Finalização e persistência da missão
  const handleFinishMission = async () => {
    if (!activeMission || isSubmitting) return;

    setIsSubmitting(true);
    const totalQ = activeMission.questions.length;
    let correctCount = 0;

    activeMission.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const scorePercent = Math.round((correctCount / totalQ) * 100);
    const stars = scorePercent >= 90 ? 3 : scorePercent >= 50 ? 2 : 1;
    const earnedXp = Math.round(activeMission.xp * (Math.max(scorePercent, 40) / 100));
    const earnedCoins = Math.round(activeMission.coins * (Math.max(scorePercent, 40) / 100));

    const newRecord: CompletedAssessmentRecord = {
      id: `att_${Date.now()}`,
      missionId: activeMission.id,
      title: activeMission.title,
      subject: activeMission.subject,
      score: scorePercent,
      totalQuestions: totalQ,
      correctAnswers: correctCount,
      earnedXp,
      earnedCoins,
      stars,
      completedAt: new Date().toISOString()
    };

    // 1. Atualização e premiação no aluno
    handleAward(earnedXp, earnedCoins);

    // 2. Persistência local imediata
    const updated = [
      newRecord,
      ...completedRecords.filter(r => r.missionId !== activeMission.id)
    ];
    setCompletedRecords(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // 3. Salva no banco de dados Supabase de forma assíncrona
    try {
      await submitQuizAttempt({
        studentId: currentStudentId,
        quizId: activeMission.id,
        score: scorePercent,
        totalQuestions: totalQ,
        correctAnswers: correctCount,
        earnedXp,
        earnedCoins
      });
    } catch (e) {
      console.warn('Submissão remota da avaliação falhou, mas dados locais foram salvos:', e);
    }

    setIsSubmitting(false);
    setLocalView('list');
    setActiveMission(null);
  };

  // MODAL DE EXECUÇÃO DA PROVA / AVALIAÇÃO
  if (localView === 'taking' && activeMission) {
    const isFinishedScreen = assessmentStep >= activeMission.questions.length;
    const currentQuestion = !isFinishedScreen ? activeMission.questions[assessmentStep] : null;
    const totalQuestions = activeMission.questions.length;

    // Cálculo preliminar de acertos para a tela de conclusão
    let preliminaryCorrect = 0;
    if (isFinishedScreen) {
      activeMission.questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctAnswer) {
          preliminaryCorrect += 1;
        }
      });
    }
    const finalScorePercent = isFinishedScreen ? Math.round((preliminaryCorrect / totalQuestions) * 100) : 0;
    const finalStars = finalScorePercent >= 90 ? 3 : finalScorePercent >= 50 ? 2 : 1;

    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-neutral-950 flex flex-col animate-in fade-in duration-300">
        {/* Header Prova */}
        <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setLocalView('list');
                setActiveMission(null);
              }} 
              className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 cursor-pointer"
              title="Voltar"
            >
              <X size={20} />
            </button>
            <div className="h-2 w-32 md:w-64 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, ((assessmentStep + 1) / (totalQuestions + 1)) * 100)}%` }}
              />
            </div>
            <span className="font-bold text-neutral-500 text-sm">
              {isFinishedScreen ? 'Conclusão' : `Questão ${assessmentStep + 1} de ${totalQuestions}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full font-bold text-sm">
            <Timer size={16} /> {activeMission.duration}
          </div>
        </header>

        {/* Área da Questão / Conclusão */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-center">
          <div className="max-w-3xl w-full space-y-8 py-8 animate-in slide-in-from-right-8 duration-500">
            {!isFinishedScreen && currentQuestion && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full">
                    {activeMission.subject}
                  </span>
                  <span className="text-xs font-bold text-neutral-400">
                    {activeMission.title}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white leading-tight">
                  {assessmentStep + 1}. {currentQuestion.question}
                </h2>

                {currentQuestion.contextText && (
                  <div className="bg-orange-50/70 dark:bg-orange-500/10 p-6 rounded-2xl border border-orange-200/60 dark:border-orange-500/20 text-neutral-800 dark:text-neutral-200 font-medium text-lg leading-relaxed shadow-inner">
                    {currentQuestion.contextText}
                  </div>
                )}

                {currentQuestion.imageUrl && (
                  <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-800 relative">
                    <img src={currentQuestion.imageUrl} alt="Ilustração" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((opcao, index) => {
                    const isSelected = selectedAnswer === index;
                    return (
                      <button 
                        key={index}
                        onClick={() => handleAnswerOption(index)}
                        className={`w-full text-left p-5 rounded-2xl font-bold text-lg border-2 transition-all flex items-center gap-4 cursor-pointer ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 shadow-md transform scale-[1.01]' 
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500 text-white font-black' : 'border-neutral-300 text-neutral-400'}`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1">{opcao}</span>
                        {isSelected && <Check size={20} className="text-orange-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {isFinishedScreen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
                className="flex flex-col items-center justify-center text-center space-y-6 py-8 relative"
              >
                <div className="w-32 h-32 bg-amber-100 dark:bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center relative shadow-xl shadow-amber-500/20">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <Trophy size={64} className="text-amber-500" />
                  </motion.div>
                </div>

                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
                    {[1, 2, 3].map(st => (
                      <Star 
                        key={st} 
                        size={28} 
                        fill={st <= finalStars ? 'currentColor' : 'none'} 
                        className={st <= finalStars ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700'} 
                      />
                    ))}
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    {finalScorePercent >= 70 ? 'Missão Cumprida com Sucesso!' : 'Missão Finalizada!'}
                  </h2>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                    Você acertou <strong>{preliminaryCorrect} de {totalQuestions}</strong> questões ({finalScorePercent}% de aproveitamento) em <strong>{activeMission.title}</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  <div className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-6 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-sm border border-sky-100 dark:border-sky-500/20 min-w-[130px]">
                    <span className="text-xs uppercase tracking-wider opacity-80">XP Ganhos</span>
                    <span className="text-3xl font-black">+{Math.round(activeMission.xp * (Math.max(finalScorePercent, 40) / 100))}</span>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-6 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-sm border border-yellow-100 dark:border-yellow-500/20 min-w-[130px]">
                    <span className="text-xs uppercase tracking-wider opacity-80">Moedas</span>
                    <span className="text-3xl font-black">+{Math.round(activeMission.coins * (Math.max(finalScorePercent, 40) / 100))}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-6 py-3 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Sua acurácia mágica e histórico foram atualizados com sucesso!
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Prova */}
        <footer className="p-4 md:p-6 border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md flex justify-between items-center">
          {!isFinishedScreen ? (
            <>
              <button 
                onClick={() => {
                  setLocalView('list');
                  setActiveMission(null);
                }}
                className="px-6 py-3 font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              
              <button 
                disabled={selectedAnswer === null}
                onClick={handleNextStep}
                className={`ml-auto px-8 py-4 rounded-2xl font-black text-lg text-white transition-all shadow-xl flex items-center gap-2 cursor-pointer ${
                  selectedAnswer !== null 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:-translate-y-0.5 shadow-orange-500/30 active:scale-95' 
                    : 'bg-neutral-300 dark:bg-neutral-800 cursor-not-allowed shadow-none text-neutral-400'
                }`}
              >
                {assessmentStep + 1 < totalQuestions ? 'Próxima Questão' : 'Ver Resultado'}
                <ArrowRight size={20} />
              </button>
            </>
          ) : (
            <button 
              disabled={isSubmitting}
              onClick={handleFinishMission}
              className="w-full max-w-md mx-auto py-4 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={22} />
              {isSubmitting ? 'Salvando Resultados...' : 'Concluir e Retornar às Avaliações'}
            </button>
          )}
        </footer>
      </div>
    );
  }

  // CÁLCULO DO ANEL CIRCULAR SVG (Raio 40 => Circunferência 251.2)
  const circleRadius = 40;
  const circleCircumference = 2 * Math.PI * circleRadius; // ~251.327
  const strokeDashoffset = circleCircumference - (circleCircumference * accuracyStats.accuracy) / 100;

  // Filtragem das listas
  const displayedOpenMissions = activeFilter === 'completed' ? [] : openMissions;
  const displayedCompletedMissions = activeFilter === 'open' ? [] : completedRecords;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Banner: Desafios Mágicos & Acurácia */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Banner Motivacional */}
        <div className="flex-1 rounded-[32px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden flex flex-col justify-center min-h-[220px]">
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-20%] right-[20%] w-[30%] h-[80%] bg-yellow-300/30 blur-[40px] rounded-full rotate-45"></div>
          </div>
          <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none translate-y-1/4">
            <Target size={240} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4 border border-white/20">
              <Sparkles size={14} className="text-yellow-200" /> Centro de Avaliações
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight flex items-center gap-3">
              Desafios & Avaliações <Sparkles className="text-yellow-200" size={32} />
            </h2>
            <p className="text-white/90 max-w-xl text-sm md:text-base leading-relaxed">
              Realize suas missões escolares, mostre seu domínio e evolua seu nível. Suas respostas ajustam sua precisão mágica em tempo real!
            </p>
          </div>
        </div>

        {/* Acurácia Mágica Radial Dinâmica */}
        <div className="w-full lg:w-96 bg-white dark:bg-neutral-900 rounded-[32px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <Zap className="text-amber-500" size={18} fill="currentColor" />
              Sua Acurácia Mágica
            </h3>
            <span className="text-[11px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
              {completedRecords.length} {completedRecords.length === 1 ? 'Avaliação' : 'Avaliações'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Círculo de fundo */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r={circleRadius} 
                  className="stroke-neutral-100 dark:stroke-neutral-800" 
                  strokeWidth="11" 
                  fill="none" 
                />
                {/* Círculo de progresso dinâmico */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r={circleRadius} 
                  className={`transition-all duration-1000 ease-out ${
                    accuracyStats.accuracy >= 80 
                      ? 'stroke-amber-500' 
                      : accuracyStats.accuracy >= 60 
                      ? 'stroke-sky-500' 
                      : 'stroke-rose-500'
                  }`}
                  strokeWidth="11" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeDasharray={circleCircumference} 
                  strokeDashoffset={strokeDashoffset} 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-black text-neutral-900 dark:text-white">
                <span className="text-2xl leading-none">{accuracyStats.accuracy}%</span>
                <span className="text-[9px] uppercase tracking-wider text-neutral-400 mt-0.5">precisão</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
                {accuracyStats.badgeText}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                {accuracyStats.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/60 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            Todas ({openMissions.length + completedRecords.length})
          </button>
          <button
            onClick={() => setActiveFilter('open')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'open'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                : 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Swords size={16} /> Abertas ({openMissions.length})
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'completed'
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Shield size={16} /> Concluídas ({completedRecords.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* COLUNA 1: MISSÕES ABERTAS */}
        {activeFilter !== 'completed' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Swords className="text-rose-500" size={24} />
                Missões Abertas ({openMissions.length})
              </h3>
              <span className="text-xs font-bold text-neutral-400">
                Recompensas aguardando
              </span>
            </div>

            {openMissions.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-8 border border-neutral-200/50 dark:border-neutral-800/50 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-xl font-black text-neutral-900 dark:text-white">
                  Todas as missões foram completadas! 🏆
                </h4>
                <p className="text-sm text-neutral-500 max-w-md mx-auto">
                  Parabéns! Você concluiu todos os desafios disponíveis. Você pode praticar novamente qualquer uma das suas vitórias ao lado para manter sua mente afiada.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOpenMissions.map((mission) => {
                  const isAmber = mission.subjectColor === 'amber';
                  const isRose = mission.subjectColor === 'rose';
                  const isEmerald = mission.subjectColor === 'emerald';
                  const isSky = mission.subjectColor === 'sky';

                  return (
                    <div 
                      key={mission.id}
                      className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group"
                    >
                      <div className="flex gap-4 items-start">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                          isAmber ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                          isRose ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' :
                          isEmerald ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' :
                          'bg-sky-100 dark:bg-sky-500/20 text-sky-500'
                        }`}>
                          {mission.icon === 'brain' && <Brain size={32} />}
                          {mission.icon === 'target' && <Target size={32} />}
                          {mission.icon === 'book' && <BookOpen size={32} />}
                          {mission.icon === 'compass' && <Compass size={32} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                              Pendente
                            </span>
                            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                              <Clock size={12} /> {mission.duration}
                            </span>
                            <span className="text-xs font-semibold text-neutral-400 ml-auto">
                              {mission.subject}
                            </span>
                          </div>
                          <h4 className="font-black text-xl text-neutral-900 dark:text-white leading-tight">
                            {mission.title}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                            {mission.description}
                          </p>
                        </div>
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                          <Trophy size={16} className="text-amber-500" />
                          <span>{mission.rewardTitle}</span>
                        </div>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-500/20 px-2 py-1 rounded-md">
                          +{mission.coins} Moedas
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        {mission.expiresIn && (
                          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                            <Clock size={14} /> {mission.expiresIn}
                          </span>
                        )}
                        <button 
                          onClick={() => startMission(mission)}
                          className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-6 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Play size={16} fill="currentColor" /> Iniciar Missão
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* COLUNA 2: MISSÕES CONCLUÍDAS / SUAS VITÓRIAS */}
        {activeFilter !== 'open' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Shield className="text-emerald-500" size={24} />
                Missões Concluídas ({completedRecords.length})
              </h3>
              <span className="text-xs font-bold text-neutral-400">
                Histórico & Conquistas
              </span>
            </div>
            
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-4 space-y-3">
              {completedRecords.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                    <Award size={32} />
                  </div>
                  <h4 className="font-bold text-neutral-900 dark:text-white">
                    Nenhuma missão concluída ainda
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Inicie uma das missões abertas ao lado para conquistar estrelas, desbloquear medalhas e calibrar sua acurácia mágica!
                  </p>
                </div>
              ) : (
                displayedCompletedMissions.map((record) => {
                  const catalogItem = MISSIONS_CATALOG.find(m => m.id === record.missionId);

                  return (
                    <div 
                      key={record.id}
                      className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-[24px] border border-neutral-100 dark:border-neutral-800/40 transition-all flex flex-col sm:flex-row sm:items-center gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                            {record.subject}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {formatDateRelative(record.completedAt)}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight truncate">
                          {record.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                          <span className="font-bold text-amber-500 flex items-center gap-1">
                            +{record.earnedXp} XP
                          </span>
                          <span>•</span>
                          <span>{record.correctAnswers} de {record.totalQuestions} acertos</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="flex text-amber-400">
                          {[1, 2, 3].map(st => (
                            <Star 
                              key={st} 
                              size={14} 
                              fill={st <= record.stars ? 'currentColor' : 'none'} 
                              className={st <= record.stars ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700'} 
                            />
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                            record.score >= 90 
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/20' 
                              : record.score >= 60 
                              ? 'text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-500/20'
                              : 'text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/20'
                          }`}>
                            {record.score}% de Acerto
                          </span>

                          {catalogItem && (
                            <button
                              onClick={() => startMission(catalogItem)}
                              className="text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Praticar novamente"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {completedRecords.length > 0 && (
                <div className="pt-2 px-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <span>Todas as tentativas são registradas no seu boletim gamificado.</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Total: {completedRecords.reduce((acc, c) => acc + c.earnedXp, 0)} XP acumulados
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
