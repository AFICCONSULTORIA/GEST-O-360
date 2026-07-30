import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, ArrowRightLeft, Plus, Wallet, FileText, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Info, BarChart3, Receipt, Scale, Activity 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, ComposedChart 
} from 'recharts';

import { RemanejamentoSaldos } from './RemanejamentoSaldos';

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
  const [activeTab, setActiveTab] = useState<'remanejamento' | 'despesa' | 'arrecadacao'>('remanejamento');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 font-['Inter']">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#003B6F] dark:text-white tracking-tight flex items-center gap-3 font-['Montserrat']">
            <Landmark className="text-[#003B6F] dark:text-white" size={32} />
            Execução Orçamentária & Finanças
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            Monitoramento fiscal e gestão de despesas e arrecadação da SMAF.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-[#003B6F] dark:text-white rounded-xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Integrar sistema SICONFI"
          >
            <ArrowRightLeft size={16} /> Integrar SICONFI
          </button>
          <button 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00A86B] text-white rounded-xl font-bold text-sm hover:bg-[#00905B] transition-colors shadow-lg shadow-[#00A86B]/20"
            aria-label="Nova conciliação bancária"
          >
            <Plus size={16} /> Nova Conciliação
          </button>
        </div>
      </div>

      {/* 2. CARDS DE MONITORAMENTO FISCAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Fluxo de Caixa */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Wallet size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Fluxo de Caixa (Mês)</h3>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-500">Arrecadado: <strong className="text-neutral-900 dark:text-white">{formatCurrency(5900000)}</strong></span>
              <span className="text-neutral-500">Meta: {formatCurrency(6000000)}</span>
            </div>
            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#00A86B] rounded-full" style={{ width: '98%' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Gasto com Pessoal */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Activity size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Gasto com Pessoal (LRF)</h3>
            </div>
            <span className="px-2.5 py-1 bg-[#00A86B]/10 text-[#00A86B] border border-[#00A86B]/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 size={12} /> Regular
            </span>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <h4 className="text-4xl font-black text-neutral-900 dark:text-white font-['Montserrat']">48.2%</h4>
            <div className="pb-1 text-xs text-neutral-500">
              <p>Alerta: 51.3%</p>
              <p>Teto: 54.0%</p>
            </div>
          </div>
        </div>

        {/* Card 3: Repasse Duodécimo */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Scale size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Repasse Câmara (Duodécimo)</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-full border-4 border-[#003B6F] text-[#003B6F] dark:border-white dark:text-white font-black">
              6.5%
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Dentro do limite constitucional (6% a 7%). Repasse mensal obrigatório.
            </p>
          </div>
        </div>
      </div>

      {/* 3. ÁREA CENTRAL (Abas) */}
      <div className="bg-white dark:bg-[#171717] rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="flex flex-wrap border-b border-neutral-100 dark:border-neutral-800 p-2 gap-2 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('remanejamento')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'remanejamento'
                ? 'bg-white dark:bg-[#171717] text-[#003B6F] dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Aba Remanejamento e Distribuição de Saldos"
          >
            <ArrowRightLeft size={18} /> Remanejamento & Distribuição de Saldos
          </button>
          <button
            onClick={() => setActiveTab('despesa')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'despesa'
                ? 'bg-white dark:bg-[#171717] text-[#003B6F] dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Aba Fluxo da Despesa Pública"
          >
            <Receipt size={18} /> Fluxo da Despesa Pública
          </button>
          <button
            onClick={() => setActiveTab('arrecadacao')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'arrecadacao'
                ? 'bg-white dark:bg-[#171717] text-[#003B6F] dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Aba Arrecadação em Tempo Real"
          >
            <BarChart3 size={18} /> Arrecadação em Tempo Real
          </button>
        </div>

        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'remanejamento' && (
              <motion.div
                key="remanejamento"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <RemanejamentoSaldos />
              </motion.div>
            )}

            {activeTab === 'despesa' && (
              <motion.div
                key="despesa"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-[#003B6F] dark:text-white">Pipeline Orçamentário</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-black uppercase tracking-widest text-neutral-400">
                        <th className="py-4 font-black">Processo</th>
                        <th className="py-4 font-black">Secretaria</th>
                        <th className="py-4 font-black">Fase</th>
                        <th className="py-4 font-black">Valor</th>
                        <th className="py-4 font-black text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_EXPENSES.map((exp, idx) => (
                        <tr key={idx} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors">
                          <td className="py-4 font-bold text-neutral-900 dark:text-white">{exp.id}</td>
                          <td className="py-4 text-neutral-600 dark:text-neutral-300">{exp.secret}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border inline-block ${
                              exp.phase === 'Empenho' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                              exp.phase === 'Liquidação' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' :
                              'bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/20'
                            }`}>
                              {exp.phase}
                            </span>
                          </td>
                          <td className="py-4 font-medium text-neutral-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                          <td className="py-4 text-right">
                            <button 
                              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-[#003B6F] dark:text-white rounded-lg text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors mr-2"
                              aria-label={`Visualizar detalhes do processo ${exp.id}`}
                            >
                              Visualizar
                            </button>
                            <button 
                              className="px-4 py-2 bg-[#00A86B] text-white rounded-lg text-xs font-bold hover:bg-[#00905B] transition-colors"
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-[#003B6F] dark:text-white">Receitas Previstas vs. Arrecadadas (Mês)</h3>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <ComposedChart data={MOCK_REVENUE_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
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
                      <Bar dataKey="previsto" name="Receita Prevista" fill="#003B6F" radius={[8, 8, 0, 0]} maxBarSize={60} />
                      <Bar dataKey="arrecadado" name="Receita Arrecadada" fill="#00A86B" radius={[8, 8, 0, 0]} maxBarSize={60} />
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
