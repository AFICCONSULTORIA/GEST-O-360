import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Plus, Search, Filter, Clock, 
  CheckCircle2, AlertTriangle, AlertCircle, Send, 
  Building2, MapPin, User, ChevronRight, X, FileCheck 
} from 'lucide-react';
import { Indicacao, StatusIndicacao, Vereador } from '../types';
import { showToast } from '../../../components/ui/Toast';

interface IndicacoesRastreamentoProps {
  indicacoes: Indicacao[];
  vereadores: Vereador[];
  onSaveIndicacao: (indicacao: Indicacao) => void;
}

const STATUS_CONFIG: Record<StatusIndicacao, { bg: string, text: string, border: string, label: string }> = {
  'Aguardando Envio': { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300', border: 'border-neutral-200 dark:border-neutral-700', label: 'Aguardando Envio' },
  'Encaminhado': { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', label: 'Ofício Enviado à Prefeitura' },
  'Em Análise': { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', label: 'Em Análise pela Secretaria' },
  'Respondido': { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', label: 'Ofício de Resposta Recebido' },
  'Atendido': { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', label: 'Demanda Concluída / Atendida' },
  'Vencido': { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20', label: 'Prazo do Executivo Vencido' }
};

export const IndicacoesRastreamento: React.FC<IndicacoesRastreamentoProps> = ({
  indicacoes,
  vereadores,
  onSaveIndicacao
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [respondingIndicacao, setRespondingIndicacao] = useState<Indicacao | null>(null);

  // Form states - Nova Indicação
  const [novoNumero, setNovoNumero] = useState(`IND ${Math.floor(Math.random() * 90) + 120}/2026`);
  const [novoTipo, setNovoTipo] = useState<'Indicação' | 'Requerimento' | 'Pedido de Providência'>('Indicação');
  const [novoVereadorId, setNovoVereadorId] = useState(vereadores[0]?.id || '');
  const [novoBairro, setNovoBairro] = useState('');
  const [novaSecretaria, setNovaSecretaria] = useState('Secretaria Municipal de Obras e Serviços Públicos');
  const [novaDescricao, setNovaDescricao] = useState('');

  // Form states - Resposta da Prefeitura
  const [textoResposta, setTextoResposta] = useState('');
  const [statusResposta, setStatusResposta] = useState<StatusIndicacao>('Atendido');

  const filtered = indicacoes.filter(ind => {
    const matchSearch = 
      ind.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.vereador_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ind.bairro && ind.bairro.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ind.secretaria_destino.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = filterStatus === 'todos' || ind.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSalvarNova = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNumero || !novaDescricao) return;

    const ver = vereadores.find(v => v.id === novoVereadorId);

    const hoje = new Date();
    const prazo = new Date();
    prazo.setDate(hoje.getDate() + 30);

    const nova: Indicacao = {
      id: `ind-${Date.now()}`,
      numero: novoNumero,
      ano: 2026,
      tipo: novoTipo,
      vereador_id: novoVereadorId,
      vereador_nome: ver?.nome_parlamentar || 'Vereador',
      bairro: novoBairro || 'Geral do Município',
      secretaria_destino: novaSecretaria,
      descricao: novaDescricao,
      data_envio: hoje.toISOString().split('T')[0],
      prazo_resposta_dias: 30,
      data_limite_resposta: prazo.toISOString().split('T')[0],
      status: 'Encaminhado'
    };

    onSaveIndicacao(nova);
    setIsNewModalOpen(false);
    setNovaDescricao('');
    setNovoBairro('');
    showToast('Indicação registrada e ofício gerado com sucesso!', 'success');
  };

  const handleSalvarResposta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingIndicacao || !textoResposta) return;

    const updated: Indicacao = {
      ...respondingIndicacao,
      status: statusResposta,
      data_resposta: new Date().toISOString().split('T')[0],
      resposta_executivo: textoResposta
    };

    onSaveIndicacao(updated);
    setRespondingIndicacao(null);
    setTextoResposta('');
    showToast('Resposta oficial da Prefeitura registrada no sistema!', 'success');
  };

  const countVencidas = indicacoes.filter(i => i.status === 'Vencido').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat'] tracking-tight flex items-center gap-3">
            <MessageSquare className="text-amber-500" size={28} />
            Indicações & Rastreamento da Prefeitura
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Pedidos de providências urbanas aos secretários municipais e controle de prazos regimentais de resposta.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} /> Nova Indicação
        </button>
      </div>

      {/* 2. FILTROS & ALERTAS DE PRAZO */}
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-100 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por bairro, secretaria, vereador ou descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === 'todos' ? 'bg-[#003B6F] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              Todas ({indicacoes.length})
            </button>
            <button
              onClick={() => setFilterStatus('Encaminhado')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === 'Encaminhado' ? 'bg-sky-600 text-white' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'
              }`}
            >
              Encaminhadas
            </button>
            <button
              onClick={() => setFilterStatus('Atendido')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterStatus === 'Atendido' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              Atendidas
            </button>
            {countVencidas > 0 && (
              <button
                onClick={() => setFilterStatus('Vencido')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'Vencido' ? 'bg-rose-600 text-white' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 animate-pulse'
                }`}
              >
                Prazos Vencidos ({countVencidas})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. LISTA DE INDICAÇÕES */}
      <div className="space-y-3">
        {filtered.map(ind => {
          const cfg = STATUS_CONFIG[ind.status] || STATUS_CONFIG['Encaminhado'];

          return (
            <motion.div
              key={ind.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-500 text-neutral-950 text-xs font-black font-mono rounded-lg">
                      {ind.numero}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                    {ind.bairro && (
                      <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        <MapPin size={12} className="text-amber-500" /> {ind.bairro}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white pt-1">
                    {ind.descricao}
                  </h4>
                </div>

                <button
                  onClick={() => {
                    setRespondingIndicacao(ind);
                    setTextoResposta(ind.resposta_executivo || '');
                  }}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileCheck size={14} /> Registrar Resposta do Prefeito
                </button>
              </div>

              {/* Informações de Autoria & Destino */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-4">
                  <span>Vereador: <strong className="text-neutral-800 dark:text-neutral-200">{ind.vereador_nome}</strong></span>
                  <span>Destino: <strong className="text-neutral-800 dark:text-neutral-200">{ind.secretaria_destino}</strong></span>
                </div>

                <div className="flex items-center gap-4">
                  <span>Enviado: {ind.data_envio}</span>
                  {ind.data_limite_resposta && (
                    <span className={ind.status === 'Vencido' ? 'text-rose-500 font-bold' : 'text-neutral-500'}>
                      Prazo Limite: {ind.data_limite_resposta}
                    </span>
                  )}
                </div>
              </div>

              {/* Resposta da Prefeitura se houver */}
              {ind.resposta_executivo && (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                      Resposta Oficial do Poder Executivo:
                    </span>
                    {ind.data_resposta && <span className="font-mono text-[11px] opacity-80">{ind.data_resposta}</span>}
                  </div>
                  <p className="leading-relaxed pl-5">
                    {ind.resposta_executivo}
                  </p>
                </div>
              )}

            </motion.div>
          );
        })}
      </div>

      {/* MODAL NOVA INDICAÇÃO */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                Protocolar Indicação ao Executivo
              </h4>
              <button onClick={() => setIsNewModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarNova} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-neutral-400">Número / Ano</label>
                  <input
                    type="text"
                    required
                    value={novoNumero}
                    onChange={e => setNovoNumero(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-neutral-400">Vereador Autor</label>
                  <select
                    value={novoVereadorId}
                    onChange={e => setNovoVereadorId(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                  >
                    {vereadores.map(v => (
                      <option key={v.id} value={v.id}>{v.nome_parlamentar} ({v.partido})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Bairro / Comunidade / Região</label>
                <input
                  type="text"
                  placeholder="Ex: Centro, Bairro Nova Esperança, Linha 3 Rural..."
                  value={novoBairro}
                  onChange={e => setNovoBairro(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Secretaria Municipal de Destino</label>
                <select
                  value={novaSecretaria}
                  onChange={e => setNovaSecretaria(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="Secretaria Municipal de Obras e Serviços Públicos">Secretaria de Obras e Serviços Públicos</option>
                  <option value="Secretaria Municipal de Saúde">Secretaria de Saúde</option>
                  <option value="Secretaria Municipal de Educação">Secretaria de Educação</option>
                  <option value="Secretaria Municipal de Trânsito e Mobilidade">Secretaria de Trânsito e Mobilidade</option>
                  <option value="Secretaria Municipal de Meio Ambiente">Secretaria de Meio Ambiente</option>
                  <option value="Secretaria Municipal de Finanças e Tributos">Secretaria de Finanças</option>
                  <option value="Gabinete do Prefeito">Gabinete do Prefeito</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Descrição do Pedido de Providência</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva a solicitação da comunidade (ex: troca de lâmpadas, recapeamento asfáltico, instalação de redutor de velocidade)..."
                  value={novaDescricao}
                  onChange={e => setNovaDescricao(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 text-neutral-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Enviar ao Executivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR RESPOSTA DO PREFEITO */}
      {respondingIndicacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                Registrar Resposta Oficial da Prefeitura
              </h4>
              <button onClick={() => setRespondingIndicacao(null)} className="text-neutral-400 hover:text-neutral-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs space-y-1">
              <span className="font-bold text-neutral-800 dark:text-neutral-200">{respondingIndicacao.numero} - {respondingIndicacao.bairro}</span>
              <p className="text-neutral-500 line-clamp-2">{respondingIndicacao.descricao}</p>
            </div>

            <form onSubmit={handleSalvarResposta} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Status do Atendimento</label>
                <select
                  value={statusResposta}
                  onChange={e => setStatusResposta(e.target.value as StatusIndicacao)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="Atendido">Atendido / Executado</option>
                  <option value="Respondido">Respondido / Incluído no Cronograma</option>
                  <option value="Em Análise">Em Análise Técnica</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Texto do Ofício de Resposta</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Cole o teor do ofício expedido pelo Secretário ou Prefeito..."
                  value={textoResposta}
                  onChange={e => setTextoResposta(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRespondingIndicacao(null)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Salvar Resposta Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
