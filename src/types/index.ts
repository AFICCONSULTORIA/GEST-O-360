export type View = 'home' | 'mayor' | 'controls' | 'calendar' | 'norms' | 'risk' | 'pntp' | 'protocol' | 'contracts' | 'education' | 'orders' | 'doc_numbers' | 'reports' | 'certificates' | 'laws' | 'obras' | 'admin_financas' | 'administracao' | 'financas' | 'saude' | 'servicos_publicos' | 'meio_ambiente' | 'tributos' | 'agricultura' | 'assistencia_social' | 'esporte' | 'planejamento' | 'settings' | 'patrimonio' | 'templates' | 'camara' | 'support' | 'communication' | 'forms';

export type LawType = 
  | 'Lei Orgânica' 
  | 'Lei Complementar' 
  | 'Lei Ordinária' 
  | 'Decreto' 
  | 'Portaria' 
  | 'Resolução' 
  | 'Emenda à LOM' 
  | 'Outros';

export type LawStatus = 
  | 'Em Vigor' 
  | 'Revogada' 
  | 'Alterada' 
  | 'Regulamentada' 
  | 'Em Tramitação';

export type LawCategory = 
  | 'Administração Geral' 
  | 'Finanças e Tributos' 
  | 'Saúde' 
  | 'Educação' 
  | 'Meio Ambiente' 
  | 'Viação e Obras' 
  | 'Servidores e RH' 
  | 'Assistência Social' 
  | 'Urbanismo e Patrimônio' 
  | 'Geral';

export interface MunicipalLaw {
  id: string;
  number: string;
  title: string;
  type: LawType;
  category: LawCategory;
  ementa: string;
  full_text?: string;
  publication_date: string;
  status: LawStatus;
  author?: string;
  file_url?: string;
  external_link?: string;
  tags?: string[];
  institution_id?: string;
  created_at?: string;
}


export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  type: 'Bug' | 'Dúvida' | 'Sugestão';
  status: 'Aberto' | 'Em Análise' | 'Fechado' | 'Respondido';
  user_id: string;
  user_name?: string;
  institution_id?: string;
  created_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name?: string;
  message: string;
  attachment_url?: string;
  is_admin: boolean;
  created_at: string;
}
export interface ProtocolHistoryEntry {
  date: string;
  user: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  comment?: string;
}

export interface ProtocolSignature {
  user: string;
  date: string;
  hash: string;
  role?: string;
}

export interface Protocol {
  id: string;
  subject: string;
  type: string;
  from: string;
  to: string;
  status: 'Pendente' | 'Recebido' | 'Em Análise' | 'Concluído';
  date: string;
  attachment?: string;
  history?: ProtocolHistoryEntry[];
  signatures?: ProtocolSignature[];
}

export interface HistoryEntry {
  id: string;
  user: string;
  date: string;
  action: string;
  changes: string;
}

export interface CheckItem {
  id: string;
  task: string;
  status: 'pending' | 'completed' | 'urgent';
  department: string;
  deadline: string;
  notes?: string;
  history?: HistoryEntry[];
}

export type OrderType = 'obras_abrange' | 'veiculos_gtf';
export type OrderStatus = 'pendente' | 'em_cotacao' | 'concluido' | 'cancelado';

export interface OrderItem {
  id: string;
  type: OrderType;
  description: string;
  requester: string;
  projectSite?: string;
  dateRequested: string;
  quotationNumber?: string;
  winningSupplier?: string;
  status: OrderStatus;
}

export type DocType = 'Ofício' | 'Decreto' | 'Portaria' | 'Memorando';

export interface DocumentRecord {
  id: string;
  type: DocType;
  number: number;
  year: number;
  requester: string;
  subject: string;
  dateCreated: string;
  attachment?: string;
}

export interface PatrimonioItem {
  id: string;
  itemType: 'Geral' | 'Veículo';
  code: string;
  objectName: string;
  location: string;
  status: 'Servível' | 'Inservível' | 'Ocioso' | 'Em Manutenção' | 'Baixado';
  condition: 'Excelente' | 'Bom' | 'Ruim' | 'Muito Ruim';
  department: string;
  year: number;
  imageUrls?: string[];
  plate?: string;
  chassis?: string;
  model?: string;
  description?: string;
  createdByName?: string;
}

export interface Evidence {
  label: string;
  type: 'URL' | 'PDF' | 'DOCX';
  link: string;
}

export interface PNTPItem {
  name: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  score: number;
  weight: number;
  evidences: Evidence[];
}

export interface PNTPCategory {
  category: string;
  score: number;
  items: PNTPItem[];
}

export interface CompanyCertificates {
  id: string;
  companyName: string;
  cnpj: string;
  certificates: {
    [key in 'Trabalhista' | 'Federal' | 'Estadual' | 'Municipal' | 'FGTS']: {
      issueDate: string;
      expiryDate: string;
      fileUrl?: string;
    } | null;
  };
}

export interface Institution {
  id: string;
  name: string;
  subdomain?: string;
  logo_url?: string;
  cert_links?: any;
  state_links?: any;
}

export interface Department {
  id: string;
  name: string;
  institution_id: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Prefeito' | 'Visualizador' | 'Editor' | 'Professor';
  status: 'Ativo' | 'Inativo';
  lastLogin: string;
  permissions: View[];
  institution_id?: string;
  department_id?: string;
  subject?: string;
  classes?: string[];
}



export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  format: 'Word' | 'Excel' | 'PDF' | 'PowerPoint' | 'Editor Web' | 'Outro';
  fileUrl: string;
  updatedAt?: string;
  downloads?: number;
  content?: string;
  header?: string;
  footer?: string;
}

export interface Contract {
  id: string;
  title: string;
  contractor: string;
  value: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expiring' | 'expired';
  department: string;
  alertSent: boolean;
}

export interface EnvironmentalReport {
  id: string;
  protocolo?: string;
  description: string;
  location: string;
  referencePoint?: string;
  isAnonymous: boolean;
  reporterName?: string;
  reporterContact?: string;
  photoUrl?: string;
  status: 'Pendente' | 'Em Análise' | 'Resolvido';
  dateReported: string;
  institution_id?: string;
}

export type FormFieldType = 
  | 'text' 
  | 'textarea' 
  | 'radio' 
  | 'checkbox' 
  | 'select' 
  | 'rating_stars' 
  | 'rating_emojis' 
  | 'scale_nps' 
  | 'date' 
  | 'time' 
  | 'cpf' 
  | 'phone' 
  | 'neighborhood' 
  | 'file_link' 
  | 'yes_no' 
  | 'section_header';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  allowOther?: boolean;
}

export interface PublicForm {
  id: string;
  institution_id?: string;
  title: string;
  description: string;
  category: string;
  slug?: string;
  cover_theme: string; // gradient / color identifier
  cover_image_url?: string;
  status: 'published' | 'draft' | 'closed';
  is_anonymous: boolean;
  require_cpf: boolean;
  max_responses?: number;
  start_date?: string;
  end_date?: string;
  thank_you_title?: string;
  thank_you_message?: string;
  redirect_url?: string;
  questions: FormField[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  response_count?: number;
}

export interface FormResponse {
  id: string;
  form_id: string;
  institution_id?: string;
  respondent_name?: string;
  respondent_cpf?: string;
  respondent_phone?: string;
  respondent_neighborhood?: string;
  answers: Record<string, any>;
  protocol: string;
  created_at: string;
}

