import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Layers, Users, FileText, Calendar, Clock, Plus, 
  CheckCircle2, AlertCircle, ChevronRight, UserCheck, ShieldCheck 
} from 'lucide-react';
import { Comissao, MateriaLegislativa, Vereador } from '../types';

interface ComissoesLegislativasProps {
  comissoes: Comissao[];
  materias: MateriaLegislativa[];
  vereadores: Vereador[];
  onSelectMateria: (materia: MateriaLegislativa) => void;
  onOpenNovaMateria: () => void;
}

export const ComissoesLegislativas: React.FC<ComissoesLegislativasProps> = ({
  comissoes,
  materias,
  vereadores,
  onSelectMateria,
  onOpenNovaMateria
}) => {
  const [selectedComissaoId, setSelectedComissaoId] = useState<string>(comissoes[0]?.id || '');

  const comissaoAtiva = comissoes.find(c => c.id === selectedComissaoId) || comissoes[0];

  const materiasNaComissao = materias.filter(m => 
    m.comissao_atual_id === comissaoAtiva?.id || 
    (m.status === 'Em Comissão' && m.comissao_atual_nome?.includes(comissaoAtiva?.sigla || ''))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* 1. TOPO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat'] tracking-tight flex items-center gap-3">
            <Layers className="text-[#003B6F] dark:text-sky-400" size={28} />
            Comissões Permanentes & Especiais
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Distribuição de relatorias, análise de constitucionalidade e emissão de pareceres técnicos.
          </p>
        </div>
      </div>

      {/* 2. CARDS DAS COMISSÕES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comissoes.map(com => {
          const isSelected = com.id === selectedComissaoId;
          const countMaterias = materias.filter(m => m.comissao_atual_id === com.id).length;

          return (
            <div
              key={com.id}
              onClick={() => setSelectedComissaoId(com.id)}
              className={`p-6 rounded-[28px] border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-gradient-to-br from-[#003B6F] to-[#0A4D8C] text-white border-[#003B6F] shadow-xl shadow-[#003B6F]/20'
                  : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-3 py-1 text-xs font-black font-mono rounded-lg ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-[#003B6F] dark:text-sky-400'
                  }`}>
                    {com.sigla}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  }`}>
                    {com.tipo}
                  </span>
                </div>

                <h4 className="text-base font-black font-['Montserrat'] line-clamp-1">
                  {com.nome}
                </h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-neutral-200' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {com.descricao}
                </p>
              </div>

              <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                isSelected ? 'border-white/10 text-neutral-200' : 'border-neutral-100 dark:border-neutral-800 text-neutral-500'
              }`}>
                <span>Presidente: <strong>{com.presidente_nome || 'A definir'}</strong></span>
                <span className="font-bold font-mono">{countMaterias} Matérias</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. DETALHES DA COMISSÃO SELECIONADA & FILA DE MATÉRIAS */}
      {comissaoAtiva && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Membros da Comissão */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm space-y-6">
            <div>
              <h4 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2 mb-4">
                <Users className="text-[#003B6F] dark:text-sky-400" size={18} />
                Composição dos Membros
              </h4>

              <div className="space-y-3">
                {/* Presidente */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block">
                      Presidente da Comissão
                    </span>
                    <h5 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {comissaoAtiva.presidente_nome || 'Não definido'}
                    </h5>
                  </div>
                  <UserCheck size={18} className="text-amber-500" />
                </div>

                {/* Vice-Presidente */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 tracking-wider block">
                      Vice-Presidente / Relator
                    </span>
                    <h5 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {comissaoAtiva.vice_presidente_nome || 'Não definido'}
                    </h5>
                  </div>
                  <UserCheck size={18} className="text-sky-500" />
                </div>

                {/* Membros Titulares */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block">
                    Membros Titulares & Suplentes
                  </span>
                  <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                    {comissaoAtiva.membros_nomes?.join(', ') || 'Nenhum membro extra'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-sky-50 dark:bg-sky-500/10 rounded-2xl border border-sky-100 dark:border-sky-500/20 text-xs text-sky-900 dark:text-sky-200">
              <p className="font-bold mb-1">Prazo Regimental das Comissões:</p>
              <p className="text-[11px] leading-relaxed">
                As comissões têm prazo máximo de 15 dias para emitir parecer conclusivo, prorrogável por igual período a pedido do relator.
              </p>
            </div>
          </div>

          {/* Fila de Proposições em Análise */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
                  <FileText className="text-[#003B6F] dark:text-sky-400" size={18} />
                  Fila de Proposições na {comissaoAtiva.sigla} ({materiasNaComissao.length})
                </h4>
              </div>

              {materiasNaComissao.length === 0 ? (
                <div className="text-center py-16 text-neutral-400 bg-neutral-50 dark:bg-neutral-800/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-500 opacity-60" />
                  <h5 className="font-bold text-neutral-700 dark:text-neutral-300 text-sm">Fila Zerada!</h5>
                  <p className="text-xs">Não há matérias pendentes de parecer nesta comissão.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materiasNaComissao.map(materia => (
                    <div
                      key={materia.id}
                      onClick={() => onSelectMateria(materia)}
                      className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-[#003B6F] text-white">
                            {materia.numero}
                          </span>
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                            {materia.tipo}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">
                          {materia.ementa}
                        </h5>
                        <p className="text-[11px] text-neutral-400">
                          Autor: {materia.autor_nome} • Relator: <strong className="text-neutral-700 dark:text-neutral-300">{materia.relator_nome || 'Pendente'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {materia.data_limite_comissao && (
                          <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-center gap-1">
                            <Clock size={12} /> Prazo: {materia.data_limite_comissao}
                          </span>
                        )}
                        <ChevronRight size={18} className="text-neutral-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
