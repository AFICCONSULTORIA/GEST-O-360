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
                onClick={() => showToast('Botão em desenvolvimento', 'warning')}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <Download size={12} /> Exportar PDF
              </button>
              <button 
                onClick={() => showToast('Botão em desenvolvimento', 'warning')}
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

export { RiskModule };
