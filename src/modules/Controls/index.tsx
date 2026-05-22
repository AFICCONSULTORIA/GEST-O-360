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
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X
} = LucideIcons;

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

export { ControlsModule };
