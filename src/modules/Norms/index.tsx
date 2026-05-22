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
                onClick={() => showToast('Botão em desenvolvimento', 'warning')}
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


export { NormsModule };
