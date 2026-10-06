import React, { useState, useEffect } from 'react';
import { 
  Play, PlayCircle, Award, Clock, Video, BookOpen, FileText, Download, 
  Search, CheckCircle2, Check, ChevronRight, X, Sparkles, Filter, 
  Printer, ArrowLeft, Trophy, Zap, Flame, Eye, RotateCcw, Share2, 
  Volume2, Maximize2, Pause, SkipForward, BookCheck, ShieldCheck, Star
} from 'lucide-react';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl?: string;
  summary: string;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  category: 'Inclusão' | 'Tecnologia' | 'Metodologias Ativas' | 'BNCC' | 'Gestão';
  coverImage: string;
  workloadHours: number;
  xpReward: number;
  levelBadge: string;
  modules: CourseModule[];
}

export interface ManualDoc {
  id: string;
  title: string;
  category: string;
  pages: number;
  fileSize: string;
  summary: string;
  keyTopics: string[];
  contentSections: { title: string; text: string }[];
  read: boolean;
}

export interface TeacherCertificate {
  id: string;
  courseId: string;
  courseTitle: string;
  workloadHours: number;
  issueDate: string;
  validationCode: string;
}

const DEFAULT_COURSES: Course[] = [
  {
    id: 'course-inclusao',
    title: 'Educação Inclusiva na Prática',
    subtitle: 'Adaptação Curricular, AEE e Transtornos de Aprendizagem',
    category: 'Inclusão',
    coverImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop',
    workloadHours: 40,
    xpReward: 350,
    levelBadge: 'Inclusão Avançada',
    modules: [
      {
        id: 'mod-1',
        title: 'Módulo 1: Fundamentos da Inclusão e Legislação',
        lessons: [
          {
            id: 'l-1-1',
            title: '1. O Marco Legal da Educação Inclusiva no Brasil',
            duration: '14:20',
            completed: true,
            summary: 'Compreensão das diretrizes da LDB e convenções internacionais sobre direitos da pessoa com deficiência na escola regular.'
          },
          {
            id: 'l-1-2',
            title: '2. Identificação Precoce de Sinais de Alerta',
            duration: '18:45',
            completed: true,
            summary: 'Como observar alterações pedagógicas, psicomotoras e de comunicação no convívio escolar cotidiano.'
          }
        ]
      },
      {
        id: 'mod-2',
        title: 'Módulo 2: Adaptações Curriculares e PEI',
        lessons: [
          {
            id: 'l-2-1',
            title: '3. Elaboração do Plano Educacional Individualizado (PEI)',
            duration: '22:15',
            completed: true,
            summary: 'Passo a passo prático para criar metas acessíveis com flexibilização de tempo, critérios e recursos.'
          },
          {
            id: 'l-2-2',
            title: '4. Adaptação Curricular para Estudantes no Espectro Autista (TEA)',
            duration: '25:30',
            completed: false,
            summary: 'Estratégias de rotina estruturada, previsibilidade, apoio visual e regulação sensorial em sala de aula.'
          },
          {
            id: 'l-2-3',
            title: '5. Recursos de Tecnologia Assistiva de Baixo Custo',
            duration: '19:10',
            completed: false,
            summary: 'Materiais táteis, engrossadores de lápis, pranchas de comunicação e recursos digitais acessíveis.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-tecnologia',
    title: 'Tecnologia & IA em Sala de Aula',
    subtitle: 'Ferramentas Digitais, Ensino Híbrido e Avaliações Dinâmicas',
    category: 'Tecnologia',
    coverImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
    workloadHours: 30,
    xpReward: 300,
    levelBadge: 'Educador Digital',
    modules: [
      {
        id: 'mod-t1',
        title: 'Módulo 1: Ferramentas Interativas e IA Pedagógica',
        lessons: [
          {
            id: 'l-t1-1',
            title: '1. IA Generativa para Criação de Planos de Aula e Exercícios',
            duration: '16:40',
            completed: true,
            summary: 'Como utilizar prompts educacionais éticos para gerar rubricas, quizzes contextualizados e resumos.'
          },
          {
            id: 'l-t1-2',
            title: '2. Plataformas de Quizzes e Feedback em Tempo Real',
            duration: '15:10',
            completed: false,
            summary: 'Uso de dinâmicas rápidas para checagem de retenção do conteúdo sem sobrecarga avaliativa.'
          }
        ]
      },
      {
        id: 'mod-t2',
        title: 'Módulo 2: Segurança Digital e Cidadania dos Estudantes',
        lessons: [
          {
            id: 'l-t2-1',
            title: '3. Letramento Midiático e Combate à Desinformação',
            duration: '20:50',
            completed: false,
            summary: 'Orientando alunos sobre fontes seguras, uso responsável de telas e prevenção ao ciberbullying.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-gamificacao',
    title: 'Gamificação & Metodologias Ativas',
    subtitle: 'Dinâmicas Lúdicas, Sala de Aula Invertida e Aprendizagem Baseada em Problemas',
    category: 'Metodologias Ativas',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
    workloadHours: 35,
    xpReward: 320,
    levelBadge: 'Mestre da Gamificação',
    modules: [
      {
        id: 'mod-g1',
        title: 'Módulo 1: Elementos de Jogo no Aprendizado',
        lessons: [
          {
            id: 'l-g1-1',
            title: '1. Mecânicas de Recompensa, Narrativa e Missões',
            duration: '18:00',
            completed: false,
            summary: 'Transformando matérias densas em jornadas investigativas por meio de enredos pedagógicos.'
          },
          {
            id: 'l-g1-2',
            title: '2. Aprendizagem Baseada em Projetos (PBL) na Prática',
            duration: '24:15',
            completed: false,
            summary: 'Estruturação de desafios reais onde os estudantes propõem soluções para a comunidade.'
          }
        ]
      }
    ]
  },
  {
    id: 'course-bncc',
    title: 'Alinhamento BNCC e Habilidades do Século XXI',
    subtitle: 'Competências Gerais, Socioemocionais e Progressão de Aprendizagem',
    category: 'BNCC',
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop',
    workloadHours: 25,
    xpReward: 250,
    levelBadge: 'Especialista BNCC',
    modules: [
      {
        id: 'mod-b1',
        title: 'Módulo 1: Competências Gerais e Socioemocionais',
        lessons: [
          {
            id: 'l-b1-1',
            title: '1. Articulação dos Objetivos de Aprendizagem e Códigos BNCC',
            duration: '21:30',
            completed: false,
            summary: 'Como associar as habilidades da base com a matriz curricular e o plano bimestral.'
          }
        ]
      }
    ]
  }
];

const DEFAULT_MANUALS: ManualDoc[] = [
  {
    id: 'doc-bncc',
    title: 'Guia Prático da BNCC 2026',
    category: 'Normativas & Currículo',
    pages: 48,
    fileSize: '2.4 MB',
    summary: 'Referência completa contendo desdobramentos de competências, progressão pedagógica e orientações avaliativas.',
    keyTopics: ['Competências Gerais', 'Progressão de Habilidades', 'Avaliação Formativa', 'Adaptações Regionais'],
    contentSections: [
      {
        title: '1. Propósito e Diretrizes Centrais',
        text: 'A Base Nacional Comum Curricular orienta as redes de ensino a priorizar a formação integral dos educandos, integrando dimensões intelectuais, físicas, afetivas, sociais e éticas.'
      },
      {
        title: '2. Desenvolvimento de Competências Socioemocionais',
        text: 'A empatia, cooperação, resolução pacífica de conflitos e pensamento crítico devem ser trabalhados transversalmente em todas as disciplinas cotidianas.'
      },
      {
        title: '3. Critérios de Flexibilização e Contextualização',
        text: 'Os professores têm autonomia para adaptar os projetos aos saberes locais da comunidade escolar, garantindo relevância sociocultural.'
      }
    ],
    read: true
  },
  {
    id: 'doc-diario',
    title: 'Manual do Diário de Classe Digital',
    category: 'Gestão Escolar',
    pages: 24,
    fileSize: '1.1 MB',
    summary: 'Procedimentos passo a passo para lançamento de frequência, notas parciais, registros de ocorrências e fechamento bimestral.',
    keyTopics: ['Lançamento de Faltas', 'Rubricas de Desempenho', 'Fechamento de Médias', 'Exportação para Secretaria'],
    contentSections: [
      {
        title: '1. Rotina Diária de Registro',
        text: 'Recomenda-se registrar as frequências nos primeiros 15 minutos da aula para acionar a busca ativa automatizada quando necessário.'
      },
      {
        title: '2. Registro Descritivo de Habilidades',
        text: 'Utilize os campos de observação para evidenciar progressos qualitativos e indicar se o aluno atingiu a meta ou necessita de reforço contínuo.'
      }
    ],
    read: true
  },
  {
    id: 'doc-pei',
    title: 'Protocolos Inclusivos de Aprendizagem (PEI/AEE)',
    category: 'Inclusão & Acessibilidade',
    pages: 32,
    fileSize: '850 KB',
    summary: 'Modelos e critérios técnicos para a construção do Plano de Desenvolvimento Individual em conjunto com a equipe multifuncional.',
    keyTopics: ['Diagnóstico Funcional', 'Adaptação de Materiais', 'Comunicação Aumentativa', 'Mediação Pedagógica'],
    contentSections: [
      {
        title: '1. Identificação de Barreiras de Aprendizagem',
        text: 'O foco deve ser remover barreiras pedagógicas e arquitetônicas, oferecendo múltiplos meios de representação, ação e engajamento (DUA).'
      },
      {
        title: '2. Parceria com a Sala de Recursos (AEE)',
        text: 'Planejamento compartilhado quinzenal entre professor regente e professor do AEE para alinhamento dos objetivos específicos.'
      }
    ],
    read: false
  },
  {
    id: 'doc-conflitos',
    title: 'Mediação de Conflitos e Convivência Escolar',
    category: 'Clima Escolar',
    pages: 28,
    fileSize: '920 KB',
    summary: 'Práticas restaurativas, rodas de conversa estruturadas e acolhimento para fortalecimento do vínculo da comunidade.',
    keyTopics: ['Comunicação Não-Violenta', 'Círculos Restaurativos', 'Prevenção ao Bullying', 'Gestão Emocional'],
    contentSections: [
      {
        title: '1. Círculos de Construção de Paz',
        text: 'Estruturação de momentos seguros para que os alunos compartilhem sentimentos, estabeleçam acordos coletivos e assumam responsabilidades.'
      }
    ],
    read: false
  }
];

export const TeacherTrainingCenter: React.FC = () => {
  // Courses state
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('gestao360_teacher_courses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_COURSES;
  });

  // Manuals state
  const [manuals, setManuals] = useState<ManualDoc[]>(() => {
    const saved = localStorage.getItem('gestao360_teacher_manuals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_MANUALS;
  });

  // Gamification & XP State
  const [xp, setXp] = useState<number>(() => {
    const saved = localStorage.getItem('gestao360_teacher_xp');
    return saved ? parseInt(saved, 10) : 1250;
  });

  // Certificates state
  const [certificates, setCertificates] = useState<TeacherCertificate[]>(() => {
    const saved = localStorage.getItem('gestao360_teacher_certificates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Navigation / Search / Filter State
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed' | 'manuals' | 'certificates'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeCoursePlayer, setActiveCoursePlayer] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoPlaybackProgress, setVideoPlaybackProgress] = useState(45);
  const [teacherLessonNote, setTeacherLessonNote] = useState('');

  const [activeManualReader, setActiveManualReader] = useState<ManualDoc | null>(null);
  const [activeCertificateModal, setActiveCertificateModal] = useState<TeacherCertificate | null>(null);

  // Success Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('gestao360_teacher_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('gestao360_teacher_manuals', JSON.stringify(manuals));
  }, [manuals]);

  useEffect(() => {
    localStorage.setItem('gestao360_teacher_xp', xp.toString());
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('gestao360_teacher_certificates', JSON.stringify(certificates));
  }, [certificates]);

  // Level computation based on XP
  // Level 1: 0-400, Level 2: 401-800, Level 3: 801-1200, Level 4: 1201-1600, Level 5: 1601+
  const currentLevelNumber = Math.floor(xp / 400) + 1;
  const currentLevelTitle = 
    currentLevelNumber === 1 ? 'Educador Iniciante' :
    currentLevelNumber === 2 ? 'Praticante Ativo' :
    currentLevelNumber === 3 ? 'Professor Conectado' :
    currentLevelNumber === 4 ? 'Mestre Inovador' :
    currentLevelNumber === 5 ? 'Líder Pedagógico' : 'Especialista Máximo';

  const xpInCurrentLevel = xp % 400;
  const xpNeededForNext = 400 - xpInCurrentLevel;
  const levelProgressPercentage = Math.min(100, Math.round((xpInCurrentLevel / 400) * 100));

  // Compute course overall progress percentage
  const calculateCourseProgress = (course: Course) => {
    let totalLessons = 0;
    let completedLessons = 0;
    course.modules.forEach(m => {
      m.lessons.forEach(l => {
        totalLessons++;
        if (l.completed) completedLessons++;
      });
    });
    if (totalLessons === 0) return 0;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  // Open Course Player
  const handleOpenCourse = (course: Course) => {
    setActiveCoursePlayer(course);
    // Find first incomplete lesson or default to first lesson
    let firstIncomplete: Lesson | null = null;
    for (const mod of course.modules) {
      for (const les of mod.lessons) {
        if (!les.completed && !firstIncomplete) {
          firstIncomplete = les;
          break;
        }
      }
    }
    const targetLesson = firstIncomplete || course.modules[0]?.lessons[0] || null;
    setSelectedLesson(targetLesson);
    setIsPlayingVideo(true);
    setVideoPlaybackProgress(targetLesson?.completed ? 100 : 35);
    
    // Load existing note
    if (targetLesson) {
      const savedNote = localStorage.getItem(`gestao360_note_${targetLesson.id}`) || '';
      setTeacherLessonNote(savedNote);
    }
  };

  // Toggle Lesson Completion inside Course Player
  const handleToggleLessonComplete = (lessonId: string) => {
    if (!activeCoursePlayer) return;

    let newlyCompleted = false;

    const updatedModules = activeCoursePlayer.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(les => {
        if (les.id === lessonId) {
          const nextState = !les.completed;
          newlyCompleted = nextState;
          return { ...les, completed: nextState };
        }
        return les;
      })
    }));

    const updatedCourse = {
      ...activeCoursePlayer,
      modules: updatedModules
    };

    setActiveCoursePlayer(updatedCourse);

    const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    setCourses(updatedCourses);

    // Update selectedLesson if current
    if (selectedLesson?.id === lessonId) {
      setSelectedLesson({ ...selectedLesson, completed: newlyCompleted });
    }

    if (newlyCompleted) {
      setXp(prev => prev + 50);
      showToast('Aula concluída! +50 XP adicionados ao seu perfil');

      // Check if whole course is completed to generate certificate
      const allDone = updatedCourse.modules.every(m => m.lessons.every(l => l.completed));
      if (allDone) {
        setXp(prev => prev + updatedCourse.xpReward);
        const existingCert = certificates.find(c => c.courseId === updatedCourse.id);
        if (!existingCert) {
          const newCert: TeacherCertificate = {
            id: `cert-${Date.now()}`,
            courseId: updatedCourse.id,
            courseTitle: updatedCourse.title,
            workloadHours: updatedCourse.workloadHours,
            issueDate: new Date().toLocaleDateString('pt-BR'),
            validationCode: `G360-${Math.random().toString(36).substring(2, 8).toUpperCase()}-EDU`
          };
          setCertificates(prev => [newCert, ...prev]);
          showToast(`Parabéns! Você concluiu o curso e emitiu seu Certificado (+${updatedCourse.xpReward} XP)`);
        }
      }
    }
  };

  // Save personal pedagogical note
  const handleSaveLessonNote = () => {
    if (!selectedLesson) return;
    localStorage.setItem(`gestao360_note_${selectedLesson.id}`, teacherLessonNote);
    showToast('Anotações pedagógicas salvas com sucesso!');
  };

  // Handle Mark Manual as Read
  const handleMarkManualRead = (manualId: string) => {
    const updated = manuals.map(m => m.id === manualId ? { ...m, read: true } : m);
    setManuals(updated);
    setXp(prev => prev + 30);
    showToast('Manual concluído! +30 XP de leitura adicionados');
    if (activeManualReader?.id === manualId) {
      setActiveManualReader({ ...activeManualReader, read: true });
    }
  };

  // Simulated download action
  const handleDownloadManual = (doc: ManualDoc) => {
    const element = document.createElement('a');
    const file = new Blob([
      `GESTÃO 360 - BIBLIOTECA DE MANUAIS PEDAGÓGICOS\n\nDocumento: ${doc.title}\nCategoria: ${doc.category}\nPáginas: ${doc.pages}\n\nRESUMO:\n${doc.summary}\n\nTÓPICOS CHAVE:\n${doc.keyTopics.join('\n- ')}\n\nDIRETRIZES TÉCNICAS:\n${doc.contentSections.map(s => `\n## ${s.title}\n${s.text}`).join('\n')}\n\nEmitido pelo Portal do Professor Gestão 360.`
    ], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.title.replace(/\s+/g, '_')}_Gestao360.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`Download de "${doc.title}" iniciado!`);
  };

  // Filtered courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;

    const progress = calculateCourseProgress(course);
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'in_progress' ? (progress > 0 && progress < 100) :
      activeTab === 'completed' ? (progress === 100) :
      false;

    return matchesSearch && matchesCategory && matchesTab;
  });

  // Filtered manuals
  const filteredManuals = manuals.filter(m => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-neutral-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-500/40 backdrop-blur-xl animate-in fade-in slide-in-from-top-3">
          <Sparkles className="text-amber-400 shrink-0" size={18} />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Gamification Banner & Progression */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero Card */}
        <div className="lg:col-span-2 rounded-[32px] bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-8 md:p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[60%] bg-fuchsia-500/20 blur-[60px] rounded-full"></div>
            <Award className="absolute right-6 -bottom-6 text-white/5 w-64 h-64" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                <Star fill="currentColor" size={12} className="text-amber-300" /> Formação Continuada 2026
              </span>
              <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Flame size={12} className="text-amber-400" /> 5 dias seguidos
              </span>
            </div>

            <h2 className="text-2xl md:text-4xl font-black mb-3 leading-tight tracking-tight">
              Centro de Treinamento Pedagógico
            </h2>
            <p className="text-indigo-100 max-w-xl mb-6 text-sm md:text-base leading-relaxed font-medium">
              Aprimore suas competências em educação inclusiva, tecnologia educacional e metodologias ativas. Conclua módulos, acumule pontos de experiência e emita certificados com validação institucional.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-4">
            <button 
              onClick={() => {
                const inProg = courses.find(c => {
                  const p = calculateCourseProgress(c);
                  return p > 0 && p < 100;
                }) || courses[0];
                handleOpenCourse(inProg);
              }}
              className="bg-white text-indigo-700 font-extrabold px-6 py-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2.5 cursor-pointer text-sm"
            >
              <Play fill="currentColor" size={16} />
              Continuar Aprendizado
            </button>

            <button 
              onClick={() => setActiveTab('manuals')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3.5 rounded-2xl transition-all border border-white/20 backdrop-blur-md flex items-center gap-2 cursor-pointer text-sm"
            >
              <BookOpen size={16} />
              Consultar Manuais Oficiais
            </button>
          </div>
        </div>

        {/* Gamification Progress Box */}
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Trophy size={140} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Award className="text-amber-500" size={16} />
                Nível do Professor
              </span>
              <span className="text-xs font-black px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center gap-1">
                <Zap size={12} fill="currentColor" /> {xp} XP Total
              </span>
            </div>

            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Nível {currentLevelNumber}
              </span>
            </div>
            <p className="text-base font-extrabold text-neutral-800 dark:text-neutral-200">
              {currentLevelTitle}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Próxima meta de carreira pedagógica
            </p>
          </div>

          <div className="mt-6 relative z-10 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-neutral-500 dark:text-neutral-400">{xpInCurrentLevel} / 400 XP no nível</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">Faltam {xpNeededForNext} XP</span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700 relative" 
                style={{ width: `${levelProgressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={() => setActiveTab('certificates')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck size={14} /> {certificates.length} Certificado(s) obtido(s)
              </button>
              <span className="text-neutral-400">Escola Nota 10</span>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs and Search Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/60 dark:border-neutral-800 pb-4">
        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
          >
            Todos os Cursos ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'in_progress' ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
          >
            Em Andamento
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'completed' ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
          >
            Concluídos
          </button>
          <button
            onClick={() => setActiveTab('manuals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'manuals' ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
          >
            <FileText size={14} /> Manuais & BNCC ({manuals.length})
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'certificates' ? 'bg-indigo-600 text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
          >
            <Award size={14} /> Certificados ({certificates.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por assunto, BNCC ou curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </section>

      {/* Main Content Area */}
      {activeTab === 'certificates' ? (
        /* Certificates View */
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Award className="text-amber-500" size={24} /> Meus Certificados de Formação
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Certificados oficiais emitidos automaticamente após 100% de conclusão de cada curso.
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-[32px] border border-dashed border-neutral-200 dark:border-neutral-800">
              <Award size={48} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="font-bold text-neutral-700 dark:text-neutral-300 text-base">Nenhum certificado emitido ainda</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-5">
                Complete todas as aulas de um dos cursos de formação para desbloquear seu certificado oficial com horas complementares.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
              >
                Explorar Cursos Disponíveis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map(cert => (
                <div 
                  key={cert.id}
                  className="bg-white dark:bg-neutral-900 rounded-[28px] border border-amber-200/60 dark:border-amber-900/40 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                        <Award size={22} />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        Válido • {cert.workloadHours} Horas
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-neutral-900 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                      {cert.courseTitle}
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Emitido em: <strong className="text-neutral-700 dark:text-neutral-300">{cert.issueDate}</strong>
                    </p>
                    <p className="text-[11px] font-mono text-neutral-400 mt-1">
                      Cód: {cert.validationCode}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                    <button
                      onClick={() => setActiveCertificateModal(cert)}
                      className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} /> Visualizar
                    </button>
                    <button
                      onClick={() => {
                        setActiveCertificateModal(cert);
                        setTimeout(() => window.print(), 300);
                      }}
                      className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors cursor-pointer"
                      title="Imprimir Certificado"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'manuals' ? (
        /* Manuals & Documents View */
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText className="text-rose-500" size={24} /> Biblioteca de Manuais & Diretrizes Oficiais
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Documentos pedagógicos, referências normativas da BNCC e guias operacionais da rede.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredManuals.map(doc => (
              <div 
                key={doc.id}
                className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/50 dark:border-neutral-800/50 p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                          {doc.category}
                        </span>
                        <h4 className="text-base font-black text-neutral-900 dark:text-white leading-tight group-hover:text-rose-600 transition-colors">
                          {doc.title}
                        </h4>
                      </div>
                    </div>
                    {doc.read ? (
                      <span className="shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Check size={12} /> Lido
                      </span>
                    ) : (
                      <span className="shrink-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-black px-2.5 py-1 rounded-full">
                        +30 XP
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    {doc.summary}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {doc.keyTopics.map((topic, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-400">
                    PDF • {doc.pages} Páginas • {doc.fileSize}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveManualReader(doc)}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} /> Ler Manual
                    </button>
                    <button
                      onClick={() => handleDownloadManual(doc)}
                      className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Baixar Arquivo"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Courses Grid (All, In Progress, Completed) */
        <div className="space-y-8 animate-in fade-in">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-400 mr-2 flex items-center gap-1">
              <Filter size={14} /> Filtrar por:
            </span>
            {['all', 'Inclusão', 'Tecnologia', 'Metodologias Ativas', 'BNCC'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${categoryFilter === cat ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
              >
                {cat === 'all' ? 'Todas as Categorias' : cat}
              </button>
            ))}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-[32px] border border-dashed border-neutral-200 dark:border-neutral-800">
              <BookOpen size={48} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="font-bold text-neutral-700 dark:text-neutral-300 text-base">Nenhum curso encontrado</h4>
              <p className="text-xs text-neutral-400 mt-1">Tente ajustar seus termos de busca ou filtros de categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => {
                const progress = calculateCourseProgress(course);
                const isCompleted = progress === 100;

                return (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
                    onClick={() => handleOpenCourse(course)}
                  >
                    {/* Cover Image & Play Button overlay */}
                    <div className="h-44 bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden shrink-0">
                      <img 
                        src={course.coverImage} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                      
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-neutral-900/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                          {course.category}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                          <Zap size={10} fill="currentColor" /> +{course.xpReward} XP
                        </span>
                      </div>

                      {/* Play hover trigger */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play fill="currentColor" size={24} className="text-white ml-1" />
                        </div>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {course.workloadHours}h de formação
                        </span>
                        {isCompleted ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-black">
                            <CheckCircle2 size={13} /> Concluído
                          </span>
                        ) : (
                          <span>{progress}% concluído</span>
                        )}
                      </div>
                    </div>

                    {/* Course Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-lg text-neutral-900 dark:text-white mb-1.5 group-hover:text-indigo-600 transition-colors leading-tight">
                          {course.title}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-4">
                          {course.subtitle}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-neutral-400">
                            {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} aulas
                          </span>
                          <span className={`font-black ${isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {isCompleted ? 'Certificado Disponível' : 'Acessar Aulas →'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: INTERACTIVE COURSE PLAYER & LESSON ROOM          */}
      {/* ======================================================== */}
      {activeCoursePlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-6xl max-h-[95vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800">
            
            {/* Player Header */}
            <div className="p-4 md:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveCoursePlayer(null)}
                  className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {activeCoursePlayer.category} • {activeCoursePlayer.workloadHours}h
                  </span>
                  <h3 className="text-base md:text-lg font-black text-neutral-900 dark:text-white leading-tight">
                    {activeCoursePlayer.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:flex text-xs font-black px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg items-center gap-1">
                  <Zap size={14} /> +{activeCoursePlayer.xpReward} XP ao Concluir
                </span>
                <button
                  onClick={() => setActiveCoursePlayer(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Player Main Layout (Video on Left, Syllabus/Notes on Right) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3">
              
              {/* Left Column: Simulated Video Screen & Lesson Controls */}
              <div className="lg:col-span-2 p-4 md:p-8 flex flex-col space-y-6 border-r border-neutral-200 dark:border-neutral-800">
                
                {/* Video Container */}
                <div className="w-full aspect-video bg-neutral-950 rounded-2xl md:rounded-3xl overflow-hidden relative group shadow-2xl flex flex-col justify-between p-4">
                  
                  {/* Background visual banner if not playing */}
                  <img 
                    src={activeCoursePlayer.coverImage} 
                    alt="Aula" 
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isPlayingVideo ? 'opacity-30' : 'opacity-60'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                  {/* Top video bar */}
                  <div className="relative z-10 flex items-center justify-between text-white">
                    <span className="text-xs font-black bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg">
                      {selectedLesson?.title || 'Selecione uma aula'}
                    </span>
                    <span className="text-xs font-mono text-neutral-300">
                      HD 1080p
                    </span>
                  </div>

                  {/* Center Play/Pause button */}
                  <div className="relative z-10 self-center">
                    <button
                      onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center backdrop-blur-md shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {isPlayingVideo ? (
                        <Pause size={28} />
                      ) : (
                        <Play size={28} className="ml-1" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Bottom Video Controls */}
                  <div className="relative z-10 space-y-2">
                    {/* Scrubber bar */}
                    <div 
                      className="w-full bg-white/20 hover:bg-white/30 rounded-full h-1.5 cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = Math.round((clickX / rect.width) * 100);
                        setVideoPlaybackProgress(Math.max(0, Math.min(100, pct)));
                      }}
                    >
                      <div 
                        className="bg-indigo-500 h-full rounded-full relative transition-all"
                        style={{ width: `${videoPlaybackProgress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-white text-xs font-bold">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                          className="hover:text-indigo-400 transition-colors"
                        >
                          {isPlayingVideo ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <Volume2 size={16} />
                        <span className="font-mono text-[11px]">
                          08:15 / {selectedLesson?.duration || '15:00'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded">1.0x</span>
                        <Maximize2 size={15} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lesson Details & Action */}
                {selectedLesson && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-black text-neutral-900 dark:text-white">
                          {selectedLesson.title}
                        </h4>
                        <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 mt-1">
                          <Clock size={13} /> Carga da aula: {selectedLesson.duration} • Metodologia Ativa
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleLessonComplete(selectedLesson.id)}
                        className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${selectedLesson.completed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                      >
                        {selectedLesson.completed ? (
                          <>
                            <CheckCircle2 size={16} /> Aula Concluída (+50 XP)
                          </>
                        ) : (
                          <>
                            <Check size={16} /> Marcar como Concluída
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                      {selectedLesson.summary}
                    </p>

                    {/* Teacher Notes Area */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                          <BookCheck size={14} className="text-indigo-500" /> Minhas Anotações Pedagógicas desta Aula
                        </label>
                        <button
                          onClick={handleSaveLessonNote}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Salvar Anotação
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Escreva insights, ideias para aplicar em sala de aula com seus alunos ou planos de intervenção..."
                        value={teacherLessonNote}
                        onChange={(e) => setTeacherLessonNote(e.target.value)}
                        className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Syllabus & Lesson Checklist */}
              <div className="p-4 md:p-6 bg-neutral-50/40 dark:bg-neutral-950/40 overflow-y-auto space-y-6">
                <div>
                  <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                    Conteúdo Programático
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Acompanhe seu progresso ao longo dos módulos:
                  </p>
                </div>

                <div className="space-y-6">
                  {activeCoursePlayer.modules.map((mod, modIdx) => (
                    <div key={mod.id} className="space-y-2">
                      <h5 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        {mod.title}
                      </h5>

                      <div className="space-y-2">
                        {mod.lessons.map(les => {
                          const isCurrent = selectedLesson?.id === les.id;

                          return (
                            <div
                              key={les.id}
                              onClick={() => {
                                setSelectedLesson(les);
                                setIsPlayingVideo(true);
                                setVideoPlaybackProgress(les.completed ? 100 : 20);
                                const savedNote = localStorage.getItem(`gestao360_note_${les.id}`) || '';
                                setTeacherLessonNote(savedNote);
                              }}
                              className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between border ${isCurrent ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-white dark:bg-neutral-900 border-neutral-200/50 dark:border-neutral-800/50 hover:border-neutral-300'}`}
                            >
                              <div className="flex items-center gap-3 pr-2 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLessonComplete(les.id);
                                  }}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${les.completed ? 'bg-emerald-500 text-white' : 'border-2 border-neutral-300 dark:border-neutral-700 hover:border-indigo-500'}`}
                                >
                                  {les.completed && <Check size={14} />}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-bold leading-tight truncate ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                    {les.title}
                                  </p>
                                  <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                                    <Clock size={11} /> {les.duration}
                                  </span>
                                </div>
                              </div>

                              {isCurrent && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0"></span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INTERACTIVE DOCUMENT & MANUAL READER            */}
      {/* ======================================================== */}
      {activeManualReader && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl max-h-[92vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800">
            
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                    {activeManualReader.category} • {activeManualReader.fileSize}
                  </span>
                  <h3 className="text-base md:text-lg font-black text-neutral-900 dark:text-white leading-tight">
                    {activeManualReader.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadManual(activeManualReader)}
                  className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => setActiveManualReader(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Document Content Body */}
            <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-8">
              
              {/* Summary Callout */}
              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} /> Resumo Executivo
                </h4>
                <p className="text-xs md:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                  {activeManualReader.summary}
                </p>
              </div>

              {/* Topics Pills */}
              <div>
                <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Eixos Temáticos Abordados
                </h5>
                <div className="flex flex-wrap gap-2">
                  {activeManualReader.keyTopics.map((topic, i) => (
                    <span key={i} className="text-xs font-bold px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-6 pt-2">
                {activeManualReader.contentSections.map((sec, idx) => (
                  <div key={idx} className="space-y-2 p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800/60">
                    <h5 className="text-base font-black text-neutral-900 dark:text-white">
                      {sec.title}
                    </h5>
                    <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Footer */}
            <div className="p-4 md:p-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
              <span className="text-xs font-bold text-neutral-400">
                Página 1 de {activeManualReader.pages}
              </span>

              <button
                onClick={() => handleMarkManualRead(activeManualReader.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeManualReader.read ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-md'}`}
              >
                {activeManualReader.read ? (
                  <>
                    <CheckCircle2 size={16} /> Leitura Confirmada (+30 XP)
                  </>
                ) : (
                  <>
                    <Check size={16} /> Marcar como Lido e Ganhar +30 XP
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: OFFICIAL CERTIFICATE DISPLAY                    */}
      {/* ======================================================== */}
      {activeCertificateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white text-neutral-900 w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl border-8 border-indigo-100 p-8 md:p-12 relative flex flex-col justify-between">
            
            {/* Close Button (Hidden on Print) */}
            <button
              onClick={() => setActiveCertificateModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 rounded-full transition-colors print:hidden cursor-pointer"
            >
              <X size={24} />
            </button>

            {/* Certificate Header */}
            <div className="text-center space-y-3 pb-8 border-b-2 border-indigo-50">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <Award size={36} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
                Secretaria Municipal de Educação • Gestão 360
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-neutral-900 tracking-tight">
                CERTIFICADO DE FORMAÇÃO CONTINUADA
              </h2>
            </div>

            {/* Certificate Body */}
            <div className="py-10 text-center space-y-6">
              <p className="text-sm font-medium text-neutral-600 leading-relaxed max-w-xl mx-auto">
                Certificamos que o(a) docente participou com êxito e concluiu integralmente as atividades do programa de desenvolvimento pedagógico no curso:
              </p>
              
              <h3 className="text-2xl md:text-3xl font-black text-indigo-700 tracking-tight">
                {activeCertificateModal.courseTitle}
              </h3>

              <div className="flex justify-center gap-6 text-xs font-bold text-neutral-500 pt-2">
                <span>Carga Horária: <strong>{activeCertificateModal.workloadHours} Horas</strong></span>
                <span>•</span>
                <span>Data de Conclusão: <strong>{activeCertificateModal.issueDate}</strong></span>
              </div>
            </div>

            {/* Certificate Footer / Signatures */}
            <div className="pt-8 border-t-2 border-indigo-50 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <p className="text-[11px] font-mono text-neutral-400">
                  Código de Autenticidade Digital:
                </p>
                <p className="text-xs font-mono font-black text-neutral-700">
                  {activeCertificateModal.validationCode}
                </p>
              </div>

              <div className="text-center sm:text-right">
                <div className="w-48 border-b border-neutral-400 mb-1"></div>
                <p className="text-xs font-bold text-neutral-800">Coordenação Pedagógica</p>
                <p className="text-[10px] text-neutral-400">Portal de Educação Gestão 360</p>
              </div>
            </div>

            {/* Print Action Trigger (Hidden on Print) */}
            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> Imprimir / Salvar em PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
