import { NewsCategory, ProjectStatus } from '../../types';
import { 
  HardHat, 
  HeartPulse, 
  GraduationCap, 
  Target, 
  Sparkles, 
  TreePine, 
  HeartHandshake, 
  Trophy, 
  Tractor, 
  AlertCircle 
} from 'lucide-react';

export interface CategoryMeta {
  label: NewsCategory;
  icon: any;
  color: string;
  badgeBg: string;
  badgeText: string;
  gradient: string;
  description: string;
}

export const CATEGORY_META_LIST: Record<NewsCategory, CategoryMeta> = {
  'Obras & Infraestrutura': {
    label: 'Obras & Infraestrutura',
    icon: HardHat,
    color: 'text-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-400',
    gradient: 'from-amber-500/20 to-orange-500/5',
    description: 'Pavimentação, reformas, saneamento e melhorias estruturais no município.'
  },
  'Saúde': {
    label: 'Saúde',
    icon: HeartPulse,
    color: 'text-rose-500',
    badgeBg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-400',
    gradient: 'from-rose-500/20 to-red-500/5',
    description: 'Campanhas de vacinação, mutirões, postos de atendimento e programas SUS.'
  },
  'Educação': {
    label: 'Educação',
    icon: GraduationCap,
    color: 'text-sky-500',
    badgeBg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',
    badgeText: 'text-sky-700 dark:text-sky-400',
    gradient: 'from-sky-500/20 to-blue-500/5',
    description: 'Rede municipal de ensino, CMEIs, merenda escolar e tecnologia em sala.'
  },
  'Projetos & Planos': {
    label: 'Projetos & Planos',
    icon: Target,
    color: 'text-indigo-500',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-400',
    gradient: 'from-indigo-500/20 to-purple-500/5',
    description: 'Planejamento estratégico, parcerias, inovação e metas da gestão.'
  },
  'Cultura & Eventos': {
    label: 'Cultura & Eventos',
    icon: Sparkles,
    color: 'text-violet-500',
    badgeBg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
    badgeText: 'text-violet-700 dark:text-violet-400',
    gradient: 'from-violet-500/20 to-pink-500/5',
    description: 'Festividades tradicionais, oficinas culturais, exposições e feiras.'
  },
  'Meio Ambiente': {
    label: 'Meio Ambiente',
    icon: TreePine,
    color: 'text-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    gradient: 'from-emerald-500/20 to-teal-500/5',
    description: 'Sustentabilidade, preservação de mananciais, arborização e reciclagem.'
  },
  'Assistência Social': {
    label: 'Assistência Social',
    icon: HeartHandshake,
    color: 'text-teal-500',
    badgeBg: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-400',
    gradient: 'from-teal-500/20 to-cyan-500/5',
    description: 'CRAS, apoio a famílias em vulnerabilidade e programas comunitários.'
  },
  'Esporte & Lazer': {
    label: 'Esporte & Lazer',
    icon: Trophy,
    color: 'text-orange-500',
    badgeBg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
    badgeText: 'text-orange-700 dark:text-orange-400',
    gradient: 'from-orange-500/20 to-amber-500/5',
    description: 'Campeonatos municipais, escolinhas comunitárias e praças esportivas.'
  },
  'Agricultura & Rural': {
    label: 'Agricultura & Rural',
    icon: Tractor,
    color: 'text-lime-500',
    badgeBg: 'bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/20',
    badgeText: 'text-lime-700 dark:text-lime-400',
    gradient: 'from-lime-500/20 to-emerald-500/5',
    description: 'Apoio ao produtor rural, estradas vicinais, pontes e agricultura familiar.'
  },
  'Nota Oficial': {
    label: 'Nota Oficial',
    icon: AlertCircle,
    color: 'text-neutral-500',
    badgeBg: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
    badgeText: 'text-neutral-800 dark:text-neutral-200',
    gradient: 'from-neutral-500/20 to-slate-500/5',
    description: 'Comunicados urgentes, decretos em destaque e esclarecimentos públicos.'
  }
};

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string }> = {
  'Planejamento': {
    label: 'Em Planejamento',
    bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500'
  },
  'Em Execução': {
    label: 'Em Andamento / Execução',
    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 animate-pulse'
  },
  'Concluído': {
    label: 'Obra / Projeto Entregue',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500'
  },
  'Contínuo': {
    label: 'Programa Permanente',
    bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500'
  }
};

export const POPULAR_BADGES = [
  'Obra Entregue',
  'Novo Projeto',
  'Em Andamento',
  'Inscrições Abertas',
  'Nota Oficial',
  'Aviso Importante',
  'Conquista Municipal',
  'Mais Saúde',
  'Educação Nota 10',
  'Transparência'
];
