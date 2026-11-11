import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  Cpu,
  FileText,
  CheckCircle2,
  Loader2,
  Eye,
  Copy,
  Check,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import { MunicipalLaw, LawType, LawStatus, LawCategory, LawOriginPower, Institution } from '../../../types';
import { showToast } from '../../../components/ui/Toast';
import { extractLawTextFromPdf, extractLawFromPastedText } from '../services/pdfTextExtractor';
import { extractLawFromPdf, LawOcrResult } from '../services/lawOcrService';
import { 
  parseLawDocument, 
  paginateLawDocument, 
  BudgetTableBlock, 
  DataTableBlock,
  budgetTableToTSV, 
  budgetTableToText,
  dataTableToTSV,
  dataTableToText
} from '../utils/lawFormatter';

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
  institution?: Institution | null;
  onClose: () => void;
  onSave: (lawData: Partial<MunicipalLaw>, pdfFile?: File | null) => Promise<void>;
}

export const LawFormModal: React.FC<LawFormModalProps> = ({
  lawToEdit,
  allLaws = [],
  initialMateriaData,
  institution,
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
  const [publishOnSite, setPublishOnSite] = useState<boolean>(lawToEdit?.publish_on_site ?? true);
  const [siteFeatured, setSiteFeatured] = useState<boolean>(Boolean(lawToEdit?.site_featured));
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'texto' | 'compilado' | 'previa'>('dados');

  // Estados do OCR com IA
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrStep, setOcrStep] = useState<string>('');
  const [ocrSuccessData, setOcrSuccessData] = useState<{
    articlesCount: number;
    tablesCount: number;
    valorTotal?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // Lista de possíveis Leis Mães para vincular se for Decreto
  const candidateParentLaws = allLaws.filter(l => l.type.includes('Lei') && l.id !== lawToEdit?.id);

  // Executa extração de texto nativa rápida (1s) ou OCR no PDF selecionado
  const handleRunOcrOnFile = async (selectedFile: File) => {
    setIsOcrRunning(true);
    setOcrStep('Iniciando leitura ultra-rápida do PDF...');
    setFile(selectedFile);

    try {
      const result = await extractLawTextFromPdf(
        selectedFile,
        (step) => setOcrStep(step),
        {
          municipio: institution?.city || 'Torixoréu',
          estado: institution?.state || 'Mato Grosso'
        }
      );

      const ext = result.structuredData;

      // Preenche todos os campos do formulário com os dados extraídos
      if (ext.number) setNumber(ext.number);
      if (ext.title) setTitle(ext.title);
      if (ext.type) setType(ext.type as any);
      if (ext.category) setCategory(ext.category);
      if (ext.origin_power) setOriginPower(ext.origin_power);
      if (ext.publication_date) setPublicationDate(ext.publication_date);
      if (ext.author) setAuthor(ext.author);
      if (ext.ementa) setEmenta(ext.ementa);
      if (ext.materia_numero) setMateriaNumero(ext.materia_numero);
      if (ext.tags && ext.tags.length > 0) setTagsInput(ext.tags.join(', '));
      if (ext.full_text) setFullText(ext.full_text);

      // Calcula estatísticas extraídas
      const tablesCount = result.parsedDoc.blocks.filter(b => b.type === 'budget_table').length || ext.budget_tables?.length || 0;
      const articlesCount = result.parsedDoc.blocks.filter(b => b.type === 'article').length || (ext.full_text?.match(/Art\.\s*\d+/gi) || []).length;

      setOcrSuccessData({
        articlesCount,
        tablesCount,
        valorTotal: ext.valor_total_credito
      });

      // Abre diretamente a Prévia A4 do Diário para o usuário ver o resultado formatado na hora
      setActiveTab('previa');

      const origemMsg = result.source === 'native_pdf' ? 'em <1s (Texto Nativo)' : 'via IA Rápida';
      showToast(`${ext.type} nº ${ext.number} transcrita e formatada ${origemMsg}!`, 'success');
    } catch (err: any) {
      console.error('Erro na extração:', err);
      showToast(err?.message || 'Erro ao processar PDF.', 'error');
    } finally {
      setIsOcrRunning(false);
      setOcrStep('');
    }
  };

  // Estrutura metadados e prévia a partir do texto colado manualmente
  const handleStructureFromFullText = () => {
    if (!fullText.trim()) {
      showToast('Cole o texto integral da norma antes de estruturar.', 'warning');
      return;
    }
    const result = extractLawFromPastedText(fullText);
    const ext = result.structuredData;
    if (ext.number && !number) setNumber(ext.number);
    if (ext.title && !title) setTitle(ext.title);
    if (ext.type) setType(ext.type as any);
    if (ext.category) setCategory(ext.category);
    if (ext.publication_date) setPublicationDate(ext.publication_date);
    if (ext.author && !author) setAuthor(ext.author);
    if (ext.ementa && !ementa) setEmenta(ext.ementa);
    if (ext.tags && ext.tags.length > 0 && !tagsInput) setTagsInput(ext.tags.join(', '));

    const tablesCount = result.parsedDoc.blocks.filter(b => b.type === 'budget_table').length;
    const articlesCount = result.parsedDoc.blocks.filter(b => b.type === 'article').length;
    setOcrSuccessData({
      articlesCount,
      tablesCount,
      valorTotal: ext.valor_total_credito
    });
    setActiveTab('previa');
    showToast('Campos preenchidos e Prévia A4 gerada com sucesso!', 'success');
  };

  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleRunOcrOnFile(e.target.files[0]);
    }
  };

  // Parsing estruturado para a aba de Prévia
  const parsedLawStructure = useMemo(() => {
    return parseLawDocument(fullText, ementa, {
      type,
      number,
      publication_date: publicationDate,
      author,
      institution_name: institution?.name || 'Prefeitura Municipal de Torixoréu'
    });
  }, [fullText, ementa, type, number, publicationDate, author, institution]);

  const lawPages = useMemo(() => {
    return paginateLawDocument(parsedLawStructure);
  }, [parsedLawStructure]);

  const [copiedTableIndex, setCopiedTableIndex] = useState<number | null>(null);

  const handleCopyTable = (block: BudgetTableBlock | DataTableBlock, idx: number, asTSV: boolean) => {
    const text =
      block.type === 'data_table'
        ? asTSV
          ? dataTableToTSV(block)
          : dataTableToText(block)
        : asTSV
        ? budgetTableToTSV(block)
        : budgetTableToText(block);
    navigator.clipboard.writeText(text);
    setCopiedTableIndex(idx);
    showToast(asTSV ? 'Tabela copiada no formato Excel!' : 'Tabela copiada!', 'success');
    setTimeout(() => setCopiedTableIndex(null), 2500);
  };

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
        tags,
        publish_on_site: publishOnSite,
        site_featured: publishOnSite ? siteFeatured : false,
      }, file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-neutral-950/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.95, y: 15 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-5xl rounded-[28px] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[94vh] flex flex-col border border-neutral-200 dark:border-neutral-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Scale className="text-emerald-500" /> 
              {lawToEdit ? 'Editar Ato Normativo Oficial' : initialMateriaData ? 'Sancionar & Publicar Lei (Origem Câmara)' : 'Cadastrar Nova Norma no Repositório Oficial'}
            </h3>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">
              Integração completa entre o Poder Executivo e o Poder Legislativo Municipal com Leitor IA de Diários Oficiais.
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

        {/* Banner do OCR Inteligente */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-blue-950/40 p-4 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Cpu size={22} />
            </div>
            <div>
              <div className="text-xs font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Leitor Inteligente de Diário Oficial (OCR com IA)</span>
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  LC 95/98
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5">
                Envie o PDF do Diário Oficial (ex: AMM-MT) para preencher número, ementa, artigos e dotações orçamentárias na formatação exata.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <input 
              type="file" 
              ref={ocrFileInputRef} 
              accept=".pdf,application/pdf,image/png,image/jpeg"
              className="hidden" 
              onChange={handleOcrFileChange}
            />
            <button
              type="button"
              disabled={isOcrRunning}
              onClick={() => ocrFileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isOcrRunning ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Ler PDF com IA</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Indicador de Processamento do OCR */}
        <AnimatePresence>
          {isOcrRunning && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-neutral-900 text-white rounded-xl flex items-center gap-3 text-xs"
            >
              <Loader2 size={16} className="text-emerald-400 animate-spin shrink-0" />
              <div className="flex-1 font-medium">{ocrStep}</div>
            </motion.div>
          )}

          {ocrSuccessData && !isOcrRunning && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300 flex-wrap gap-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Transcrição concluída:</strong> {ocrSuccessData.articlesCount} artigos e {ocrSuccessData.tablesCount} tabelas de dotação orçamentária identificadas
                  {ocrSuccessData.valorTotal ? ` (Total: ${ocrSuccessData.valorTotal})` : ''}.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('previa')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eye size={12} />
                <span>Ver Prévia A4</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Abas do Formulário */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 shrink-0">
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
          <button
            type="button"
            onClick={() => setActiveTab('previa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'previa'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Eye size={13} />
            <span>4. Prévia A4 do Diário</span>
            {lawPages.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                {lawPages.length} {lawPages.length === 1 ? 'folha' : 'folhas'}
              </span>
            )}
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

                  <div className="p-2.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center gap-2 text-neutral-400 text-xs">
                    <Layers size={16} />
                    <span className="text-[11px] leading-tight">Unifica repositório oficial da Cidade</span>
                  </div>
                </div>
              </div>

              {/* Linha 2: Tipo, Número e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Espécie Normativa *
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as LawType)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  >
                    {LAW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Número do Ato *
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: 1331 ou 1.331"
                    value={number}
                    onChange={e => {
                      setNumber(e.target.value);
                      if (!title || title.startsWith('Lei')) {
                        const year = publicationDate ? publicationDate.split('-')[0] : new Date().getFullYear();
                        setTitle(`${type} nº ${e.target.value}/${year}`);
                      }
                    }}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Situação Vigencial *
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as LawStatus)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  >
                    {LAW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Linha 3: Título e Ementa */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Título Oficial do Ato Normativo *
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Lei Municipal nº 1331/2026"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Ementa Oficial (Objeto do Ato) *
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Ex: Dispõe sobre a autorização de Abertura de Crédito Adicional Especial por Superávit Financeiro, e LDO/2026, e dá outras providências."
                    value={ementa}
                    onChange={e => setEmenta(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Linha 4: Categoria, Data e Autoria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Área Temática / Categoria *
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
                    placeholder="Ex: Prefeito Municipal ou Ver. João da Silva"
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
                    placeholder="Ex: PL 014/2026 ou Autógrafo nº 05/2026"
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
                  Documento Oficial Assinado (PDF) — Anexar e Transcrever Automaticamente
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
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const selected = e.target.files[0];
                        setFile(selected);
                        if (selected.name.toLowerCase().endsWith('.pdf') && !fullText.trim()) {
                          handleRunOcrOnFile(selected);
                        }
                      }
                    }}
                  />
                  <Download size={20} className="mx-auto text-neutral-400 mb-1" />
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    {file ? file.name : (lawToEdit?.file_url ? "Arquivo PDF já anexado (Clique para substituir)" : "Clique para selecionar o PDF oficial (Transcreve e formata automaticamente)")}
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
                    placeholder="Ex: Crédito Adicional, Superávit Financeiro, Educação"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Link Externo (Diário Oficial / AMM-MT)
                  </label>
                  <input 
                    type="url"
                    placeholder="https://amm.diariomunicipal.org/..."
                    value={externalLink}
                    onChange={e => setExternalLink(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-medium outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Publicação no Site Institucional */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishOnSite}
                    onChange={(e) => setPublishOnSite(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-100 block">
                      Exibir no Site Institucional (Portal do Cidadão)
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Desmarque se quiser manter este ato apenas no controle interno.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    publishOnSite
                      ? 'bg-white dark:bg-neutral-900 border-amber-300/80 dark:border-amber-700 text-amber-700 dark:text-amber-300 cursor-pointer'
                      : 'opacity-45 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={siteFeatured}
                    disabled={!publishOnSite}
                    onChange={(e) => setSiteFeatured(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Fixar em destaque</span>
                </label>
              </div>

            </div>
          )}

          {activeTab === 'texto' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Texto Integral da Norma (Redação Oficial Padronizada LC 95/98)
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Art. 1º, Art. 2º e blocos "Órgão:", "Natureza da Despesa:" geram tabelas e páginas A4 automáticas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStructureFromFullText}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Sparkles size={13} />
                  <span>Extrair Metadados e Gerar Prévia A4</span>
                </button>
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

          {activeTab === 'previa' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-blue-600 shrink-0" />
                  <span>
                    <strong>Pré-visualização Oficial A4:</strong> Veja como o ato normativo será visualizado no Diário Oficial pelos servidores e cidadãos.
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px] bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                  {lawPages.length} {lawPages.length === 1 ? 'Página A4' : 'Páginas A4'}
                </span>
              </div>

              {/* Renderização das Folhas Físicas A4 */}
              <div className="space-y-6 bg-neutral-200/70 dark:bg-neutral-950/70 p-4 rounded-2xl">
                {lawPages.map((page) => (
                  <div
                    key={`page-preview-${page.pageNumber}`}
                    className="bg-white text-black p-6 sm:p-10 rounded-xl shadow-lg border border-neutral-300 max-w-[780px] mx-auto min-h-[700px] flex flex-col justify-between"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    <div>
                      {/* Cabeçalho do Diário */}
                      <div className="border-b-2 border-blue-800 pb-2 mb-6 flex justify-between items-center text-xs text-blue-900 font-sans font-bold">
                        <div>{parsedLawStructure.diarioHeader.diario}</div>
                        <div>{parsedLawStructure.diarioHeader.edicaoData}</div>
                        <div>{parsedLawStructure.diarioHeader.estado}</div>
                      </div>

                      {/* Epígrafe na Primeira Página */}
                      {page.isFirstPage && (
                        <div className="text-center mb-6">
                          <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-neutral-900">
                            {parsedLawStructure.epigrafe.tipoNumero}
                          </h2>
                          <p className="text-xs text-neutral-700 italic mt-0.5">
                            {parsedLawStructure.epigrafe.data}
                          </p>
                          <p className="text-xs font-bold text-neutral-800 tracking-wider uppercase mt-1">
                            {parsedLawStructure.epigrafe.entidade}
                          </p>
                        </div>
                      )}

                      {/* Ementa */}
                      {page.isFirstPage && parsedLawStructure.ementa && (
                        <div className="mb-6 flex justify-end">
                          <div className="w-full sm:w-[68%] text-xs text-neutral-800 leading-relaxed font-serif italic text-justify border-l-2 border-neutral-400 pl-3">
                            "{parsedLawStructure.ementa}"
                          </div>
                        </div>
                      )}

                      {/* Preâmbulo */}
                      {page.isFirstPage && parsedLawStructure.preambulo && (
                        <div className="mb-5 text-xs text-neutral-900 leading-relaxed font-serif font-bold text-justify">
                          {parsedLawStructure.preambulo}
                        </div>
                      )}

                      {/* Blocos de Artigos e Tabelas */}
                      <div className="space-y-4 text-xs leading-relaxed font-serif text-neutral-900 text-justify">
                        {page.blocks.map((block, bIdx) => {
                          if (block.type === 'budget_table') {
                            const isCopied = copiedTableIndex === bIdx;
                            return (
                              <div key={`prev-budget-${bIdx}`} className="my-4 border border-neutral-300 rounded-lg p-3 bg-neutral-50/60 font-sans">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-neutral-800">
                                    {block.entity || 'Dotação Orçamentária'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTable(block, bIdx, false)}
                                      className="px-2 py-0.5 rounded bg-white border border-neutral-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                      <span>Copiar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTable(block, bIdx, true)}
                                      className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileSpreadsheet size={11} className="text-emerald-600" />
                                      <span>Excel (TSV)</span>
                                    </button>
                                  </div>
                                </div>
                                <table className="w-full border-collapse text-xs">
                                  <tbody>
                                    {block.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-neutral-200 last:border-b-0">
                                        <td className="w-[28%] font-bold p-1.5 bg-neutral-100/60 border-r border-neutral-200">
                                          {row.label}
                                        </td>
                                        <td className="p-1.5">
                                          {row.isNaturezaDespesa && row.naturezaValor ? (
                                            <div className="flex items-baseline justify-between gap-2">
                                              <span>{row.naturezaCodeDesc}</span>
                                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                {row.naturezaValor}
                                              </span>
                                            </div>
                                          ) : (
                                            <span>{row.value}</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          }

                          if (block.type === 'data_table') {
                            const isCopied = copiedTableIndex === bIdx;
                            return (
                              <div key={`prev-data-${bIdx}`} className="my-4 border border-neutral-300 rounded-lg p-3 bg-neutral-50/60 font-sans">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-neutral-800">
                                    {block.title || 'Tabela / Quadro Demonstrativo'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTable(block, bIdx, false)}
                                      className="px-2 py-0.5 rounded bg-white border border-neutral-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                      <span>Copiar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTable(block, bIdx, true)}
                                      className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileSpreadsheet size={11} className="text-emerald-600" />
                                      <span>Excel (TSV)</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-xs">
                                    {block.headers.length > 0 && (
                                      <thead>
                                        <tr className="bg-neutral-100 border-b border-neutral-300">
                                          {block.headers.map((h, hIdx) => (
                                            <th key={hIdx} className="font-bold text-left p-1.5 border-r border-neutral-200 last:border-r-0">
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                    )}
                                    <tbody>
                                      {block.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-neutral-200 last:border-b-0">
                                          {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="p-1.5 border-r border-neutral-200 last:border-r-0">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          }

                          if (block.type === 'article') {
                            return (
                              <p key={`prev-art-${bIdx}`} className="text-justify indent-6">
                                <strong className="font-sans font-bold">{block.articleLabel} </strong>
                                {block.rawText.replace(/^Art\.\s*\d+[ºo°]?\s*[-–.]?\s*/i, '')}
                              </p>
                            );
                          }

                          return (
                            <p key={`prev-gen-${bIdx}`} className="text-justify">
                              {block.rawText}
                            </p>
                          );
                        })}
                      </div>

                      {/* Assinatura na Última Página */}
                      {page.isLastPage && (
                        <div className="mt-8 text-center pt-4 border-t border-neutral-300">
                          <p className="text-xs text-neutral-800 italic mb-4">
                            Gabinete do Prefeito Municipal, {parsedLawStructure.epigrafe.data}.
                          </p>
                          <p className="text-xs font-black uppercase text-neutral-900 tracking-wider">
                            {parsedLawStructure.assinatura.nome}
                          </p>
                          <p className="text-[11px] text-neutral-700">
                            {parsedLawStructure.assinatura.cargo}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Rodapé da Página A4 */}
                    <div className="border-t border-neutral-300 pt-2 mt-8 flex justify-between items-center text-[10px] text-neutral-500 font-sans">
                      <span>amm.diariomunicipal.org</span>
                      <span className="font-bold">Página {page.pageNumber} de {page.totalPages}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé e Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
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
    </motion.div>,
    document.body
  );
};
