import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { 
  CheckItem, Protocol, PatrimonioItem, DocumentRecord, OrderItem,
  OrderType, OrderStatus, DocType, PNTPItem, DocumentTemplate, Contract,
  Institution, AdminUser, View, PNTPCategory, Evidence
} from '../../types';
import { showToast } from '../../components/ui/Toast';

// Destructure common icons to avoid changing code
const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X, Baby, Save
} = LucideIcons;

const EducationModule = () => {
  const [educationView, setEducationView] = React.useState<'overview' | 'transport' | 'meals' | 'councils' | 'plans' | 'creche'>('overview');
  const [crecheSettings, setCrecheSettings] = React.useState<any>(() => {
    const saved = localStorage.getItem('@gestao360:creche_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      bercarioTotal: 20, bercarioOccupied: 0,
      maternal1Total: 35, maternal1Occupied: 0,
      maternal2Total: 45, maternal2Occupied: 0,
      decretoUrl: '#', decretoName: 'Decreto Municipal nº 035/2024',
      decretoDescription: 'Regulamentação do Acesso à Educação Infantil e Fila Única dos CMEIs.',
      isOpen: true,
      fichaUrl: ''
    };
  });

  const saveCrecheSettings = () => {
    localStorage.setItem('@gestao360:creche_settings', JSON.stringify(crecheSettings));
    showToast('Configurações do CMEI salvas com sucesso!', 'success');
  };

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
              { id: 'creche', label: 'Vagas CMEI', icon: Baby },
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
                    <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline">Ver Mapa de Unidades</button>
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
                          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="p-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-950 rounded-xl transition-all border border-neutral-100 dark:border-neutral-700">
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
                      <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                        Exportar Educacenso
                      </button>
                      <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
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
                <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="w-full mt-8 bg-white text-neutral-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all">
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
                  <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-50 text-neutral-900 border border-neutral-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all">
                    Relatório de KM
                  </button>
                  <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
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
                          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors">
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
                <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic">Novo Cardápio</button>
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
                  <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
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
                          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Plus size={14} /> Membro
                          </button>
                          <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-white border border-neutral-100 text-neutral-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-neutral-50">
                            <Upload size={14} /> Documento
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Membros */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Membros do Colegiado ({council.members.length})</h5>
                            <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="text-[9px] font-black text-emerald-600 uppercase hover:underline">Ver Todos</button>
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
                            <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="text-[9px] font-black text-sky-600 uppercase hover:underline">Ir para Arquivo</button>
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
                     <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">Visualizar Plano →</button>
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
                     <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">Ver Histórico →</button>
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
                     <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">Gerenciar PPPs →</button>
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
                    <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-white text-emerald-600 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all">Baixar PDF Consolidado</button>
                    <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="bg-emerald-700/50 text-white border border-emerald-500/50 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all">Enviar para Auditoria</button>
                  </div>
                </div>
             </div>
          </motion.div>
        )}

        {educationView === 'creche' && (
          <motion.div 
            key="creche"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className="space-y-8"
          >
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-8 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Baby className="text-pink-500" /> Vagas do CMEI
                  </h3>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">
                    Gerencie a quantidade de vagas, ocupação e os documentos do portal público.
                  </p>
                </div>
                <button 
                  onClick={saveCrecheSettings}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  <Save size={16} /> Salvar Alterações
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Status da Fila */}
                <div className="lg:col-span-3 bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white">Status do Sistema de Vagas</h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Controla o banner exibido no portal público.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={crecheSettings.isOpen}
                      onChange={(e) => setCrecheSettings({...crecheSettings, isOpen: e.target.checked})}
                    />
                    <div className="w-14 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-500"></div>
                    <span className="ml-3 text-sm font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100">
                      {crecheSettings.isOpen ? 'Aberto' : 'Fila de Espera'}
                    </span>
                  </label>
                </div>

                {/* Berçário */}
                <div className="space-y-4 p-6 bg-sky-50/50 dark:bg-sky-900/10 rounded-3xl border border-sky-100 dark:border-sky-900/30">
                  <h4 className="font-black text-sky-600 dark:text-sky-400">Berçário (0 a 1 ano)</h4>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Totais Ofertadas</label>
                    <input 
                      type="number" 
                      value={crecheSettings.bercarioTotal}
                      onChange={(e) => setCrecheSettings({...crecheSettings, bercarioTotal: parseInt(e.target.value) || 0})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Ocupadas</label>
                    <input 
                      type="number" 
                      value={crecheSettings.bercarioOccupied}
                      onChange={(e) => setCrecheSettings({...crecheSettings, bercarioOccupied: parseInt(e.target.value) || 0})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Maternal I */}
                <div className="space-y-4 p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                  <h4 className="font-black text-amber-600 dark:text-amber-400">Maternal I (1 a 2 anos)</h4>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Totais Ofertadas</label>
                    <input 
                      type="number" 
                      value={crecheSettings.maternal1Total}
                      onChange={(e) => setCrecheSettings({...crecheSettings, maternal1Total: parseInt(e.target.value) || 0})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Ocupadas</label>
                    <input 
                      type="number" 
                      value={crecheSettings.maternal1Occupied}
                      onChange={(e) => setCrecheSettings({...crecheSettings, maternal1Occupied: parseInt(e.target.value) || 0})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Maternal II */}
                <div className="space-y-4 p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                  <h4 className="font-black text-emerald-600 dark:text-emerald-400">Maternal II (2 a 3 anos)</h4>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Totais Ofertadas</label>
                    <input 
                      type="number" 
                      value={crecheSettings.maternal2Total}
                      onChange={(e) => setCrecheSettings({...crecheSettings, maternal2Total: parseInt(e.target.value) || 0})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Ocupadas</label>
                    <input 
                      type="number" 
                      value={crecheSettings.maternal2Occupied}
                      onChange={(e) => setCrecheSettings({...crecheSettings, maternal2Occupied: parseInt(e.target.value) || 0})}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Documentos */}
                <div className="lg:col-span-3 space-y-4 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800 mt-4">
                  <h4 className="font-black text-neutral-900 dark:text-white mb-4">Decreto / Documento de Regulação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nome do Documento</label>
                      <input 
                        type="text" 
                        value={crecheSettings.decretoName}
                        onChange={(e) => setCrecheSettings({...crecheSettings, decretoName: e.target.value})}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Arquivo do Decreto (PDF)</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setCrecheSettings({...crecheSettings, decretoUrl: event.target?.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors relative">
                          <Upload size={16} /> 
                          {crecheSettings.decretoUrl && crecheSettings.decretoUrl.length > 100 ? 'Arquivo Selecionado (Base64)' : 'Fazer Upload do PDF'}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Descrição do Documento</label>
                      <input 
                        type="text" 
                        value={crecheSettings.decretoDescription}
                        onChange={(e) => setCrecheSettings({...crecheSettings, decretoDescription: e.target.value})}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Ficha de Matrícula (PDF para Download)</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setCrecheSettings({...crecheSettings, fichaUrl: event.target?.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors relative">
                          <Upload size={16} /> 
                          {crecheSettings.fichaUrl && crecheSettings.fichaUrl.length > 100 ? 'Ficha de Matrícula Selecionada (Base64)' : 'Fazer Upload da Ficha de Matrícula'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { EducationModule };
