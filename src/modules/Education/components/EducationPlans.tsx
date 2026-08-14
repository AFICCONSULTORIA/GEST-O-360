import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, FileText, BookOpen, CheckCircle2, Clock, 
  AlertTriangle, Download, Printer, ShieldCheck, 
  GraduationCap, ChevronRight, X, Sparkles, Building2
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';

export interface PmeGoal {
  id: string;
  number: number;
  title: string;
  category: string;
  targetDescription: string;
  progressPercentage: number;
  status: 'Atingida' | 'Em Andamento' | 'Atenção' | 'Não Iniciada';
  lastReviewDate: string;
}

const DEFAULT_PME_GOALS: PmeGoal[] = [
  {
    id: '1',
    number: 1,
    title: 'Educação Infantil (Creche & Pré-Escola)',
    category: 'Acesso e Universalização',
    targetDescription: 'Universalizar a pré-escola (4 e 5 anos) e ampliar a oferta de vagas em creches para atender no mínimo 50% das crianças de até 3 anos.',
    progressPercentage: 78,
    status: 'Em Andamento',
    lastReviewDate: '2024-04-30'
  },
  {
    id: '2',
    number: 2,
    title: 'Ensino Fundamental de 9 Anos',
    category: 'Universalização',
    targetDescription: 'Universalizar o ensino fundamental de 9 anos para toda a população de 6 a 14 anos e garantir que pelo menos 95% dos alunos concluam na idade recomendada.',
    progressPercentage: 94,
    status: 'Em Andamento',
    lastReviewDate: '2024-05-10'
  },
  {
    id: '3',
    number: 5,
    title: 'Alfabetização na Idade Certa',
    category: 'Qualidade do Ensino',
    targetDescription: 'Alfabetizar todas as crianças municipais, no máximo, até o final do 2º ano do Ensino Fundamental com domínio de leitura e cálculo básico.',
    progressPercentage: 86,
    status: 'Em Andamento',
    lastReviewDate: '2024-05-15'
  },
  {
    id: '4',
    number: 7,
    title: 'Aprendizado Adequado e IDEB',
    category: 'Qualidade do Ensino',
    targetDescription: 'Atingir média de 5.8 nos Anos Iniciais do IDEB e 5.2 nos Anos Finais, com redução da distorção idade-série.',
    progressPercentage: 90,
    status: 'Em Andamento',
    lastReviewDate: '2024-03-20'
  },
  {
    id: '5',
    number: 15,
    title: 'Valorização e Formação Docente',
    category: 'Profissionais da Educação',
    targetDescription: 'Garantir política de formação continuada para 100% dos professores e cumprimento do Piso Salarial Profissional Nacional.',
    progressPercentage: 100,
    status: 'Atingida',
    lastReviewDate: '2024-05-01'
  },
];

export const EducationPlans: React.FC = () => {
  const [goals, setGoals] = useState<PmeGoal[]>(() => {
    const saved = localStorage.getItem('@gestao360:education_pme_goals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_PME_GOALS;
  });

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PmeGoal | null>(null);
  const [goalProgress, setGoalProgress] = useState<number>(50);
  const [goalStatus, setGoalStatus] = useState<PmeGoal['status']>('Em Andamento');

  const saveGoals = (updated: PmeGoal[]) => {
    setGoals(updated);
    localStorage.setItem('@gestao360:education_pme_goals', JSON.stringify(updated));
  };

  const handleOpenGoalModal = (g: PmeGoal) => {
    setEditingGoal(g);
    setGoalProgress(g.progressPercentage);
    setGoalStatus(g.status);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    const updated = goals.map(g => g.id === editingGoal.id ? {
      ...g,
      progressPercentage: Number(goalProgress),
      status: goalStatus,
      lastReviewDate: new Date().toISOString().split('T')[0]
    } : g);

    saveGoals(updated);
    showToast('Meta do PME atualizada com sucesso!', 'success');
    setEditingGoal(null);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* 3 Cartões de Visão Geral dos Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* PME */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                <Target size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black italic text-neutral-900 dark:text-white">Plano Municipal <span className="text-neutral-400 font-normal">de Educação</span></h4>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Lei Municipal do PME</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-6">
              Monitoramento das 20 metas do PME vigentes, com comissão de acompanhamento e controle dos índices educacionais.
            </p>
          </div>
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 italic">89% Média Atingida</span>
            <span className="text-[10px] font-black uppercase text-neutral-400">Vigência Decenal</span>
          </div>
        </div>

        {/* SIOPE */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm group hover:border-sky-200 dark:hover:border-sky-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black italic text-neutral-900 dark:text-white">SIOPE & <span className="text-neutral-400 font-normal">FNDE</span></h4>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Prestação Bimestral</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-6">
              Sistema de Informações sobre Orçamentos Públicos em Educação. Controle de remessas e conformidade com o Art. 212 da CF.
            </p>
          </div>
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <span className="text-xs font-black text-sky-600 dark:text-sky-400 italic">1º Bimestre: Transmitido</span>
            <span className="text-[10px] font-black uppercase text-neutral-400">2º Bimestre: Em Aberto</span>
          </div>
        </div>

        {/* PPPs */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-8 shadow-sm group hover:border-amber-200 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <BookOpen size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black italic text-neutral-900 dark:text-white">Projetos Pedagógicos <span className="text-neutral-400 font-normal">(PPP)</span></h4>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Todas as Escolas</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-6">
              Vigência e atualização anual dos Projetos Político-Pedagógicos e Regimentos Escolares das unidades municipais.
            </p>
          </div>
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 italic">100% Homologados</span>
            <span className="text-[10px] font-black uppercase text-neutral-400">Aprovados pelo CME</span>
          </div>
        </div>

      </div>

      {/* Banner de Relatório Geral de Transparência Ativa */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 sm:p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-15 pointer-events-none">
          <GraduationCap size={160} />
        </div>
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> Transparência Pública Municipal
          </div>
          <h3 className="text-3xl font-black tracking-tight italic">
            Relatório Geral de <span className="underline underline-offset-8">Gestão da Educação</span>
          </h3>
          <p className="text-emerald-50 text-xs font-medium opacity-90 leading-relaxed">
            Consolidação completa para publicação no Portal da Transparência, Ouvidoria e Prestação de Contas ao Tribunal de Contas do Estado (TCE).
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="bg-white text-emerald-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Printer size={16} /> Visualizar / Imprimir Relatório
            </button>
            <button 
              onClick={() => showToast('Dossiê enviado ao controle interno e auditoria!', 'success')}
              className="bg-emerald-800/60 border border-emerald-400/40 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all"
            >
              Enviar para Auditoria
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Metas do PME */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/30">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Target size={20} className="text-emerald-500" />
              Metas Estratégicas do Plano Municipal de Educação (PME)
            </h3>
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
              Clique em qualquer meta para atualizar o progresso ou status do comitê.
            </p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {goals.map((goal) => (
            <div 
              key={goal.id} 
              className="p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
            >
              <div className="flex items-start gap-4 max-w-2xl">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                  M{goal.number}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">{goal.title}</h4>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
                      {goal.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                    {goal.targetDescription}
                  </p>
                  <p className="text-[10px] text-neutral-400">Última avaliação: {goal.lastReviewDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
                <div className="w-36 space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-neutral-400">Progresso</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{goal.progressPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${goal.progressPercentage}%` }} 
                    />
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  goal.status === 'Atingida' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                  goal.status === 'Em Andamento' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {goal.status}
                </span>

                <button 
                  onClick={() => handleOpenGoalModal(goal)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-white text-neutral-700 hover:text-white dark:hover:text-neutral-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Atualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Editar Meta do PME */}
      <AnimatePresence>
        {editingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Target className="text-emerald-500" />
                  Meta {editingGoal.number} · PME
                </h3>
                <button 
                  onClick={() => setEditingGoal(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-4 bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                    {editingGoal.title}: {editingGoal.targetDescription}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">
                    Percentual Alcançado (%): {goalProgress}%
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={goalProgress}
                    onChange={(e) => setGoalProgress(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Status da Meta</label>
                  <select 
                    value={goalStatus}
                    onChange={(e) => setGoalStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Atingida">Atingida / Concluída</option>
                    <option value="Atenção">Atenção / Abaixo da Meta</option>
                    <option value="Não Iniciada">Não Iniciada</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setEditingGoal(null)}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Salvar Progresso
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Relatório Geral para Impressão */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-neutral-900 rounded-3xl p-8 max-w-3xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              {/* Cabeçalho do Relatório */}
              <div className="flex justify-between items-start pb-6 border-b border-neutral-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-black">
                    <GraduationCap size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Prefeitura Municipal de Torixoréu</h2>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Secretaria Municipal de Educação · Relatório de Gestão 2024</p>
                  </div>
                </div>
                <div className="flex gap-2 print:hidden">
                  <button 
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <Printer size={14} /> Imprimir / Salvar PDF
                  </button>
                  <button 
                    onClick={() => setIsReportModalOpen(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Corpo do Relatório */}
              <div className="py-6 space-y-6 text-xs text-neutral-700">
                
                {/* Indicadores Fiscais */}
                <div>
                  <h4 className="font-black text-sm uppercase text-neutral-900 mb-3 border-b pb-1">1. Aplicação Constitucional de Recursos (MDE e FUNDEB)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">MDE Mínimo (25%)</p>
                      <p className="text-lg font-black text-emerald-600">26.4%</p>
                      <p className="text-[9px] text-emerald-700">Regular / Cumprido</p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">FUNDEB Magistério (70%)</p>
                      <p className="text-lg font-black text-sky-600">72.8%</p>
                      <p className="text-[9px] text-sky-700">Regular / Cumprido</p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">PNAE / Agric. Familiar</p>
                      <p className="text-lg font-black text-amber-600">34.2%</p>
                      <p className="text-[9px] text-amber-700">Mínimo legal: 30%</p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Matrículas Totais</p>
                      <p className="text-lg font-black text-neutral-900">4.850</p>
                      <p className="text-[9px] text-neutral-500">Censo Escolar Oficial</p>
                    </div>
                  </div>
                </div>

                {/* Estrutura da Rede */}
                <div>
                  <h4 className="font-black text-sm uppercase text-neutral-900 mb-3 border-b pb-1">2. Estrutura Operacional da Rede Municipal</h4>
                  <ul className="list-disc pl-5 space-y-1 font-medium">
                    <li><strong>Rede Escolar:</strong> 4 unidades ativas (2 CMEIs de Educação Infantil, 1 Escola de Ensino Fundamental I e 1 Polo Rural).</li>
                    <li><strong>Transporte Escolar (PNATE):</strong> 4 veículos em operação diária atendendo rotas rurais e alunos com necessidades especiais.</li>
                    <li><strong>Alimentação Escolar (PNAE):</strong> 9.200 refeições preparadas e servidas diariamente com cardápios elaborados por nutricionista RT.</li>
                    <li><strong>Controle Social:</strong> Conselhos CACS-FUNDEB, CAE e CME devidamente constituídos com mandatos vigentes e atas registradas.</li>
                  </ul>
                </div>

                {/* Síntese do PME */}
                <div>
                  <h4 className="font-black text-sm uppercase text-neutral-900 mb-3 border-b pb-1">3. Execução das Metas do PME</h4>
                  <div className="space-y-2">
                    {goals.map((g) => (
                      <div key={g.id} className="flex justify-between items-center p-2 bg-neutral-50 rounded-lg">
                        <span className="font-bold">Meta {g.number}: {g.title}</span>
                        <span className="font-black text-emerald-600">{g.progressPercentage}% ({g.status})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assinatura */}
                <div className="pt-8 border-t border-neutral-200 grid grid-cols-2 gap-8 text-center">
                  <div>
                    <div className="border-b border-neutral-400 w-48 mx-auto mb-2" />
                    <p className="font-bold text-xs">Secretário(a) Municipal de Educação</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Prefeitura de Torixoréu</p>
                  </div>
                  <div>
                    <div className="border-b border-neutral-400 w-48 mx-auto mb-2" />
                    <p className="font-bold text-xs">Controle Interno / Auditoria</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Gestão 360 Compliance</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
