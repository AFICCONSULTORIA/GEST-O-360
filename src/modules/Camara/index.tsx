import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, FileText, MessageSquare, Users, Calendar, Plus, Search, 
  ChevronRight, CheckCircle2, Clock, FileWarning, Eye, Trash2, Edit2, CircleOff, XCircle, Globe
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { PNTPModule } from '../PNTP';

type Tab = 'projetos' | 'indicacoes' | 'pauta' | 'vereadores' | 'pntp';

const TABS: { id: Tab, label: string, icon: any }[] = [
  { id: 'projetos', label: 'Projetos de Lei', icon: FileText },
  { id: 'indicacoes', label: 'Indicações', icon: MessageSquare },
  { id: 'pauta', label: 'Pauta da Sessão', icon: Calendar },
  { id: 'vereadores', label: 'Vereadores', icon: Users },
  { id: 'pntp', label: 'Radar PNTP', icon: Globe },
];

export const CamaraModule = () => {
  const [activeTab, setActiveTab] = React.useState<Tab>('projetos');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Mock data for MVP presentation
  const [projetos, setProjetos] = React.useState([
    { id: 'PL-001/24', autor: 'João Silva', ementa: 'Dispõe sobre a criação do programa Bairro Limpo.', status: 'Em Comissão', data: '10/05/2026' },
    { id: 'PL-002/24', autor: 'Maria Santos', ementa: 'Institui a semana municipal de incentivo à leitura.', status: '1ª Votação', data: '12/05/2026' },
    { id: 'PL-003/24', autor: 'Mesa Diretora', ementa: 'Altera o regimento interno da câmara municipal.', status: 'Sancionado', data: '15/05/2026' },
  ]);

  const [indicacoes, setIndicacoes] = React.useState([
    { id: 'IND-105/24', autor: 'Pedro Álvares', descricao: 'Solicita tapa-buraco na rua das Flores, Centro.', status: 'Encaminhado', data: '25/05/2026' },
    { id: 'IND-106/24', autor: 'Maria Santos', descricao: 'Instalação de lixeiras na praça da matriz.', status: 'Aguardando', data: '26/05/2026' },
  ]);

  const STATUS_COLORS: Record<string, string> = {
    'Em Comissão': 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    '1ª Votação': 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    'Sancionado': 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    'Encaminhado': 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    'Aguardando': 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
            <Landmark className="text-emerald-600 dark:text-emerald-400" size={32} />
            Câmara 360
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Gestão Legislativa Integrada: Projetos, Indicações e Pautas.</p>
        </div>
        <button className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/10">
          <Plus size={16} /> Novo Registro
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
        {/* Header / Tabs */}
        <div className="border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex overflow-x-auto hide-scrollbar">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-8 py-5 text-sm font-bold transition-all relative whitespace-nowrap ${
                    isActive 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                  {isActive && (
                    <motion.div 
                      layoutId="camara-active-tab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-4 justify-between bg-neutral-50/50 dark:bg-neutral-800/20 border-b border-neutral-100 dark:border-neutral-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por ementa, autor, número..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white shadow-sm"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'projetos' && (
              <motion.div key="projetos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {projetos.map(pl => (
                  <div key={pl.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer shadow-sm hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl">
                        <FileText size={24} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black font-mono text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">{pl.id}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[pl.status]}`}>
                            {pl.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">{pl.ementa}</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Autor: <span className="font-bold">{pl.autor}</span> • {pl.data}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-neutral-400">
                      <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-sky-500 rounded-lg transition-colors" title="Ver Detalhes"><Eye size={18} /></button>
                      <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-lg transition-colors" title="Editar"><Edit2 size={18} /></button>
                      <button className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'indicacoes' && (
              <motion.div key="indicacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {indicacoes.map(ind => (
                  <div key={ind.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer shadow-sm hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 bg-sky-50 dark:bg-sky-500/10 p-3 rounded-xl">
                        <MessageSquare size={24} className="text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black font-mono text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">{ind.id}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[ind.status] || STATUS_COLORS['Aguardando']}`}>
                            {ind.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">{ind.descricao}</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">Vereador: <span className="font-bold">{ind.autor}</span> • {ind.data}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-neutral-400">
                      <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-sky-500 rounded-lg transition-colors" title="Ver Detalhes"><Eye size={18} /></button>
                      <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-lg transition-colors" title="Editar"><Edit2 size={18} /></button>
                      <button className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'pauta' && (
              <motion.div key="pauta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center text-center py-20 opacity-60">
                <Calendar size={64} className="text-neutral-300 dark:text-neutral-700 mb-6" />
                <h3 className="text-xl font-bold text-neutral-700 dark:text-neutral-300">Pauta da Sessão</h3>
                <p className="text-sm text-neutral-500 mt-2 max-w-sm">Organize os PLs e Requerimentos que serão pautados na próxima sessão da Câmara.</p>
              </motion.div>
            )}

            {activeTab === 'vereadores' && (
              <motion.div key="vereadores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center text-center py-20 opacity-60">
                <Users size={64} className="text-neutral-300 dark:text-neutral-700 mb-6" />
                <h3 className="text-xl font-bold text-neutral-700 dark:text-neutral-300">Gestão de Vereadores</h3>
                <p className="text-sm text-neutral-500 mt-2 max-w-sm">Gerencie os mandatos, verba indenizatória e dados do gabinete legislativo.</p>
              </motion.div>
            )}
            {activeTab === 'pntp' && (
              <motion.div key="pntp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4">
                <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
                  <Globe className="text-sky-600 dark:text-sky-400" size={24} />
                  <div>
                    <h4 className="font-bold text-sky-900 dark:text-sky-100">Radar de Transparência Pública - Câmara Municipal</h4>
                    <p className="text-sm text-sky-700 dark:text-sky-300">Este painel exibe os indicadores específicos exigidos pela ATRICON para o Poder Legislativo Municipal.</p>
                  </div>
                </div>
                {/* Reusing the existing PNTP module logic for demonstration */}
                <div className="transform scale-[0.98] origin-top">
                  <PNTPModule selectedYear="2026" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
