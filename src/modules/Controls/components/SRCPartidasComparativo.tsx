import React from 'react';
import { ArrowRight, BookOpen, Layers, CheckCircle2, AlertCircle, FileDiff, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { PartidaContabil, TipoAjusteContabil, TIPOS_AJUSTES_CONTABEIS } from '../types/accountingChanges';

interface SRCPartidasComparativoProps {
  partidaOriginal?: PartidaContabil;
  partidaProposta?: PartidaContabil;
  currentStateText?: string;
  proposedStateText?: string;
  valorOriginal?: number;
  valorAjuste?: number;
  tipoAjuste?: TipoAjusteContabil | string;
}

export const SRCPartidasComparativo: React.FC<SRCPartidasComparativoProps> = ({
  partidaOriginal,
  partidaProposta,
  currentStateText,
  proposedStateText,
  valorOriginal = 0,
  valorAjuste = 0,
  tipoAjuste
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const tipoAjusteInfo = TIPOS_AJUSTES_CONTABEIS.find(t => t.value === tipoAjuste);

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Comparativo com Tipo de Ajuste */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-100/80 dark:bg-neutral-900/80 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
            <FileDiff size={15} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-neutral-500 dark:text-neutral-400 block">
              Trilha de Retificação Contábil (MCASP & PCASP)
            </span>
            <strong className="text-neutral-900 dark:text-white font-black text-xs">
              {tipoAjusteInfo?.label || 'Ajuste / Retificação Contábil'}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div>
            <span className="text-[10px] text-neutral-400 block">Valor Original:</span>
            <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{formatCurrency(valorOriginal)}</span>
          </div>
          <ArrowRight size={14} className="text-neutral-400 mt-2" />
          <div>
            <span className="text-[10px] text-indigo-500 font-bold block">Valor do Ajuste:</span>
            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(valorAjuste)}</span>
          </div>
        </div>
      </div>

      {/* Grid Comparativo: Lançamento Primitivo vs Lançamento Retificador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lançamento Primitivo (DE) */}
        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-900/40 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle size={13} /> Partida Primitiva (Como Está - DE)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-150 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
              Registro Original
            </span>
          </div>

          {partidaOriginal && (partidaOriginal.contaDebitoCodigo || partidaOriginal.contaCreditoCodigo) ? (
            <div className="space-y-2.5 text-xs">
              {/* Conta Débito */}
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">Conta a Débito (Aplicação):</span>
                <div className="font-mono font-bold text-neutral-900 dark:text-white text-xs">
                  {partidaOriginal.contaDebitoCodigo || '3.x.x.x.x.xx'}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {partidaOriginal.contaDebitoNome || 'Despesa / VPD Primitiva'}
                </div>
              </div>

              {/* Conta Crédito */}
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">Conta a Crédito (Origem):</span>
                <div className="font-mono font-bold text-neutral-900 dark:text-white text-xs">
                  {partidaOriginal.contaCreditoCodigo || '1.x.x.x.x.xx'}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {partidaOriginal.contaCreditoNome || 'Disponibilidades / Passivo'}
                </div>
              </div>

              {/* Fonte e Elemento */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/30 text-[11px]">
                <div>
                  <span className="text-[10px] text-neutral-500 block">Fonte de Recursos:</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                    {partidaOriginal.fonteRecursoCodigo || '1.500.0000'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">Elemento / Dotação:</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                    {partidaOriginal.elementoDespesaCodigo || '3.3.90.39'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white/80 dark:bg-neutral-900/60 rounded-xl border border-amber-200/60 dark:border-amber-900/30 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {currentStateText || 'Registro contábil original conforme empenho/documento primitivo.'}
            </div>
          )}
        </div>

        {/* Lançamento Retificador Proposto (PARA) */}
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-emerald-900/40 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Partida Retificadora (Como Fica - PARA)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-150 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
              Lançamento de Ajuste
            </span>
          </div>

          {partidaProposta && (partidaProposta.contaDebitoCodigo || partidaProposta.contaCreditoCodigo) ? (
            <div className="space-y-2.5 text-xs">
              {/* Nova Conta Débito */}
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">Nova Conta a Débito (Retificada):</span>
                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                  {partidaProposta.contaDebitoCodigo || '3.x.x.x.x.xx'}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {partidaProposta.contaDebitoNome || 'Nova Despesa / VPD Reclassificada'}
                </div>
              </div>

              {/* Nova Conta Crédito */}
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">Nova Conta a Crédito (Retificada):</span>
                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                  {partidaProposta.contaCreditoCodigo || '1.x.x.x.x.xx'}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {partidaProposta.contaCreditoNome || 'Contrapartida Contábil / Estorno'}
                </div>
              </div>

              {/* Nova Fonte e Elemento */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/30 text-[11px]">
                <div>
                  <span className="text-[10px] text-neutral-500 block">Nova Fonte de Recursos:</span>
                  <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                    {partidaProposta.fonteRecursoCodigo || '1.500.0000'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">Novo Elemento / Dotação:</span>
                  <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                    {partidaProposta.elementoDespesaCodigo || '3.3.90.30'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white/80 dark:bg-neutral-900/60 rounded-xl border border-emerald-200/60 dark:border-emerald-900/30 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {proposedStateText || 'Lançamento corretivo proposto com estorno autônomo no Razão Contábil.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
