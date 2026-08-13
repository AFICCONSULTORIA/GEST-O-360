import { PublicForm, FormField, FormFieldType, FormResponse } from '../../types';

export interface FormTheme {
  id: string;
  name: string;
  gradient: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
  badgeBg: string;
  badgeText: string;
}

export const FORM_THEMES: Record<string, FormTheme> = {
  blue_ocean: {
    id: 'blue_ocean',
    name: 'Azul Institucional',
    gradient: 'from-blue-600 via-indigo-600 to-sky-700',
    accentColor: '#2563eb',
    bgLight: 'bg-blue-50/50',
    bgDark: 'dark:bg-blue-950/20',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
    badgeText: 'text-blue-700 dark:text-blue-300'
  },
  emerald_health: {
    id: 'emerald_health',
    name: 'Verde Saúde & Meio Ambiente',
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    accentColor: '#059669',
    bgLight: 'bg-emerald-50/50',
    bgDark: 'dark:bg-emerald-950/20',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300'
  },
  amber_citizen: {
    id: 'amber_citizen',
    name: 'Ouro Cidadão & Obras',
    gradient: 'from-amber-500 via-orange-600 to-amber-700',
    accentColor: '#d97706',
    bgLight: 'bg-amber-50/50',
    bgDark: 'dark:bg-amber-950/20',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
    badgeText: 'text-amber-800 dark:text-amber-300'
  },
  purple_modern: {
    id: 'purple_modern',
    name: 'Roxo Inovação & Cultura',
    gradient: 'from-purple-600 via-violet-600 to-indigo-700',
    accentColor: '#7c3aed',
    bgLight: 'bg-purple-50/50',
    bgDark: 'dark:bg-purple-950/20',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/40',
    badgeText: 'text-purple-700 dark:text-purple-300'
  },
  rose_social: {
    id: 'rose_social',
    name: 'Rosa Assistência & Cidadania',
    gradient: 'from-rose-500 via-pink-600 to-rose-700',
    accentColor: '#e11d48',
    bgLight: 'bg-rose-50/50',
    bgDark: 'dark:bg-rose-950/20',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
    badgeText: 'text-rose-700 dark:text-rose-300'
  },
  slate_minimal: {
    id: 'slate_minimal',
    name: 'Grafite Executivo',
    gradient: 'from-neutral-800 via-neutral-900 to-slate-950',
    accentColor: '#171717',
    bgLight: 'bg-neutral-100/60',
    bgDark: 'dark:bg-neutral-900/40',
    badgeBg: 'bg-neutral-200 dark:bg-neutral-800',
    badgeText: 'text-neutral-800 dark:text-neutral-200'
  }
};

export const FIELD_TYPE_CONFIGS: {
  type: FormFieldType;
  label: string;
  description: string;
  iconName: string;
  category: 'Texto' | 'Escolha' | 'Avaliação' | 'Identificação' | 'Especial';
}[] = [
  { type: 'text', label: 'Resposta Curta', description: 'Linha única de texto para nomes ou itens breves', iconName: 'Type', category: 'Texto' },
  { type: 'textarea', label: 'Parágrafo / Sugestão', description: 'Caixa de texto expandida para opiniões e relatos', iconName: 'AlignLeft', category: 'Texto' },
  { type: 'radio', label: 'Múltipla Escolha', description: 'O cidadão escolhe apenas uma única opção', iconName: 'CheckCircle2', category: 'Escolha' },
  { type: 'checkbox', label: 'Caixas de Seleção', description: 'Permite selecionar múltiplas alternativas simultaneamente', iconName: 'CheckSquare', category: 'Escolha' },
  { type: 'select', label: 'Lista Suspensa', description: 'Menu retrátil compacto com várias opções', iconName: 'ListOrdered', category: 'Escolha' },
  { type: 'yes_no', label: 'Sim ou Não Rápido', description: 'Opção binária prática e de toque rápido', iconName: 'ToggleRight', category: 'Escolha' },
  { type: 'rating_stars', label: 'Avaliação por Estrelas (1 a 5)', description: 'Mede a qualidade do atendimento ou serviço', iconName: 'Star', category: 'Avaliação' },
  { type: 'rating_emojis', label: 'Emojis de Satisfação', description: 'Escala visual emotiva (Péssimo a Excelente)', iconName: 'Smile', category: 'Avaliação' },
  { type: 'scale_nps', label: 'Escala Linear NPS (0 a 10)', description: 'Índice de recomendação pública', iconName: 'Sliders', category: 'Avaliação' },
  { type: 'cpf', label: 'CPF com Validação', description: 'Campo com formatação e validação de dígitos', iconName: 'ShieldCheck', category: 'Identificação' },
  { type: 'phone', label: 'WhatsApp / Telefone', description: 'Com máscara (DDD) e link de contato', iconName: 'Phone', category: 'Identificação' },
  { type: 'neighborhood', label: 'Bairro / Comunidade', description: 'Mapeia a distribuição geográfica das respostas', iconName: 'MapPin', category: 'Identificação' },
  { type: 'date', label: 'Data', description: 'Seletor de dia, mês e ano', iconName: 'Calendar', category: 'Especial' },
  { type: 'time', label: 'Horário', description: 'Seletor de hora e minuto', iconName: 'Clock', category: 'Especial' },
  { type: 'file_link', label: 'Anexo / Foto / Comprovante', description: 'Upload ou link para imagem/documento', iconName: 'Upload', category: 'Especial' },
  { type: 'section_header', label: 'Título de Seção / Banner', description: 'Divisor temático com texto explicativo', iconName: 'Heading', category: 'Especial' }
];

export const COMMON_MUNICIPAL_NEIGHBORHOODS = [
  'Centro',
  'Vila Nova',
  'Jardim Imperial',
  'Bela Vista',
  'São Pedro',
  'Santa Terezinha',
  'Distrito Industrial',
  'Zona Rural / Assentamentos',
  'Outro'
];

export const generateProtocol = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `FORMS-${year}-${randomNum}`;
};
