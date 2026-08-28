import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, FileText, Calendar, User, Tag, Clock, ArrowRight, 
  CheckCircle2, AlertCircle, FileCheck, Send, Plus, 
  Printer, ShieldAlert, BookOpen, Layers
} from 'lucide-react';
import { MateriaLegislativa, StatusMateria, Tramitacao, Parecer, Comissao, Vereador } from '../types';

interface MateriaDetailModalProps {
  materia: MateriaLegislativa | null;
  comissoes: Comissao[];
  vereadores: Vereador[];
  onClose: () => void;
  onAddTramitacao: (materiaId: string, tramitacao: Omit<Tramitacao, 'id' | 'materia_id'>) => void;
  onAddParecer: (materiaId: string, parecer: Omit<Parecer, 'id' | 'materia_id'>) => void;
  onPrintDocumento?: (materia: MateriaLegislativa, tipoDoc: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Protocolado': 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  'Lido no Expediente': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
  'Em Comissão': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  'Apto para Ordem do Dia': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  '1ª Votação Aprovada': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  '2ª Votação Aprovada': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  'Aprovado em Redação Final': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
  'Enviado ao Executivo': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  'Sancionado': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'Promulgado': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'Vetado': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  'Rejeitado': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  'Arquivado': 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
};

const STAGES_ORDER: StatusMateria[] = [
  'Protocolado',
  'Lido no Expediente',
  'Em Comissão',
  'Apto para Ordem do Dia',
  '1ª Votação Aprovada',
  'Enviado ao Executivo',
  'Sancionado'
];

export const MateriaDetailModal: React.FC<MateriaDetailModalProps> = ({
  materia,
  comissoes,
  vereadores,
  onClose,
  onAddTramitacao,
  onAddParecer,
  onPrintDocumento
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'timeline' | 'pareceres' | 'texto'>('geral');
  const [showNewTramitacao, setShowNewTramitacao] = useState(false);
  const [showNewParecer, setShowNewParecer] = useState(false);

  // Form states para nova tramitação
  const [novaFase, setNovaFase] = useState('');
  const [novoDespacho, setNovoDespacho] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('Secretaria Legislativa');
  const [novoStatus, setNovoStatus] = useState<StatusMateria>('Em Comissão');

  // Form states para novo parecer
  const [parecerComissaoId, setParecerComissaoId] = useState(comissoes[0]?.id || '');
  const [parecerRelatorId, setParecerRelatorId] = useState(vereadores[0]?.id || '');
  const [parecerConclusao, setParecerConclusao] = useState<'Favorável' | 'Contrário' | 'Favorável com Emenda Substitutiva' | 'Favorável com Emenda Aditiva'>('Favorável');
  const [parecerRelatorio, setParecerRelatorio] = useState('');
  const [parecerVoto, setParecerVoto] = useState('');

  if (!materia) return null;

  const handleSalvarTramitacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaFase || !novoDespacho) return;

    onAddTramitacao(materia.id, {
      data_tramitacao: new Date().toISOString().replace('T', ' ').substring(0, 19),
      fase: novaFase,
      despacho: novoDespacho,
      responsavel: novoResponsavel,
      status_resultante: novoStatus
    });

    setNovaFase('');
    setNovoDespacho('');
    setShowNewTramitacao(false);
  };

  const handleSalvarParecer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parecerRelatorio || !parecerVoto) return;

    const comissao = comissoes.find(c => c.id === parecerComissaoId);
    const relator = vereadores.find(v => v.id === parecerRelatorId);

    onAddParecer(materia.id, {
      comissao_id: parecerComissaoId,
      comissao_nome: comissao?.sigla || 'Comissão',
      relator_id: parecerRelatorId,
      relator_nome: relator?.nome_parlamentar || 'Relator',
      conclusao: parecerConclusao,
      relatorio: parecerRelatorio,
      voto_relator: parecerVoto,
      data_emissao: new Date().toISOString().split('T')[0],
      aprovado_comissao: true
    });

    setParecerRelatorio('');
    setParecerVoto('');
    setShowNewParecer(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
      >
        
        {/* Header do Modal */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-[#003B6F] text-white text-xs font-black font-mono rounded-lg shadow-sm">
                {materia.numero}
              </span>
              <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-lg">
                {materia.tipo}
              </span>
              <span className={`px-3 py-1 text-xs font-black uppercase rounded-full border ${STATUS_COLORS[materia.status] || STATUS_COLORS['Protocolado']}`}>
                {materia.status}
              </span>
              {materia.regime !== 'Ordinário' && (
                <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-500/20">
                  {materia.regime}
                </span>
              )}
            </div>

            <h3 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat'] line-clamp-2">
              {materia.ementa}
            </h3>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-neutral-400" />
                Autor: <strong className="text-neutral-800 dark:text-neutral-200">{materia.autor_nome}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-neutral-400" />
                Protocolo: {materia.data_protocolo}
              </span>
              {materia.comissao_atual_nome && (
                <span className="flex items-center gap-1.5">
                  <Layers size={14} className="text-neutral-400" />
                  Comissão: {materia.comissao_atual_nome}
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 px-6 bg-neutral-50/50 dark:bg-neutral-900/50">
          {[
            { id: 'geral', label: 'Visão Geral & Despachos', icon: FileText },
            { id: 'timeline', label: `Linha do Tempo (${materia.tramitacoes?.length || 1})`, icon: Clock },
            { id: 'pareceres', label: `Pareceres (${materia.pareceres?.length || 0})`, icon: FileCheck },
            { id: 'texto', label: 'Texto Integral', icon: BookOpen }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#003B6F] dark:border-sky-400 text-[#003B6F] dark:text-sky-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">

          {/* ABA GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              
              {/* Stepper Visual de Fases */}
              <div className="bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
                  Etapas do Processo Legislativo
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {STAGES_ORDER.map((stage, idx) => {
                    const isPassed = (materia.tramitacoes || []).some(t => t.status_resultante === stage) || materia.status === stage;
                    const isCurrent = materia.status === stage;

                    return (
                      <div 
                        key={stage}
                        className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                          isCurrent
                            ? 'bg-[#003B6F] text-white border-[#003B6F] shadow-md shadow-[#003B6F]/20'
                            : isPassed
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-white dark:bg-neutral-800/50 text-neutral-400 border-neutral-100 dark:border-neutral-800'
                        }`}
                      >
                        {isPassed && !isCurrent ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <span className="text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-current">
                            {idx + 1}
                          </span>
                        )}
                        <span className="text-[10px] font-bold leading-tight">
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalhes da Proposição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-800/30 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                  <h4 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                    Dados do Protocolo
                  </h4>
                  <div className="space-y-2 text-xs">
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Número/Ano:</strong> {materia.numero}</p>
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Tipo de Proposição:</strong> {materia.tipo}</p>
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Regime de Tramitação:</strong> {materia.regime}</p>
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Data de Entrada:</strong> {materia.data_protocolo}</p>
                    {materia.data_limite_comissao && (
                      <p><strong className="text-rose-500">Prazo Limite Regimental:</strong> {materia.data_limite_comissao}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800/30 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                  <h4 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                    Autoria e Comissões
                  </h4>
                  <div className="space-y-2 text-xs">
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Autor Principal:</strong> {materia.autor_nome}</p>
                    {materia.coautores && materia.coautores.length > 0 && (
                      <p><strong className="text-neutral-700 dark:text-neutral-300">Coautores:</strong> {materia.coautores.join(', ')}</p>
                    )}
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Comissão Atual:</strong> {materia.comissao_atual_nome || 'Nenhuma (Aguardando Despacho)'}</p>
                    <p><strong className="text-neutral-700 dark:text-neutral-300">Relator Designado:</strong> {materia.relator_nome || 'Aguardando Designação'}</p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setShowNewTramitacao(true)}
                  className="px-5 py-2.5 bg-[#003B6F] dark:bg-sky-600 hover:bg-[#002b52] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-[#003B6F]/20 cursor-pointer"
                >
                  <Send size={14} /> Novo Despacho / Avançar Fase
                </button>
                <button
                  onClick={() => setShowNewParecer(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <FileCheck size={14} /> Emitir Parecer de Comissão
                </button>
                {onPrintDocumento && (
                  <button
                    onClick={() => onPrintDocumento(materia, 'autografo')}
                    className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={14} /> Gerar Autógrafo / Espelho PDF
                  </button>
                )}
              </div>

            </div>
          )}

          {/* ABA LINHA DO TEMPO / HISTÓRICO */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Histórico de Tramitação Legislativa
                </h4>
                <button 
                  onClick={() => setShowNewTramitacao(true)}
                  className="px-4 py-2 bg-[#003B6F] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Adicionar Despacho
                </button>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
                {(materia.tramitacoes || []).map((tram, index) => (
                  <div key={tram.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-neutral-900 border-2 border-[#003B6F] dark:border-sky-400 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#003B6F] dark:bg-sky-400" />
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-neutral-900 dark:text-white">
                            {tram.fase}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[tram.status_resultante]}`}>
                            {tram.status_resultante}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {tram.data_tramitacao}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {tram.despacho}
                      </p>

                      <div className="text-[11px] text-neutral-500 font-medium">
                        Responsável: <span className="font-bold text-neutral-700 dark:text-neutral-300">{tram.responsavel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA PARECERES */}
          {activeTab === 'pareceres' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Pareceres das Comissões Permanentes
                </h4>
                <button 
                  onClick={() => setShowNewParecer(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Novo Parecer
                </button>
              </div>

              {(!materia.pareceres || materia.pareceres.length === 0) ? (
                <div className="text-center py-12 text-neutral-400 bg-neutral-50 dark:bg-neutral-800/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <FileCheck size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Nenhum parecer emitido até o momento para esta proposição.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {materia.pareceres.map(par => (
                    <div key={par.id} className="bg-white dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-black text-xs rounded-lg">
                          {par.comissao_nome || 'Comissão'}
                        </span>
                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${
                          par.conclusao.includes('Favorável') 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                          {par.conclusao}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-500">
                        Relator: <strong className="text-neutral-800 dark:text-neutral-200">{par.relator_nome}</strong> • Data: {par.data_emissao}
                      </div>

                      <div className="bg-neutral-50 dark:bg-neutral-900/60 p-4 rounded-xl text-xs space-y-2 border border-neutral-100 dark:border-neutral-800">
                        <p><strong className="text-neutral-700 dark:text-neutral-300">Relatório:</strong> {par.relatorio}</p>
                        <p><strong className="text-neutral-700 dark:text-neutral-300">Voto do Relator:</strong> {par.voto_relator}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA TEXTO INTEGRAL */}
          {activeTab === 'texto' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Texto Integral da Proposição
                </h4>
                <span className="text-xs text-neutral-400 font-mono">
                  {materia.numero}
                </span>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-950 p-6 md:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 font-serif text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                {materia.texto_integral || 'Texto integral não informado.'}
              </div>
            </div>
          )}

        </div>

        {/* MODAL / FORMULÁRIO DE NOVA TRAMITAÇÃO */}
        {showNewTramitacao && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-lg w-full border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                  Avançar Fase / Novo Despacho
                </h4>
                <button onClick={() => setShowNewTramitacao(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSalvarTramitacao} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Fase da Tramitação</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Leitura em Plenário, Parecer CCJR, Apto para Votação..."
                    value={novaFase}
                    onChange={e => setNovaFase(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Status Resultante</label>
                  <select
                    value={novoStatus}
                    onChange={e => setNovoStatus(e.target.value as StatusMateria)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  >
                    <option value="Protocolado">Protocolado</option>
                    <option value="Lido no Expediente">Lido no Expediente</option>
                    <option value="Em Comissão">Em Comissão</option>
                    <option value="Apto para Ordem do Dia">Apto para Ordem do Dia</option>
                    <option value="1ª Votação Aprovada">1ª Votação Aprovada</option>
                    <option value="2ª Votação Aprovada">2ª Votação Aprovada</option>
                    <option value="Aprovado em Redação Final">Aprovado em Redação Final</option>
                    <option value="Enviado ao Executivo">Enviado ao Executivo</option>
                    <option value="Sancionado">Sancionado</option>
                    <option value="Promulgado">Promulgado</option>
                    <option value="Vetado">Vetado</option>
                    <option value="Rejeitado">Rejeitado</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Texto do Despacho</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Descreva a deliberação, envio à comissão ou resultado regimental..."
                    value={novoDespacho}
                    onChange={e => setNovoDespacho(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Responsável pelo Despacho</label>
                  <input
                    type="text"
                    value={novoResponsavel}
                    onChange={e => setNovoResponsavel(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTramitacao(false)}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#003B6F] text-white rounded-xl text-xs font-bold shadow-md shadow-[#003B6F]/20"
                  >
                    Salvar Despacho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL / FORMULÁRIO DE NOVO PARECER */}
        {showNewParecer && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-lg w-full border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                  Emitir Parecer da Comissão
                </h4>
                <button onClick={() => setShowNewParecer(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSalvarParecer} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Comissão</label>
                    <select
                      value={parecerComissaoId}
                      onChange={e => setParecerComissaoId(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                    >
                      {comissoes.map(c => (
                        <option key={c.id} value={c.id}>{c.sigla} - {c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Relator(a)</label>
                    <select
                      value={parecerRelatorId}
                      onChange={e => setParecerRelatorId(e.target.value)}
                      className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                    >
                      {vereadores.map(v => (
                        <option key={v.id} value={v.id}>{v.nome_parlamentar} ({v.partido})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Conclusão do Parecer</label>
                  <select
                    value={parecerConclusao}
                    onChange={e => setParecerConclusao(e.target.value as any)}
                    className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  >
                    <option value="Favorável">Favorável</option>
                    <option value="Contrário">Contrário</option>
                    <option value="Favorável com Emenda Substitutiva">Favorável com Emenda Substitutiva</option>
                    <option value="Favorável com Emenda Aditiva">Favorável com Emenda Aditiva</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Relatório e Fundamentação</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Resumo da análise legal, constitucional ou técnica..."
                    value={parecerRelatorio}
                    onChange={e => setParecerRelatorio(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Voto do Relator</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Voto conclusivo submetido aos membros da comissão..."
                    value={parecerVoto}
                    onChange={e => setParecerVoto(e.target.value)}
                    className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewParecer(false)}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                  >
                    Emitir Parecer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
