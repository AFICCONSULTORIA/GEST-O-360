import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, FilePlus, Sparkles, Send, Tag, AlertCircle } from 'lucide-react';
import { MateriaLegislativa, TipoMateria, RegimeTramitacao, StatusMateria, Vereador, Comissao } from '../types';

interface MateriaFormModalProps {
  vereadores: Vereador[];
  comissoes: Comissao[];
  materiaParaEditar?: MateriaLegislativa | null;
  onClose: () => void;
  onSave: (materia: MateriaLegislativa) => void;
}

const TIPOS_MATERIA: TipoMateria[] = [
  'Projeto de Lei Ordinária',
  'Projeto de Lei Complementar',
  'Decreto Legislativo',
  'Projeto de Resolução',
  'Emenda à LOM',
  'Moção',
  'Requerimento',
  'Pedido de Informação',
  'Veto'
];

export const MateriaFormModal: React.FC<MateriaFormModalProps> = ({
  vereadores,
  comissoes,
  materiaParaEditar,
  onClose,
  onSave
}) => {
  const currentYear = new Date().getFullYear();

  const [tipo, setTipo] = useState<TipoMateria>(materiaParaEditar?.tipo || 'Projeto de Lei Ordinária');
  const [numero, setNumero] = useState(materiaParaEditar?.numero || `PLO 0${Math.floor(Math.random() * 90) + 10}/${currentYear}`);
  const [ano, setAno] = useState<number>(materiaParaEditar?.ano || currentYear);
  const [regime, setRegime] = useState<RegimeTramitacao>(materiaParaEditar?.regime || 'Ordinário');
  const [autorId, setAutorId] = useState<string>(materiaParaEditar?.autor_id || vereadores[0]?.id || '');
  const [ementa, setEmenta] = useState(materiaParaEditar?.ementa || '');
  const [textoIntegral, setTextoIntegral] = useState(materiaParaEditar?.texto_integral || '');
  const [comissaoId, setComissaoId] = useState<string>(materiaParaEditar?.comissao_atual_id || comissoes[0]?.id || '');
  const [tagsText, setTagsText] = useState(materiaParaEditar?.tags?.join(', ') || '');

  // Atualizar prefixo do número conforme tipo selecionado
  const handleTipoChange = (newTipo: TipoMateria) => {
    setTipo(newTipo);
    if (!materiaParaEditar) {
      let sigla = 'PLO';
      if (newTipo === 'Projeto de Lei Complementar') sigla = 'PLC';
      if (newTipo === 'Decreto Legislativo') sigla = 'PDL';
      if (newTipo === 'Projeto de Resolução') sigla = 'PR';
      if (newTipo === 'Emenda à LOM') sigla = 'PELOM';
      if (newTipo === 'Moção') sigla = 'MOC';
      if (newTipo === 'Requerimento') sigla = 'REQ';
      if (newTipo === 'Pedido de Informação') sigla = 'PI';
      if (newTipo === 'Veto') sigla = 'VET';
      setNumero(`${sigla} 0${Math.floor(Math.random() * 90) + 10}/${ano}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero || !ementa || !textoIntegral) return;

    const autor = vereadores.find(v => v.id === autorId);
    const comissao = comissoes.find(c => c.id === comissaoId);

    const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);

    const materiaData: MateriaLegislativa = {
      id: materiaParaEditar?.id || `mat-${Date.now()}`,
      numero,
      ano,
      tipo,
      ementa,
      texto_integral: textoIntegral,
      autor_id: autorId,
      autor_nome: autor?.nome_parlamentar || autor?.nome || 'Mesa Diretora',
      regime,
      status: materiaParaEditar?.status || 'Protocolado',
      comissao_atual_id: comissaoId,
      comissao_atual_nome: comissao?.nome,
      data_protocolo: materiaParaEditar?.data_protocolo || new Date().toISOString().split('T')[0],
      tags,
      tramitacoes: materiaParaEditar?.tramitacoes || [],
      pareceres: materiaParaEditar?.pareceres || []
    };

    onSave(materiaData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 md:p-8 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#003B6F]/10 dark:bg-sky-500/10 flex items-center justify-center text-[#003B6F] dark:text-sky-400">
              <FilePlus size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
                {materiaParaEditar ? 'Editar Proposição Legislativa' : 'Protocolar Nova Proposição'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Processo Legislativo Eletrônico (SAPL da Câmara Municipal)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          
          {/* Linha 1: Tipo & Número & Ano */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                Tipo de Matéria
              </label>
              <select
                value={tipo}
                onChange={e => handleTipoChange(e.target.value as TipoMateria)}
                className="w-full mt-1.5 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              >
                {TIPOS_MATERIA.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                Número do Protocolo
              </label>
              <input
                type="text"
                required
                value={numero}
                onChange={e => setNumero(e.target.value)}
                className="w-full mt-1.5 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-mono font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                Regime de Tramitação
              </label>
              <select
                value={regime}
                onChange={e => setRegime(e.target.value as RegimeTramitacao)}
                className="w-full mt-1.5 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              >
                <option value="Ordinário">Ordinário (Padrão)</option>
                <option value="Urgência">Urgência Regimental</option>
                <option value="Urgência Urgentíssima">Urgência Urgentíssima</option>
              </select>
            </div>
          </div>

          {/* Linha 2: Autor e Comissão Inicial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                Autor Parlamentar
              </label>
              <select
                value={autorId}
                onChange={e => setAutorId(e.target.value)}
                className="w-full mt-1.5 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              >
                {vereadores.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nome_parlamentar} ({v.partido}) - {v.cargo_mesa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                Comissão de Distribuição
              </label>
              <select
                value={comissaoId}
                onChange={e => setComissaoId(e.target.value)}
                className="w-full mt-1.5 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              >
                {comissoes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.sigla} - {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ementa */}
          <div>
            <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
              Ementa da Proposição
            </label>
            <textarea
              rows={2}
              required
              placeholder="Ex: Dispõe sobre a instituição do programa municipal de incentivo à leitura e dá outras providências..."
              value={ementa}
              onChange={e => setEmenta(e.target.value)}
              className="w-full mt-1.5 p-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-medium outline-none leading-relaxed"
            />
          </div>

          {/* Texto Integral */}
          <div>
            <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
              Texto Integral dos Artigos & Justificativa
            </label>
            <textarea
              rows={6}
              required
              placeholder="Art. 1º ...&#10;Art. 2º ...&#10;&#10;JUSTIFICATIVA:&#10;A presente proposta visa..."
              value={textoIntegral}
              onChange={e => setTextoIntegral(e.target.value)}
              className="w-full mt-1.5 p-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-mono outline-none leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
              Tags / Palavras-Chave (separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="Educação, Saúde, Trânsito, Finanças, Meio Ambiente..."
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
              className="w-full mt-1.5 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none"
            />
          </div>

          {/* Rodapé Form */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-[#003B6F] hover:bg-[#002b52] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#003B6F]/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Send size={16} /> Protocolar no SAPL
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
