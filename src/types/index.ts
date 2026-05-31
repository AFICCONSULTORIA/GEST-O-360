export type View = 'home' | 'controls' | 'calendar' | 'norms' | 'risk' | 'pntp' | 'protocol' | 'contracts' | 'education' | 'orders' | 'doc_numbers' | 'reports' | 'certificates' | 'obras' | 'admin_financas' | 'saude' | 'servicos_publicos' | 'meio_ambiente' | 'tributos' | 'agricultura' | 'assistencia_social' | 'esporte' | 'planejamento' | 'settings' | 'patrimonio' | 'templates' | 'camara';


export interface ProtocolHistoryEntry {
  date: string;
  user: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
}

export interface Protocol {
  id: string;
  subject: string;
  type: 'Memorando' | 'Ofício' | 'Pedido';
  from: string;
  to: string;
  status: 'Pendente' | 'Recebido' | 'Em Análise' | 'Concluído';
  date: string;
  attachment?: string;
  history?: ProtocolHistoryEntry[];
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
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Visualizador' | 'Editor';
  status: 'Ativo' | 'Inativo';
  lastLogin: string;
  permissions: View[];
  institution_id?: string;
}



export interface DocumentTemplate {
  id: string;
  title: string;
  category: 'Ofícios' | 'Portarias' | 'Decretos' | 'Relatórios' | 'Contratos' | 'Memorandos';
  format: 'DOCX' | 'XLSX' | 'PDF';
  lastUpdated: string;
  url: string;
  downloads: number;
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
