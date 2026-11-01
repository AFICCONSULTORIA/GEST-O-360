import { LucideIcon } from 'lucide-react';
import { View } from '../../types';

export type SaaSActiveTab = 
  | 'tenants' 
  | 'support' 
  | 'users' 
  | 'health' 
  | 'announcements' 
  | 'saude' 
  | 'import' 
  | 'education' 
  | 'pdf-extractor' 
  | 'proposal';

export interface SaaSNavItem {
  id: SaaSActiveTab;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'sky';
  description?: string;
}

export interface SaaSNavGroup {
  id: string;
  title: string;
  items: SaaSNavItem[];
}

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Municípios' | 'Servidores' | 'Chamados' | 'Módulos' | 'Ações Rápidas';
  icon: LucideIcon;
  action: () => void;
}

