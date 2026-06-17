import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RADAR_DATA } from '../../lib/mockData';
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

const PNTPModule = ({ selectedYear }: { selectedYear: string }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [viewingEvidence, setViewingEvidence] = React.useState<PNTPItem | null>(null);

  const handleExport = (categoryName: string) => {
    showToast('Botão em desenvolvimento', 'warning');
  };

  const exportEvidence = (itemName: string) => {
    showToast('Botão em desenvolvimento', 'warning');
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
                      onClick={() => showToast('Botão em desenvolvimento', 'warning')}
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

export { PNTPModule };
