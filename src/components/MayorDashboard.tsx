import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Heart, 
  Stethoscope, 
  Lightbulb, 
  HardHat, 
  GraduationCap, 
  DollarSign, 
  Users,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Handshake,
  Award,
  FileSignature,
  PieChart
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

interface MayorDashboardProps {
  darkMode: boolean;
  userName?: string;
}

export const MayorDashboard = ({ darkMode, userName = 'Prefeito' }: MayorDashboardProps) => {
  // Dados simulados super atrativos para o Prefeito
  const sparklineData = [
    { value: 40 }, { value: 65 }, { value: 55 }, { value: 80 }, { value: 75 }, { value: 95 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header de Boas-vindas (Mobile Friendly) */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[32px] p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-purple-200 mb-2">Visão Executiva</h2>
          <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Bom dia, {userName}.</h1>
          <p className="text-purple-100 max-w-lg text-sm md:text-base leading-relaxed">
            Aqui está o resumo em tempo real da sua gestão. A aprovação da população está em alta esta semana devido aos avanços na saúde.
          </p>
        </div>
        
        {/* Quick Highlights */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-emerald-300 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Aprovação</span>
            </div>
            <p className="text-2xl font-black">78%</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-sky-300 mb-1">
              <DollarSign size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Caixa (Mi)</span>
            </div>
            <p className="text-2xl font-black">R$ 14,5</p>
          </div>
        </div>
      </div>

      {/* Seção: Saúde (A maior prioridade) */}
      <div>
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <Heart size={20} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-white">Saúde</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <Stethoscope size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={12} className="mr-1" /> +12%
              </span>
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white mb-1">4.520</p>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Consultas no Mês</p>
            
            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={sparklineData}>
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Ótimo
              </span>
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white mb-1">92%</p>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Medicamentos Entregues</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <Users size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingDown size={12} className="mr-1" /> -15%
              </span>
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white mb-1">1.204</p>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Fila de Espera (Exames)</p>
          </motion.div>
        </div>
      </div>

      {/* Seção: Obras e Serviços (Visibilidade) */}
      <div>
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <HardHat size={20} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-white">Obras e Zeladoria</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <HardHat size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-amber-100 mb-4">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Esta Semana</span>
              </div>
              <p className="text-4xl md:text-5xl font-black mb-1">342</p>
              <p className="text-sm font-bold text-amber-100">Buracos Tapados</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Lightbulb size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-blue-200 mb-4">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Neste Mês</span>
              </div>
              <p className="text-4xl md:text-5xl font-black mb-1">1.205</p>
              <p className="text-sm font-bold text-blue-200">Lâmpadas de LED Instaladas</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Seção: Educação */}
      <div>
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl">
            <GraduationCap size={20} />
          </div>
          <h3 className="text-lg font-black text-neutral-900 dark:text-white">Educação</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm col-span-2">
             <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Frequência Escolar</p>
                <TrendingUp size={16} className="text-emerald-500" />
             </div>
             <p className="text-3xl font-black text-neutral-900 dark:text-white mb-2">96,4%</p>
             <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
               <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '96.4%' }}></div>
             </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm col-span-2">
             <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Kits Merenda</p>
                <CheckCircle2 size={16} className="text-sky-500" />
             </div>
             <p className="text-3xl font-black text-neutral-900 dark:text-white mb-2">12.000</p>
             <p className="text-xs font-semibold text-neutral-500">Kits entregues este mês.</p>
          </div>
        </div>
      </div>

      {/* Seção: Balanço Semestral e Articulação (Capital Político) */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Landmark size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Balanço Semestral & Articulação</h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">Indicadores de capital político e resultados de gestão</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <Handshake size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                1º Semestre
              </span>
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white mb-1">R$ 12,5<span className="text-lg text-neutral-500 font-bold ml-1">Mi</span></p>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Emendas Captadas</p>
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 opacity-70 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Base de apoio sólida na câmara e assembleia</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <Award size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Em dia
              </span>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-3xl font-black text-neutral-900 dark:text-white">68%</p>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Plano de Governo</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-3 mb-1">
               <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '68%' }}></div>
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 opacity-70 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Promessas de campanha cumpridas</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <FileSignature size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                Execução Alta
              </span>
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white mb-1">18</p>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Convênios Assinados</p>
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 opacity-70 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Parcerias federais e estaduais ativas</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl">
                <PieChart size={24} />
              </div>
              <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingUp size={12} className="mr-1" /> +12% Base
              </span>
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white mb-1">45</p>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Projetos Aprovados</p>
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 opacity-70 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold">Ampla governabilidade no legislativo</p>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
};
