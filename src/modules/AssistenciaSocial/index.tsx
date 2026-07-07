import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, Users, FileText, ClipboardList, 
  Lightbulb, MessagesSquare, LayoutGrid, BrainCircuit
} from 'lucide-react';
import { showToast } from '../../components/ui/Toast';
import { RelatoriosTab } from './Relatorios';
import { ProntuariosTab } from './Prontuarios';
import { EncaminhamentosTab } from './Encaminhamentos';
import { DinamicasTab } from './Dinamicas';

export const AssistenciaSocialModule = () => {
  const [activeTab, setActiveTab] = useState<'geral' | 'psicologia'>('psicologia');
  const [psicologiaSubTab, setPsicologiaSubTab] = useState<'relatorios' | 'prontuarios' | 'encaminhamentos' | 'dinamicas'>('relatorios');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
            <HeartHandshake className="text-rose-500" size={32} />
            Assistência Social
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            Gestão e acompanhamento de programas e atendimentos sociais.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar print:hidden">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'geral'
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <LayoutGrid size={18} /> Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('psicologia')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'psicologia'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
          }`}
        >
          <BrainCircuit size={18} /> Psicologia
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'geral' && (
          <motion.div
            key="geral"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Dashboard blocks */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Famílias Atendidas</p>
                <h4 className="text-3xl font-black text-neutral-900 dark:text-white">1.240</h4>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'psicologia' && (
          <motion.div
            key="psicologia"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Psicologia Sub-tabs */}
            <div className="bg-white dark:bg-neutral-900 p-2 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex gap-2 overflow-x-auto custom-scrollbar shadow-sm print:hidden">
              <button
                onClick={() => setPsicologiaSubTab('relatorios')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  psicologiaSubTab === 'relatorios'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <FileText size={16} /> Relatórios
              </button>
              <button
                onClick={() => setPsicologiaSubTab('prontuarios')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  psicologiaSubTab === 'prontuarios'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <ClipboardList size={16} /> Prontuários
              </button>
              <button
                onClick={() => setPsicologiaSubTab('encaminhamentos')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  psicologiaSubTab === 'encaminhamentos'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <MessagesSquare size={16} /> Encaminhamentos
              </button>
              <button
                onClick={() => setPsicologiaSubTab('dinamicas')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  psicologiaSubTab === 'dinamicas'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Lightbulb size={16} /> Dinâmicas e Oficinas
              </button>
            </div>

            {/* Sub-tab Content */}
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm min-h-[400px] print:border-none print:shadow-none print:p-0 print:bg-transparent">
              {psicologiaSubTab === 'relatorios' && <RelatoriosTab />}
              {psicologiaSubTab === 'prontuarios' && <ProntuariosTab />}
              {psicologiaSubTab === 'encaminhamentos' && <EncaminhamentosTab />}
              {psicologiaSubTab === 'dinamicas' && <DinamicasTab />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
