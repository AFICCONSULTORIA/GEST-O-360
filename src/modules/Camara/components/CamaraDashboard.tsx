import React from 'react';
import { motion } from 'motion/react';
import { 
  Landmark, FileText, Vote, Users, Calendar, AlertCircle, 
  CheckCircle2, Clock, Plus, ArrowUpRight, TrendingUp, 
  MessageSquare, ShieldCheck, PlayCircle, Eye, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { MateriaLegislativa, SessaoPlenaria, Indicacao, Vereador } from '../types';

interface CamaraDashboardProps {
  materias: MateriaLegislativa[];
  sessoes: SessaoPlenaria[];
  indicacoes: Indicacao[];
  vereadores: Vereador[];
  onNavigateTab: (tab: any) => void;
  onOpenNovaMateria: () => void;
  onOpenNovaIndicacao: () => void;
  onSelectMateria: (materia: MateriaLegislativa) => void;
  onStartSessao: (sessao: SessaoPlenaria) => void;
}

const COLORS = ['#003B6F', '#00A86B', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

export const CamaraDashboard: React.FC<CamaraDashboardProps> = ({
  materias,
  sessoes,
  indicacoes,
  vereadores,
  onNavigateTab,
  onOpenNovaMateria,
  onOpenNovaIndicacao,
  onSelectMateria,
  onStartSessao
}) => {
  // Cálculos de métricas
  const materiasEmTramitacao = materias.filter(m => !['Sancionado', 'Promulgado', 'Arquivado', 'Rejeitado'].includes(m.status));
  const sessoesRealizadas = sessoes.filter(s => s.status === 'Encerrada').length;
  const sessaoAtivaOuProxima = sessoes.find(s => s.status === 'Em Andamento') || sessoes.find(s => s.status === 'Agendada') || sessoes[0];
  
  const indicacoesRespondidas = indicacoes.filter(i => ['Respondido', 'Atendido'].includes(i.status)).length;
  const indicacoesVencidas = indicacoes.filter(i => i.status === 'Vencido').length;
  const taxaRespostaExecutivo = indicacoes.length > 0 ? Math.round((indicacoesRespondidas / indicacoes.length) * 100) : 0;

  // Gráfico por tipo de matéria
  const materiasPorTipo = React.useMemo(() => {
    const counts: Record<string, number> = {};
    materias.forEach(m => {
      counts[m.tipo] = (counts[m.tipo] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('Projeto de Lei', 'PL'), value }));
  }, [materias]);

  // Gráfico por partido
  const producaoPorPartido = React.useMemo(() => {
    const counts: Record<string, number> = {};
    vereadores.forEach(v => {
      const pls = v.estatisticas?.pls_apresentados || 0;
      counts[v.partido] = (counts[v.partido] || 0) + pls;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vereadores]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. HERO COM PRÓXIMA SESSÃO & AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Banner Sessão Plenária */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#002244] via-[#003B6F] to-[#0A4D8C] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {sessaoAtivaOuProxima?.status === 'Em Andamento' ? 'Sessão em Andamento no Plenário' : 'Próxima Sessão Plenária'}
              </span>
              <span className="text-xs text-neutral-300 font-mono font-bold">
                {sessaoAtivaOuProxima ? `${sessaoAtivaOuProxima.numero}ª Sessão ${sessaoAtivaOuProxima.tipo}/${sessaoAtivaOuProxima.ano}` : 'Sessão Ordinária'}
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight mb-2">
              Plenário Legislativo Vereador Presidente
            </h3>
            <p className="text-neutral-300 text-sm max-w-xl line-clamp-2">
              {sessaoAtivaOuProxima?.ata_resumida || 'Ordem do dia em votação: Projetos de Lei prioritários e requerimentos de urgência regimental.'}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-neutral-200">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-emerald-400" />
                <span>{sessaoAtivaOuProxima?.data_sessao || 'Hoje'} às {sessaoAtivaOuProxima?.hora_inicio || '19:00'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-sky-300" />
                <span>{sessaoAtivaOuProxima?.presencas?.filter(p => p.presente).length || vereadores.length} de {vereadores.length} Parlamentares</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (sessaoAtivaOuProxima) onStartSessao(sessaoAtivaOuProxima);
                  onNavigateTab('plenario');
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <PlayCircle size={16} /> Abrir Painel de Votação
              </button>
            </div>
          </div>
        </div>

        {/* Card Radar PNTP & Transparência Rápido */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-7 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-neutral-600 dark:text-neutral-300">
              <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={22} />
              <h4 className="font-bold text-sm tracking-wide">Transparência ATRICON</h4>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase rounded-lg border border-amber-200 dark:border-amber-500/20">
              Selo Ouro
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-4xl font-black text-[#003B6F] dark:text-white font-['Montserrat']">94.8%</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Meta: 95% (Diamante)</span>
            </div>
            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: '94.8%' }} />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              8 de 8 pilares da transparência legislativa atendidos em conformidade.
            </p>
          </div>

          <button 
            onClick={() => onNavigateTab('pntp')}
            className="w-full py-2.5 text-xs font-bold text-[#003B6F] dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            Ver Checklist Radar PNTP <ChevronRight size={14} />
          </button>
        </div>

      </div>

      {/* 2. CARDS DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Matérias em Tramitação */}
        <div 
          onClick={() => onNavigateTab('materias')}
          className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:border-[#003B6F]/30 dark:hover:border-sky-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-[#003B6F] dark:text-sky-400">
              <FileText size={24} />
            </div>
            <span className="text-xs font-bold text-neutral-400 group-hover:text-[#003B6F] dark:group-hover:text-sky-400 flex items-center gap-1 transition-colors">
              SAPL <ArrowUpRight size={14} />
            </span>
          </div>
          <h4 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
            {materiasEmTramitacao.length}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
            Matérias em tramitação ativa
          </p>
        </div>

        {/* Card 2: Sessões Realizadas */}
        <div 
          onClick={() => onNavigateTab('plenario')}
          className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:border-[#003B6F]/30 dark:hover:border-sky-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Vote size={24} />
            </div>
            <span className="text-xs font-bold text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1 transition-colors">
              Plenário <ArrowUpRight size={14} />
            </span>
          </div>
          <h4 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
            {sessoes.length}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
            {sessoesRealizadas} sessões já encerradas
          </p>
        </div>

        {/* Card 3: Indicações & Resposta Prefeitura */}
        <div 
          onClick={() => onNavigateTab('indicacoes')}
          className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:border-[#003B6F]/30 dark:hover:border-sky-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <MessageSquare size={24} />
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md font-mono">
              {taxaRespostaExecutivo}% atendido
            </span>
          </div>
          <h4 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
            {indicacoes.length}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
            {indicacoesVencidas > 0 ? (
              <span className="text-rose-500 font-bold">{indicacoesVencidas} com prazo expirado</span>
            ) : (
              'Indicações à Prefeitura'
            )}
          </p>
        </div>

        {/* Card 4: Vereadores & Gabinetes */}
        <div 
          onClick={() => onNavigateTab('vereadores')}
          className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:border-[#003B6F]/30 dark:hover:border-sky-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users size={24} />
            </div>
            <span className="text-xs font-bold text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center gap-1 transition-colors">
              Mesa <ArrowUpRight size={14} />
            </span>
          </div>
          <h4 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
            {vereadores.length}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
            Parlamentares em exercício
          </p>
        </div>

      </div>

      {/* 3. GRÁFICOS E MATÉRIAS EM DESTAQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico 1: Produção Legislativa por Tipo */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
              Proposições por Categoria
            </h4>
            <span className="text-xs text-neutral-400">Exercício 2026</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materiasPorTipo} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#003B6F" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Bancadas Partidárias */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
              Produção por Bancada Partidária
            </h4>
            <span className="text-xs text-neutral-400">Total de PLs</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={producaoPorPartido} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#00A86B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lista: Matérias Recentes & Prazos */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                Últimas Matérias no SAPL
              </h4>
              <button 
                onClick={() => onNavigateTab('materias')}
                className="text-xs text-[#003B6F] dark:text-sky-400 font-bold hover:underline"
              >
                Ver todas
              </button>
            </div>

            <div className="space-y-3">
              {materias.slice(0, 3).map(materia => (
                <div 
                  key={materia.id}
                  onClick={() => onSelectMateria(materia)}
                  className="p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
                      {materia.numero}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {materia.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {materia.ementa}
                  </h5>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Autor: {materia.autor_nome}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <button 
              onClick={onOpenNovaMateria}
              className="flex-1 py-2.5 bg-[#003B6F] dark:bg-sky-600 hover:bg-[#002b52] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#003B6F]/20 cursor-pointer"
            >
              <Plus size={14} /> Nova Matéria
            </button>
            <button 
              onClick={onOpenNovaIndicacao}
              className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare size={14} /> Nova Indicação
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
