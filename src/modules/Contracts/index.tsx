import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MOCK_CONTRACTS } from '../../App';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { 
  CheckItem, Protocol, PatrimonioItem, DocumentRecord, OrderItem,
  OrderType, OrderStatus, DocType, PNTPItem, DocumentTemplate, Contract,
  Institution, AdminUser, View, PNTPCategory, Evidence
} from '../../types';
import { showToast } from '../../components/ui/Toast';

// Destructure common icons to avoid changing code
const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X
} = LucideIcons;

const ContractsModule = () => {
  const [contracts, setContracts] = React.useState<Contract[]>(MOCK_CONTRACTS);
  
  React.useEffect(() => {
    supabase.from('contracts').select('*').then(({ data }) => {
      if (data && data.length > 0) {
        setContracts(data.map(c => ({ ...c, vendorName: c.vendor_name } as Contract)));
      }
    });
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Licitações & <span className="text-neutral-400 font-normal">Contratos</span></h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Fiscalização proativa e monitoramento da Lei 14.133/21.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all flex items-center gap-2">
            <Download size={16} /> Relatórios Lupa
          </button>
          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
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
                    <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="p-2.5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-950 transition-all shadow-sm">
                      <Target size={14} />
                    </button>
                    <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="p-2.5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all shadow-sm">
                      <FileText size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
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
          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-white text-neutral-900 px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transform hover:-translate-y-1 transition-all shadow-xl shadow-black/50">
            Rodar Diagnóstico Lupa 360
          </button>
        </div>
      </div>
    </div>
  );
};

export { ContractsModule };
