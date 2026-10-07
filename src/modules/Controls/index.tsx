import React, { useState, useMemo } from 'react';
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
import { AccountingChangesControl } from './components/AccountingChangesControl';
import { hasPermission } from '../../lib/permissions';

// Destructure common icons to avoid changing code
const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X, Paperclip, CheckSquare, Scale
} = LucideIcons;

const ControlsModule = ({ 
  controls, 
  onAddNew, 
  onEdit, 
  onDelete, 
  onView,
  onViewHistory,
  currentUser
}: { 
  controls: CheckItem[], 
  onAddNew: () => void,
  onEdit: (c: CheckItem) => void,
  onDelete: (id: string) => void,
  onView: (c: CheckItem) => void,
  onViewHistory: (c: CheckItem) => void,
  currentUser?: AdminUser | null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'urgent' | 'completed'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [controlsTab, setControlsTab] = useState<'compliance' | 'accounting'>('compliance');

  const canViewAccounting = !currentUser || hasPermission(currentUser, 'accounting_changes', 'view');

  const navigationTabs = useMemo(() => [
    { id: 'compliance' as const, label: 'Controles Internos & Compliance', icon: ClipboardCheck },
    ...(canViewAccounting ? [{ id: 'accounting' as const, label: 'Alterações na Contabilidade', icon: Scale }] : [])
  ], [canViewAccounting]);

  // Metrics (KPIs)
  const totalControls = controls.length;
  const urgentControls = controls.filter(c => c.status === 'urgent').length;
  const completedControls = controls.filter(c => c.status === 'completed').length;
  const complianceRate = totalControls === 0 ? 0 : Math.round((completedControls / totalControls) * 100);

  // Departments for dropdown
  const departments = useMemo(() => {
    return Array.from(new Set(controls.map(c => c.department))).sort();
  }, [controls]);

  // Filtering
  const filteredControls = useMemo(() => {
    return controls.filter(c => {
      const matchesSearch = c.task.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
      const matchesDept = departmentFilter === 'all' ? true : c.department === departmentFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [controls, searchTerm, statusFilter, departmentFilter]);

  // Helper to check if deadline is near or overdue
  const isOverdueOrNear = (deadlineStr: string) => {
    const parts = deadlineStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const now = new Date();
      // Difference in days
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3; // within 3 days or already passed
    }
    return false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            {controlsTab === 'compliance' ? <ClipboardCheck size={28} /> : <Scale size={28} />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              {controlsTab === 'compliance' ? 'Painel de Controles Internos' : 'Controle de Alterações na Contabilidade'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
              {controlsTab === 'compliance' 
                ? 'Monitore prazos preventivos, exigências do TCE e conformidade das rotinas municipais.' 
                : 'Auditoria de solicitações de alterações contábeis, retificações de empenho e pareceres técnicos.'}
            </p>
          </div>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 w-full md:w-auto">
          {navigationTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setControlsTab(tab.id as any)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                controlsTab === tab.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {controlsTab === 'accounting' ? (
        <AccountingChangesControl searchQuery={searchTerm} currentUser={currentUser} />
      ) : (
        <>
          <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Checklists & Prazos do TCE</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">Monitore prazos, exigências do Tribunal de Contas e acompanhe as rotinas preventivas.</p>
            </div>
            <button 
              onClick={onAddNew}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-2.5 rounded-2xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <ClipboardCheck size={18} />
              Novo Controle
            </button>
          </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Total de Controles</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{totalControls}</h3>
            <span className="flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              <Activity size={12} className="mr-1" /> Ativos
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-rose-500/10 dark:text-rose-500/5">
            <AlertTriangle size={80} />
          </div>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1 relative z-10">Atrasados / Urgentes</p>
          <div className="flex items-end justify-between relative z-10">
            <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400">{urgentControls}</h3>
            <span className="flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlarmClock size={12} className="mr-1" /> Prioridade
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Concluídos</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{completedControls}</h3>
            <span className="flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} className="mr-1" /> Finalizados
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-sm font-medium text-sky-600 dark:text-sky-400 mb-1">Taxa de Conformidade</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-sky-600 dark:text-sky-400">{complianceRate}%</h3>
            <span className="flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <ShieldCheck size={12} className="mr-1" /> Eficiência
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome do controle ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 dark:text-white"
            />
          </div>
          
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 dark:text-white cursor-pointer"
          >
            <option value="all">Todas as Secretarias</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'urgent', label: 'Urgentes' },
            { id: 'completed', label: 'Concluídos' }
          ].map(status => (
            <button
              key={status.id}
              onClick={() => setStatusFilter(status.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === status.id 
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                  : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        {filteredControls.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 dark:text-neutral-400 flex flex-col items-center">
            <ClipboardCheck size={48} className="mb-4 text-neutral-300 dark:text-neutral-600" />
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Nenhum controle encontrado</p>
            <p className="text-sm mt-1">Ajuste os filtros ou o termo de pesquisa para ver os resultados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-bottom border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
                  <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Procedimento & Observação</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Secretaria</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Prazo Limite</th>
                  <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {filteredControls.map((control) => {
                  const overdue = isOverdueOrNear(control.deadline) && control.status !== 'completed';
                  
                  return (
                    <tr key={control.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/80 transition-colors group">
                      <td className="px-8 py-5 max-w-sm">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{control.task}</span>
                          {control.notes && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                              <span className="inline-flex items-center gap-1"><FileText size={10} /></span> {control.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1 rounded-full flex w-max items-center gap-1.5">
                          <Building2 size={12} className="text-neutral-400" />
                          {control.department}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] flex w-max items-center gap-1.5 uppercase font-black px-3 py-1 rounded-full ${
                          control.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 
                          control.status === 'urgent' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)]' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}>
                          {control.status === 'completed' && <CheckCircle2 size={12} />}
                          {control.status === 'urgent' && <AlertTriangle size={12} />}
                          {control.status === 'pending' && <Clock size={12} />}
                          {control.status === 'completed' ? 'Concluído' : control.status === 'urgent' ? 'Urgente' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`flex items-center gap-2 text-xs font-mono font-medium px-2.5 py-1 rounded-lg w-max ${
                          overdue 
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30' 
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          <Calendar size={14} />
                          {control.deadline}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              showToast('Ferramenta de Checklists será aberta em breve.', 'info');
                              onView(control);
                            }}
                            className="text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30"
                            title="Checklist de Auditoria"
                          >
                            <CheckSquare size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              showToast('Sistema de anexos de evidências será disponibilizado.', 'info');
                              onView(control);
                            }}
                            className="text-neutral-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors p-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-500/10 border border-transparent hover:border-violet-100 dark:hover:border-violet-900/30"
                            title="Anexar Evidência"
                          >
                            <Paperclip size={16} />
                          </button>
                          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1 my-auto" />
                          <button 
                            onClick={() => onViewHistory(control)}
                            className="text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                            title="Histórico"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => onEdit(control)}
                            className="text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDelete(control.id)}
                            className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}
</div>
);
};

export { ControlsModule };
