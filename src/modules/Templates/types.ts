import { AdminUser, Institution } from '../../types';

export type TimbreStyle = 
  | 'classico' 
  | 'gabinete' 
  | 'secretaria' 
  | 'moderno' 
  | 'lateral' 
  | 'imagem_cabecalho' 
  | 'fundo_completo' 
  | 'personalizado'
  | 'nenhum';

export interface TimbreData {
  id: string;
  name: string;
  style: TimbreStyle;
  municipio?: string;
  estado?: string;
  prefeitura?: string;
  secretaria?: string;
  departamento?: string;
  endereco?: string;
  cep?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  site?: string;
  logoUrl?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  backgroundImageUrl?: string;
  backgroundOpacity?: number; // 0 to 1
  firstPageOnlyBackground?: boolean;
  accentColor?: string;
}

export type WatermarkType = 'none' | 'minuta' | 'confidencial' | 'copia' | 'urgente' | 'brasao' | 'custom';

export interface WatermarkConfig {
  type: WatermarkType;
  customText?: string;
  opacity: number; // 0.05 to 0.3
}

export type MarginPreset = 'abnt' | 'normal' | 'narrow' | 'wide';

export interface MarginConfig {
  top: string;
  bottom: string;
  left: string;
  right: string;
  label: string;
}

export interface WebDocument {
  id: string;
  title: string;
  header?: string;
  content: string;
  footer?: string;
  timbreConfig?: TimbreData;
  watermarkConfig?: WatermarkConfig;
  margins?: MarginPreset;
  createdAt: string;
  updatedAt: string;
  status: 'Rascunho' | 'Finalizado';
  templateId?: string;
  authorName?: string;
  authorRole?: string;
}

export interface SignatureConfig {
  name: string;
  role: string;
  department?: string;
  documentNumber?: string;
}
