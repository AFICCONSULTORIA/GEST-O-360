import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, ArrowRightLeft, Scale, ShieldCheck, FileSpreadsheet
} from 'lucide-react';

import { Institution, AdminUser } from '../../types';
import { RemanejamentoSaldos } from './RemanejamentoSaldos';
import { ComparativoExtratos } from './ComparativoExtratos';

interface FinanceModulesProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
}

export const FinanceModules: React.FC<FinanceModulesProps> = ({
  currentInstitution,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'extratos' | 'remanejamento'>('extratos');
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20 font-['Inter']">
      
      {/* CABEÇALHO UNIFICADO DA SECRETARIA DE FINANÇAS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-indigo-950/40 print:hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 shrink-0">
              <Landmark size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight font-['Montserrat']">
                  Secretaria de Finanças
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck size={12} /> Exercício {currentYear}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {currentInstitution?.name
                  ? `${currentInstitution.name} — Gestão de competências mensais, arquivos de extratos bancários, notas fiscais e remanejamento de saldos.`
                  : 'Gestão organizada por competência mensal de extratos bancários, notas fiscais vinculadas, histórico comparativo e remanejamento de saldos.'}
              </p>
            </div>
          </div>

          {/* Seletor Principal de Ambiente da Secretaria */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('extratos')}
              className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                activeTab === 'extratos'
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet size={16} />
              <span>Competências, Extratos & Notas</span>
            </button>

            <button
              onClick={() => setActiveTab('remanejamento')}
              className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                activeTab === 'remanejamento'
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ArrowRightLeft size={16} />
              <span>Remanejamento de Saldos</span>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <div className="min-h-[480px]">
        <AnimatePresence mode="wait">
          {activeTab === 'extratos' && (
            <motion.div
              key="extratos"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <ComparativoExtratos
                currentInstitution={currentInstitution}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {activeTab === 'remanejamento' && (
            <motion.div
              key="remanejamento"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <RemanejamentoSaldos
                currentInstitution={currentInstitution}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
