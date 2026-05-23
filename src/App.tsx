import React from 'react';
import { supabase, signUpNewUser } from './lib/supabase';
import { ToastContainer, showToast } from './components/ui/Toast';
import { CertificatesModule } from './modules/Certificates';
import { SettingsModule } from './modules/Settings';
import { ProtocolModule } from './modules/Protocol';
import { ReportsModule, PatrimonioPrintLayout } from './modules/Reports';
import { ControlsModule } from './modules/Controls';
import { RiskModule } from './modules/Risk';
import { PNTPModule } from './modules/PNTP';
import { DocumentNumbersModule } from './modules/DocumentNumbers';
import { OrdersModule } from './modules/Orders';
import { PatrimonioModule } from './modules/Patrimonio';
import { TemplatesModule } from './modules/Templates';
import { SaudeModule } from './modules/Saude';
import { PublicSaudePortal } from './modules/Saude/PublicPortal';
import { ContractsModule } from './modules/Contracts';
import { EducationModule } from './modules/Education';
import { CalendarModule } from './modules/Calendar';
import { NormsModule } from './modules/Norms';
import { Building2, XCircle, FileBadge, HardHat, Briefcase, HeartPulse, Wrench, TreePine, Calculator, Tractor, HeartHandshake, Trophy, Map, Menu, X, 
  LayoutDashboard, 
  ClipboardCheck, 
  Calendar, 
  BookText, 
  ShieldAlert, Shield, Compass,
  Users, UserCircle,
  Settings,
  Bell,
  Search,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileText,
  Globe,
  ExternalLink,
  Target,
  CheckCircle2,
  Download,
  Info,
  CircleOff,
  AlertCircle,
  Clock,
  AlarmClock,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  GraduationCap,
  BookOpen,
  Home,
  Bus,
  Salad,
  Users2,
  Package,
  Leaf,
  Plus,
  Upload,
  History,
  Sun,
  Moon,
  ShoppingCart,
  PieChart as PieChartIcon,
  FileCheck,
  LogOut,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// --- Types ---
type View = 'home' | 'controls' | 'calendar' | 'norms' | 'risk' | 'pntp' | 'protocol' | 'contracts' | 'education' | 'orders' | 'doc_numbers' | 'reports' | 'certificates' | 'obras' | 'admin_financas' | 'saude' | 'servicos_publicos' | 'meio_ambiente' | 'tributos' | 'agricultura' | 'assistencia_social' | 'esporte' | 'planejamento' | 'settings' | 'patrimonio' | 'templates';

interface Protocol {
  id: string;
  subject: string;
  type: 'Memorando' | 'Ofício' | 'Pedido';
  from: string;
  to: string;
  status: 'Pendente' | 'Recebido' | 'Em Análise' | 'Concluído';
  date: string;
  attachment?: string;
}

interface HistoryEntry {
  id: string;
  user: string;
  date: string;
  action: string;
  changes: string;
}

interface CheckItem {
  id: string;
  task: string;
  status: 'pending' | 'completed' | 'urgent';
  department: string;
  deadline: string;
  notes?: string;
  history?: HistoryEntry[];
}

type OrderType = 'obras_abrange' | 'veiculos_gtf';
type OrderStatus = 'pendente' | 'em_cotacao' | 'concluido' | 'cancelado';

interface OrderItem {
  id: string;
  type: OrderType;
  description: string;
  requester: string;
  dateRequested: string;
  quotationNumber?: string;
  winningSupplier?: string;
  status: OrderStatus;
}

type DocType = 'Ofício' | 'Decreto' | 'Portaria' | 'Memorando';

interface DocumentRecord {
  id: string;
  type: DocType;
  number: number;
  year: number;
  requester: string;
  subject: string;
  dateCreated: string;
  attachment?: string;
}

// --- Data ---
const MOCK_DOCUMENTS: DocumentRecord[] = [
  { id: 'd1', type: 'Ofício', number: 1, year: 2026, requester: 'Maria - Gabinete', subject: 'Solicitação de agendamento de reunião', dateCreated: '2026-05-18' },
  { id: 'd2', type: 'Decreto', number: 1, year: 2026, requester: 'Prefeito', subject: 'Nomeação de servidores', dateCreated: '2026-05-18' },
];

const MOCK_ORDERS: OrderItem[] = [
  {
    id: '1',
    type: 'obras_abrange',
    description: 'Cimento, areia e brita para reforma do posto de saúde',
    requester: 'João - Obras',
    dateRequested: '2024-05-15',
    quotationNumber: 'COT-2024-055',
    winningSupplier: 'Construmax Materiais',
    status: 'concluido'
  },
  {
    id: '2',
    type: 'veiculos_gtf',
    description: 'Troca de óleo e filtros da ambulância placa XYZ-1234',
    requester: 'Maria - Saúde',
    dateRequested: '2024-05-18',
    status: 'em_cotacao'
  }
];

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

const MOCK_PATRIMONIO: PatrimonioItem[] = [
  { id: 'pat1', itemType: 'Geral', code: '001/2026', objectName: 'Mesa de Escritório Executiva', location: 'Gabinete do Prefeito', status: 'Servível', condition: 'Bom', department: 'Gabinete', year: 2023, imageUrls: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&q=80&w=300'] },
  { id: 'pat2', itemType: 'Geral', code: '002/2026', objectName: 'Notebook Dell Latitude', location: 'Sala TI', status: 'Servível', condition: 'Excelente', department: 'Administração', year: 2025, imageUrls: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=300'] },
  { id: 'pat3', itemType: 'Veículo', code: '003/2026', objectName: 'Ambulância Fiat Fiorino', location: 'Garagem Central', status: 'Inservível', condition: 'Muito Ruim', department: 'Saúde', year: 2015, plate: 'ABC-1234', chassis: '9BD123456789', model: 'Fiat Fiorino 1.4', imageUrls: ['https://images.unsplash.com/photo-1587560699334-bea93391dcef?auto=format&fit=crop&q=80&w=300'] },
  { id: 'pat4', itemType: 'Geral', code: '004/2026', objectName: 'Cadeira Giratória', location: 'Recepção', status: 'Servível', condition: 'Ruim', department: 'Assistência Social', year: 2018, imageUrls: ['https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=300'] }
];

const MOCK_CONTROLS: CheckItem[] = [
  { 
    id: '1', 
    task: 'Revisão de Folha de Pagamento', 
    status: 'completed', 
    department: 'RH', 
    deadline: '2024-05-30', 
    notes: 'Confrontado com o e-Social e sem divergências.',
    history: [
      { id: 'h1', user: 'Carlos Mendes', date: '10/05/2024 14:20', action: 'Criação', changes: 'Procedimento inicializado no sistema.' },
      { id: 'h2', user: 'Ana Paula (RH)', date: '12/05/2024 09:15', action: 'Atualização', changes: 'Status alterado para em andamento. Notas adicionadas.' },
      { id: 'h3', user: 'Dr. Afonso', date: '14/05/2024 16:00', action: 'Finalização', changes: 'Conformidade validada e status alterado para concluído.' }
    ]
  },
  { 
    id: '2', 
    task: 'Auditoria de Frotas - Maio', 
    status: 'pending', 
    department: 'Transportes', 
    deadline: '2024-05-15', 
    notes: 'Aguardando envio dos diários de bordo da Secretaria de Saúde.',
    history: [
      { id: 'h4', user: 'Roberto Silva', date: '08/05/2024 10:00', action: 'Criação', changes: 'Auditoria mensal agendada.' }
    ]
  },
  { 
    id: '3', 
    task: 'Prestação de Contas TCE', 
    status: 'urgent', 
    department: 'Contabilidade', 
    deadline: '2024-05-10', 
    notes: 'Faltam anexos dos convênios federais.',
    history: [
      { id: 'h5', user: 'Julia Santos', date: '05/05/2024 11:30', action: 'Criação', changes: 'Processo de prestação de contas iniciado.' },
      { id: 'h6', user: 'Julia Santos', date: '07/05/2024 15:45', action: 'Alerta', changes: 'Status alterado para urgente devido a atrasos em anexos.' }
    ]
  },
  { id: '4', task: 'Fiscalização de Obras - Unidade de Saúde', status: 'pending', department: 'Obras', deadline: '2024-05-20', notes: 'Medição agendada para sexta-feira.' },
  { id: '5', task: 'Conferência de Almoxarifado', status: 'pending', department: 'Administração', deadline: '2024-05-25', notes: 'Iniciado processo de contagem física.' },
];

const COMPLIANCE_DATA = [
  { name: 'Jan', value: 85 },
  { name: 'Fev', value: 88 },
  { name: 'Mar', value: 82 },
  { name: 'Abr', value: 91 },
  { name: 'Mai', value: 95 },
];

const DEPT_DISTRIBUTION = [
  { name: 'RH', value: 400 },
  { name: 'Obras', value: 300 },
  { name: 'Saúde', value: 300 },
  { name: 'Finanças', value: 200 },
];

const COLORS = ['#1a1a1a', '#4a4a4a', '#8e8e8e', '#cccccc'];

// --- Helper for Year Data ---
const getComplianceDataForYear = (year: string) => {
  const seeds: Record<string, number[]> = {
    '2026': [75, 82, 78, 88, 92],
    '2025': [70, 75, 72, 80, 85],
    '2024': [85, 88, 82, 91, 95],
    '2023': [60, 65, 70, 68, 75],
    '2022': [40, 55, 52, 60, 65]
  };
  const base = seeds[year] || seeds['2024'];
  return [
    { name: 'Jan', value: base[0] },
    { name: 'Fev', value: base[1] },
    { name: 'Mar', value: base[2] },
    { name: 'Abr', value: base[3] },
    { name: 'Mai', value: base[4] },
  ];
};

const LogoCompass = ({ size = 32, className = '' }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="compass-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id="needle-gradient" x1="12" y1="6" x2="12" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34D399" />
        <stop offset="1" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#compass-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 4V5M12 19V20M4 12H5M19 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
    <path d="M12 12L15 6L12 10.5V12Z" fill="url(#needle-gradient)" />
    <path d="M12 12L9 18L12 13.5V12Z" fill="currentColor" className="opacity-50" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const NAVBAR_CATEGORIES = [
  {
    id: 'painel',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    items: [
      { id: 'calendar', label: 'Calendário TCE', icon: Calendar },
    ]
  },
  {
    id: 'controle',
    label: 'Controles',
    icon: ShieldAlert,
    items: [
      { id: 'controls', label: 'Controles Internos', icon: ClipboardCheck },
      { id: 'norms', label: 'Normativas', icon: BookText },
      { id: 'risk', label: 'Análise de Risco', icon: ShieldAlert },
      { id: 'pntp', label: 'Radar PNTP', icon: Globe },
    ]
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: BookOpen,
    items: [
      { id: 'certificates', label: 'Banco de Certidões', icon: FileCheck },
      { id: 'protocol', label: 'Protocolo Digital', icon: ClipboardCheck },
      { id: 'doc_numbers', label: 'Controle de Numeração', icon: FileText },
      { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
      { id: 'contracts', label: 'Licitações & Contratos', icon: Target },
      { id: 'reports', label: 'Relatórios', icon: PieChartIcon },
      { id: 'patrimonio', label: 'Patrimônio', icon: Package },
      { id: 'templates', label: 'Modelos', icon: FileBadge },
    ]
  },
  {
    id: 'secretarias',
    label: 'Secretarias',
    icon: Users2,
    items: [
      { id: 'education', label: 'Educação', icon: GraduationCap },
      { id: 'obras', label: 'Viação e Obras', icon: HardHat },
      { id: 'admin_financas', label: 'Administração e Finanças', icon: Briefcase },
      { id: 'saude', label: 'Saúde', icon: HeartPulse },
      { id: 'servicos_publicos', label: 'Serviços Públicos', icon: Wrench },
      { id: 'meio_ambiente', label: 'Meio Ambiente', icon: TreePine },
      { id: 'tributos', label: 'Tributos', icon: Calculator },
      { id: 'agricultura', label: 'Agricultura', icon: Tractor },
      { id: 'assistencia_social', label: 'Assistência Social', icon: HeartHandshake },
      { id: 'esporte', label: 'Esporte', icon: Trophy },
      { id: 'planejamento', label: 'Planejamento', icon: Map },
    ]
  }
];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50' 
        : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const Dashboard = ({ controls, onViewAll, selectedYear, darkMode }: { controls: CheckItem[], onViewAll: () => void, selectedYear: string, darkMode: boolean }) => {
  const chartData = getComplianceDataForYear(selectedYear);
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[
        { label: 'Índice de Compliance', value: '94%', sub: `Consolidado ${selectedYear}`, trend: 'up', color: 'text-neutral-900' },
        { label: 'Controles Pendentes', value: controls.filter(c => c.status !== 'completed').length.toString(), sub: `${controls.filter(c => c.status === 'urgent').length} urgentes em ${selectedYear}`, trend: 'down', color: 'text-neutral-900' },
        { label: 'Gasto com Pessoal', value: '48.2%', sub: 'Limite LRF: 54%', trend: 'up', color: 'text-amber-600' },
        { label: 'Investimento Saúde', value: '18.4%', sub: 'Mínimo Legal: 15%', trend: 'up', color: 'text-emerald-600' },
      ].map((stat, i) => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          key={i} 
          className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm"
        >
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{stat.label}</p>
          <div className="flex items-end justify-between">
            <h3 className={`text-3xl font-bold ${stat.color} dark:text-neutral-100`}>{stat.value}</h3>
            <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
              stat.trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {stat.trend === 'up' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
              {stat.sub.split(' ')[0]}
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2 uppercase tracking-wider font-semibold">{stat.sub}</p>
        </motion.div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <h4 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-neutral-100">
          Histórico de Conformidade
          <span className="text-xs font-normal text-neutral-400 font-mono bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded text-neutral-500">{selectedYear}</span>
        </h4>
        <div className="h-64 mt-4 text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#333" : "#f0f0f0"} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} stroke={darkMode ? "#777" : "#888"} />
              <YAxis axisLine={false} tickLine={false} domain={[0, 100]} stroke={darkMode ? "#777" : "#888"} />
              <Tooltip 
                cursor={{ fill: darkMode ? '#1a1a1a' : '#f9f9f9', radius: 8 }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: darkMode ? '#171717' : '#fff',
                  color: darkMode ? '#fff' : '#000'
                }}
              />
              <Bar dataKey="value" fill={darkMode ? "#f5f5f5" : "#171717"} radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-bold dark:text-neutral-100">Controles Críticos</h4>
          <button 
            onClick={onViewAll}
            className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white border-b border-neutral-200 dark:border-neutral-700"
          >
            Ver todos
          </button>
        </div>
        <div className="space-y-4">
          {controls.slice(0, 4).map((control, i) => (
            <div key={control.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  control.status === 'urgent' ? 'bg-rose-500' : control.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-none mb-1">{control.task}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{control.department} • Prazo: {control.deadline}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
};



// --- PNTP Data ---
interface Evidence {
  label: string;
  type: 'URL' | 'PDF' | 'DOCX';
  link: string;
}

interface PNTPItem {
  name: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  score: number;
  weight: number;
  evidences: Evidence[];
}

interface PNTPCategory {
  category: string;
  score: number;
  items: PNTPItem[];
}

export const RADAR_DATA: PNTPCategory[] = [
  {
    category: 'Prioritários',
    score: 82,
    items: [
      { 
        name: 'Receitas', 
        status: 'compliant', 
        score: 100, 
        weight: 10,
        evidences: [
          { label: 'Portal da Transparência - Receitas 2024', type: 'URL', link: '#' },
          { label: 'Relatório Trimestral de Arrecadação', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Despesas', 
        status: 'compliant', 
        score: 95, 
        weight: 10,
        evidences: [
          { label: 'Empenhos e Liquidações em Tempo Real', type: 'URL', link: '#' },
          { label: 'Manual de Procedimentos de Despesa', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Licitações', 
        status: 'partial', 
        score: 60, 
        weight: 15,
        evidences: [
          { label: 'Editais Publicados - Primeiro Trimestre', type: 'URL', link: '#' },
          { label: 'Termos de Referência Padronizados', type: 'DOCX', link: '#' }
        ]
      },
      { 
        name: 'Contratos', 
        status: 'partial', 
        score: 70, 
        weight: 15,
        evidences: [
          { label: 'Relação de Contratos e Aditivos', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Folha de Pagamento', 
        status: 'compliant', 
        score: 85, 
        weight: 10,
        evidences: [
          { label: 'Tabela de Cargos e Salários Atualizada', type: 'PDF', link: '#' }
        ]
      },
    ]
  },
  {
    category: 'Essenciais',
    score: 75,
    items: [
      { 
        name: 'Obras Públicas', 
        status: 'non-compliant', 
        score: 20, 
        weight: 12,
        evidences: [
          { label: 'Plano de Obras 2024 (Incompleto)', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Diárias', 
        status: 'compliant', 
        score: 100, 
        weight: 8,
        evidences: [
          { label: 'Portal de Consultas de Diárias', type: 'URL', link: '#' }
        ]
      },
      { 
        name: 'Convênios', 
        status: 'partial', 
        score: 55, 
        weight: 10,
        evidences: [
          { label: 'SICONV - Acompanhamento Local', type: 'URL', link: '#' }
        ]
      },
      { 
        name: 'Relatórios Fiscais', 
        status: 'compliant', 
        score: 90, 
        weight: 10,
        evidences: [
          { label: 'RREO - 1º Bimestre Publicado', type: 'PDF', link: '#' }
        ]
      },
    ]
  },
  {
    category: 'Obrigatórios',
    score: 68,
    items: [
      { 
        name: 'Ouvidoria/e-SIC', 
        status: 'compliant', 
        score: 100, 
        weight: 8,
        evidences: [
          { label: 'Sistema Eletrônico do SIC', type: 'URL', link: '#' },
          { label: 'Relatórios Anuais de Pedidos', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Estrutura Organizacional', 
        status: 'compliant', 
        score: 80, 
        weight: 7,
        evidences: [
          { label: 'Organograma Municipal 2024', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Perguntas Frequentes', 
        status: 'non-compliant', 
        score: 0, 
        weight: 5,
        evidences: []
      },
    ]
  }
];



// --- Orders Module ---

// --- Protocols ---

const Login = ({ onLogin, darkMode }: { onLogin: () => void, darkMode: boolean }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (signInError) {
        console.error("Erro no login:", signInError.message);
        setError(true);
      } else if (data.session) {
        onLogin();
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[100dvh] bg-[#F9F9F8] dark:bg-neutral-950 grid place-items-center p-4 py-8 transition-colors overflow-y-auto overflow-x-hidden">
      {/* Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-sky-900/20' : 'bg-sky-100/50'} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100/50'} rounded-full blur-3xl animate-pulse delay-1000`} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] sm:rounded-[48px] p-8 sm:p-12 shadow-2xl shadow-neutral-200/50 dark:shadow-neutral-950/50 border border-neutral-100 dark:border-neutral-800 relative z-10 my-auto"
      >
        <div className="text-center space-y-4 mb-10">
          <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white p-3 rounded-[1.25rem] shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] border border-neutral-100 dark:border-neutral-800 flex items-center justify-center mx-auto w-20 h-20 transition-all hover:scale-110 duration-500">
            <LogoCompass size={44} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic mt-2">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">Sistemas de Compliance & Protocolo</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Usuário</label>
            <div className="relative">
              <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={18} />
              <input 
                type="email" 
                placeholder="seu@email.com"
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-14 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all font-bold text-neutral-900 dark:text-white"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={18} />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-14 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all font-bold text-neutral-900 dark:text-white"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center"
            >
              Credenciais inválidas. Verifique os dados.
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/20 dark:shadow-neutral-950/20 flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 dark:border-neutral-900/30 border-t-white dark:border-t-neutral-900 rounded-full animate-spin" />
            ) : (
              <>
                Acessar Painel
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-neutral-50 dark:border-neutral-800 space-y-4">

          <p className="text-[10px] text-neutral-400 font-bold text-center uppercase tracking-widest">
            Acesso Restrito ao Setor de Controladoria
          </p>
        </div>
      </motion.div>
    </div>
  );
};






interface CompanyCertificates {
  id: string;
  companyName: string;
  cnpj: string;
  certificates: Record<'Trabalhista' | 'Federal' | 'Estadual' | 'Municipal' | 'FGTS', {
    issueDate: string;
    expiryDate: string;
    fileUrl?: string;
  } | null>;
}

const MOCK_COMPANIES: CompanyCertificates[] = [
  {
    id: '1', companyName: 'Construtora Alfa Ltda', cnpj: '12.345.678/0001-90',
    certificates: {
      Trabalhista: { issueDate: '2024-01-15', expiryDate: '2025-01-15' },
      Federal: { issueDate: '2024-01-10', expiryDate: '2024-12-10' },
      Estadual: { issueDate: '2024-03-20', expiryDate: '2024-09-20' },
      Municipal: { issueDate: '2023-11-20', expiryDate: '2024-05-10' },
      FGTS: { issueDate: '2024-05-18', expiryDate: '2024-06-18' },
    }
  },
  {
    id: '2', companyName: 'Tecnologias Silva', cnpj: '98.765.432/0001-10',
    certificates: {
      Trabalhista: { issueDate: '2023-11-20', expiryDate: '2024-11-20' },
      Federal: null,
      Estadual: { issueDate: '2024-03-20', expiryDate: '2024-09-20' },
      Municipal: null,
      FGTS: { issueDate: '2024-05-18', expiryDate: '2024-06-18' },
    }
  },
  {
    id: '3', companyName: 'Serviços Gerais Oliveira', cnpj: '55.666.777/0001-22',
    certificates: {
      Trabalhista: { issueDate: '2024-05-10', expiryDate: '2024-11-10' },
      Federal: { issueDate: '2024-05-15', expiryDate: '2024-11-15' },
      Estadual: { issueDate: '2024-05-16', expiryDate: '2024-11-16' },
      Municipal: { issueDate: '2024-05-17', expiryDate: '2024-11-17' },
      FGTS: { issueDate: '2024-05-18', expiryDate: '2024-06-18' },
    }
  }
];




const PlaceholderModule = ({ title }: { title: string }) => (
  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
    <div className="flex flex-col items-center justify-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-16 text-center">
      <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 text-neutral-300 dark:text-neutral-600">
        <PieChartIcon size={40} />
      </div>
      <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
        Este módulo está em desenvolvimento. Em breve, ferramentas específicas para esta secretaria estarão disponíveis.
      </p>
      <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="mt-8 px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/10">
        Notificar Lançamento
      </button>
    </div>
  </div>
);

export interface Institution {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Visualizador' | 'Editor';
  status: 'Ativo' | 'Inativo';
  lastLogin: string;
  permissions: View[];
  institution_id?: string;
}

const AVAILABLE_PERMISSIONS: { id: View; label: string }[] = [
  { id: 'home', label: 'Início (Dashboard)' },
  { id: 'controls', label: 'Controles Internos' },
  { id: 'calendar', label: 'Calendário Oficial' },
  { id: 'norms', label: 'Atos Normativos' },
  { id: 'risk', label: 'Gestão de Riscos' },
  { id: 'pntp', label: 'PNTP' },
  { id: 'protocol', label: 'Protocolo' },
  { id: 'contracts', label: 'Contratos e Licitações' },
  { id: 'education', label: 'Educação' },
  { id: 'orders', label: 'Pedidos (Obras/Veículos)' },
  { id: 'doc_numbers', label: 'Controle de Numeração' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'certificates', label: 'Certidões' },
  { id: 'obras', label: 'Obras e Inf.' },
  { id: 'admin_financas', label: 'Administração/Finanças' },
  { id: 'saude', label: 'Saúde' },
  { id: 'servicos_publicos', label: 'Serviços Públicos' },
  { id: 'meio_ambiente', label: 'Meio Ambiente' },
  { id: 'tributos', label: 'Tributos' },
  { id: 'agricultura', label: 'Agricultura' },
  { id: 'assistencia_social', label: 'Assistência Social' },
  { id: 'esporte', label: 'Esporte' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'settings', label: 'Configurações' }
];

const MOCK_INSTITUTIONS: Institution[] = [
  { id: 'inst_1', name: 'Prefeitura Municipal' },
  { id: 'inst_2', name: 'Câmara Municipal' },
  { id: 'inst_3', name: 'Secretaria de Saúde' }
];

const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Administrador Principal', email: 'admin@gestao360.com.br', role: 'Admin', status: 'Ativo', lastLogin: 'Hoje, 09:41', permissions: ['home', 'controls', 'calendar', 'norms', 'risk', 'pntp', 'protocol', 'contracts', 'education', 'orders', 'doc_numbers', 'reports', 'certificates', 'obras', 'admin_financas', 'saude', 'servicos_publicos', 'meio_ambiente', 'tributos', 'agricultura', 'assistencia_social', 'esporte', 'planejamento', 'settings', 'patrimonio'], institution_id: 'inst_1' },
  { id: '2', name: 'João Silva', email: 'joao.silva@gestao360.com.br', role: 'Editor', status: 'Ativo', lastLogin: 'Ontem, 15:30', permissions: ['home', 'controls', 'protocol'], institution_id: 'inst_1' },
  { id: '3', name: 'Maria Souza', email: 'maria.souza@gestao360.com.br', role: 'Visualizador', status: 'Inativo', lastLogin: '10/05/2026', permissions: ['home', 'calendar'], institution_id: 'inst_2' }
];



export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: 'RH' | 'Licitações' | 'Contratos' | 'Ofícios' | 'Geral';
  format: 'Word' | 'Excel' | 'PDF' | 'PowerPoint' | 'Outro';
  fileUrl: string;
  updatedAt: string;
}

export const MOCK_TEMPLATES: DocumentTemplate[] = [
  { id: 'tpl1', title: 'Ofício Padrão - Notificação', description: 'Modelo oficial para notificação de empresas e fornecedores.', category: 'Ofícios', format: 'Word', fileUrl: '#', updatedAt: '2025-10-15' },
  { id: 'tpl2', title: 'Planilha de Custos Unitários', description: 'Planilha padrão para estimativa de custos em processos licitatórios.', category: 'Licitações', format: 'Excel', fileUrl: '#', updatedAt: '2025-11-20' },
  { id: 'tpl3', title: 'Minuta de Contrato Administrativo', description: 'Estrutura base para contratos de prestação de serviços.', category: 'Contratos', format: 'Word', fileUrl: '#', updatedAt: '2026-01-05' },
  { id: 'tpl4', title: 'Ficha de Avaliação de Desempenho', description: 'Formulário anual para avaliação de servidores.', category: 'RH', format: 'PDF', fileUrl: '#', updatedAt: '2026-02-10' },
  { id: 'tpl5', title: 'Apresentação Institucional', description: 'Slides padrão com a identidade visual da prefeitura.', category: 'Geral', format: 'PowerPoint', fileUrl: '#', updatedAt: '2026-03-01' }
];


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<AdminUser | null>(null);
  const [pendingReport, setPendingReport] = React.useState<'patrimonio' | null>(null);
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('gestao360-dark-mode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    localStorage.setItem('gestao360-dark-mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  React.useEffect(() => {
    const handleAuthSession = (session: any) => {
      setIsAuthenticated(!!session);
      if (session?.user?.email) {
        if (session.user.email === 'aficconsultoria@gmail.com') {
          setCurrentUser({
            id: session.user.id,
            name: 'AFIC Consultoria',
            email: session.user.email,
            role: 'Super Admin',
            status: 'Ativo',
            lastLogin: new Date().toISOString(),
            permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
          });
        } else {
          supabase.from('admin_users').select('*').eq('email', session.user.email).single().then(({data}) => {
            if (data) {
              setCurrentUser({ ...data, lastLogin: data.last_login } as AdminUser);
              if (data.last_login === 'Nunca') {
                setIsChangingPassword(true);
                setForcePasswordChange(true);
              }
            }
          });
        }
      } else {
        setCurrentUser(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  const [activeView, setActiveView] = React.useState<View>('home');
  const [patrimonioItems, setPatrimonioItems] = React.useState<PatrimonioItem[]>(MOCK_PATRIMONIO);
  const [adminUsers, setAdminUsers] = React.useState<AdminUser[]>(MOCK_USERS);
  const [institutions, setInstitutions] = React.useState<Institution[]>(MOCK_INSTITUTIONS);
  const [selectedYear, setSelectedYear] = React.useState('2026');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [controls, setControls] = React.useState<CheckItem[]>(MOCK_CONTROLS);
  const [orders, setOrders] = React.useState<OrderItem[]>(MOCK_ORDERS);
  const [docRecords, setDocRecords] = React.useState<DocumentRecord[]>(MOCK_DOCUMENTS);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchGlobalData = async () => {
      try {
        const [{ data: users }, { data: docs }, { data: ords }, { data: ctrls }, { data: insts }] = await Promise.all([
          supabase.from('admin_users').select('*'),
          supabase.from('documents').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('controls').select('*'),
          supabase.from('institutions').select('*')
        ]);

        if (users && users.length > 0) setAdminUsers(users.map(u => ({ ...u, lastLogin: u.last_login } as AdminUser)));
        if (docs && docs.length > 0) setDocRecords(docs.map(d => ({ ...d, dateCreated: d.date_created } as DocumentRecord)));
        if (ords && ords.length > 0) setOrders(ords.map(o => ({ ...o, dateRequested: o.date_requested, quotationNumber: o.quotation_number, winningSupplier: o.winning_supplier } as OrderItem)));
        if (ctrls && ctrls.length > 0) setControls(ctrls as CheckItem[]);
        if (insts && insts.length > 0) setInstitutions(insts as Institution[]);
      } catch (err) {
        console.error('Erro ao buscar dados do Supabase:', err);
      }
    };

    fetchGlobalData();
  }, [isAuthenticated]);
  const [protocols, setProtocols] = React.useState<Protocol[]>([]);
  const [editingControl, setEditingControl] = React.useState<CheckItem | null>(null);
  const [viewingControl, setViewingControl] = React.useState<CheckItem | null>(null);
  const [viewingHistory, setViewingHistory] = React.useState<CheckItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const [notifications, setNotifications] = React.useState([
    { id: 1, text: 'Prazo do RREO vencendo em 15 dias', type: 'warning', read: false },
    { id: 2, text: 'Novo protocolo recebido da Secretaria de Saúde', type: 'info', read: false },
    { id: 3, text: 'Parecer do Gemini gerado para análise de frotas', type: 'success', read: true },
  ]);
  const [obligations, setObligations] = React.useState([
    { id: 1, title: 'RREO - 2º Bimestre', date: '2024-05-30', status: 'pending', priority: 'high' },
    { id: 2, title: 'Siace/TCE - Lançamento Mensal', date: '2024-05-15', status: 'completed', priority: 'medium' },
    { id: 3, title: 'PCA - Plano de Contratações Anual', date: '2024-06-01', status: 'urgent', priority: 'high' },
    { id: 4, title: 'Relatório de Gestão da Saúde', date: '2024-05-25', status: 'pending', priority: 'medium' },
  ]);
  const [isNewControlModalOpen, setIsNewControlModalOpen] = React.useState(false);
  const [attachingFor, setAttachingFor] = React.useState<number | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [forcePasswordChange, setForcePasswordChange] = React.useState(false);
  const [recentViews, setRecentViews] = React.useState<View[]>([]);

  // Carrega os acessos recentes quando o usuário logar
  React.useEffect(() => {
    if (currentUser?.id) {
      const saved = localStorage.getItem(`gestao360-recent-views-${currentUser.id}`);
      if (saved) {
        setRecentViews(JSON.parse(saved));
      } else {
        setRecentViews([]);
      }
    }
  }, [currentUser?.id]);

  // Salva o acesso recente sempre que mudar de view (atrelado ao usuário)
  React.useEffect(() => {
    if (activeView !== 'home' && currentUser?.id) {
      setRecentViews(prev => {
        const updated = [activeView, ...prev.filter(v => v !== activeView)].slice(0, 8);
        localStorage.setItem(`gestao360-recent-views-${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeView, currentUser?.id]);

  const isPublicPortal = window.location.pathname === '/agendamento';

  if (isPublicPortal) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
           <button 
             onClick={() => setDarkMode(!darkMode)}
             className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
           >
             {darkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
         </div>
         <PublicSaudePortal darkMode={darkMode} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
           <button 
             onClick={() => setDarkMode(!darkMode)}
             className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
           >
             {darkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
         </div>
         <Login onLogin={() => setIsAuthenticated(true)} darkMode={darkMode} />
      </div>
    );
  }

  const addControl = async (newControl: Omit<CheckItem, 'id'>) => {
    const control: CheckItem = {
      ...newControl,
      id: Math.random().toString(36).substr(2, 9)
    };
    setControls([control, ...controls]);
    setIsNewControlModalOpen(false);
    showToast('Controle adicionado com sucesso!');
    
    await supabase.from('controls').insert({
      id: control.id,
      task: control.task,
      status: control.status,
      department: control.department,
      deadline: control.deadline,
      notes: control.notes,
      history: control.history || []
    }).then(({ error }) => { if (error) console.error(error) });
  };

  const updateControl = async (updated: CheckItem) => {
    setControls(controls.map(c => c.id === updated.id ? updated : c));
    setEditingControl(null);
    showToast('Alterações salvas!');
    
    await supabase.from('controls').update({
      task: updated.task,
      status: updated.status,
      department: updated.department,
      deadline: updated.deadline,
      notes: updated.notes,
      history: updated.history || []
    }).eq('id', updated.id).then(({ error }) => { if (error) console.error(error) });
  };

  const deleteControl = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este controle?')) {
      setControls(controls.filter(c => c.id !== id));
      showToast('Controle removido do sistema.');
      await supabase.from('controls').delete().eq('id', id).then(({ error }) => { if (error) console.error(error) });
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F9F9F8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex transition-colors duration-500 print:bg-white">
      {/* New Control Modal */}
      <AnimatePresence>
        {isNewControlModalOpen && (
          <NewControlModal 
            onClose={() => setIsNewControlModalOpen(false)} 
            onAdd={addControl} 
          />
        )}
      </AnimatePresence>
      {/* Edit Control Modal */}
      <AnimatePresence>
        {editingControl && (
          <NewControlModal 
            onClose={() => setEditingControl(null)} 
            onAdd={(c) => updateControl({ ...c, id: editingControl.id })}
            initialData={editingControl}
            title="Editar Controle"
          />
        )}
      </AnimatePresence>
      {/* View Control Detail Modal */}
      <AnimatePresence>
        {viewingControl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{viewingControl.task}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{viewingControl.department}</p>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                  viewingControl.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                  viewingControl.status === 'urgent' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {viewingControl.status}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Prazo Limite</p>
                  <p className="text-sm font-bold dark:text-neutral-200">{viewingControl.deadline}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Observações</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">“{viewingControl.notes || 'Nenhuma observação informada.'}”</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingControl(null)}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
              >
                Fechar Detalhes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* History Modal */}
      <AnimatePresence>
        {viewingHistory && (
          <HistoryModal 
            item={viewingHistory} 
            onClose={() => setViewingHistory(null)} 
          />
        )}
      </AnimatePresence>
      {/* Attachment Modal */}
      <AnimatePresence>
        {attachingFor && (
          <AttachmentModal 
            title={obligations.find(o => o.id === attachingFor)?.title || ''}
            onClose={() => setAttachingFor(null)}
            onConfirm={() => {
              setObligations(obligations.map(o => o.id === attachingFor ? {...o, status: 'completed'} : o));
              setAttachingFor(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <ChangePasswordModal 
            forceChange={forcePasswordChange}
            onClose={() => !forcePasswordChange && setIsChangingPassword(false)}
            onSuccess={async () => {
              if (forcePasswordChange && currentUser) {
                const now = new Date().toLocaleString('pt-BR');
                await supabase.from('admin_users').update({ last_login: now }).eq('id', currentUser.id);
                setCurrentUser({ ...currentUser, lastLogin: now } as AdminUser);
                setAdminUsers(adminUsers.map(u => u.id === currentUser.id ? { ...u, lastLogin: now } : u));
                setForcePasswordChange(false);
              }
              setIsChangingPassword(false);
            }}
          />
        )}
      </AnimatePresence>

                        {/* Top Navbar Component */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10 transition-all duration-300 w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
        <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-40 transition-colors shadow-sm w-full">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView('home')}>
                  <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm group-hover:scale-110 transition-transform flex items-center justify-center">
                    <LogoCompass size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight leading-none italic dark:text-white">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
                  </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-2">
                  {NAVBAR_CATEGORIES.map((category) => {
                    const allowedItems = category.items.filter(item => currentUser?.permissions?.includes(item.id as View) || currentUser?.role === 'Super Admin');
                    if (allowedItems.length === 0) return null;
                    const isActiveCategory = allowedItems.some(i => i.id === activeView);
                    
                    return (
                      <div key={category.id} className="relative">
                        <button
                          onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                            isActiveCategory 
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'
                          }`}
                        >
                          <category.icon size={16} />
                          {category.label}
                          <ChevronRight size={14} className={`transition-transform duration-200 ${expandedCategory === category.id ? 'rotate-90' : ''}`} />
                        </button>

                        <AnimatePresence>
                        {expandedCategory === category.id && (
                          <>
                          <div className="fixed inset-0 z-30" onClick={() => setExpandedCategory(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-max min-w-[240px] z-40"
                          >
                            <div className="pt-2">
                              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xl overflow-hidden relative z-40 p-2">
                                {allowedItems.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      setActiveView(item.id as View);
                                      setExpandedCategory(null);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all relative whitespace-nowrap ${
                                      activeView === item.id 
                                        ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
                                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                                    }`}
                                  >
                                    <item.icon size={16} className="shrink-0" />
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                          </>
                        )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                {currentUser && (
                  <button 
                    onClick={() => { setIsChangingPassword(true); setForcePasswordChange(false); }}
                    className="hidden sm:flex items-center gap-2 mr-2 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full border border-neutral-100 dark:border-neutral-700 transition-colors text-left"
                    title="Alterar Senha"
                  >
                    <UserCircle size={16} className="text-neutral-500 dark:text-neutral-400" />
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold leading-none text-neutral-900 dark:text-white truncate max-w-[120px]">{currentUser.name || currentUser.email}</span>
                      <span className="text-[9px] leading-none text-neutral-500 dark:text-neutral-400 mt-0.5">{currentUser.role}</span>
                    </div>
                  </button>
                )}
                {/* Hamburger Button for Mobile */}
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                  title="Menu"
                >
                  <Menu size={20} />
                </button>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                  title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {(currentUser?.permissions?.includes('settings') || currentUser?.role === 'Super Admin') && (
                  <button 
                    onClick={() => setActiveView('settings')}
                    className={`p-2.5 rounded-xl transition-all ${
                      activeView === 'settings' 
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'
                    }`}
                    title="Configurações e Usuários"
                  >
                    <Settings size={20} />
                  </button>
                )}
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsAuthenticated(false);
                  }}
                  className="p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>

            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 lg:hidden print:hidden"
                />
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-neutral-900 z-50 shadow-2xl flex flex-col lg:hidden print:hidden"
                >
                  <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500 text-white p-2 rounded-xl">
                        <LogoCompass size={20} />
                      </div>
                      <h2 className="text-lg font-black italic dark:text-white">Gestão <span className="text-neutral-400 font-normal">360</span></h2>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {NAVBAR_CATEGORIES.map((category) => {
                      const allowedItems = category.items.filter(item => currentUser?.permissions?.includes(item.id as View) || currentUser?.role === 'Super Admin');
                      if (allowedItems.length === 0) return null;

                      return (
                      <div key={category.id} className="space-y-2">
                        <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                          <category.icon size={12} /> {category.label}
                        </h3>
                        <div className="space-y-1">
                          {allowedItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveView(item.id as View);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeView === item.id 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                            >
                              <item.icon size={16} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </nav>

        <div className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar print:overflow-visible print:h-auto">
          <main className="min-h-full p-6 lg:p-10 pb-20 print:p-0 print:pb-0">
            <div className="max-w-[1400px] mx-auto w-full">
            {/* View Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === 'doc_numbers' && (
              <DocumentNumbersModule
                records={docRecords.filter(r => r.subject.toLowerCase().includes(searchQuery.toLowerCase()) || r.requester.toLowerCase().includes(searchQuery.toLowerCase()))}
                onAdd={async (newRecord) => {
                  const currentYear = new Date().getFullYear();
                  const number = docRecords.filter(r => r.type === newRecord.type && r.year === currentYear).length + 1;
                  const newDoc = { 
                    ...newRecord, 
                    id: Math.random().toString(36).substring(2, 9),
                    number,
                    year: currentYear,
                    dateCreated: new Date().toISOString().split('T')[0]
                  };
                  setDocRecords([newDoc, ...docRecords]);
                  showToast('Número gerado com sucesso!', 'success');
                  
                  await supabase.from('documents').insert({
                    id: newDoc.id,
                    type: newDoc.type,
                    number: newDoc.number,
                    year: newDoc.year,
                    requester: newDoc.requester,
                    subject: newDoc.subject,
                    date_created: newDoc.dateCreated
                  }).then(({ error }) => { if (error) console.error(error) });
                }}
                onUpdate={async (id, updates) => {
                  setDocRecords(docRecords.map(r => r.id === id ? { ...r, ...updates } : r));
                  showToast('Documento atualizado com sucesso!', 'success');
                  
                  await supabase.from('documents').update(updates).eq('id', id).then(({ error }) => { if (error) console.error(error) });
                }}
              />
            )}
            {activeView === 'patrimonio' && (
              <PatrimonioModule 
                items={patrimonioItems} 
                onAdd={(item) => setPatrimonioItems([item, ...patrimonioItems])}
              />
            )}
            {activeView === 'orders' && (
              <OrdersModule 
                orders={orders.filter(o => o.description.toLowerCase().includes(searchQuery.toLowerCase()) || o.requester.toLowerCase().includes(searchQuery.toLowerCase()))}
                onAdd={async (newOrder) => {
                  const order = { ...newOrder, id: Math.random().toString(36).substr(2, 9) } as OrderItem;
                  setOrders([order, ...orders]);
                  setNotifications([{ id: Date.now(), text: `Novo pedido recebido de ${order.requester}`, type: 'info', read: false }, ...notifications]);
                  showToast('Pedido registrado com sucesso!', 'success');
                  
                  await supabase.from('orders').insert({
                    id: order.id,
                    type: order.type,
                    description: order.description,
                    requester: order.requester,
                    date_requested: order.dateRequested,
                    quotation_number: order.quotationNumber,
                    winning_supplier: order.winningSupplier,
                    status: order.status
                  }).then(({ error }) => { if (error) console.error(error) });
                }}
                onEdit={async (updatedOrder) => {
                  setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  await supabase.from('orders').update({
                    type: updatedOrder.type,
                    description: updatedOrder.description,
                    requester: updatedOrder.requester,
                    date_requested: updatedOrder.dateRequested,
                    quotation_number: updatedOrder.quotationNumber,
                    winning_supplier: updatedOrder.winningSupplier,
                    status: updatedOrder.status
                  }).eq('id', updatedOrder.id).then(({ error }) => { if (error) console.error(error) });
                }}
                setOrders={setOrders}
              />
            )}
            {activeView === 'home' && (
              <div className="w-full max-w-[1400px] mx-auto px-6 py-12 relative z-10 animate-in fade-in duration-500">
                <div className="mb-10">
                  <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    {recentViews.length > 0 ? 'Acessados Recentemente' : 'Acesso Rápido'}
                  </h2>
                  <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                    {recentViews.length > 0 ? 'Suas ferramentas mais utilizadas recentemente.' : 'Selecione um módulo para começar.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                  {(() => {
                    // Flatten all allowed items
                    const allAllowedItems = NAVBAR_CATEGORIES.flatMap(category => 
                      category.items
                        .filter(item => currentUser?.permissions?.includes(item.id as View) || currentUser?.role === 'Super Admin')
                        .map(item => ({ ...item, categoryLabel: category.label }))
                    );

                    // If no recent views, show all allowed items
                    let itemsToDisplay = allAllowedItems;
                    
                    if (recentViews.length > 0) {
                      // Map recentViews to items, maintaining order
                      itemsToDisplay = recentViews
                        .map(viewId => allAllowedItems.find(item => item.id === viewId))
                        .filter((item): item is typeof allAllowedItems[0] => item !== undefined);
                        
                      // If recent views somehow yielded no allowed items, fallback to all allowed
                      if (itemsToDisplay.length === 0) {
                        itemsToDisplay = allAllowedItems;
                      }
                    }

                    return itemsToDisplay.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as View)}
                        className="group flex flex-col text-left p-6 bg-white dark:bg-neutral-900 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-50 dark:bg-neutral-800/50 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110" />
                        
                        <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6 text-neutral-500 dark:text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-colors shadow-inner">
                          <item.icon size={24} />
                        </div>
                        
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-1 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                          {item.label}
                        </h3>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                          {item.categoryLabel}
                        </p>
                      </button>
                    ));
                  })()}
                </div>
                
                {/* Minimal watermark background */}
                <div className="fixed bottom-0 right-0 p-12 pointer-events-none opacity-[0.06] dark:opacity-10 z-0 flex items-center scale-50 origin-bottom-right">
                  <LogoCompass size={160} className="text-neutral-900 dark:text-white mr-8" />
                  <h1 className="text-[140px] font-black tracking-tight leading-none italic text-neutral-900 dark:text-white">Gestão <span className="font-normal">360</span></h1>
                </div>
              </div>
            )}
            {activeView === 'controls' && (
              <ControlsModule 
                controls={controls.filter(c => 
                  c.task.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  c.department.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onAddNew={() => setIsNewControlModalOpen(true)} 
                onEdit={setEditingControl}
                onDelete={deleteControl}
                onView={setViewingControl}
                onViewHistory={setViewingHistory}
              />
            )}
            {activeView === 'risk' && <RiskModule />}
            {activeView === 'pntp' && <PNTPModule selectedYear={selectedYear} />}
            {activeView === 'calendar' && (
                  <CalendarModule 
                obligations={obligations.filter(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()))} 
                onAttach={setAttachingFor} 
              />
            )}
            {activeView === 'norms' && <NormsModule />}
            {activeView === 'protocol' && <ProtocolModule searchQuery={searchQuery} />}
            {activeView === 'contracts' && <ContractsModule />}
            {activeView === 'education' && <EducationModule />}
            {activeView === 'reports' && <ReportsModule patrimonioItems={patrimonioItems} initialReport={pendingReport} clearPendingReport={() => setPendingReport(null)} />}
            {activeView === 'certificates' && <CertificatesModule />}
            {activeView === 'obras' && <PlaceholderModule title="Secretaria de Viação e Obras" />}
            {activeView === 'admin_financas' && <PlaceholderModule title="Secretaria de Administração e Finanças" />}
            {activeView === 'saude' && <SaudeModule />}
            {activeView === 'servicos_publicos' && <PlaceholderModule title="Secretaria de Serviços Públicos" />}
            {activeView === 'meio_ambiente' && <PlaceholderModule title="Secretaria de Meio Ambiente" />}
            {activeView === 'tributos' && <PlaceholderModule title="Secretaria de Tributos" />}
            {activeView === 'agricultura' && <PlaceholderModule title="Secretaria de Agricultura" />}
            {activeView === 'assistencia_social' && <PlaceholderModule title="Secretaria de Assistência Social" />}
            {activeView === 'esporte' && <PlaceholderModule title="Secretaria de Esporte" />}
            {activeView === 'planejamento' && <PlaceholderModule title="Secretaria de Planejamento" />}
            {activeView === 'settings' && <SettingsModule users={adminUsers} setUsers={setAdminUsers} institutions={institutions} setInstitutions={setInstitutions} />}
            {activeView === 'templates' && <TemplatesModule />}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>
    </div>

      {/* Toasts */}
      <ToastContainer />
      
        </div>
      </div>
    </div>
  );
}

// --- Additional Modules ---

interface Contract {
  id: string;
  number: string;
  object: string;
  vendorName: string;
  amount: number;
  status: 'active' | 'review' | 'expired' | 'risk';
  category: 'Licitação' | 'Dispensa' | 'Inexigibilidade';
  deadline: string;
}

export const MOCK_CONTRACTS: Contract[] = [
  { id: '1', number: '015/2024', object: 'Locação de Software de Gestão', vendorName: 'TechGov Soluções Ltda', amount: 450000, status: 'active', category: 'Licitação', deadline: '2025-05-10' },
  { id: '2', number: '018/2024', object: 'Aquisição de Alimentos Escolares', vendorName: 'Distribuidora São Paulo', amount: 1200000, status: 'risk', category: 'Licitação', deadline: '2024-12-20' },
  { id: '3', number: '021/2024', object: 'Reforma da Praça Central', vendorName: 'Construtora Forte', amount: 890000, status: 'review', category: 'Licitação', deadline: '2024-08-30' },
  { id: '4', number: '005/2024-D', object: 'Serviços de Vigilância Emergencial', vendorName: 'Segurança Total Eireli', amount: 85000, status: 'expired', category: 'Dispensa', deadline: '2024-04-15' },
];



const NewControlModal = ({ 
  onClose, 
  onAdd, 
  initialData, 
  title = "Novo Controle Interno" 
}: { 
  onClose: () => void, 
  onAdd: (c: Omit<CheckItem, 'id'>) => void,
  initialData?: CheckItem,
  title?: string
}) => {
  const [formData, setFormData] = React.useState<Omit<CheckItem, 'id'>>(initialData ? {
    task: initialData.task,
    department: initialData.department,
    status: initialData.status,
    deadline: initialData.deadline,
    notes: initialData.notes || ''
  } : {
    task: '',
    department: '',
    status: 'pending',
    deadline: new Date().toISOString().split('T')[0],
    notes: ''
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">{title}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Preencha as informações para monitoramento do procedimento.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Descrição do Procedimento</label>
            <input 
              type="text" 
              placeholder="Ex: Auditoria Semanal de Diárias"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all dark:text-neutral-100"
              value={formData.task}
              onChange={e => setFormData({...formData, task: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Secretaria / Setor</label>
            <select 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all appearance-none dark:text-neutral-100"
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
            >
              <option value="">Selecione...</option>
              <option value="RH">Recursos Humanos</option>
              <option value="Saúde">Saúde</option>
              <option value="Obras">Obras</option>
              <option value="Transportes">Transportes</option>
              <option value="Administração">Administração</option>
              <option value="Contabilidade">Contabilidade</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Prazo Limite</label>
            <input 
              type="date" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all dark:text-neutral-100"
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Prioridade / Status</label>
            <div className="flex gap-2">
              {(['pending', 'urgent', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFormData({...formData, status: s})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.status === s 
                      ? (s === 'urgent' ? 'bg-rose-900 dark:bg-rose-700 text-white' : s === 'completed' ? 'bg-emerald-900 dark:bg-emerald-700 text-white' : 'bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white')
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {s === 'pending' ? 'Pendente' : s === 'urgent' ? 'Urgente' : 'Concluído'}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Observações Internas (Opcional)</label>
            <textarea 
              rows={3}
              placeholder="Notas adicionais sobre o procedimento..."
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all resize-none dark:text-neutral-100"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={() => onAdd(formData)}
            disabled={!formData.task || !formData.department}
            className="flex-1 bg-neutral-900 dark:bg-white text-emerald-400 dark:text-emerald-600 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
          >
            {initialData ? 'Atualizar Controle' : 'Cadastrar Controle'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


const AttachmentModal = ({ title, onClose, onConfirm }: { title: string, onClose: () => void, onConfirm: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
  >
    <motion.div 
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-neutral-100 dark:border-neutral-700">
          <FileText size={32} className="text-neutral-400 dark:text-neutral-500" />
        </div>
        <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Anexar Documento</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{title}</p>
      </div>

      <div className="border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-4 hover:border-neutral-900/20 dark:hover:border-white/20 transition-colors cursor-pointer group">
        <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
          <Download size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Clique ou arraste o arquivo</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">PDF, DOCX ou ZIP (Máx. 20MB)</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onConfirm}
          className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
        >
          Confirmar Envio
        </button>
        <button 
          onClick={onClose}
          className="px-8 py-5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-[24px] font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const HistoryModal = ({ item, onClose }: { item: CheckItem, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
  >
    <motion.div 
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8 max-h-[85vh] flex flex-col"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History size={20} className="text-sky-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Log de Alterações</span>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">{item.task}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{item.department}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
          <CircleOff size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
        {item.history && item.history.length > 0 ? (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-neutral-100 dark:before:bg-neutral-800">
            {item.history.map((entry, idx) => (
              <div key={entry.id} className="relative flex items-start gap-6 group">
                <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm z-10 ${
                  idx === 0 ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
                }`}>
                  <History size={16} />
                </div>
                <div className="flex-1 space-y-1 pt-1">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">{entry.action}</span>
                      <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded">{entry.date}</span>
                   </div>
                   <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold italic mb-1">{entry.user}</p>
                   <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                     {entry.changes}
                   </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-[32px] border border-dashed border-neutral-200 dark:border-neutral-700">
            <History size={48} className="text-neutral-200 dark:text-neutral-700 mb-4" />
            <h4 className="text-lg font-bold text-neutral-400 dark:text-neutral-500">Sem Histórico Registrado</h4>
            <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-2 max-w-[240px]">Ainda não há registros de alterações manuais registradas para este controle.</p>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button 
          onClick={onClose}
          className="w-full py-5 bg-neutral-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/20"
        >
          Fechar Histórico
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const ChangePasswordModal = ({ forceChange, onClose, onSuccess }: { forceChange: boolean, onClose: () => void, onSuccess: () => void }) => {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (authError) {
      setError('Erro ao atualizar senha: ' + authError.message);
    } else {
      showToast('Senha atualizada com sucesso!', 'success');
      onSuccess();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      {...(!forceChange ? { onClick: onClose } : {})}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {!forceChange && (
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
            <X size={20} />
          </button>
        )}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-100 dark:border-sky-500/20 text-sky-500">
            <Lock size={24} />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {forceChange ? 'Defina sua Senha' : 'Alterar Senha'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {forceChange ? 'Como este é seu primeiro acesso, por favor defina uma senha segura para continuar.' : 'Insira sua nova senha abaixo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-2xl text-[13px] font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nova Senha</label>
            <input 
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
            />
            <p className="text-[10px] font-bold text-neutral-400 ml-1">A senha deve conter no mínimo 6 caracteres.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Confirmar Nova Senha</label>
            <input 
              type="password" required
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-sky-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-sky-700 transition-all shadow-xl shadow-sky-600/20 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : forceChange ? 'Definir Senha e Acessar' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Protocol Module ---

