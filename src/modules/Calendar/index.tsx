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
                    showToast('Botão em desenvolvimento', 'warning');
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

export { CalendarModule };
