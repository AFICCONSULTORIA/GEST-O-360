import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Scale, 
  Download, 
  Building2, 
  Landmark, 
  Sparkles, 
  FileCheck2, 
  Tag, 
  Layers,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { MunicipalLaw, LawType, LawStatus, LawCategory, LawOriginPower } from '../../../types';
import { showToast } from '../../../components/ui/Toast';

export const LAW_TYPES: LawType[] = [
  'Lei Orgânica', 'Lei Complementar', 'Lei Ordinária', 
  'Decreto', 'Portaria', 'Resolução', 'Emenda à LOM', 'Outros'
];

export const LAW_CATEGORIES: LawCategory[] = [
  'Administração Geral', 'Finanças e Tributos', 'Saúde', 
  'Educação', 'Meio Ambiente', 'Viação e Obras', 
  'Servidores e RH', 'Assistência Social', 'Urbanismo e Patrimônio', 'Geral'
];

export const LAW_STATUSES: LawStatus[] = [
  'Em Vigor', 'Revogada', 'Alterada', 'Regulamentada', 'Em Tramitação'
];

interface LawFormModalProps {
  lawToEdit?: MunicipalLaw | null;
  allLaws?: MunicipalLaw[];
  initialMateriaData?: {
    numero: string;
    ementa: string;
    texto_integral?: string;
    autor_nome?: string;
    tipo?: string;
  } | null;
  onClose: () => void;
  onSave: (lawData: Partial<MunicipalLaw>, pdfFile?: File | null) => Promise<void>;
}

export const LawFormModal: React.FC<LawFormModalProps> = ({
  lawToEdit,
  allLaws = [],
  initialMateriaData,
  onClose,
  onSave
}) => {
  const [number, setNumber] = useState(lawToEdit?.number || initialMateriaData?.numero || '');
  const [title, setTitle] = useState(lawToEdit?.title || (initialMateriaData ? `Lei decorrente do ${initialMateriaData.numero}` : ''));
  const [type, setType] = useState<LawType>(
    lawToEdit?.type || (initialMateriaData?.tipo?.includes('Complementar') ? 'Lei Complementar' : 'Lei Ordinária')
  );
  const [category, setCategory] = useState<LawCategory>(lawToEdit?.category || 'Administração Geral');
  const [status, setStatus] = useState<LawStatus>(lawToEdit?.status || 'Em Vigor');
  const [originPower, setOriginPower] = useState<LawOriginPower>(
    lawToEdit?.origin_power || (initialMateriaData ? 'legislativo' : 'executivo')
  );
  const [materiaNumero, setMateriaNumero] = useState(lawToEdit?.materia_numero || initialMateriaData?.numero || '');
  const [parentLawId, setParentLawId] = useState(lawToEdit?.parent_law_id || '');
  
  const [publicationDate, setPublicationDate] = useState(
    lawToEdit?.publication_date || new Date().toISOString().split('T')[0]
  );
  const [author, setAuthor] = useState(
    lawToEdit?.author || initialMateriaData?.autor_nome || (originPower === 'legislativo' ? 'Câmara Municipal' : 'Poder Executivo Municipal')
  );
  const [ementa, setEmenta] = useState(lawToEdit?.ementa || initialMateriaData?.ementa || '');
  const [fullText, setFullText] = useState(lawToEdit?.full_text || initialMateriaData?.texto_integral || '');
  const [compiledText, setCompiledText] = useState(lawToEdit?.compiled_text || '');
  const [isCompiled, setIsCompiled] = useState(lawToEdit?.is_compiled || false);
  const [externalLink, setExternalLink] = useState(lawToEdit?.external_link || '');
  const [tagsInput, setTagsInput] = useState(lawToEdit?.tags?.join(', ') || '');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'texto' | 'compilado'>('dados');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de possíveis Leis Mães para vincular se for Decreto
  const candidateParentLaws = allLaws.filter(l => l.type.includes('Lei') && l.id !== lawToEdit?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !title.trim() || !ementa.trim()) {
      showToast('Por favor, preencha o número, título e ementa da norma.', 'warning');
      return;
    }

    setIsSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const selectedParent = candidateParentLaws.find(p => p.id === parentLawId);

    try {
      await onSave({
        ...(lawToEdit ? { id: lawToEdit.id } : {}),
        number: number.trim(),
        title: title.trim(),
        type,
        category,
        status,
        origin_power: originPower,
        materia_numero: materiaNumero.trim() || undefined,
        parent_law_id: parentLawId || undefined,
        parent_law_number: selectedParent ? `${selectedParent.type} nº ${selectedParent.number}` : undefined,
        parent_law_title: selectedParent?.title,
        publication_date: publicationDate,
        author: author.trim(),
        ementa: ementa.trim(),
        full_text: fullText,
        compiled_text: isCompiled && compiledText ? compiledText : undefined,
        is_compiled: isCompiled && !!compiledText,
        external_link: externalLink.trim(),
        tags
      }, file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-neutral-950/75 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.95, y: 15 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[28px] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] flex flex-col border border-neutral-200 dark:border-neutral-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-4 shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Scale className="text-emerald-500" /> 
              {lawToEdit ? 'Editar Ato Normativo Oficial' : initialMateriaData ? 'Sancionar & Publicar Lei (Origem Câmara)' : 'Cadastrar Nova Norma no Repositório Oficial'}
            </h3>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">
              Integração completa entre o Poder Executivo e o Poder Legislativo Municipal.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas do Formulário */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'dados'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            1. Dados & Metadados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('texto')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'texto'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            2. Texto Integral da Norma
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compilado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'compilado'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Sparkles size={12} />
            3. Texto Compilado (Opcional)
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
          
          {activeTab === 'dados' && (
            <div className="space-y-4">
              
              {/* Seletor de Poder / Origem Institucional */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">
                  Origem do Ato Normativo *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOriginPower('executivo');
                      if (!author || author === 'Câmara Municipal') setAuthor('Poder Executivo Municipal');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      originPower === 'executivo'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <Building2 size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Poder Executivo</div>
                      <div className="text-[10px] text-neutral-400 font-normal">Prefeitura / Gabinete</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOriginPower('legislativo');
                      if (!author || author === 'Poder Executivo Municipal') setAuthor('Câmara Municipal');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      originPower === 'legislativo'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <Landmark size={16} className="text-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Poder Legislativo</div>
                      <div className="text-[10px] text-neutral-400 font-normal">Câmara de Vereadores</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOriginPower('conjunto')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      originPower === 'conjunto'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <Layers size={16} className="text-purple-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Ato Conjunto</div>
                      <div className="text-[10px] text-neutral-400 font-normal">Executivo + Legislativo</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Linha 1: Tipo, Número e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Tipo de Ato *
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as LawType)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                  >
                    {LAW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Número / Ano *
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: 1.450/2026"
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Vigência / Status *
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as LawStatus)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                  >
                    {LAW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Linha 2: Título Oficial */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Título da Norma *
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Estatuto dos Servidores Públicos Municipais"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                  required
                />
              </div>

              {/* Linha 3: Ementa */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Ementa Oficial *
                </label>
                <textarea 
                  rows={3}
                  placeholder="Dispõe sobre..."
                  value={ementa}
                  onChange={e => setEmenta(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  required
                />
              </div>

              {/* Linha 4: Categoria, Data de Publicação e Autoria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Área Temática
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as LawCategory)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  >
                    {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Data de Publicação
                  </label>
                  <input 
                    type="date"
                    value={publicationDate}
                    onChange={e => setPublicationDate(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Autoria / Iniciativa
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Ver. João da Silva ou Prefeito"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Linha 5: Relações (Câmara / Decreto Regulamentador) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                    <Landmark size={13} className="text-blue-500" />
                    Projeto de Lei de Origem (Câmara)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: PL 014/2023 ou Autógrafo nº 05/2023"
                    value={materiaNumero}
                    onChange={e => setMateriaNumero(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                    <FileCheck2 size={13} className="text-emerald-500" />
                    Regulamenta qual Lei? (Se for Decreto)
                  </label>
                  <select
                    value={parentLawId}
                    onChange={e => setParentLawId(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white cursor-pointer"
                  >
                    <option value="">-- Ato Autônomo (Não regulamenta lei específica) --</option>
                    {candidateParentLaws.map(pl => (
                      <option key={pl.id} value={pl.id}>
                        {pl.type} {pl.number} — {pl.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload de Documento PDF Oficial */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Documento Oficial Assinado (PDF)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".pdf,.doc,.docx"
                    className="hidden" 
                    onChange={e => e.target.files && setFile(e.target.files[0])}
                  />
                  <Download size={20} className="mx-auto text-neutral-400 mb-1" />
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    {file ? file.name : (lawToEdit?.file_url ? "Arquivo PDF já anexado (Clique para substituir)" : "Selecione o arquivo PDF oficial do Diário para anexo")}
                  </span>
                </div>
              </div>

              {/* Tags e Link Externo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Tags de Busca (separadas por vírgula)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Tributos, IPTU, Servidores"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Link Externo (Diário Oficial / Planalto)
                  </label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={externalLink}
                    onChange={e => setExternalLink(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>
              </div>

            </div>
          )}

          {activeTab === 'texto' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Texto Integral da Norma (Redação Original)
                </label>
                <span className="text-[10px] text-neutral-400">
                  Use Art. 1º, Art. 2º, TÍTULO, CAPÍTULO para gerar o sumário automático
                </span>
              </div>
              <textarea 
                rows={16}
                placeholder="Cole ou digite o texto integral da lei..."
                value={fullText}
                onChange={e => setFullText(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 text-xs font-mono font-medium outline-none dark:text-white leading-relaxed"
              />
            </div>
          )}

          {activeTab === 'compilado' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Texto Compilado & Consolidação Normativa (Padrão Planalto)
                </div>
                <p className="text-[11px] leading-relaxed">
                  Para marcar redações revogadas, utilize <code>~~texto revogado~~</code>. 
                  Para adicionar notas de alteração, utilize <code>*(Redação dada pela Lei nº ...)*</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="enableCompiled"
                  checked={isCompiled}
                  onChange={e => setIsCompiled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="enableCompiled" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Disponibilizar versão compilada desta lei para os servidores e cidadãos
                </label>
              </div>

              {isCompiled && (
                <textarea 
                  rows={14}
                  placeholder="Texto consolidado com anotações de alterações vigentes..."
                  value={compiledText}
                  onChange={e => setCompiledText(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 text-xs font-mono font-medium outline-none dark:text-white leading-relaxed"
                />
              )}
            </div>
          )}

          {/* Rodapé e Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isSaving ? 'Gravando no Repositório...' : (lawToEdit ? 'Salvar Alterações' : 'Publicar Ato Normativo')}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-bold text-xs rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

