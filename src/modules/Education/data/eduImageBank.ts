// =============================================================================
// BANCO DE IMAGENS PEDAGÓGICAS (IA + VETORES EDUCATIVOS) & MODELOS PRONTOS BNCC
// =============================================================================

export type CourseColorKey = 'emerald' | 'sky' | 'rose' | 'amber' | 'purple' | 'indigo';

export interface CourseColorTheme {
  label: string;
  dot: string;
  iconBg: string;
  iconText: string;
  badgeBg: string;
  badgeText: string;
  barBg: string;
  progressText: string;
  cardHover: string;
  buttonHover: string;
  gradient: string;
}

export const COURSE_COLOR_STYLES: Record<CourseColorKey, CourseColorTheme> = {
  emerald: {
    label: 'Verde Esmeralda',
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    barBg: 'bg-emerald-500',
    progressText: 'text-emerald-600 dark:text-emerald-400',
    cardHover: 'hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-emerald-500/10',
    buttonHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-500/30',
    gradient: 'from-emerald-500 to-teal-600',
  },
  sky: {
    label: 'Azul Céu',
    dot: 'bg-sky-500',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20',
    iconText: 'text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
    badgeText: 'text-sky-700 dark:text-sky-300',
    barBg: 'bg-sky-500',
    progressText: 'text-sky-600 dark:text-sky-400',
    cardHover: 'hover:border-sky-300 dark:hover:border-sky-500/40 hover:shadow-sky-500/10',
    buttonHover: 'hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-500/30',
    gradient: 'from-sky-500 to-indigo-600',
  },
  rose: {
    label: 'Rosa Coral',
    dot: 'bg-rose-500',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    iconText: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    badgeText: 'text-rose-700 dark:text-rose-300',
    barBg: 'bg-rose-500',
    progressText: 'text-rose-600 dark:text-rose-400',
    cardHover: 'hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-rose-500/10',
    buttonHover: 'hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/30',
    gradient: 'from-rose-500 to-pink-600',
  },
  amber: {
    label: 'Âmbar Solar',
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconText: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    badgeText: 'text-amber-700 dark:text-amber-300',
    barBg: 'bg-amber-500',
    progressText: 'text-amber-600 dark:text-amber-400',
    cardHover: 'hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-amber-500/10',
    buttonHover: 'hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-500/30',
    gradient: 'from-amber-500 to-orange-600',
  },
  purple: {
    label: 'Roxo Criativo',
    dot: 'bg-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20',
    iconText: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
    badgeText: 'text-purple-700 dark:text-purple-300',
    barBg: 'bg-purple-500',
    progressText: 'text-purple-600 dark:text-purple-400',
    cardHover: 'hover:border-purple-300 dark:hover:border-purple-500/40 hover:shadow-purple-500/10',
    buttonHover: 'hover:bg-purple-50 dark:hover:bg-purple-500/15 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500/30',
    gradient: 'from-purple-500 to-fuchsia-600',
  },
  indigo: {
    label: 'Índigo Real',
    dot: 'bg-indigo-500',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    barBg: 'bg-indigo-500',
    progressText: 'text-indigo-600 dark:text-indigo-400',
    cardHover: 'hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-indigo-500/10',
    buttonHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30',
    gradient: 'from-indigo-500 to-violet-600',
  },
};

export function getCourseTheme(color?: string): CourseColorTheme {
  if (color && color in COURSE_COLOR_STYLES) {
    return COURSE_COLOR_STYLES[color as CourseColorKey];
  }
  return COURSE_COLOR_STYLES.emerald;
}

export interface EduImageAsset {
  id: string;
  title: string;
  subject: 'Matemática' | 'Português' | 'Ciências' | 'História' | 'Geografia' | 'Artes' | 'Geral';
  usage: 'capa' | 'atividade' | 'ambos';
  url: string;
  tags: string[];
  aiGenerated?: boolean;
}

// Helper para criar SVGs pedagógicos vetoriais ultra-leves e nítidos
const svgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const EDU_DEFAULT_IMAGES: EduImageAsset[] = [
  // ================= CAPAS GERADAS POR IA =================
  {
    id: 'ai-cover-matematica',
    title: 'Capa Matemática — Formas, Ábaco e Estrelas',
    subject: 'Matemática',
    usage: 'ambos',
    url: '/edu-bank/cover-matematica.jpg',
    tags: ['matemática', 'capa', 'geometria', 'números', 'cálculo', 'ábaco'],
    aiGenerated: true,
  },
  {
    id: 'ai-cover-portugues',
    title: 'Capa Língua Portuguesa — Livro Mágico & Leitura',
    subject: 'Português',
    usage: 'ambos',
    url: '/edu-bank/cover-portugues.jpg',
    tags: ['português', 'leitura', 'literatura', 'redação', 'alfabetização', 'livro'],
    aiGenerated: true,
  },
  {
    id: 'ai-cover-ciencias',
    title: 'Capa Ciências — Laboratório, Natureza & Descobertas',
    subject: 'Ciências',
    usage: 'ambos',
    url: '/edu-bank/cover-ciencias.jpg',
    tags: ['ciências', 'laboratório', 'microscópio', 'biologia', 'natureza', 'plantas'],
    aiGenerated: true,
  },
  {
    id: 'ai-cover-historia',
    title: 'Capa História — Viagem no Tempo & Civilizações',
    subject: 'História',
    usage: 'ambos',
    url: '/edu-bank/cover-historia.jpg',
    tags: ['história', 'tempo', 'pirâmides', 'egito', 'castelo', 'memória'],
    aiGenerated: true,
  },
  {
    id: 'ai-cover-geografia',
    title: 'Capa Geografia — Planeta Terra, Relevo & Exploração',
    subject: 'Geografia',
    usage: 'ambos',
    url: '/edu-bank/cover-geografia.jpg',
    tags: ['geografia', 'globo', 'terra', 'mapa', 'continentes', 'clima'],
    aiGenerated: true,
  },
  {
    id: 'ai-cover-artes',
    title: 'Capa Artes & Criatividade — Pintura, Música e Cores',
    subject: 'Artes',
    usage: 'ambos',
    url: '/edu-bank/cover-artes.jpg',
    tags: ['artes', 'pintura', 'música', 'cores', 'criatividade', 'cultura'],
    aiGenerated: true,
  },

  // ================= ILUSTRAÇÕES DE ATIVIDADES GERADAS POR IA =================
  {
    id: 'ai-ativ-fracoes-pizza',
    title: 'Pizza em 8 Fatias (Frações e Divisão)',
    subject: 'Matemática',
    usage: 'atividade',
    url: '/edu-bank/ativ-fracoes-pizza.jpg',
    tags: ['fração', 'pizza', 'divisão', 'fatias', 'matemática', 'metade', 'quarto'],
    aiGenerated: true,
  },
  {
    id: 'ai-ativ-contagem-frutas',
    title: 'Cestas de Frutas Coloridas (Contagem e Soma)',
    subject: 'Matemática',
    usage: 'atividade',
    url: '/edu-bank/ativ-contagem-frutas.jpg',
    tags: ['contagem', 'frutas', 'maçãs', 'soma', 'subtração', 'alfabetização', 'alimentação'],
    aiGenerated: true,
  },
  {
    id: 'ai-ativ-sistema-solar',
    title: 'Sistema Solar e Planetas em Órbita',
    subject: 'Ciências',
    usage: 'ambos',
    url: '/edu-bank/ativ-sistema-solar.jpg',
    tags: ['sistema solar', 'planetas', 'sol', 'terra', 'astronomia', 'espaço'],
    aiGenerated: true,
  },
  {
    id: 'ai-ativ-fotossintese',
    title: 'Crescimento das Plantas, Sol, Água e Raízes',
    subject: 'Ciências',
    usage: 'atividade',
    url: '/edu-bank/ativ-fotossintese.jpg',
    tags: ['planta', 'fotossíntese', 'água', 'sol', 'raiz', 'ecologia', 'meio ambiente'],
    aiGenerated: true,
  },
  {
    id: 'ai-ativ-animais-biomas',
    title: 'Fauna Brasileira & Biomas (Tucano, Onça e Capivara)',
    subject: 'Geografia',
    usage: 'ambos',
    url: '/edu-bank/ativ-animais-biomas.jpg',
    tags: ['animais', 'fauna', 'brasil', 'amazônia', 'biomas', 'natureza', 'ciências'],
    aiGenerated: true,
  },
  {
    id: 'ai-ativ-desafio-trofeu',
    title: 'Troféu Dourado — Missão Especial & Simulado',
    subject: 'Geral',
    usage: 'ambos',
    url: '/edu-bank/ativ-desafio-trofeu.jpg',
    tags: ['troféu', 'desafio', 'simulado', 'prova', 'revisão', 'olimpíada', 'premiação'],
    aiGenerated: true,
  },

  // ================= DIAGRAMAS & ILUSTRAÇÕES DIDÁTICAS VETORIAIS =================
  {
    id: 'vec-formas-geometricas',
    title: 'Quadro de Formas Geométricas Planas',
    subject: 'Matemática',
    usage: 'atividade',
    tags: ['formas', 'círculo', 'quadrado', 'triângulo', 'retângulo', 'geometria'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#eff6ff"/>
            <stop offset="100%" stop-color="#e0e7ff"/>
          </linearGradient>
        </defs>
        <rect width="600" height="340" rx="28" fill="url(#bg)"/>
        <circle cx="115" cy="170" r="58" fill="#38bdf8" stroke="#0284c7" stroke-width="6"/>
        <rect x="205" y="112" width="116" height="116" rx="14" fill="#fbbf24" stroke="#d97706" stroke-width="6"/>
        <polygon points="415,108 480,228 350,228" fill="#34d399" stroke="#059669" stroke-width="6" stroke-linejoin="round"/>
        <polygon points="535,115 575,155 560,225 510,225 495,155" fill="#fb7185" stroke="#e11d48" stroke-width="6" stroke-linejoin="round"/>
      </svg>
    `),
  },
  {
    id: 'vec-relogio-horas',
    title: 'Relógio Analógico Didático (Leitura de Horas)',
    subject: 'Matemática',
    usage: 'atividade',
    tags: ['relógio', 'horas', 'tempo', 'minutos', 'grandezas', 'medidas'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#fef3c7"/>
        <circle cx="300" cy="170" r="128" fill="#ffffff" stroke="#f59e0b" stroke-width="14"/>
        <circle cx="300" cy="64" r="7" fill="#d97706"/>
        <circle cx="406" cy="170" r="7" fill="#d97706"/>
        <circle cx="300" cy="276" r="7" fill="#d97706"/>
        <circle cx="194" cy="170" r="7" fill="#d97706"/>
        <line x1="300" y1="170" x2="300" y2="95" stroke="#1e293b" stroke-width="10" stroke-linecap="round"/>
        <line x1="300" y1="170" x2="368" y2="170" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
        <circle cx="300" cy="170" r="12" fill="#f59e0b"/>
      </svg>
    `),
  },
  {
    id: 'vec-grafico-barras',
    title: 'Gráfico de Colunas Colorido (Tratamento da Informação)',
    subject: 'Matemática',
    usage: 'atividade',
    tags: ['gráfico', 'estatística', 'tabela', 'dados', 'colunas', 'saeb'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#f0fdf4"/>
        <line x1="90" y1="60" x2="90" y2="280" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>
        <line x1="90" y1="280" x2="520" y2="280" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>
        <rect x="135" y="170" width="60" height="107" rx="10" fill="#38bdf8"/>
        <rect x="235" y="95" width="60" height="182" rx="10" fill="#10b981"/>
        <rect x="335" y="135" width="60" height="142" rx="10" fill="#f59e0b"/>
        <rect x="435" y="75" width="60" height="202" rx="10" fill="#8b5cf6"/>
      </svg>
    `),
  },
  {
    id: 'vec-rosa-dos-ventos',
    title: 'Rosa dos Ventos & Orientação Espacial',
    subject: 'Geografia',
    usage: 'atividade',
    tags: ['rosa dos ventos', 'norte', 'sul', 'leste', 'oeste', 'bússola', 'orientação'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#f5f3ff"/>
        <circle cx="300" cy="170" r="115" fill="#ede9fe" stroke="#8b5cf6" stroke-width="4" stroke-dasharray="8 8"/>
        <polygon points="300,38 326,144 300,170 274,144" fill="#ef4444"/>
        <polygon points="300,302 326,196 300,170 274,196" fill="#6366f1"/>
        <polygon points="432,170 326,196 300,170 326,144" fill="#f59e0b"/>
        <polygon points="168,170 274,196 300,170 274,144" fill="#10b981"/>
        <circle cx="300" cy="170" r="14" fill="#ffffff" stroke="#4f46e5" stroke-width="5"/>
      </svg>
    `),
  },
  {
    id: 'vec-coleta-seletiva',
    title: 'Reciclagem e Coleta Seletiva (Meio Ambiente)',
    subject: 'Ciências',
    usage: 'atividade',
    tags: ['reciclagem', 'lixo', 'meio ambiente', 'sustentabilidade', 'coleta seletiva', 'ecologia'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#ecfdf5"/>
        <rect x="85" y="110" width="85" height="150" rx="14" fill="#3b82f6"/>
        <rect x="78" y="92" width="99" height="22" rx="8" fill="#1d4ed8"/>
        <rect x="200" y="110" width="85" height="150" rx="14" fill="#ef4444"/>
        <rect x="193" y="92" width="99" height="22" rx="8" fill="#b91c1c"/>
        <rect x="315" y="110" width="85" height="150" rx="14" fill="#10b981"/>
        <rect x="308" y="92" width="99" height="22" rx="8" fill="#047857"/>
        <rect x="430" y="110" width="85" height="150" rx="14" fill="#f59e0b"/>
        <rect x="423" y="92" width="99" height="22" rx="8" fill="#b45309"/>
      </svg>
    `),
  },
  {
    id: 'vec-baloes-dialogo',
    title: 'Balões de Diálogo & Tirinha (Gêneros Textuais)',
    subject: 'Português',
    usage: 'atividade',
    tags: ['tirinha', 'diálogo', 'quadrinhos', 'pontuação', 'fala', 'interpretação'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#f0fdfa"/>
        <rect x="70" y="65" width="220" height="115" rx="28" fill="#ffffff" stroke="#14b8a6" stroke-width="6"/>
        <polygon points="130,180 165,180 120,225" fill="#ffffff" stroke="#14b8a6" stroke-width="6" stroke-linejoin="round"/>
        <line x1="105" y1="105" x2="250" y2="105" stroke="#99f6e4" stroke-width="10" stroke-linecap="round"/>
        <line x1="105" y1="138" x2="215" y2="138" stroke="#5eead4" stroke-width="10" stroke-linecap="round"/>
        <rect x="315" y="125" width="215" height="115" rx="28" fill="#fef3c7" stroke="#f59e0b" stroke-width="6"/>
        <polygon points="440,240 475,240 490,282" fill="#fef3c7" stroke="#f59e0b" stroke-width="6" stroke-linejoin="round"/>
        <line x1="350" y1="165" x2="495" y2="165" stroke="#fcd34d" stroke-width="10" stroke-linecap="round"/>
        <line x1="350" y1="198" x2="455" y2="198" stroke="#fbbf24" stroke-width="10" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: 'vec-semaforo-cidadania',
    title: 'Semáforo e Educação para o Trânsito / Cidadania',
    subject: 'Geografia',
    usage: 'atividade',
    tags: ['trânsito', 'semáforo', 'cidadania', 'cidade', 'regras', 'convivência'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#e0f2fe"/>
        <rect x="245" y="35" width="110" height="240" rx="34" fill="#1e293b" stroke="#0f172a" stroke-width="6"/>
        <rect x="288" y="275" width="24" height="50" fill="#475569"/>
        <circle cx="300" cy="88" r="28" fill="#ef4444"/>
        <circle cx="300" cy="155" r="28" fill="#fbbf24"/>
        <circle cx="300" cy="222" r="28" fill="#22c55e"/>
      </svg>
    `),
  },
  {
    id: 'vec-ciclo-agua',
    title: 'Ciclo da Água (Nuvens, Chuva, Rio e Evaporação)',
    subject: 'Ciências',
    usage: 'atividade',
    tags: ['água', 'chuva', 'ciclo da água', 'evaporação', 'nuvem', 'estados físicos'],
    url: svgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="28" fill="#dbeafe"/>
        <circle cx="110" cy="85" r="42" fill="#facc15"/>
        <ellipse cx="410" cy="90" rx="75" ry="38" fill="#ffffff"/>
        <ellipse cx="365" cy="98" rx="48" ry="28" fill="#ffffff"/>
        <ellipse cx="455" cy="98" rx="48" ry="28" fill="#ffffff"/>
        <line x1="380" y1="145" x2="370" y2="195" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 12"/>
        <line x1="415" y1="145" x2="405" y2="195" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 12"/>
        <line x1="450" y1="145" x2="440" y2="195" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 12"/>
        <path d="M0 265 Q150 235 300 265 T600 255 L600 340 L0 340 Z" fill="#0ea5e9"/>
      </svg>
    `),
  },
];

// Presets automáticos por matéria para economizar cliques do professor
export const SUBJECT_PRESETS: Record<
  string,
  { color: CourseColorKey; icon: string; defaultCover: string }
> = {
  Matemática: {
    color: 'sky',
    icon: 'Calculator',
    defaultCover: '/edu-bank/cover-matematica.jpg',
  },
  Português: {
    color: 'emerald',
    icon: 'BookOpen',
    defaultCover: '/edu-bank/cover-portugues.jpg',
  },
  'Língua Portuguesa': {
    color: 'emerald',
    icon: 'BookOpen',
    defaultCover: '/edu-bank/cover-portugues.jpg',
  },
  Ciências: {
    color: 'emerald',
    icon: 'FlaskConical',
    defaultCover: '/edu-bank/cover-ciencias.jpg',
  },
  História: {
    color: 'amber',
    icon: 'Landmark',
    defaultCover: '/edu-bank/cover-historia.jpg',
  },
  Geografia: {
    color: 'purple',
    icon: 'Globe',
    defaultCover: '/edu-bank/cover-geografia.jpg',
  },
  Artes: {
    color: 'rose',
    icon: 'Palette',
    defaultCover: '/edu-bank/cover-artes.jpg',
  },
};

export interface ReadyActivityQuestion {
  question: string;
  contextText?: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface ReadyTemplate {
  id: string;
  kind: 'quick-activity' | 'full-trail';
  title: string;
  subject: string;
  bnccCode: string;
  gradeHint: string;
  description: string;
  color: CourseColorKey;
  icon: string;
  coverUrl: string;
  xp: number;
  coins: number;
  duration: string;
  questions: ReadyActivityQuestion[];
  readingLesson?: {
    title: string;
    contentBody: string;
    imageUrl: string;
  };
}

export const EDU_READY_TEMPLATES: ReadyTemplate[] = [
  {
    id: 'tpl-fracoes-pizza',
    kind: 'quick-activity',
    title: 'Desafio Ilustrado: Frações no Dia a Dia',
    subject: 'Matemática',
    bnccCode: 'EF04MA09',
    gradeHint: '4º e 5º Ano',
    description: 'Atividade visual de frações equivalentes e partes do inteiro usando ilustrações do cotidiano.',
    color: 'sky',
    icon: 'Calculator',
    coverUrl: '/edu-bank/ativ-fracoes-pizza.jpg',
    xp: 120,
    coins: 40,
    duration: '10 min',
    questions: [
      {
        question: 'Observe a pizza dividida em 8 fatias iguais. Se 2 fatias foram separadas, qual fração representa a parte separada?',
        imageUrl: '/edu-bank/ativ-fracoes-pizza.jpg',
        options: ['2/8 (ou 1/4 da pizza)', '1/2 da pizza', '6/8 da pizza', '2/4 da pizza'],
        correctAnswer: 0,
        explanation: 'Foram separadas 2 fatias de um total de 8 fatias iguais: 2/8, que simplificando por 2 equivale a 1/4.',
      },
      {
        question: 'Quantas fatias ainda restaram na tábua dessa mesma pizza de 8 pedaços?',
        imageUrl: '/edu-bank/ativ-fracoes-pizza.jpg',
        options: ['4/8 da pizza', '6/8 (ou 3/4 da pizza)', '5/8 da pizza', '7/8 da pizza'],
        correctAnswer: 1,
        explanation: 'De 8 fatias, tirando 2 restam 6 fatias: 6/8 ou 3/4 da pizza.',
      },
      {
        question: 'Verdadeiro ou Falso: Comer 4 fatias de uma pizza de 8 pedaços é o mesmo que comer metade (1/2) da pizza.',
        options: ['Verdadeiro', 'Falso'],
        correctAnswer: 0,
        explanation: '4 é exatamente a metade de 8, portanto 4/8 equivale a 1/2.',
      },
    ],
  },
  {
    id: 'tpl-fotossintese-plantas',
    kind: 'quick-activity',
    title: 'Como as Plantas se Alimentam (Fotossíntese)',
    subject: 'Ciências',
    bnccCode: 'EF04CI04',
    gradeHint: '3º ao 5º Ano',
    description: 'Quiz ilustrado sobre o papel da luz solar, da água e das raízes na vida das plantas.',
    color: 'emerald',
    icon: 'FlaskConical',
    coverUrl: '/edu-bank/ativ-fotossintese.jpg',
    xp: 100,
    coins: 35,
    duration: '10 min',
    questions: [
      {
        question: 'Observando a ilustração, quais elementos a planta precisa para realizar a fotossíntese e crescer saudável?',
        imageUrl: '/edu-bank/ativ-fotossintese.jpg',
        options: [
          'Luz do Sol, água e gás carbônico do ar',
          'Apenas sombra e pedras secas',
          'Somente vento forte durante a noite',
          'Água salgada sem luz solar',
        ],
        correctAnswer: 0,
        explanation: 'Na fotossíntese, a planta utiliza luz solar, água absorvida pelas raízes e gás carbônico para produzir seu alimento.',
      },
      {
        question: 'Qual parte da planta fica dentro do solo e é responsável por absorver água e sais minerais?',
        imageUrl: '/edu-bank/ativ-fotossintese.jpg',
        options: ['As pétalas', 'A raiz', 'Os frutos', 'As sementes secas'],
        correctAnswer: 1,
        explanation: 'As raízes fixam a planta no solo e absorvem a água e os nutrientes.',
      },
    ],
  },
  {
    id: 'tpl-trilha-sistema-solar',
    kind: 'full-trail',
    title: 'Viagem pelo Sistema Solar',
    subject: 'Ciências',
    bnccCode: 'EF05CI11',
    gradeHint: '4º e 5º Ano',
    description: 'Trilha completa com leitura ilustrada + desafio sobre o Sol, a Terra e os planetas vizinhos.',
    color: 'indigo',
    icon: 'Globe',
    coverUrl: '/edu-bank/ativ-sistema-solar.jpg',
    xp: 150,
    coins: 50,
    duration: '15 min',
    readingLesson: {
      title: 'O Sol e a Vizinhança da Terra',
      imageUrl: '/edu-bank/ativ-sistema-solar.jpg',
      contentBody:
        'O Sistema Solar é formado por uma estrela central — o Sol — e por todos os astros que giram ao seu redor, como os oito planetas, luas, asteroides e cometas.\n\nA Terra é o terceiro planeta a partir do Sol e reúne condições essenciais para a vida: água em estado líquido, atmosfera protetora e temperatura equilibrada graças à luz e ao calor solar.',
    },
    questions: [
      {
        question: 'Qual astro fica no centro do Sistema Solar fornecendo luz e calor para a Terra?',
        imageUrl: '/edu-bank/ativ-sistema-solar.jpg',
        options: ['A Lua Cheia', 'O Sol', 'Saturno', 'Marte'],
        correctAnswer: 1,
        explanation: 'O Sol é a estrela central do nosso Sistema Solar e fonte de luz e energia térmica.',
      },
      {
        question: 'Qual planeta é famoso pelos seus grandes e brilhantes anéis ao seu redor?',
        imageUrl: '/edu-bank/ativ-sistema-solar.jpg',
        options: ['Mercúrio', 'Vênus', 'Saturno', 'Marte'],
        correctAnswer: 2,
        explanation: 'Saturno possui o sistema de anéis mais visível e marcante do Sistema Solar.',
      },
    ],
  },
  {
    id: 'tpl-trilha-interpretacao',
    kind: 'full-trail',
    title: 'Oficina de Leitura e Interpretação de Textos',
    subject: 'Português',
    bnccCode: 'EF35LP03',
    gradeHint: '2º ao 5º Ano',
    description: 'Trilha pronta de Língua Portuguesa com leitura guiada e identificação de ideia central e diálogos.',
    color: 'emerald',
    icon: 'BookOpen',
    coverUrl: '/edu-bank/cover-portugues.jpg',
    xp: 140,
    coins: 45,
    duration: '15 min',
    readingLesson: {
      title: 'A Cigarra, a Formiga e a Cooperação',
      imageUrl: '/edu-bank/cover-portugues.jpg',
      contentBody:
        'Durante toda a primavera, a formiga organizava folhas e grãos no formigueiro, enquanto a cigarra compunha canções que alegravam a floresta inteira.\n\nQuando o inverno chegou, as formigas convidaram a cigarra para aquecer o formigueiro com sua música em troca de abrigo e alimento. Assim, todos descobriram que tanto o trabalho organizado quanto a arte têm valor na comunidade.',
    },
    questions: [
      {
        question: 'Qual é o ensinamento principal dessa versão da história?',
        contextText: '"Assim, todos descobriram que tanto o trabalho organizado quanto a arte têm valor na comunidade."',
        options: [
          'Que ninguém deve ouvir música na floresta',
          'A importância da cooperação e da valorização dos diferentes talentos',
          'Que o inverno dura o ano inteiro',
          'Que as formigas não gostam de trabalhar em grupo',
        ],
        correctAnswer: 1,
        explanation: 'O desfecho destaca a cooperação mútua entre o trabalho das formigas e a música da cigarra.',
      },
      {
        question: 'Nas histórias em quadrinhos e tirinhas, para que servem os balões apontados para os personagens?',
        imageUrl: EDU_DEFAULT_IMAGES.find(i => i.id === 'vec-baloes-dialogo')?.url,
        options: [
          'Para indicar a fala ou o pensamento dos personagens',
          'Apenas para enfeitar o fundo do desenho',
          'Para apagar o cenário da história',
          'Para mostrar somente o título do livro',
        ],
        correctAnswer: 0,
        explanation: 'Os balões representam visualmente as falas, gritos, sussurros ou pensamentos dos personagens.',
      },
    ],
  },
];

