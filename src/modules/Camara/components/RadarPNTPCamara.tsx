import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Globe, CheckCircle2, XCircle, Award, 
  HelpCircle, ExternalLink, Download, Sparkles, TrendingUp 
} from 'lucide-react';
import { CriterioPNTPCamara } from '../types';
import { CamaraService } from '../services/camaraService';
import { showToast } from '../../../components/ui/Toast';

export const RadarPNTPCamara: React.FC = () => {
  const [criterios, setCriterios] = useState<CriterioPNTPCamara[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CamaraService.getPNTPChecklist().then(data => {
      setCriterios(data);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (id: string) => {
    const updated = await CamaraService.toggleCriterioPNTP(id);
    setCriterios(updated);
    showToast('Critério de transparência atualizado!', 'info');
  };

  // Cálculo da pontuação
  const totalPontos = criterios.reduce((acc, c) => acc + c.peso, 0);
  const pontosObtidos = criterios.filter(c => c.atendido).reduce((acc, c) => acc + c.peso, 0);
  const percentual = totalPontos > 0 ? Math.round((pontosObtidos / totalPontos) * 100) : 0;

  let selo = 'Selo Prata';
  let seloCor = 'bg-neutral-100 text-neutral-700 border-neutral-300';
  if (percentual >= 95) {
    selo = 'Selo Diamante 💎';
    seloCor = 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300';
  } else if (percentual >= 85) {
    selo = 'Selo Ouro 🥇';
    seloCor = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300';
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. HEADER & SCORE GAUGE */}
      <div className="bg-gradient-to-br from-[#002B49] via-[#003B6F] to-[#0A548F] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Globe className="text-sky-300" size={24} />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-200">
              Programa Nacional de Transparência Pública (ATRICON)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight">
            Radar da Transparência • Poder Legislativo
          </h2>
          <p className="text-xs text-neutral-200 leading-relaxed">
            Autoavaliação dos critérios oficiais de transparência exigidos pelos Tribunais de Contas e Associação dos Membros dos Tribunais de Contas do Brasil.
          </p>
        </div>

        {/* Card do Score */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-center shrink-0 min-w-[220px]">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-200 mb-1">
            Índice de Transparência
          </div>
          <div className="text-5xl font-black font-['Montserrat'] text-white">
            {percentual}%
          </div>
          <div className={`mt-3 py-1.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border inline-block ${seloCor}`}>
            {selo}
          </div>
        </div>
      </div>

      {/* 2. PILARES & CHECKLIST */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h4 className="font-bold text-neutral-900 dark:text-white text-base">
              Checklist de Critérios da Matriz ATRICON 2026
            </h4>
            <p className="text-xs text-neutral-500">
              Marque os itens atendidos no portal legislativo para recalcular o índice de conformidade.
            </p>
          </div>
          <button
            onClick={() => showToast('Relatório de Diagnóstico de Transparência exportado!', 'success')}
            className="px-5 py-2.5 bg-[#003B6F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#003B6F]/20 cursor-pointer"
          >
            <Download size={14} /> Exportar Diagnóstico PDF
          </button>
        </div>

        <div className="space-y-4">
          {criterios.map(crit => (
            <div
              key={crit.id}
              onClick={() => handleToggle(crit.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                crit.atendido
                  ? 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  crit.atendido ? 'bg-emerald-500 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-transparent'
                }`}>
                  <CheckCircle2 size={16} />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {crit.categoria}
                    </span>
                    {crit.obrigatorio && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        Obrigatório
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-neutral-400">
                      Peso: {crit.peso} pts
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-neutral-900 dark:text-white">
                    {crit.item}
                  </h5>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {crit.criterio_atricon}
                  </p>
                  {crit.evidencia && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      ✓ Evidência: {crit.evidencia}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-bold px-3 py-1 rounded-xl ${
                  crit.atendido 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}>
                  {crit.atendido ? 'Conforme' : 'Não Atendido'}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
