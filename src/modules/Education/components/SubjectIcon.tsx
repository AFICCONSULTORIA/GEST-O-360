import React from 'react';
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Landmark,
  Globe,
  Palette,
  Languages,
  Leaf,
  Trophy,
  Zap,
} from 'lucide-react';

export const SUBJECT_ICON_OPTIONS = [
  { id: 'BookOpen', label: 'Livro / Leitura' },
  { id: 'Calculator', label: 'Cálculo / Matemática' },
  { id: 'FlaskConical', label: 'Ciências / Laboratório' },
  { id: 'Landmark', label: 'História / Patrimônio' },
  { id: 'Globe', label: 'Geografia / Mundo' },
  { id: 'Palette', label: 'Artes / Criatividade' },
  { id: 'Leaf', label: 'Meio Ambiente' },
  { id: 'Languages', label: 'Idiomas' },
  { id: 'Trophy', label: 'Desafio / Simulado' },
  { id: 'Zap', label: 'Missão Rápida' },
] as const;

export const SubjectIcon: React.FC<{
  icon?: string;
  size?: number;
  className?: string;
}> = ({ icon, size = 26, className = '' }) => {
  const cleanIcon = (icon || 'BookOpen').split('||G360||')[0];
  switch (cleanIcon) {
    case 'Calculator':
      return <Calculator size={size} className={className} />;
    case 'FlaskConical':
      return <FlaskConical size={size} className={className} />;
    case 'Landmark':
      return <Landmark size={size} className={className} />;
    case 'Globe':
      return <Globe size={size} className={className} />;
    case 'Palette':
      return <Palette size={size} className={className} />;
    case 'Leaf':
      return <Leaf size={size} className={className} />;
    case 'Languages':
      return <Languages size={size} className={className} />;
    case 'Trophy':
      return <Trophy size={size} className={className} />;
    case 'Zap':
      return <Zap size={size} className={className} />;
    default:
      return <BookOpen size={size} className={className} />;
  }
};

