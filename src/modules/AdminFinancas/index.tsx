import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, ArrowRightLeft, Wallet, CheckCircle2, 
  Scale, Activity, Sparkles, Layers, ShieldCheck
} from 'lucide-react';

import { RemanejamentoSaldos } from './RemanejamentoSaldos';
import { ComparativoExtratos } from './ComparativoExtratos';

export const FinanceModules = () => {
  const [activeTab, setActiveTab] = useState<'extratos' | 'remanejamento'>('extratos');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 font-['Inter']">
      
      {/* 1. CABEÇALHO EXECUTIVO E MODERNO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-7 md:p-9 text-white shadow-xl border border-indigo-950/40 print:hidden">
        {/* Glow de fundo */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 shrink-0">
              <Landmark size={32} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Montserrat']">
                  Secretaria de Finanças & Gestão Fiscal
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
                  <Sparkles size={12} className="text-indigo-400" /> SMAF 360
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold">
                  <ShieldCheck size={12} /> Exercício 2026
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
                Demonstrativo comparativo de contas, extratos bancários, notas fiscais apuradas e remanejamento estratégico de saldos municipais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-md text-slate-300 border border-slate-700/60 rounded-2xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SICONFI: Sincronizado
            </div>
            <button 
              onClick={() => setActiveTab('extratos')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                activeTab === 'extratos'
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/30'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
            >
              <Scale size={15} /> Comparativo Ativo
            </button>
          </div>
        </div>
      </div>

      {/* 2. CARDS DE MONITORAMENTO FISCAL EXECUTIVO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        
        {/* Card 1: Fluxo de Caixa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Fluxo de Caixa Mensal</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Arrecadação vs Meta Orçada</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[11px] font-black">
              98.3%
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-2xl font-black font-['Montserrat'] text-slate-900 dark:text-white">{formatCurrency(5900000)}</span>
              <span className="text-xs text-slate-400 font-bold">Meta: {formatCurrency(6000000)}</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/50" style={{ width: '98.3%' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Gasto com Pessoal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800/40">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Gasto com Pessoal (LRF)</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Limite Constitucional Municipal</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} /> Regular
            </span>
          </div>

          <div className="flex items-end justify-between mt-3">
            <div>
              <h4 className="text-3xl font-black text-slate-900 dark:text-white font-['Montserrat']">48.2%</h4>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Abaixo do Limite de Alerta</p>
            </div>
            <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-medium space-y-0.5">
              <p>Alerta: <span className="font-bold text-amber-600 dark:text-amber-400">51.3%</span></p>
              <p>Teto LRF: <span className="font-bold text-rose-600 dark:text-rose-400">54.0%</span></p>
            </div>
          </div>
        </div>

        {/* Card 3: Repasse Duodécimo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-800/40">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Repasse Câmara (Duodécimo)</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Repasse Obrigatório Legislativo</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 rounded-full text-[10px] font-black">
              Em dia
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-black text-lg border border-purple-200 dark:border-purple-800/50 shadow-inner">
              6.5%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Dentro do teto legal (6.0% a 7.0%). Cronograma de repasses rigorosamente em dia.
            </p>
          </div>
        </div>

      </div>

      {/* 3. SELETOR DE ABAS PRINCIPAIS (SEGMENTED CONTROL MODERNO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
            
            <button
              onClick={() => setActiveTab('extratos')}
              className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                activeTab === 'extratos'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Scale size={18} className={activeTab === 'extratos' ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'} />
              <span>Extratos & Comparativo Mensal</span>
            </button>

            <button
              onClick={() => setActiveTab('remanejamento')}
              className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                activeTab === 'remanejamento'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <ArrowRightLeft size={18} className={activeTab === 'remanejamento' ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'} />
              <span>Remanejamento de Saldos</span>
            </button>

          </div>
        </div>

        <div className="p-6 md:p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {activeTab === 'extratos' && (
              <motion.div
                key="extratos"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ComparativoExtratos />
              </motion.div>
            )}

            {activeTab === 'remanejamento' && (
              <motion.div
                key="remanejamento"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <RemanejamentoSaldos />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
