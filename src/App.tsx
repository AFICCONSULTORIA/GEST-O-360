import React from 'react';
import { supabase } from './lib/supabase';
import { Building2, XCircle, FileBadge, HardHat, Briefcase, HeartPulse, Wrench, TreePine, Calculator, Tractor, HeartHandshake, Trophy, Map, Menu, X, 
  LayoutDashboard, 
  ClipboardCheck, 
  Calendar, 
  BookText, 
  ShieldAlert, 
  Users, 
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
  FileCheck
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
type View = 'home' | 'controls' | 'calendar' | 'norms' | 'risk' | 'pntp' | 'protocol' | 'contracts' | 'education' | 'orders' | 'doc_numbers' | 'reports' | 'certificates' | 'obras' | 'admin_financas' | 'saude' | 'servicos_publicos' | 'meio_ambiente' | 'tributos' | 'agricultura' | 'assistencia_social' | 'esporte' | 'planejamento';

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

const ControlsModule = ({ 
  controls, 
  onAddNew, 
  onEdit, 
  onDelete, 
  onView,
  onViewHistory
}: { 
  controls: CheckItem[], 
  onAddNew: () => void,
  onEdit: (c: CheckItem) => void,
  onDelete: (id: string) => void,
  onView: (c: CheckItem) => void,
  onViewHistory: (c: CheckItem) => void
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold dark:text-neutral-100">Planilha de Controle Interno</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">Monitore a execução das instruções normativas em tempo real.</p>
      </div>
      <button 
        onClick={onAddNew}
        className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-2.5 rounded-2xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
      >
        <ClipboardCheck size={18} />
        Novo Controle
      </button>
    </div>

    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-bottom border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
            <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Procedimento</th>
            <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Secretaria</th>
            <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Status</th>
            <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Observação</th>
            <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Prazo Limite</th>
            <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
          {controls.map((control) => (
            <tr key={control.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <td className="px-8 py-5">
                <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{control.task}</span>
              </td>
              <td className="px-8 py-5">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{control.department}</span>
              </td>
              <td className="px-8 py-5">
                <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                  control.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 
                  control.status === 'urgent' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                  {control.status}
                </span>
              </td>
              <td className="px-8 py-5 max-w-xs">
                <div className="flex flex-col">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 italic">“{control.notes || 'Sem observações'}”</p>
                </div>
              </td>
              <td className="px-8 py-5">
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{control.deadline}</span>
              </td>
              <td className="px-8 py-5 text-right">
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => onViewHistory(control)}
                    className="text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    title="Histórico de alterações"
                  >
                    <History size={16} />
                  </button>
                  <button 
                    onClick={() => onView(control)}
                    className="text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    title="Detalhes"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    onClick={() => onEdit(control)}
                    className="text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDelete(control.id)}
                    className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const RiskModule = () => {
  const [analysis, setAnalysis] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [scenario, setScenario] = React.useState('');

  const analyze = async () => {
    if (!scenario) return;
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: scenario })
      });
      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Análise de Risco com Gemini</h2>
        <p className="text-neutral-500">Descreva uma situação e receba uma análise técnica preventiva.</p>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-6">
        <textarea 
          className="w-full h-40 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white transition-all outline-none resize-none text-sm leading-relaxed text-neutral-900 dark:text-neutral-100"
          placeholder="Ex: Identifiquei que os veículos da Secretaria de Obras estão sendo abastecidos sem a devida ordem de serviço no final de semana..."
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        />
        <button 
          onClick={analyze}
          disabled={loading || !scenario}
          className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-all shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/10"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShieldAlert size={20} />
              Gerar Consultoria Inteligente
            </>
          )}
        </button>
      </div>

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 text-neutral-100 p-10 rounded-3xl shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert size={120} />
          </div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Parecer Técnico Preventivo
            </h3>
            <div className="prose prose-invert max-w-none text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {analysis}
            </div>
            <div className="pt-8 flex gap-4">
              <button 
                onClick={() => alert("Botão em desenvolvimento")}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <Download size={12} /> Exportar PDF
              </button>
              <button 
                onClick={() => alert("Botão em desenvolvimento")}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
              >
                Notificar Controlador
              </button>
            </div>
          </div>
        </motion.div>
      )}
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

const RADAR_DATA: PNTPCategory[] = [
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

const PNTPModule = ({ selectedYear }: { selectedYear: string }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [viewingEvidence, setViewingEvidence] = React.useState<PNTPItem | null>(null);

  const handleExport = (categoryName: string) => {
    alert("Botão em desenvolvimento");
  };

  const exportEvidence = (itemName: string) => {
    alert("Botão em desenvolvimento");
  };

  const getStatusColor = (status: PNTPItem['status']) => {
    switch (status) {
      case 'compliant': return 'text-emerald-500';
      case 'partial': return 'text-amber-500';
      case 'non-compliant': return 'text-rose-500';
      default: return 'text-neutral-300';
    }
  };

  const getStatusIcon = (status: PNTPItem['status']) => {
    switch (status) {
      case 'compliant': return <CheckCircle2 size={16} />;
      case 'partial': return <AlertCircle size={16} />;
      case 'non-compliant': return <CircleOff size={16} />;
      default: return <Info size={16} />;
    }
  };

  const filteredData = selectedCategory 
    ? RADAR_DATA.filter(c => c.category === selectedCategory)
    : RADAR_DATA;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative">
      {/* Evidence Modal */}
      <AnimatePresence>
        {viewingEvidence && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setViewingEvidence(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Evidências: {viewingEvidence.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Documentação comprobatória para o Radar PNTP.</p>
                </div>
                <div className={`p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 ${getStatusColor(viewingEvidence.status)}`}>
                  {getStatusIcon(viewingEvidence.status)}
                </div>
              </div>

              <div className="space-y-3">
                {viewingEvidence.evidences.length > 0 ? viewingEvidence.evidences.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 group hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-neutral-400 dark:text-neutral-500" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{doc.label}</span>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{doc.type}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert("Botão em desenvolvimento")}
                      className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 rounded-full hover:bg-sky-600 hover:text-white dark:hover:bg-sky-400 dark:hover:text-neutral-900 transition-all"
                    >
                      {doc.type === 'URL' ? 'Acessar' : 'Download'}
                    </button>
                  </div>
                )) : (
                  <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <AlertTriangle className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" size={32} />
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">Nenhuma evidência cadastrada para este item.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => exportEvidence(viewingEvidence.name)}
                  className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/10"
                >
                  <Download size={16} /> Exportar Dossiê
                </button>
                <button 
                  onClick={() => setViewingEvidence(null)}
                  className="px-6 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-2xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold flex items-center gap-3 dark:text-neutral-100">
            <Globe className="text-sky-500" />
            Radar Transparência Pública
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">Monitoramento oficial ATRICON/TCU para o ciclo {selectedYear}.</p>
        </div>
        <div className="flex items-center gap-8 bg-neutral-50 dark:bg-neutral-800 px-8 py-4 rounded-3xl">
          <div className="text-center">
            <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1">Pontuação Geral</p>
            <p className="text-3xl font-black text-neutral-900 dark:text-neutral-100">78.5<span className="text-lg text-neutral-400 dark:text-neutral-500 ml-1">%</span></p>
          </div>
          <div className="h-10 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div className="text-center">
            <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1">Selo Atual</p>
            <p className="text-sm font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-400/10 px-3 py-1 rounded-full uppercase tracking-tighter">Prata</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {RADAR_DATA.map((cat, idx) => (
          <motion.button 
            key={idx}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedCategory(selectedCategory === cat.category ? null : cat.category)}
            className={`p-6 rounded-3xl border text-left transition-all duration-300 ${
              selectedCategory === cat.category 
                ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white text-white dark:text-neutral-950 shadow-2xl shadow-neutral-900/20 dark:shadow-neutral-50/10 ring-4 ring-neutral-900/5 dark:ring-white/5' 
                : 'bg-white border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
               <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedCategory === cat.category ? 'text-white/50 dark:text-neutral-400/50' : 'text-neutral-400 dark:text-neutral-500'}`}>
                 {cat.category}
               </h3>
               {selectedCategory === cat.category && <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600" />}
            </div>
            <div className="flex items-end justify-between">
               <p className="text-3xl font-black">{cat.score}%</p>
               <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                 cat.score >= 80 
                   ? 'bg-emerald-500/10 text-emerald-500' 
                   : 'bg-amber-500/10 text-amber-500'
               }`}>
                 {cat.items.length} ITENS
               </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
             <Target size={14} />
             {selectedCategory ? `Detalhes: ${selectedCategory}` : 'Todos os Indicadores'}
           </h3>
           {selectedCategory && (
             <button 
               onClick={() => setSelectedCategory(null)}
               className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline uppercase"
             >
               Limpar Filtro
             </button>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredData.flatMap(cat => cat.items.map((item, i) => (
            <motion.div 
              key={`${cat.category}-${i}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300 dark:text-neutral-600">{cat.category}</span>
                    <span className="w-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500">PESO: {item.weight}</span>
                  </div>
                  <h4 className="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors uppercase tracking-tight">{item.name}</h4>
                </div>
                <div className={getStatusColor(item.status)}>
                  {getStatusIcon(item.status)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Conformidade</span>
                  <span className="text-xs font-black text-neutral-900 dark:text-neutral-100">{item.score}%</span>
                </div>
                <div className="h-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    className={`h-full ${
                      item.status === 'compliant' ? 'bg-emerald-500' : 
                      item.status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => setViewingEvidence(item)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                >
                  <FileText size={12} className="text-sky-500" /> Dossiê de Evidências
                </button>
                {item.status !== 'compliant' && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase italic">
                    <AlertTriangle size={10} /> Pendente
                  </span>
                )}
              </div>
            </motion.div>
          )))}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 p-10 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-xl font-bold dark:text-neutral-100">Progressão de Metas</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Próximo objetivo: Selo Ouro (85%)</p>
          </div>
          <div className="flex gap-2">
             <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
               <CheckCircle2 size={12} /> Em Conformidade
             </div>
             <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
               <AlertCircle size={12} /> Parcial
             </div>
             <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
               <CircleOff size={12} /> Não Conforme
             </div>
          </div>
        </div>
        
        <div className="relative pt-6">
          <div className="relative h-6 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '78.5%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-neutral-900 dark:bg-white"
            />
            
            {/* Target Markers */}
            <div className="absolute top-0 left-[75%] h-full w-px bg-white/30 z-10" />
            <div className="absolute top-0 left-[85%] h-full w-px bg-white/30 z-10" />
            <div className="absolute top-0 left-[95%] h-full w-px bg-white/30 z-10" />
          </div>

          <div className="grid grid-cols-10 mt-4 h-12">
            <div className="col-span-7 flex flex-col justify-end">
               <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-600 text-center w-full border-r border-neutral-100 dark:border-neutral-800">Básico</div>
            </div>
            <div className="col-span-1 flex flex-col justify-end">
               <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 text-center w-full border-r border-neutral-100 dark:border-neutral-800">Prata</div>
            </div>
            <div className="col-span-1 flex flex-col justify-end">
               <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 text-center w-full border-r border-neutral-100 dark:border-neutral-800">Ouro</div>
            </div>
            <div className="col-span-1 flex flex-col justify-end">
               <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 text-center w-full">Diamante</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentNumbersModule = ({ records, onAdd, onUpdate }: { records: DocumentRecord[], onAdd: (o: Omit<DocumentRecord, 'id' | 'number' | 'year' | 'dateCreated'>) => void, onUpdate: (id: string, updates: Partial<DocumentRecord>) => void }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState({
    type: 'Ofício' as DocType,
    requester: '',
    subject: '',
  });

  const [typeFilter, setTypeFilter] = React.useState('Todos');

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => typeFilter === 'Todos' || r.type === typeFilter);
  }, [records, typeFilter]);

  const handleAdd = () => {
    if (!formData.requester || !formData.subject) return;
    onAdd(formData);
    setIsAdding(false);
    setFormData({ type: 'Ofício', requester: '', subject: '' });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Controle de Numeração</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Geração de números sequenciais para Ofícios, Decretos e Memorandos.</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none dark:text-neutral-100 min-w-[150px]"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Ofício">Ofício</option>
            <option value="Decreto">Decreto</option>
            <option value="Memorando">Memorando</option>
            <option value="Portaria">Portaria</option>
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Gerar Número
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="font-bold dark:text-neutral-100">Reservar Novo Número</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tipo de Documento</label>
              <select
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as DocType })}
              >
                <option value="Ofício">Ofício</option>
                <option value="Decreto">Decreto</option>
                <option value="Memorando">Memorando</option>
                <option value="Portaria">Portaria</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Solicitante</label>
              <input
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.requester}
                onChange={e => setFormData({ ...formData, requester: e.target.value })}
                placeholder="Ex: João Silva - Sec. Administração"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Assunto</label>
              <input
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Assunto tratado no documento..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={!formData.requester || !formData.subject} className="px-6 py-3 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-50 transition-opacity">Gerar Documento</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase font-black tracking-widest text-neutral-400 dark:text-neutral-500">
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Assunto</th>
                <th className="px-6 py-4">Solicitante</th>
                <th className="px-6 py-4 text-center">Data</th>
                <th className="px-6 py-4 text-center">Anexo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-neutral-900 dark:text-neutral-100 font-medium">
                      {record.type.toUpperCase()}&nbsp;<span className="font-bold text-sky-600 dark:text-sky-400">{String(record.number).padStart(3, '0')}/{record.year}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3 py-1 rounded-full text-xs font-medium">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">
                    {record.subject}
                  </td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                    {record.requester}
                  </td>
                  <td className="px-6 py-4 text-center text-neutral-500 dark:text-neutral-500">
                    {record.dateCreated}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {record.attachment ? (
                      <button 
                        onClick={() => alert("Botão em desenvolvimento")}
                        className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 justify-center w-full"
                      >
                        <FileText size={14} />
                        <span className="text-xs font-bold truncate max-w-[80px]" title={record.attachment}>{record.attachment}</span>
                      </button>
                    ) : (
                      <label className="text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center justify-center gap-1 transition-colors">
                        <Upload size={14} />
                        <span className="text-xs font-bold">Anexar</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              onUpdate(record.id, { attachment: e.target.files[0].name });
                            }
                          }}
                        />
                      </label>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm font-bold">
                    Nenhum documento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Orders Module ---
const OrdersModule = ({ orders, onAdd, onEdit, setOrders }: { orders: OrderItem[], onAdd: (o: Omit<OrderItem, 'id'>) => void, onEdit: (o: OrderItem) => void, setOrders: React.Dispatch<React.SetStateAction<OrderItem[]>> }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<OrderItem | null>(null);
  const [requesterFilter, setRequesterFilter] = React.useState<string>('all');
  const [supplierFilter, setSupplierFilter] = React.useState<string>('all');
  
  const formDataInitialState = {
    type: 'obras_abrange' as OrderType,
    description: '',
    requester: '',
  };
  const [formData, setFormData] = React.useState(formDataInitialState);

  const uniqueRequesters = React.useMemo(() => {
    return Array.from(new Set(orders.map(o => o.requester))).sort();
  }, [orders]);

  const uniqueSuppliers = React.useMemo(() => {
    return Array.from(new Set(orders.map(o => o.winningSupplier).filter(Boolean))).sort() as string[];
  }, [orders]);

  const displayOrders = React.useMemo(() => {
    return orders.filter(o => 
      (requesterFilter === 'all' || o.requester === requesterFilter) &&
      (supplierFilter === 'all' || o.winningSupplier === supplierFilter)
    );
  }, [orders, requesterFilter, supplierFilter]);

  const [editFormData, setEditFormData] = React.useState({
    quotationNumber: '',
    winningSupplier: '',
    status: 'pendente' as OrderStatus
  });

  const handleAdd = () => {
    if (!formData.description || !formData.requester) return;
    onAdd({
      type: formData.type,
      description: formData.description,
      requester: formData.requester,
      dateRequested: new Date().toISOString().split('T')[0],
      status: 'pendente',
    });
    setIsAdding(false);
    setFormData({ type: 'obras_abrange', description: '', requester: '' });
  };

  const handleEditSave = () => {
    if (!editingOrder) return;
    onEdit({
      ...editingOrder,
      quotationNumber: editFormData.quotationNumber,
      winningSupplier: editFormData.winningSupplier,
      status: editFormData.status,
    });
    setEditingOrder(null);
  };

  const startEdit = (order: OrderItem) => {
    setEditingOrder(order);
    setEditFormData({
      quotationNumber: order.quotationNumber || '',
      winningSupplier: order.winningSupplier || '',
      status: order.status
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Central de Pedidos</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Gerencie suprimentos (Abrange) e veículos/serviços (GTF).</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none dark:text-neutral-100 min-w-[200px]"
            value={requesterFilter}
            onChange={e => setRequesterFilter(e.target.value)}
          >
            <option value="all">Todos os Solicitantes</option>
            {uniqueRequesters.map(req => (
              <option key={req} value={req}>{req}</option>
            ))}
          </select>
          <select
            className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none dark:text-neutral-100 min-w-[200px]"
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          >
            <option value="all">Todos os Fornecedores</option>
            {uniqueSuppliers.map(sup => (
              <option key={sup} value={sup}>{sup}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> Novo Pedido
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="font-bold dark:text-neutral-100">Registrar Novo Pedido</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tipo de Pedido</label>
              <select
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as OrderType })}
              >
                <option value="obras_abrange">Obras (Abrange)</option>
                <option value="veiculos_gtf">Veículos/Serviços (GTF)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Solicitante</label>
              <input
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.requester}
                onChange={e => setFormData({ ...formData, requester: e.target.value })}
                placeholder="Ex: João - Sec. Obras"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Descrição do Pedido</label>
              <textarea
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100 resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Detalhes dos itens ou serviços..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={!formData.description || !formData.requester} className="px-6 py-3 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-50 transition-opacity">Salvar</button>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm space-y-4">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Atualizar Pedido Administração</h3>
          <p className="text-sm dark:text-neutral-300">Pedido: {editingOrder.description}</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</label>
              <select
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={editFormData.status}
                onChange={e => setEditFormData({ ...editFormData, status: e.target.value as OrderStatus })}
              >
                <option value="pendente">Pendente</option>
                <option value="em_cotacao">Em Cotação</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Nº Cotação</label>
              <input
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={editFormData.quotationNumber}
                onChange={e => setEditFormData({ ...editFormData, quotationNumber: e.target.value })}
                placeholder="Ex: COT-1234/24"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Fornecedor Ganhador</label>
              <input
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={editFormData.winningSupplier}
                onChange={e => setEditFormData({ ...editFormData, winningSupplier: e.target.value })}
                placeholder="Ex: Oficina Confiança..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingOrder(null)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleEditSave} className="px-6 py-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Atualizar Cotação</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase font-black tracking-widest text-neutral-400 dark:text-neutral-500">
                <th className="px-6 py-4">Pedido</th>
                <th className="px-6 py-4">Solicitante</th>
                <th className="px-6 py-4">Nº Cotação</th>
                <th className="px-6 py-4">Fornecedor Ganhador</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
              {displayOrders.map(order => (
                <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{order.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400">{order.type === 'obras_abrange' ? 'Obras / Abrange' : 'Veículos / GTF'}</span>
                        <span className="text-neutral-300 dark:text-neutral-600">•</span>
                        <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400">{order.dateRequested}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{order.requester}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-neutral-600 dark:text-neutral-400 font-medium">{order.quotationNumber || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{order.winningSupplier || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex ${
                      order.status === 'pendente' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' :
                      order.status === 'em_cotacao' ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 animate-pulse' :
                      order.status === 'concluido' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(order)}
                        className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="Atualizar Pedido"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setOrders(orders.filter(o => o.id !== order.id))}
                        className="bg-neutral-100 dark:bg-neutral-800 text-rose-500 p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm font-bold">
                    Nenhum pedido registrado no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

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

  const handleDemoMode = () => {
    setLoading(true);
    setTimeout(onLogin, 500);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors">
      {/* Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-sky-900/20' : 'bg-sky-100/50'} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100/50'} rounded-full blur-3xl animate-pulse delay-1000`} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[48px] p-12 shadow-2xl shadow-neutral-200/50 dark:shadow-neutral-950/50 border border-neutral-100 dark:border-neutral-800 relative z-10"
      >
        <div className="text-center space-y-4 mb-10">
          <div className="w-16 h-16 bg-neutral-900 dark:bg-neutral-800 rounded-[24px] flex items-center justify-center mx-auto text-emerald-400 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-xl">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
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
          <button 
            onClick={handleDemoMode}
            className="w-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center gap-2"
          >
            <TrendingUp size={16} />
            Modo de Demonstração
          </button>
          <p className="text-[10px] text-neutral-400 font-bold text-center uppercase tracking-widest">
            Acesso Restrito ao Setor de Controladoria
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const ReportsModule = () => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Relatórios <span className="text-neutral-400 font-normal">Inteligentes</span></h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Central de emissão de relatórios personalizados e automatizados.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2">
            <Plus size={16} /> Novo Relatório
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 text-neutral-300 dark:text-neutral-600">
          <PieChartIcon size={40} />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
          A central de relatórios está sendo construída. Futuramente você poderá emitir relatórios e dashboards consolidados de todas as secretarias e departamentos, parametrizados dinamicamente.
        </p>
        <button onClick={() => alert("Botão em desenvolvimento")} className="mt-8 px-8 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all">
          Notificar Lançamento
        </button>
      </div>
    </div>
  );
};




interface CompanyCertificates {
  id: string;
  companyName: string;
  cnpj: string;
  certificates: {
    [key in 'Trabalhista' | 'Federal' | 'Estadual' | 'Municipal' | 'FGTS']: {
      issueDate: string;
      expiryDate: string;
    } | null;
  };
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

const ManageCertificatesModal = ({ company, onClose, onUpdate }: { company: CompanyCertificates, onClose: () => void, onUpdate: (comp: CompanyCertificates) => void }) => {
  const [uploadingCert, setUploadingCert] = React.useState<string | null>(null);

  const certTypes = ['Trabalhista', 'Federal', 'Estadual', 'Municipal', 'FGTS'] as const;

  if (uploadingCert) {
    return (
      <AttachmentModal 
        title={`Anexar ${uploadingCert}`}
        onClose={() => setUploadingCert(null)}
        onConfirm={() => {
          const dt = new Date();
          const issue = dt.toISOString().split('T')[0];
          dt.setFullYear(dt.getFullYear() + 1);
          const expiry = dt.toISOString().split('T')[0];
          
          const updated = { ...company };
          updated.certificates = { ...updated.certificates, [uploadingCert]: { issueDate: issue, expiryDate: expiry } };
          onUpdate(updated);
          setUploadingCert(null);
        }}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Gerenciar Certidões</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">{company.companyName}</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4">
          {certTypes.map(certType => {
            const cert = company.certificates[certType];
            const isPresent = !!cert;
            
            return (
              <div key={certType} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                     <FileBadge size={18} className="text-neutral-400" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{certType}</p>
                     {isPresent ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Válida até {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}</p>
                     ) : (
                        <p className="text-xs text-rose-500 dark:text-rose-400 font-bold mt-0.5">Ausente / Não cadastrada</p>
                     )}
                   </div>
                </div>
                
                <div className="flex gap-2">
                  {isPresent && (
                    <button 
                      onClick={() => alert(`Imprimindo via da certidão ${certType}...`)}
                      className="px-4 py-2 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold hover:text-neutral-900 dark:hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                      <Download size={14} /> Via
                    </button>
                  )}
                  <button 
                    onClick={() => setUploadingCert(certType)}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm flex items-center gap-2"
                  >
                    {isPresent ? 'Substituir' : 'Anexar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

const NewCompanyModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (comp: CompanyCertificates) => void }) => {
  const [formData, setFormData] = React.useState({ companyName: '', cnpj: '' });

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
    }
    
    setFormData({ ...formData, cnpj: value });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Nova Empresa</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Cadastrar novo fornecedor.</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Razão Social</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Ex: Empresa Silva Ltda"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">CNPJ</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={formData.cnpj}
              onChange={handleCNPJChange}
              maxLength={18}
              placeholder="00.000.000/0001-00"
            />
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={() => {
              if (formData.companyName && formData.cnpj) {
                onConfirm({
                  id: Date.now().toString(),
                  companyName: formData.companyName,
                  cnpj: formData.cnpj,
                  certificates: { Trabalhista: null, Federal: null, Estadual: null, Municipal: null, FGTS: null }
                });
              }
            }}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-center"
          >
            Cadastrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CertificatesModule = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [companies, setCompanies] = React.useState<CompanyCertificates[]>(MOCK_COMPANIES);
  const [managingCompany, setManagingCompany] = React.useState<CompanyCertificates | null>(null);
  const [isAddingCompany, setIsAddingCompany] = React.useState(false);

  const getStatusInfo = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Vencida', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle, state: 'expired' };
    } else if (diffDays <= 30) {
      return { label: `${diffDays}d`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: AlertTriangle, state: 'warning' };
    } else {
      return { label: 'Válida', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2, state: 'valid' };
    }
  };

  const filtered = companies.filter(comp => {
    return comp.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || comp.cnpj.includes(searchQuery);
  });

  const renderCertBadge = (cert: { expiryDate: string } | null) => {
    if (!cert) return <span className="text-xs text-neutral-400 font-medium italic">Ausente</span>;
    const status = getStatusInfo(cert.expiryDate);
    return (
      <div className="flex flex-col gap-1 w-max">
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
          {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}
        </span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color}`}>
          <status.icon size={10} />
          {status.label}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
            <FileBadge size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Banco de <span className="text-neutral-400 font-normal">Certidões</span></h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gerenciamento de certidões e prazos de validade por fornecedor.</p>
          </div>
        </div>
        <button onClick={() => setIsAddingCompany(true)} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10">
          <Plus size={16} /> Nova Empresa
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por Empresa ou CNPJ..." 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                <th className="px-4 py-4 w-72">Empresa / Fornecedor</th>
                <th className="px-4 py-4">Trabalhista</th>
                <th className="px-4 py-4">Federal</th>
                <th className="px-4 py-4">Estadual</th>
                <th className="px-4 py-4">Municipal</th>
                <th className="px-4 py-4">FGTS</th>
                <th className="px-4 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {filtered.map(comp => {
                return (
                  <tr key={comp.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                          <Building2 size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate w-48" title={comp.companyName}>{comp.companyName}</span>
                          <span className="text-xs font-bold text-neutral-400">{comp.cnpj}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Trabalhista)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Federal)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Estadual)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Municipal)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.FGTS)}</td>
                    <td className="px-4 py-4 text-right align-middle">
                      <button 
                        onClick={() => setManagingCompany(comp)}
                        className="p-2 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all" 
                        title="Gerenciar Certidões"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                 <tr>
                   <td colSpan={7} className="py-10 text-center text-sm font-medium text-neutral-500">
                     Nenhuma empresa encontrada.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {managingCompany && (
          <ManageCertificatesModal 
            company={managingCompany}
            onClose={() => setManagingCompany(null)}
            onUpdate={(updatedCompany) => {
              setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c));
              setManagingCompany(updatedCompany);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingCompany && (
          <NewCompanyModal 
            onClose={() => setIsAddingCompany(false)}
            onConfirm={(comp) => {
              setCompanies([comp, ...companies]);
              setIsAddingCompany(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};



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
      <button onClick={() => alert('Botão em desenvolvimento')} className="mt-8 px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/10">
        Notificar Lançamento
      </button>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);
  const [activeView, setActiveView] = React.useState<View>('home');
  const [selectedYear, setSelectedYear] = React.useState('2026');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [controls, setControls] = React.useState<CheckItem[]>(MOCK_CONTROLS);
  const [orders, setOrders] = React.useState<OrderItem[]>(MOCK_ORDERS);
  const [docRecords, setDocRecords] = React.useState<DocumentRecord[]>(MOCK_DOCUMENTS);
  const [protocols, setProtocols] = React.useState<Protocol[]>([
    { id: '2024001', subject: 'Solicitação de Material de Expediente', type: 'Pedido', from: 'Saúde', to: 'Administração e Finanças', status: 'Concluído', date: '2024-05-10' },
    { id: '2024002', subject: 'Manutenção de Veículos Oficiais', type: 'Memorando', from: 'Transportes', to: 'Administração e Finanças', status: 'Em Análise', date: '2024-05-12' },
    { id: '2024003', subject: 'Relatório Semanal de Atividades', type: 'Ofício', from: 'Obras', to: 'Administração e Finanças', status: 'Pendente', date: '2024-05-14' },
  ]);
  const [editingControl, setEditingControl] = React.useState<CheckItem | null>(null);
  const [viewingControl, setViewingControl] = React.useState<CheckItem | null>(null);
  const [viewingHistory, setViewingHistory] = React.useState<CheckItem | null>(null);
  const [editingProtocol, setEditingProtocol] = React.useState<Protocol | null>(null);
  const [viewingProtocol, setViewingProtocol] = React.useState<Protocol | null>(null);
  const [isNewProtocolModalOpen, setIsNewProtocolModalOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  const addControl = (newControl: Omit<CheckItem, 'id'>) => {
    const control: CheckItem = {
      ...newControl,
      id: Math.random().toString(36).substr(2, 9)
    };
    setControls([control, ...controls]);
    setIsNewControlModalOpen(false);
    showToast('Controle adicionado com sucesso!');
  };

  const updateControl = (updated: CheckItem) => {
    setControls(controls.map(c => c.id === updated.id ? updated : c));
    setEditingControl(null);
    showToast('Alterações salvas!');
  };

  const deleteControl = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este controle?')) {
      setControls(controls.filter(c => c.id !== id));
      showToast('Controle removido do sistema.');
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F9F9F8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex transition-colors duration-500">
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setViewingControl(null)}
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

                        {/* Top Navbar Component */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10 transition-all duration-300 w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
        <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-40 transition-colors shadow-sm w-full">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
                  <div className="bg-neutral-900 dark:bg-emerald-500 text-emerald-400 dark:text-emerald-950 p-2 rounded-xl rotate-3 hover:rotate-0 transition-transform shadow-lg shadow-neutral-900/10">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight leading-none italic dark:text-white">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-2">
                  {NAVBAR_CATEGORIES.map((category) => {
                    const isActiveCategory = category.items.some(i => i.id === activeView);
                    
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
                                {category.items.map((item) => (
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
            </div>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar">
          <main className="min-h-full p-6 lg:p-10 pb-20">
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
                onAdd={(newRecord) => {
                  const currentYear = new Date().getFullYear();
                  const number = docRecords.filter(r => r.type === newRecord.type && r.year === currentYear).length + 1;
                  setDocRecords([{ 
                    ...newRecord, 
                    id: Math.random().toString(36).substring(2, 9),
                    number,
                    year: currentYear,
                    dateCreated: new Date().toISOString().split('T')[0]
                  }, ...docRecords]);
                  showToast('Número gerado com sucesso!', 'success');
                }}
                onUpdate={(id, updates) => {
                  setDocRecords(docRecords.map(r => r.id === id ? { ...r, ...updates } : r));
                  showToast('Documento atualizado com sucesso!', 'success');
                }}
              />
            )}
            {activeView === 'orders' && (
              <OrdersModule 
                orders={orders.filter(o => o.description.toLowerCase().includes(searchQuery.toLowerCase()) || o.requester.toLowerCase().includes(searchQuery.toLowerCase()))}
                onAdd={(newOrder) => {
                  setOrders([{ ...newOrder, id: Math.random().toString(36).substr(2, 9) } as OrderItem, ...orders]);
                  setNotifications([{ id: Date.now(), text: `Novo pedido recebido de ${newOrder.requester}`, type: 'info', read: false }, ...notifications]);
                  showToast('Pedido registrado com sucesso!', 'success');
                }}
                onEdit={(updatedOrder) => setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o))}
                setOrders={setOrders}
              />
            )}
            {activeView === 'home' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-10 z-0">
                <div className="flex items-center scale-75 md:scale-100 min-w-max">
                  <ShieldAlert size={140} className="text-neutral-900 dark:text-white mr-8" />
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
            {activeView === 'protocol' && (
              <ProtocolModule 
                protocols={protocols.filter(p => 
                  p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.from.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onAddNew={() => setIsNewProtocolModalOpen(true)} 
                onEdit={setEditingProtocol}
                onDelete={(id) => {
                  if(confirm('Deseja excluir este protocolo permanentemente?')) {
                    setProtocols(protocols.filter(p => p.id !== id));
                    showToast('Protocolo excluído.');
                  }
                }}
                onView={setViewingProtocol}
              />
            )}
            {activeView === 'contracts' && <ContractsModule />}
            {activeView === 'education' && <EducationModule />}
            {activeView === 'reports' && <ReportsModule />}
            {activeView === 'certificates' && <CertificatesModule />}
            {activeView === 'obras' && <PlaceholderModule title="Secretaria de Viação e Obras" />}
            {activeView === 'admin_financas' && <PlaceholderModule title="Secretaria de Administração e Finanças" />}
            {activeView === 'saude' && <PlaceholderModule title="Secretaria de Saúde" />}
            {activeView === 'servicos_publicos' && <PlaceholderModule title="Secretaria de Serviços Públicos" />}
            {activeView === 'meio_ambiente' && <PlaceholderModule title="Secretaria de Meio Ambiente" />}
            {activeView === 'tributos' && <PlaceholderModule title="Secretaria de Tributos" />}
            {activeView === 'agricultura' && <PlaceholderModule title="Secretaria de Agricultura" />}
            {activeView === 'assistencia_social' && <PlaceholderModule title="Secretaria de Assistência Social" />}
            {activeView === 'esporte' && <PlaceholderModule title="Secretaria de Esporte" />}
            {activeView === 'planejamento' && <PlaceholderModule title="Secretaria de Planejamento" />}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>
    </div>

      {/* Toasts */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-10 left-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-400 border-emerald-500/20' : 'bg-rose-900/90 text-rose-400 border-rose-500/20'
            }`}
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Protocol Detail Modal */}
      <AnimatePresence>
        {viewingProtocol && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setViewingProtocol(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Protocolo #{viewingProtocol.id}</span>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{viewingProtocol.subject}</h3>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  viewingProtocol.status === 'Concluído' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                  viewingProtocol.status === 'Em Análise' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                  viewingProtocol.status === 'Recebido' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
                  'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                }`}>
                  {viewingProtocol.status}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Origem</p>
                  <p className="text-sm font-bold dark:text-neutral-200">{viewingProtocol.from}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Destino</p>
                  <p className="text-sm font-bold dark:text-neutral-200">{viewingProtocol.to}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                   <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Tipo</p>
                   <p className="text-sm font-bold dark:text-neutral-200">{viewingProtocol.type}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                   <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Data</p>
                   <p className="text-sm font-bold dark:text-neutral-200">{viewingProtocol.date}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingProtocol(null)}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl font-bold"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Protocol Modal */}
      <AnimatePresence>
        {editingProtocol && (
          <NewProtocolModal 
            onClose={() => setEditingProtocol(null)}
            onAdd={(p) => {
              setProtocols(protocols.map(orig => orig.id === editingProtocol.id ? { ...orig, ...p } : orig));
              setEditingProtocol(null);
              showToast('Protocolo atualizado com sucesso!');
            }}
            initialData={editingProtocol}
            title="Editar Protocolo"
          />
        )}
      </AnimatePresence>
      
      {/* New Protocol Modal */}
      <AnimatePresence>
        {isNewProtocolModalOpen && (
          <NewProtocolModal 
            onClose={() => setIsNewProtocolModalOpen(false)}
            onAdd={(p) => {
              const newProtocol: Protocol = {
                id: `${selectedYear}${String(protocols.length + 1).padStart(3, '0')}`,
                date: new Date().toISOString().split('T')[0],
                to: 'Administração e Finanças',
                ...p,
              };
              setProtocols([newProtocol, ...protocols]);
              setIsNewProtocolModalOpen(false);
              showToast('Documento protocolado com sucesso!');
            }}
          />
        )}
      </AnimatePresence>
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

const MOCK_CONTRACTS: Contract[] = [
  { id: '1', number: '015/2024', object: 'Locação de Software de Gestão', vendorName: 'TechGov Soluções Ltda', amount: 450000, status: 'active', category: 'Licitação', deadline: '2025-05-10' },
  { id: '2', number: '018/2024', object: 'Aquisição de Alimentos Escolares', vendorName: 'Distribuidora São Paulo', amount: 1200000, status: 'risk', category: 'Licitação', deadline: '2024-12-20' },
  { id: '3', number: '021/2024', object: 'Reforma da Praça Central', vendorName: 'Construtora Forte', amount: 890000, status: 'review', category: 'Licitação', deadline: '2024-08-30' },
  { id: '4', number: '005/2024-D', object: 'Serviços de Vigilância Emergencial', vendorName: 'Segurança Total Eireli', amount: 85000, status: 'expired', category: 'Dispensa', deadline: '2024-04-15' },
];

const ContractsModule = () => {
  const [contracts] = React.useState<Contract[]>(MOCK_CONTRACTS);
  
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Licitações & <span className="text-neutral-400 font-normal">Contratos</span></h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Fiscalização proativa e monitoramento da Lei 14.133/21.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-2">
            <Download size={16} /> Relatórios Lupa
          </button>
          <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2">
            <ShieldAlert size={16} /> Auditoria Rápida
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Volume Total', value: 'R$ 4.2M', sub: 'Em contratos ativos', icon: TrendingUp, color: 'text-neutral-900 dark:text-neutral-100' },
          { label: 'Riscos Críticos', value: '2', sub: 'Pendências Jurídicas', icon: AlertTriangle, color: 'text-rose-500' },
          { label: 'Dispensas (Art. 75)', value: '14%', sub: 'Do total contratado', icon: Target, color: 'text-amber-500' },
          { label: 'Eficiência de Gasto', value: '92%', sub: 'Score de Governança', icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 transition-transform group-hover:scale-110 duration-500 ${stat.color}`} />
            <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-tight mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <th className="px-8 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Nº Contrato</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Objeto / Empresa</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-center">Categoria</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right">Valor Global</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors group">
                <td className="px-8 py-6">
                  <span className="text-xs font-black text-neutral-900 dark:text-neutral-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {contract.number}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 leading-tight">{contract.object}</span>
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1">CNPJ: {contract.vendorName}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="text-[9px] font-black text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full uppercase tracking-widest">
                    {contract.category}
                  </span>
                </td>
                <td className="px-8 py-6 text-center">
                   <div className="flex justify-center">
                    <span className={`text-[10px] uppercase font-black px-4 py-1.5 rounded-2xl flex items-center gap-2 ${
                      contract.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      contract.status === 'risk' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse' :
                      contract.status === 'review' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        contract.status === 'active' ? 'bg-emerald-500' :
                        contract.status === 'risk' ? 'bg-rose-500' :
                        contract.status === 'review' ? 'bg-amber-500' : 'bg-neutral-400'
                      }`} />
                      {contract.status === 'active' ? 'Regular' :
                       contract.status === 'risk' ? 'Crítico' :
                       contract.status === 'review' ? 'Auditoria' : 'Encerrado'}
                    </span>
                   </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.amount)}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => alert("Botão em desenvolvimento")} className="p-2.5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-950 transition-all shadow-sm">
                      <Target size={14} />
                    </button>
                    <button onClick={() => alert("Botão em desenvolvimento")} className="p-2.5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all shadow-sm">
                      <FileText size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-neutral-900 p-12 rounded-[48px] relative overflow-hidden shadow-2xl shadow-neutral-900/20">
        <div className="absolute top-0 right-0 p-12 opacity-10">
           <ShieldAlert size={140} />
        </div>
        <div className="max-w-xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            Controladoria Preventiva AI
          </div>
          <h3 className="text-4xl font-black text-white tracking-tight italic">Análise de <span className="text-neutral-500 font-normal">Superfaturamento</span></h3>
          <p className="text-neutral-400 text-sm leading-relaxed font-bold">
            Nossa IA cruza automaticamente valores de empenhos com tabelas de referência de mercado (SINAPI/FIPE) para detectar variações atípicas em tempo real.
          </p>
          <button onClick={() => alert("Botão em desenvolvimento")} className="bg-white text-neutral-900 px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transform hover:-translate-y-1 transition-all shadow-xl shadow-black/50">
            Rodar Diagnóstico Lupa 360
          </button>
        </div>
      </div>
    </div>
  );
};

const EducationModule = () => {
  const [educationView, setEducationView] = React.useState<'overview' | 'transport' | 'meals' | 'councils' | 'plans'>('overview');

  const stats = [
    { label: 'MDE (25%)', value: '26.4%', sub: 'Mínimo Constitucional', trend: 'up', color: 'text-emerald-600' },
    { label: 'FUNDEB (70%)', value: '72.8%', sub: 'Remuneração Magistério', trend: 'up', color: 'text-sky-600' },
    { label: 'PNAE (Merenda)', value: 'R$ 1.2M', sub: 'Execução Anual', trend: 'neutral', color: 'text-amber-600' },
    { label: 'Matrículas', value: '4.850', sub: 'Censo Escolar 2024', trend: 'up', color: 'text-neutral-900' },
  ];

  const schools = [
    { id: '1', name: 'Escola Municipal Maria Quitéria', compliance: 98, status: 'regular', lastInspection: '2024-05-01' },
    { id: '2', name: 'Creche Municipal Pequeno Príncipe', compliance: 85, status: 'warning', lastInspection: '2024-04-15' },
    { id: '3', name: 'Escola Setor Rural - Boa Vista', compliance: 92, status: 'regular', lastInspection: '2024-05-10' },
    { id: '4', name: 'Centro de Educação Infantil Jardim das Flores', compliance: 74, status: 'critical', lastInspection: '2024-03-20' },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
              <GraduationCap size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Secretaria de <span className="text-neutral-400 font-normal">Educação</span></h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gestão Integrada de Recursos, Logística e Controle Social.</p>
            </div>
          </div>
          <div className="flex bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Dashboard', icon: Home },
              { id: 'transport', label: 'Transporte', icon: Bus },
              { id: 'meals', label: 'Merenda', icon: Salad },
              { id: 'councils', label: 'Conselhos', icon: Users2 },
              { id: 'plans', label: 'Planos/Relatórios', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEducationView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  educationView === tab.id 
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {educationView === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-tight mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-neutral-50 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50">
                    <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">Unidades Escolares & Conformidade</h3>
                    <button onClick={() => alert("Botão em desenvolvimento")} className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline">Ver Mapa de Unidades</button>
                  </div>
                  <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
                    {schools.map((school) => (
                      <div key={school.id} className="px-8 py-6 flex items-center justify-between hover:bg-neutral-50/20 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            school.status === 'regular' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            school.status === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            <GraduationCap size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{school.name}</h4>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest">Última Inspeção: {school.lastInspection}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-black uppercase tracking-widest mb-1">Score</p>
                            <p className={`text-lg font-black ${
                               school.compliance >= 90 ? 'text-emerald-500' :
                               school.compliance >= 80 ? 'text-amber-500' : 'text-rose-500'
                            }`}>{school.compliance}%</p>
                          </div>
                          <button onClick={() => alert("Botão em desenvolvimento")} className="p-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-950 rounded-xl transition-all border border-neutral-100 dark:border-neutral-700">
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-900/5 p-8 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                     <FileText size={160} className="dark:text-white" />
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                    <div>
                      <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 italic">Censo Escolar <span className="text-neutral-400 font-normal">2024</span></h3>
                      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Acompanhamento e Validação de Dados</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => alert("Botão em desenvolvimento")} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                        Exportar Educacenso
                      </button>
                      <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        Validar Lote
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    {[
                      { label: 'Status Coleta', value: '82%', sub: 'Escolas Finalizadas', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-500/5' },
                      { label: 'Inconsistências', value: '14', sub: 'Pendentes de Correção', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-500/5' },
                      { label: 'Prazo Limite', value: '31 Jul', sub: 'Encerramento da Etapa', icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50/50 dark:bg-rose-500/5' },
                    ].map((item, i) => (
                      <div key={i} className={`${item.bg} p-5 rounded-2xl border border-white dark:border-neutral-800`}>
                        <div className="flex items-start justify-between mb-3">
                          <item.icon className={item.color} size={20} />
                          <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest italic">Monitoramento</span>
                        </div>
                        <h4 className={`text-2xl font-black ${item.color}`}>{item.value}</h4>
                        <p className="text-[10px] font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight mt-1">{item.label}</p>
                        <p className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-8 border-t border-neutral-50 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Users size={20} className="text-neutral-900" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Docentes</p>
                          <p className="text-xs font-bold text-neutral-900">Validar Vínculo e Formação</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-neutral-300" />
                     </div>
                     <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <BookOpen size={20} className="text-neutral-900" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Matrículas</p>
                          <p className="text-xs font-bold text-neutral-900">Etapa de Ensino e Atendimento</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-neutral-300" />
                     </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <AlertTriangle size={80} />
                </div>
                <h3 className="text-xl font-black italic mb-6">Alertas <span className="text-neutral-500 font-normal underline decoration-rose-500">Críticos</span></h3>
                <div className="space-y-4 relative z-10">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Prazo SIOPE</p>
                    <p className="text-sm font-bold">Faltam 12 dias para o fechamento do 2º Bimestre.</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Estoque PNAE</p>
                    <p className="text-sm font-bold">3 unidades com estoque crítico de proteínas.</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">PNATE</p>
                    <p className="text-sm font-bold">Revisão de rotas do transporte escolar em atraso.</p>
                  </div>
                </div>
                <button onClick={() => alert("Botão em desenvolvimento")} className="w-full mt-8 bg-white text-neutral-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all">
                  Gerar Plano de Ação
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {educationView === 'transport' && (
          <motion.div 
            key="transport"
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Veículos em Rota', value: '38', sub: 'Atendimento Pleno', icon: Bus, color: 'text-sky-500' },
                { label: 'Manutenção Pendente', value: '4', sub: 'Veículos em Oficina', icon: Settings, color: 'text-amber-500' },
                { label: 'Consumo Mensal', value: 'R$ 142k', sub: 'Diesel/Gasolina', icon: TrendingDown, color: 'text-rose-500' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color.replace('text-', 'bg-').replace('500', '50')}`}>
                    <item.icon size={24} className={item.color} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{item.label}</p>
                    <h3 className="text-2xl font-black text-neutral-900">{item.value}</h3>
                    <p className="text-[10px] text-neutral-500 font-bold italic">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 italic">Monitoramento da <span className="text-neutral-400 font-normal">Frota Escolar</span></h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Dados Atualizados PNATE / SIGET</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-50 text-neutral-900 border border-neutral-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all">
                    Relatório de KM
                  </button>
                  <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Nova Vistoria
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-50">
                      <th className="pb-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Veículo / Placa</th>
                      <th className="pb-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Motorista</th>
                      <th className="pb-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Linha / Trajeto</th>
                      <th className="pb-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Extensão (KM)</th>
                      <th className="pb-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {[
                      { plate: 'ABC-1234', model: 'VW Micro-ônibus', driver: 'João Ricardo', route: 'Rota 01 - Zona Rural', distance: '45.2', status: 'Em Rota' },
                      { plate: 'DEF-5678', model: 'Mercedes Sprinter', driver: 'Mário Silva', route: 'Rota 04 - Bairros Sul', distance: '28.5', status: 'Em Rota' },
                      { plate: 'GHI-9012', model: 'Ford Transit', driver: 'Antônio Santos', route: 'Rota 07 - Escolas Central', distance: '12.0', status: 'Manutenção' },
                      { plate: 'JKL-3456', model: 'Iveco Daily', driver: 'Luiz Alberto', route: 'Rota 02 - Litoral Norte', distance: '64.8', status: 'Em Rota' },
                      { plate: 'MNO-7890', model: 'VW Ônibus Escolar', driver: 'Ricardo Bento', route: 'Rota 05 - Interior', distance: '52.3', status: 'Aguardando' },
                    ].map((v, i) => (
                      <tr key={i} className="group hover:bg-neutral-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                              <Bus size={14} className="text-neutral-500 group-hover:text-sky-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-neutral-900">{v.model}</p>
                              <p className="text-[10px] font-black text-neutral-400 uppercase font-mono tracking-tighter">{v.plate}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="text-xs font-bold text-neutral-700">{v.driver}</p>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase">CNH D/E - Ativa</p>
                        </td>
                        <td className="py-4">
                          <p className="text-xs font-bold text-neutral-700">{v.route}</p>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            v.status === 'Em Rota' ? 'bg-emerald-100 text-emerald-600' : 
                            v.status === 'Manutenção' ? 'bg-rose-100 text-rose-600' : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <p className="text-xs font-black text-neutral-900">{v.distance} <span className="text-[9px] text-neutral-400 uppercase">Km</span></p>
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => alert("Botão em desenvolvimento")} className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors">
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-neutral-50 rounded-2xl p-6 bg-neutral-50/30">
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-4 italic">Documentação & Seguros</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-xs">
                      <span className="font-bold">Vencimento de Seguros (30 dias)</span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black text-[9px]">0 PENDÊNCIAS</span>
                    </li>
                    <li className="flex justify-between items-center text-xs">
                      <span className="font-bold">Vistorias PNATE Pendentes</span>
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black text-[9px]">02 ALERTAS</span>
                    </li>
                  </ul>
                </div>
                <div className="border border-neutral-50 rounded-2xl p-6 bg-neutral-50/30">
                   <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-4 italic">Eficiência Logística</h4>
                   <div className="space-y-4">
                     <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                       <div className="h-full bg-sky-500 w-[88%]" />
                     </div>
                     <p className="text-[10px] font-bold text-neutral-500 uppercase">Adesão ao Sistema de Rastreamento em Tempo Real (88%)</p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {educationView === 'meals' && (
          <motion.div 
            key="meals"
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="space-y-8"
          >
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Refeições/Dia', value: '9.200', sub: 'Média de Atendimento', icon: Salad, color: 'text-emerald-500' },
                { label: 'Estoque Central', value: '92%', sub: 'Nível de Abastecimento', icon: Package, color: 'text-emerald-500' },
                { label: 'Chamada Pública', value: '34%', sub: 'Agricultura Familiar', icon: Leaf, color: 'text-amber-500' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color.replace('text-', 'bg-').replace('500', '50')}`}>
                    <item.icon size={24} className={item.color} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{item.label}</p>
                    <h3 className="text-2xl font-black text-neutral-900">{item.value}</h3>
                    <p className="text-[10px] text-neutral-500 font-bold italic">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-neutral-100 p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black italic">Segurança <span className="text-neutral-400 font-normal">Alimentar (PNAE)</span></h3>
                <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic">Novo Cardápio</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-800">Fichas Técnicas Aprovadas</span>
                    <span className="font-black text-emerald-600 italic">100%</span>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-rose-800">Alertas de Alergias Mapeadas</span>
                    <span className="font-black text-rose-600 italic">42 Unid.</span>
                  </div>
                </div>
                <div className="bg-neutral-50 rounded-2xl p-6">
                  <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 italic">Origem dos Recursos (PNAE)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Federal</span>
                      <span>R$ 840.000</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span>Contrapartida Mun.</span>
                      <span>R$ 380.000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {educationView === 'councils' && (
          <motion.div 
            key="councils"
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="space-y-8"
          >
             <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-neutral-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black italic">Conselhos e <span className="text-neutral-400 font-normal">Controle Social</span></h3>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Gestão de Membros e Documentos Oficiais</p>
                  </div>
                  <button onClick={() => alert("Botão em desenvolvimento")} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <Users2 size={14} /> Novo Conselho
                  </button>
                </div>
                
                <div className="divide-y divide-neutral-50">
                  {[
                    { 
                      id: 'fundeb', 
                      name: 'CACS-FUNDEB', 
                      desc: 'Conselho de Acompanhamento e Controle Social',
                      members: [
                        { name: 'Ana Silva', role: 'Presidente', type: 'Professor' },
                        { name: 'João Souza', role: 'Secretário', type: 'Poder Executivo' },
                        { name: 'Maria Oliveira', role: 'Membro', type: 'Pais de Alunos' }
                      ],
                      docs: ['Regimento Interno.pdf', 'Ata de Posse 2024.pdf', 'Decreto 015-2024.pdf']
                    },
                    { 
                      id: 'cae', 
                      name: 'CAE', 
                      desc: 'Conselho de Alimentação Escolar',
                      members: [
                        { name: 'Carlos Lima', role: 'Presidente', type: 'Sociedade Civil' },
                        { name: 'Fernanda Rocha', role: 'Membro', type: 'Trabalhadores Educação' }
                      ],
                      docs: ['Parecer Nutricional.pdf', 'Ata Reunião Março.pdf']
                    }
                  ].map((council) => (
                    <div key={council.id} className="p-8 space-y-8 hover:bg-neutral-50/30 transition-colors">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-neutral-900 italic tracking-tight">{council.name}</h4>
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{council.desc}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => alert("Botão em desenvolvimento")} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Plus size={14} /> Membro
                          </button>
                          <button onClick={() => alert("Botão em desenvolvimento")} className="bg-white border border-neutral-100 text-neutral-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-neutral-50">
                            <Upload size={14} /> Documento
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Membros */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Membros do Colegiado ({council.members.length})</h5>
                            <button onClick={() => alert("Botão em desenvolvimento")} className="text-[9px] font-black text-emerald-600 uppercase hover:underline">Ver Todos</button>
                          </div>
                          <div className="space-y-3">
                            {council.members.map((member, i) => (
                              <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-neutral-100 group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center text-[10px] font-black group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                                    {member.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-neutral-900">{member.name}</p>
                                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{member.type}</p>
                                  </div>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  member.role === 'Presidente' ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-500'
                                }`}>
                                  {member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Documentos */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Repositório de Documentos</h5>
                            <button onClick={() => alert("Botão em desenvolvimento")} className="text-[9px] font-black text-sky-600 uppercase hover:underline">Ir para Arquivo</button>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                             {council.docs.map((doc, i) => (
                               <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-neutral-100 hover:border-sky-200 transition-all group cursor-pointer">
                                 <div className="flex items-center gap-3">
                                   <FileText size={14} className="text-neutral-400 group-hover:text-sky-500" />
                                   <span className="text-[11px] font-bold text-neutral-700">{doc}</span>
                                 </div>
                                 <Download size={12} className="text-neutral-300 group-hover:text-neutral-900" />
                               </div>
                             ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </motion.div>
        )}

        {educationView === 'plans' && (
          <motion.div 
            key="plans"
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="space-y-8"
          >
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl flex items-center justify-center">
                      <Target size={20} />
                    </div>
                    <h4 className="text-lg font-black italic dark:text-neutral-100">Plano Municipal <span className="text-neutral-400 dark:text-neutral-500 font-normal">de Educação</span></h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed mb-6">Acompanhamento das 20 metas do PME e monitoramento de metas em execução no exercício 2024.</p>
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 italic">68% Alcançado</span>
                     <button onClick={() => alert("Botão em desenvolvimento")} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">Visualizar Plano →</button>
                  </div>
               </div>

               <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm group hover:border-sky-200 dark:hover:border-sky-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <h4 className="text-lg font-black italic dark:text-neutral-100">Relatórios de <span className="text-neutral-400 dark:text-neutral-500 font-normal">Gestão (SIOPE)</span></h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed mb-6">Geração automática de planilhas para validação no SIOPE e monitoramento da aplicação mínima.</p>
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-black text-sky-600 dark:text-sky-400 italic">Próximo Prazo: 30/05</span>
                     <button onClick={() => alert("Botão em desenvolvimento")} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">Ver Histórico →</button>
                  </div>
               </div>

               <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm group hover:border-amber-200 dark:hover:border-amber-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl flex items-center justify-center">
                      <BookOpen size={20} />
                    </div>
                    <h4 className="text-lg font-black italic dark:text-neutral-100">Projetos <span className="text-neutral-400 dark:text-neutral-500 font-normal">Pedagógicos (PPP)</span></h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed mb-6">Monitoramento da vigência e atualização dos PPPs de todas as unidades escolares do município.</p>
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-black text-amber-600 dark:text-amber-400 italic">84% Atualizados</span>
                     <button onClick={() => alert("Botão em desenvolvimento")} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">Gerenciar PPPs →</button>
                  </div>
               </div>
             </div>

             <div className="bg-emerald-600 p-12 rounded-[40px] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-20">
                  <GraduationCap size={140} />
                </div>
                <div className="max-w-xl space-y-6 relative z-10">
                  <h3 className="text-3xl font-black tracking-tight italic">Relatório Geral de <span className="text-emerald-900 font-normal underline underline-offset-8">Transparência Ativa</span></h3>
                  <p className="text-emerald-50 text-sm font-bold opacity-80 leading-relaxed">Consolidação de dados para o Portal da Transparência, incluindo Quadro de Lotação (QDP), Gastos com Merenda e Transporte por Unidade.</p>
                  <div className="flex gap-4">
                    <button onClick={() => alert("Botão em desenvolvimento")} className="bg-white text-emerald-600 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all">Baixar PDF Consolidado</button>
                    <button onClick={() => alert("Botão em desenvolvimento")} className="bg-emerald-700/50 text-white border border-emerald-500/50 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all">Enviar para Auditoria</button>
                  </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
      onClick={onClose}
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

const CalendarModule = ({ obligations, onAttach }: { obligations: any[], onAttach: (id: number) => void }) => {
  const [alertConfigFor, setAlertConfigFor] = React.useState<number | null>(null);
  const [alertDays, setAlertDays] = React.useState(5);

  const selectedObligation = obligations.find(ob => ob.id === alertConfigFor);

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {alertConfigFor && selectedObligation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setAlertConfigFor(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Alerta: {selectedObligation.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure um lembrete para este prazo.</p>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <AlarmClock size={20} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">Lembrar-me quantos dias antes?</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    value={alertDays} 
                    onChange={(e) => setAlertDays(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white" 
                  />
                  <span className="w-12 text-center font-bold text-lg dark:text-neutral-100">{alertDays}d</span>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Você receberá uma notificação push e um e-mail {alertDays} dias antes de {selectedObligation.date}.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => {
                    alert("Botão em desenvolvimento");
                    setAlertConfigFor(null);
                  }}
                  className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-900/10 dark:shadow-neutral-950/10"
                >
                  Confirmar Alerta
                </button>
                <button 
                  onClick={() => setAlertConfigFor(null)}
                  className="px-6 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-2xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Calendário de Obrigações</h2>
          <p className="text-neutral-500 dark:text-neutral-400">Prazos fatais junto ao Tribunal de Contas e órgãos federais.</p>
        </div>
        <div className="flex gap-2">
          <Calendar size={24} className="text-neutral-300 dark:text-neutral-600" />
        </div>
      </div>

      <div className="grid gap-4">
        {obligations.map((ob, i) => (
          <motion.div 
            key={ob.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">{ob.date.split('-')[1]}</span>
                <span className="text-xl font-black text-neutral-900 dark:text-neutral-100">{ob.date.split('-')[2]}</span>
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{ob.title}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Órgão: Tribunal de Contas do Estado (TCE)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                ob.priority === 'high' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}>
                Prioridade {ob.priority}
              </div>
              <button 
                onClick={() => setAlertConfigFor(ob.id)}
                className="p-2.5 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all"
                title="Definir Alerta Personalizado"
              >
                <Clock size={20} />
              </button>
              {ob.status !== 'completed' ? (
                <button 
                  onClick={() => onAttach(ob.id)}
                  className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold px-4 py-2 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  Anexar Relatório
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold">
                  <CheckCircle2 size={14} /> Enviado
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AttachmentModal = ({ title, onClose, onConfirm }: { title: string, onClose: () => void, onConfirm: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    onClick={onClose}
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
    onClick={onClose}
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

// --- Protocol Module ---

const ProtocolModule = ({ 
  protocols, 
  onAddNew,
  onEdit,
  onDelete,
  onView
}: { 
  protocols: Protocol[], 
  onAddNew: () => void,
  onEdit: (p: Protocol) => void,
  onDelete: (id: string) => void,
  onView: (p: Protocol) => void
}) => {
  const [filterDept, setFilterDept] = React.useState<string>('Todas');
  const [filterStatus, setFilterStatus] = React.useState<string>('Todos');
  const [filterType, setFilterType] = React.useState<string>('Todos');

  const filtered = protocols.filter(p => {
    const matchDept = filterDept === 'Todas' || p.from === filterDept;
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchType = filterType === 'Todos' || p.type === filterType;
    return matchDept && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-bold italic tracking-tight uppercase dark:text-neutral-100">Protocolo Digital</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Envio e acompanhamento de documentos para a SMAF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase ml-1">Secretaria</span>
            <select 
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-xl outline-none min-w-[140px] dark:text-neutral-100"
            >
              <option value="Todas">Todas</option>
              <option value="Saúde">Saúde</option>
              <option value="Obras">Obras</option>
              <option value="Educação">Educação</option>
              <option value="Transportes">Transportes</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase ml-1">Status</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-xl outline-none min-w-[120px] dark:text-neutral-100"
            >
              <option value="Todos">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Recebido">Recebido</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase ml-1">Tipo</span>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-xl outline-none min-w-[120px] dark:text-neutral-100"
            >
              <option value="Todos">Todos</option>
              <option value="Memorando">Memorando</option>
              <option value="Ofício">Ofício</option>
              <option value="Pedido">Pedido</option>
            </select>
          </div>

          <div className="lg:ml-4 flex items-end h-full pt-5">
            <button 
              onClick={onAddNew}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow-xl transition-all whitespace-nowrap"
            >
              <FileText size={18} />
              Novo Documento
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((p, i) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm"
          >
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 bg-neutral-900 dark:bg-neutral-800 text-emerald-400 rounded-xl flex items-center justify-center font-black text-xs">
                 #{p.id.slice(-3)}
               </div>
               <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded">
                      {p.type}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">{p.date}</span>
                 </div>
                 <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{p.subject}</h4>
                 <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest mt-1">
                   DE: {p.from} <span className="mx-2">→</span> PARA: {p.to}
                 </p>
               </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                p.status === 'Concluído' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                p.status === 'Em Análise' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                p.status === 'Recebido' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}>
                {p.status}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onView(p)}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-neutral-400 group-hover:text-neutral-500 dark:group-hover:text-neutral-300"
                  title="Visualizar"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={() => onEdit(p)}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-neutral-400"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(p.id)}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-neutral-400"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const NewProtocolModal = ({ 
  onClose, 
  onAdd,
  initialData,
  title = "Novo Protocolo SMAF"
}: { 
  onClose: () => void, 
  onAdd: (p: any) => void,
  initialData?: Protocol,
  title?: string
}) => {
  const [formData, setFormData] = React.useState(initialData ? {
    subject: initialData.subject,
    type: initialData.type,
    from: initialData.from,
    status: initialData.status,
  } : {
    subject: '',
    type: 'Memorando',
    from: 'Saúde',
    status: 'Pendente',
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
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
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Novo Protocolo SMAF</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Protocolo eletrônico de ofícios, memorandos e pedidos.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Tipo de Documento</label>
            <div className="flex gap-2">
              {['Memorando', 'Ofício', 'Pedido'].map(type => (
                <button
                  key={type}
                  onClick={() => setFormData({...formData, type: type as any})}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.type === type ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Secretaria Remetente</label>
              <select 
                value={formData.from}
                onChange={(e) => setFormData({...formData, from: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 outline-none transition-all dark:text-neutral-100"
              >
                <option value="Saúde">Secretaria de Saúde</option>
                <option value="Obras">Secretaria de Obras</option>
                <option value="Educação">Secretaria de Educação</option>
                <option value="Transportes">Secretaria de Transportes</option>
                <option value="Cultura">Secretaria de Cultura</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 outline-none transition-all dark:text-neutral-100"
              >
                <option value="Pendente">Pendente</option>
                <option value="Recebido">Recebido</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Assunto / Título</label>
            <input 
              type="text" 
              placeholder="Ex: Aquisição de Toners para Impressoras"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all dark:text-neutral-100"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div className="p-8 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-3xl text-center space-y-2 group hover:border-neutral-900/20 dark:hover:border-white/20 transition-all cursor-pointer">
             <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-all">
               <Download size={18} />
             </div>
             <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase">Anexar Documento Digitalizado</p>
             <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest">Apenas arquivos assinados (PDF)</p>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => onAdd(formData)}
            disabled={!formData.subject}
            className="w-full bg-neutral-900 dark:bg-white text-emerald-400 dark:text-emerald-600 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
          >
            Protocolar Documento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const NormsModule = () => {
  const [selectedNorm, setSelectedNorm] = React.useState<number | null>(null);

  const norms = [
    { 
      id: 1, 
      title: 'IN 01/2024 - Controle de Frotas', 
      tags: ['Transportes', 'Patrimônio'], 
      summary: 'Regulamenta o uso, manutenção e abastecimento de veículos oficiais.',
      details: [
        'Uso obrigatório de diário de bordo digital.',
        'Proibição de guarda de veículos em residência particular (exceto escala).',
        'Checklist semanal obrigatório via App.',
        'Controle semanal de média de consumo (Litros/KM).'
      ]
    },
    { 
      id: 2, 
      title: 'IN 02/2024 - Gestão de Almoxarifado', 
      tags: ['Administração', 'Estoque'],
      summary: 'Normatiza a entrada, permanência e saída de materiais de consumo.',
      details: [
        'Exigência de requisição assinada eletronicamente.',
        'Inventário rotativo mensal por amostragem.',
        'Regras de descarte de materiais inservíveis.'
      ]
    },
    { 
      id: 3, 
      title: 'IN 03/2024 - Fiscalização de Contratos', 
      tags: ['Licitações', 'Jurídico'],
      summary: 'Estabelece os procedimentos para os fiscais de contratos e convênios.',
      details: [
        'Obrigatoriedade de relatório de medição mensal.',
        'Procedimento de notificação preventiva de atrasos.',
        'Checklist de regularidade fiscal para pagamentos.'
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 space-y-4">
        <h2 className="text-2xl font-bold mb-6 dark:text-neutral-100">Instruções Normativas</h2>
        {norms.map(norm => (
          <div 
            key={norm.id}
            onClick={() => setSelectedNorm(norm.id)}
            className={`p-6 rounded-3xl border cursor-pointer transition-all ${
              selectedNorm === norm.id 
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-xl' 
                : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}
          >
            <h3 className="font-bold leading-tight mb-3">{norm.title}</h3>
            <div className="flex gap-2">
              {norm.tags.map(tag => (
                <span key={tag} className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  selectedNorm === norm.id ? 'bg-white/10 dark:bg-neutral-900/10 text-white/70 dark:text-neutral-900/70' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                }`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="md:col-span-2">
        {selectedNorm ? (
          <motion.div 
            key={selectedNorm}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 p-10 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-8"
          >
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                  {norms.find(n => n.id === selectedNorm)?.title}
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">{norms.find(n => n.id === selectedNorm)?.summary}</p>
              </div>
              <button 
                onClick={() => alert("Botão em desenvolvimento")}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-950 transition-all group shadow-sm"
              >
                <Download size={20} className="text-neutral-600 dark:text-neutral-400 group-hover:text-white dark:group-hover:text-neutral-950" />
              </button>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">Pontos de Auditoria Sugeridos</h4>
              <div className="grid gap-4">
                {norms.find(n => n.id === selectedNorm)?.details.map((point, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 items-start">
                    <div className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-50 dark:border-neutral-800 flex justify-between items-center text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              <span>Última Atualização: 12/05/2024</span>
              <span className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-emerald-500" /> 
                Validado Juridicamente
              </span>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
            <BookText size={48} className="text-neutral-200 dark:text-neutral-800 mb-4" />
            <h3 className="text-lg font-bold text-neutral-400 dark:text-neutral-500">Selecione uma Instrução Normativa</h3>
            <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-1 max-w-xs">Escolha um manual ao lado para visualizar os detalhes técnicos e pontos de fiscalização.</p>
          </div>
        )}
      </div>
    </div>
  );
};
