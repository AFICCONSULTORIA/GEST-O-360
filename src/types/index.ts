export type View = 'home' | 'controls' | 'calendar' | 'norms' | 'risk' | 'pntp' | 'protocol' | 'contracts' | 'education' | 'orders' | 'doc_numbers' | 'reports' | 'certificates' | 'obras' | 'admin_financas' | 'saude' | 'servicos_publicos' | 'meio_ambiente' | 'tributos' | 'agricultura' | 'assistencia_social' | 'esporte' | 'planejamento' | 'settings' | 'patrimonio' | 'templates' | 'camara' | 'support';

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
  role: 'Super Admin' | 'Admin' | 'Visualizador' | 'Editor' | 'Professor';
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
