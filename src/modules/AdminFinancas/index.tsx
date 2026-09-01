import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, ArrowRightLeft, Plus, Wallet, FileText, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Info, BarChart3, Receipt, Scale, Activity, PieChart,
  ArrowUpRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, ComposedChart 
} from 'recharts';

import { RemanejamentoSaldos } from './RemanejamentoSaldos';
import { ComparativoExtratos } from './ComparativoExtratos';

// --- MOCKS ---
const MOCK_REVENUE_DATA = [
  { name: 'IPTU', previsto: 1200000, arrecadado: 1050000 },
  { name: 'ISS', previsto: 800000, arrecadado: 850000 },
  { name: 'FPM', previsto: 2500000, arrecadado: 2400000 },
  { name: 'ICMS', previsto: 1500000, arrecadado: 1600000 },
];

const MOCK_EXPENSES = [
  { id: '2026/0145', secret: 'Saúde', phase: 'Pagamento', amount: 45000.00, status: 'Regular' },
  { id: '2026/0189', secret: 'Educação', phase: 'Liquidação', amount: 12500.50, status: 'Regular' },
  { id: '2026/0201', secret: 'Obras', phase: 'Empenho', amount: 350000.00, status: 'Alerta' },
  { id: '2026/0205', secret: 'Gabinete', phase: 'Pagamento', amount: 8500.00, status: 'Regular' },
  { id: '2026/0212', secret: 'Assistência Social', phase: 'Empenho', amount: 12000.00, status: 'Crítico' },
];

export const FinanceModules = () => {
  const [activeTab, setActiveTab] = useState<'extratos' | 'remanejamento' | 'despesa' | 'arrecadacao'>('extratos');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 font-['Inter']">
      
      {/* 1. CABEÇALHO MODERNO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Landmark size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-['Montserrat']">
                Secretaria de Finanças & Gestão Fiscal
              </h2>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-[10px] font-black uppercase tracking-wider">
                SMAF 360
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Comparativo de contas, controle de extratos, notas fiscais, remanejamentos e arrecadação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            aria-label="Integrar sistema SICONFI"
          >
            <ArrowRightLeft size={14} className="text-indigo-500" /> SICONFI
          </button>
          <button 
            onClick={() => setActiveTab('extratos')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            aria-label="Novo Extrato ou Comparativo"
          >
            <Scale size={15} /> Comparativo & Extratos
          </button>
        </div>
      </div>

      {/* 2. CARDS DE MONITORAMENTO FISCAL EXECUTIVO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        
        {/* Card 1: Fluxo de Caixa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Fluxo de Caixa Mensal</h3>
                <p className="text-[11px] text-slate-400">Arrecadação vs Meta Orçada</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-[10px] font-black">
              98.3%
            </span>
          </div>

          <div className="mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-2xl font-black font-['Montserrat'] text-slate-900 dark:text-white">{formatCurrency(5900000)}</span>
              <span className="text-xs text-slate-400 font-semibold">Meta: {formatCurrency(6000000)}</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: '98.3%' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Gasto com Pessoal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Gasto com Pessoal (LRF)</h3>
                <p className="text-[11px] text-slate-400">Limite Constitucional Municipal</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} /> Regular
            </span>
          </div>

          <div className="flex items-end justify-between mt-2">
            <h4 className="text-3xl font-black text-slate-900 dark:text-white font-['Montserrat']">48.2%</h4>
            <div className="text-right text-[11px] text-slate-500 font-medium">
              <p>Alerta: <span className="font-bold text-amber-600 dark:text-amber-400">51.3%</span></p>
              <p>Teto LRF: <span className="font-bold text-rose-600 dark:text-rose-400">54.0%</span></p>
            </div>
          </div>
        </div>

        {/* Card 3: Repasse Duodécimo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                <Scale size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Repasse Câmara (Duodécimo)</h3>
                <p className="text-[11px] text-slate-400">Repasse Obrigatório Legislativo</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-black text-lg border border-purple-200 dark:border-purple-800/50">
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
        
        <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800 print:hidden">
          <div className="flex flex-wrap gap-2">
            
            <button
              onClick={() => setActiveTab('extratos')}
              className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'extratos'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Scale size={16} className={activeTab === 'extratos' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              Extratos & Comparativo Mensal
            </button>

            <button
              onClick={() => setActiveTab('remanejamento')}
              className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'remanejamento'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <ArrowRightLeft size={16} className={activeTab === 'remanejamento' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              Remanejamento de Saldos
            </button>

            <button
              onClick={() => setActiveTab('despesa')}
              className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'despesa'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Receipt size={16} className={activeTab === 'despesa' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              Pipeline da Despesa
            </button>

            <button
              onClick={() => setActiveTab('arrecadacao')}
              className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'arrecadacao'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/60 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 size={16} className={activeTab === 'arrecadacao' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              Arrecadação em Tempo Real
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
              >
                <RemanejamentoSaldos />
              </motion.div>
            )}

            {activeTab === 'despesa' && (
              <motion.div
                key="despesa"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-['Montserrat']">Pipeline da Despesa Pública</h3>
                    <p className="text-xs text-slate-500">Acompanhamento dos estágios de Empenho, Liquidação e Pagamento.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Processo</th>
                        <th className="py-3 px-4">Secretaria</th>
                        <th className="py-3 px-4">Fase</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {MOCK_EXPENSES.map((exp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{exp.id}</td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">{exp.secret}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border inline-block ${
                              exp.phase === 'Empenho' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                              exp.phase === 'Liquidação' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                            }`}>
                              {exp.phase}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black font-['Montserrat'] text-slate-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors mr-2"
                              aria-label={`Visualizar detalhes do processo ${exp.id}`}
                            >
                              Visualizar
                            </button>
                            <button 
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                              aria-label={`Aprovar trâmite do processo ${exp.id}`}
                            >
                              Aprovar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'arrecadacao' && (
              <motion.div
                key="arrecadacao"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-['Montserrat']">Receitas Previstas vs. Arrecadadas (Mês)</h3>
                    <p className="text-xs text-slate-500">Monitoramento das principais fontes de receitas municipais.</p>
                  </div>
                </div>
                <div className="h-[350px] w-full bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={MOCK_REVENUE_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#888', fontSize: 12, fontWeight: 'bold' }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`} 
                        tick={{ fill: '#888', fontSize: 12 }} 
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="previsto" name="Receita Prevista" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={55} />
                      <Bar dataKey="arrecadado" name="Receita Arrecadada" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={55} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
